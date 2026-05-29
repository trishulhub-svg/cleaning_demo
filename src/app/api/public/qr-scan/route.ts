import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { validateCode } from "@/lib/qr-generator";
import { sendBookingCompletionEmail } from "@/lib/email";
import { logBookingActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { code } = body;

    // ── Extract code from URL if a full URL was scanned ──
    // When QR encodes a URL like https://domain.com/public/scan-qr?code=QR-XXXX,
    // the phone may send the full URL. We extract just the code part.
    if (code && typeof code === "string") {
      const urlMatch = code.match(/[?&]code=(QR-\d{8}-[A-F0-9]{10})/);
      if (urlMatch) {
        code = urlMatch[1];
      }
    }

    // ── Validate code format ──
    if (!code || typeof code !== "string" || !validateCode(code)) {
      return NextResponse.json(
        { success: false, error: "Invalid QR code format." },
        { status: 400 }
      );
    }

    // ── Check authentication ──
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: "You must be logged in to scan QR codes.",
        needsLogin: true,
      });
    }

    // ── Find assignment by QR code ──
    // NOTE: qrCode is NOT a @unique field in the schema, so we must
    // use findFirst. findUnique requires @id or @unique constraints.
    const assignment = await db.bookingAssignment.findFirst({
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

    // ── Ownership validation: customer must own this booking ──
    if (session.user.userType === "customer") {
      if (assignment.booking.userId !== session.user.id) {
        return NextResponse.json({
          success: false,
          error: "This QR code belongs to a different booking.",
          code: "WRONG_CUSTOMER",
        });
      }
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

    // Allow both in_progress and cash_pending statuses
    if (
      assignment.status !== "in_progress" &&
      assignment.status !== "cash_pending"
    ) {
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

    // ── Branch: prepaid vs pay-after-service ──
    // Use paymentMethod (set at booking creation) as the primary indicator.
    // paymentMethod="stripe" means the customer booked with online pre-payment.
    // paymentMethod="cash_on_service" means the customer booked to pay after service.
    const isPrepaidBooking = booking.paymentMethod === "stripe";

    if (isPrepaidBooking) {
      // ── PRE-PAID: Auto-complete the service immediately ──
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

      // ── Send service completion email ──
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
      const sessionActor = {
        userType: session.user.userType,
        id: session.user.id,
        name: session.user.name || "Customer",
        email: session.user.email,
      };

      await logBookingActivity(
        "booking_completed_via_qr",
        sessionActor,
        booking.id,
        `Booking #${booking.id}`,
        { qrCode: code, paymentMethod: booking.paymentMethod }
      );

      return NextResponse.json({
        success: true,
        autoCompleted: true,
        bookingId: booking.id,
      });
    }

    // ── PAY-AFTER-SERVICE: return booking data for payment selection ──
    // Customer needs to choose cash or online payment before the service is marked complete.
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
    });
  } catch (error) {
    console.error("[QR-Scan] Error processing QR scan:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
