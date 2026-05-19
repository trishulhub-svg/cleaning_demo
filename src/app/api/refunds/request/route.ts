import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-logger"

export async function POST(req: NextRequest) {
  try {
    // Parse body
    const body = await req.json()
    const { bookingId, invoiceId, amount, reason } = body

    // Validate required fields
    if (!bookingId || !amount || !reason) {
      return NextResponse.json(
        { error: "Booking ID, amount, and reason are required." },
        { status: 400 }
      )
    }

    // Validate amount
    const refundAmount = parseFloat(amount)
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid refund amount." },
        { status: 400 }
      )
    }

    // Validate reason length
    if (typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json(
        { error: "Refund reason must be at least 10 characters." },
        { status: 400 }
      )
    }

    // Fetch the booking with validation
    const booking = await db.booking.findUnique({
      where: { id: Number(bookingId) },
      include: {
        service: { select: { name: true } },
        invoice: { select: { id: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      )
    }

    // Validate booking is eligible for refund
    if (booking.bookingStatus !== "cancelled") {
      return NextResponse.json(
        { error: "Only cancelled bookings can be refunded." },
        { status: 400 }
      )
    }

    if (booking.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Only paid bookings are eligible for refunds." },
        { status: 400 }
      )
    }

    if (booking.refundStatus !== "none" && booking.refundStatus !== "rejected") {
      return NextResponse.json(
        { error: "A refund has already been requested for this booking." },
        { status: 400 }
      )
    }

    // Validate amount doesn't exceed total
    if (refundAmount > booking.totalPrice) {
      return NextResponse.json(
        { error: `Refund amount cannot exceed the booking total of £${booking.totalPrice.toFixed(2)}.` },
        { status: 400 }
      )
    }

    // Determine refund type
    const refundType = refundAmount < booking.totalPrice ? "partial" : "full"

    // Use provided invoiceId or fall back to booking's invoice
    const refundInvoiceId = invoiceId || booking.invoice?.id || 0

    // Create the refund record and update booking in a transaction
    const refund = await db.$transaction(async (tx) => {
      // Create refund
      const newRefund = await tx.refund.create({
        data: {
          userId: booking.userId || 0,
          bookingId: booking.id,
          invoiceId: refundInvoiceId,
          amount: refundAmount,
          refundType,
          reason: reason.trim(),
          status: "pending",
        },
      })

      // Update booking refund status
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          refundStatus: "requested",
          updatedAt: new Date(),
        },
      })

      return newRefund
    })

    // Log activity (fire-and-forget, don't await)
    logActivity(
      {
        action: "refund_requested",
        category: "payment",
        targetType: "payment",
        targetId: refund.id,
        targetName: `Refund #${refund.id} for Booking #${booking.id}`,
        details: {
          bookingId: booking.id,
          serviceName: booking.service.name,
          amount: refundAmount,
          refundType,
          reason: reason.trim(),
        },
      },
      {
        userType: "customer",
        id: booking.userId || 0,
        name: "Customer",
        email: undefined,
      }
    ).catch(() => {
      // Swallow activity log errors
    })

    return NextResponse.json(
      {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          refundType: refund.refundType,
          status: refund.status,
        },
        message: "Your refund request has been submitted successfully. We'll review it within 1–2 business days.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[RefundRequest] Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
