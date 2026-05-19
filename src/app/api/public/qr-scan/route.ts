import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { validateCode } from "@/lib/qr-generator";
import { sendBookingCompletionEmail } from "@/lib/email";
import { logActivity, logBookingActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    // ── Validate code format ──
    if (!code || typeof code !== "string" || !validateCode(code)) {
      return NextResponse.json(
        { success: false, error: "Invalid QR code format." },
        { status: 400 }
      );
    }

    // ── Find assignment by QR code ──
    const assignment = await db.bookingAssignment.findUnique({
      where: { qrCode: code },
      include: {
        booking: {
          include: {
            service: { select: { name: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "QR code not found. Please check and try again." },
        { status: 404 }
      );
    }

    // ── Check assignment status ──
    if (assignment.status === "completed") {
      return NextResponse.json({
        success: false,
        error: "This booking has already been completed.",
        code: "ALREADY_COMPLETED",
      });
    }

    if (assignment.status === "cancelled") {
      return NextResponse.json({
        success: false,
        error: "This booking has been cancelled.",
        code: "BOOKING_CANCELLED",
      });
    }

    if (assignment.status === "cash_pending") {
      return NextResponse.json({
        success: false,
        error: "This booking is pending cash payment confirmation.",
        code: "CASH_PENDING",
      });
    }

    // Assignment should be in_progress (or at least assigned)
    if (assignment.status !== "in_progress" && assignment.status !== "assigned") {
      return NextResponse.json({
        success: false,
        error: "This booking is not currently active.",
        code: "NOT_ACTIVE",
      });
    }

    // ── Check booking is not already completed ──
    if (assignment.booking.bookingStatus === "completed") {
      return NextResponse.json({
        success: false,
        error: "This booking has already been completed.",
        code: "ALREADY_COMPLETED",
      });
    }

    if (assignment.booking.bookingStatus === "cancelled") {
      return NextResponse.json({
        success: false,
        error: "This booking has been cancelled.",
        code: "BOOKING_CANCELLED",
      });
    }

    const booking = assignment.booking;

    // ── Verify ownership: check session or guest email ──
    const session = await getAuthSession();
    const isOwner =
      // Logged-in customer: userId match
      (session?.user?.userType === "customer" && session.user.id === booking.userId) ||
      // Guest match via session email
      (session?.user?.email &&
        session.user.email.toLowerCase() === booking.guestEmail?.toLowerCase());

    // If no session, we still allow access — the QR code itself is the verification
    // But we flag it so the frontend can prompt for verification if needed
    const needsGuestVerification = !isOwner && !session?.user;

    // ── Branch: prepaid vs cash/pending ──
    if (booking.paymentStatus === "paid") {
      // ── Auto-complete: update assignment and booking ──
      const now = new Date();

      await db.$transaction([
        db.bookingAssignment.update({
          where: { id: assignment.id },
          data: {
            status: "completed",
            completedAt: now,
          },
        }),
        db.booking.update({
          where: { id: booking.id },
          data: {
            bookingStatus: "completed",
            completedAt: now,
            completedBy: "Customer",
            qrScannedAt: now,
            updatedAt: now,
          },
        }),
      ]);

      // ── Send completion email ──
      const customerName = booking.user?.name || booking.guestName || "Customer";
      const customerEmail = booking.user?.email || booking.guestEmail;
      if (customerEmail) {
        await sendBookingCompletionEmail(customerEmail, customerName, {
          bookingId: booking.id,
          serviceName: booking.service.name,
          date: booking.bookingDate,
        }).catch((err) => {
          console.error("[QR-Scan] Failed to send completion email:", err);
        });
      }

      // ── Log activity ──
      const sessionActor = session?.user
        ? {
            userType: session.user.userType,
            id: session.user.id,
            name: session.user.name || "Customer",
            email: session.user.email,
          }
        : null;

      await logBookingActivity(
        "booking_completed_via_qr",
        sessionActor,
        booking.id,
        `Booking #${booking.id}`,
        { qrCode: code, paymentStatus: booking.paymentStatus }
      );

      return NextResponse.json({
        success: true,
        autoCompleted: true,
        bookingId: booking.id,
      });
    }

    // ── Cash / Pending: return booking data for payment selection ──
    const bookingData = {
      id: booking.id,
      service: booking.service.name,
      date: booking.bookingDate,
      time: booking.bookingTime.slice(0, 5),
      address: booking.address,
      totalPrice: booking.totalPrice,
      paymentStatus: booking.paymentStatus,
      customerName: booking.user?.name || booking.guestName || "Customer",
    };

    return NextResponse.json({
      success: true,
      autoCompleted: false,
      booking: bookingData,
      requiresPayment: true,
      needsGuestVerification,
    });
  } catch (error) {
    console.error("[QR-Scan] Error processing QR scan:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
