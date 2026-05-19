import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============ POST: Update Payment Method to Cash ============

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId" },
        { status: 400 }
      );
    }

    // Fetch the booking
    const booking = await db.booking.findUnique({
      where: { id: Number(bookingId) },
      include: {
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    if (booking.bookingStatus === "cancelled") {
      return NextResponse.json(
        { error: "This booking has been cancelled" },
        { status: 400 }
      );
    }

    // Update booking to cash payment
    await db.booking.update({
      where: { id: booking.id },
      data: {
        paymentMethod: "cash",
        paymentStatus: "cash_on_service",
        bookingStatus: "confirmed",
        updatedAt: new Date(),
      },
    });

    // Create invoice if not exists
    if (!booking.invoiceId) {
      const invoiceNumber = `INV-${Date.now()}-${String(booking.id).padStart(5, "0")}`;
      const invoice = await db.invoice.create({
        data: {
          userId: booking.userId ?? 0,
          bookingId: booking.id,
          invoiceNumber,
          totalAmount: booking.totalPrice,
          paymentMethod: "cash",
          paymentStatus: "pending",
        },
      });

      await db.booking.update({
        where: { id: booking.id },
        data: { invoiceId: invoice.id },
      });

      // Create payment record
      await db.payment.create({
        data: {
          userId: booking.userId ?? 0,
          bookingId: booking.id,
          invoiceId: invoice.id,
          amount: booking.totalPrice,
          paymentMethod: "cash",
          paymentStatus: "pending",
        },
      });
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      message: "Payment method updated to cash on service",
    });
  } catch (error) {
    console.error("[Bookings API] Error updating payment method:", error);
    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}
