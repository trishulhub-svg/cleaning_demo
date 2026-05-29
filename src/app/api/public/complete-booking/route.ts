import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { logBookingActivity, logPaymentActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, paymentMethod } = body;

    // ── Validate input ──
    if (!bookingId || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: "Booking ID and payment method are required." },
        { status: 400 }
      );
    }

    if (!["cash", "stripe"].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment method. Must be 'cash' or 'stripe'." },
        { status: 400 }
      );
    }

    // ── Find booking with assignment ──
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { name: true, price: true } },
        user: { select: { id: true, name: true, email: true } },
        assignment: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    // ── Verify booking is not already completed or cancelled ──
    if (booking.bookingStatus === "completed") {
      return NextResponse.json(
        { success: false, error: "This booking has already been completed." },
        { status: 400 }
      );
    }

    if (booking.bookingStatus === "cancelled") {
      return NextResponse.json(
        { success: false, error: "This booking has been cancelled." },
        { status: 400 }
      );
    }

    // ── Verify authentication first (no guest access) ──
    const session = await getAuthSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    // ── Verify ownership (same logic as qr-scan) ──
    const isOwner =
      (session.user.userType === "customer" && session.user.id === booking.userId) ||
      (session.user.email &&
        session.user.email.toLowerCase() === booking.guestEmail?.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to modify this booking." },
        { status: 403 }
      );
    }

    // ── Process based on payment method ──
    if (paymentMethod === "cash") {
      const now = new Date();

      await db.$transaction([
        // Update assignment status to cash_pending
        ...(booking.assignment
          ? [
              db.bookingAssignment.update({
                where: { id: booking.assignment.id },
                data: { status: "cash_pending" },
              }),
            ]
          : []),
        // Update booking status
        db.booking.update({
          where: { id: bookingId },
          data: {
            bookingStatus: "cash_pending",
            paymentMethod: "cash_on_service",
            paymentStatus: "cash_on_service",
            updatedAt: now,
          },
        }),
      ]);

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
        "booking_cash_payment_selected",
        sessionActor,
        bookingId,
        `Booking #${bookingId}`,
        { paymentMethod: "cash" }
      );

      await logPaymentActivity(
        "cash_payment_selected",
        sessionActor,
        bookingId,
        `Booking #${bookingId}`,
        { amount: booking.totalPrice }
      );

      return NextResponse.json({
        success: true,
        message: "Cash payment selected. You can pay the cleaner when the service is complete.",
        bookingId,
        paymentMethod: "cash",
        redirect: "/dashboard",
      });
    }

    if (paymentMethod === "stripe") {
      // ── Return booking data for checkout redirect ──
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

      // ── Log activity ──
      const sessionActor = session?.user
        ? {
            userType: session.user.userType,
            id: session.user.id,
            name: session.user.name || "Customer",
            email: session.user.email,
          }
        : null;

      await logPaymentActivity(
        "online_payment_initiated",
        sessionActor,
        bookingId,
        `Booking #${bookingId}`,
        { amount: booking.totalPrice, method: "stripe" }
      );

      return NextResponse.json({
        success: true,
        redirect: "/checkout",
        bookingData,
      });
    }

    // Should not reach here
    return NextResponse.json(
      { success: false, error: "Invalid payment method." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Complete-Booking] Error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
