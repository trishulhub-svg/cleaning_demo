import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logBookingActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const customer = await requireAuth(["customer"]);

    const body = await req.json();
    const { bookingId, method } = body;

    if (!bookingId || !method || !["cash", "online"].includes(method)) {
      return NextResponse.json(
        { success: false, error: "Invalid request. Booking ID and payment method (cash/online) are required." },
        { status: 400 }
      );
    }

    // Fetch booking with assignment
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        assignment: { select: { id: true, status: true } },
        service: { select: { name: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    // Ownership validation
    if (booking.userId !== customer.id) {
      return NextResponse.json(
        { success: false, error: "This booking does not belong to you." },
        { status: 403 }
      );
    }

    // Validate booking is in correct state
    if (booking.bookingStatus === "completed") {
      return NextResponse.json({
        success: false,
        error: "This booking has already been completed.",
        code: "ALREADY_COMPLETED",
      });
    }

    if (booking.bookingStatus === "cancelled") {
      return NextResponse.json({
        success: false,
        error: "This booking has been cancelled.",
        code: "BOOKING_CANCELLED",
      });
    }

    const validStatuses = ["in_progress", "cash_pending"];
    if (!validStatuses.includes(booking.bookingStatus)) {
      return NextResponse.json({
        success: false,
        error: "This booking is not in a valid state for payment." },
        { status: 400 }
      );
    }

    if (method === "cash") {
      // Customer chose to pay cash → set to cash_pending
      // Cleaner will confirm cash received from staff portal
      await db.$transaction([
        ...(booking.assignment
          ? [
              db.bookingAssignment.update({
                where: { id: booking.assignment.id },
                data: { status: "cash_pending" },
              }),
            ]
          : []),
        db.booking.update({
          where: { id: bookingId },
          data: {
            bookingStatus: "cash_pending",
            paymentStatus: "cash_on_service",
            updatedAt: new Date(),
          },
        }),
      ]);

      await logBookingActivity(
        "customer_chose_cash_payment",
        { userType: "customer", id: customer.id, name: customer.name, email: customer.email },
        bookingId,
        `Booking #${bookingId}`,
        { amount: booking.totalPrice }
      );

      return NextResponse.json({
        success: true,
        method: "cash",
        message: "Please hand over the payment to the cleaner. They will confirm receipt to complete the booking.",
        bookingId,
      });
    }

    // method === "online"
    await logBookingActivity(
      "customer_chose_online_payment",
      { userType: "customer", id: customer.id, name: customer.name, email: customer.email },
      bookingId,
      `Booking #${bookingId}`,
      { amount: booking.totalPrice }
    );

    return NextResponse.json({
      success: true,
      method: "online",
      redirectUrl: `/checkout?bookingId=${bookingId}&fromQrScan=true`,
      bookingId,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("redirect")) {
      throw error;
    }
    console.error("[QR-Scan] choose-payment error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
