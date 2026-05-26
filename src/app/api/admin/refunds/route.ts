import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendRefundEmail } from "@/lib/email";

// ============ Stripe Instance ============

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-04-30.basil",
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || "all";

    const where: Record<string, unknown> = {};
    if (status !== "all") {
      where.status = status;
    }

    const refunds = await db.refund.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            bookingDate: true,
            address: true,
            service: { select: { name: true } },
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
          },
        },
      },
    });

    const statusCounts = await db.refund.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const counts = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );
    counts.all = Object.values(counts).reduce((a, b) => a + b, 0);

    return NextResponse.json({ refunds, statusCounts: counts });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { refundId, action, adminNotes } = body;

    if (!refundId) {
      return NextResponse.json(
        { error: "Refund ID is required" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // 1. Fetch the refund with its booking
      const refund = await db.refund.findUnique({
        where: { id: refundId },
        include: {
          booking: {
            select: {
              id: true,
              userId: true,
              guestName: true,
              guestEmail: true,
            },
          },
        },
      });

      if (!refund) {
        return NextResponse.json({ error: "Refund not found" }, { status: 404 });
      }

      // 2. Look up the payment record to get the Stripe paymentIntentId
      const payment = await db.payment.findFirst({
        where: {
          bookingId: refund.bookingId,
          paymentMethod: "stripe",
          paymentStatus: "completed",
        },
        orderBy: { paidAt: "desc" },
      });

      let stripeRefundId: string | null = null;

      // 3. If we have a Stripe payment, initiate the actual refund
      if (payment) {
        try {
          const stripe = getStripe();

          // The paymentIntentId might be stored as transactionId, or we can use charge
          // Look for the charge associated with this payment
          const chargeId = payment.transactionId;

          if (chargeId) {
            const refundParams: Stripe.RefundCreateParams = {
              amount: Math.round(refund.amount * 100), // Convert to cents
              reason: "requested_by_customer",
              metadata: {
                refundId: String(refund.id),
                bookingId: String(refund.bookingId),
              },
            };

            // If transactionId looks like a pi_ prefix, use payment_intent; otherwise try as charge
            if (chargeId.startsWith("pi_")) {
              refundParams.payment_intent = chargeId;
            } else if (chargeId.startsWith("ch_")) {
              refundParams.charge = chargeId;
            } else {
              // Try as payment intent ID
              refundParams.payment_intent = chargeId;
            }

            const stripeRefund = await stripe.refunds.create(refundParams);
            stripeRefundId = stripeRefund.id;
          }
        } catch (stripeErr) {
          console.error("[Admin Refund] Stripe refund failed:", stripeErr);
          // Still update status but note the error
          return NextResponse.json(
            { error: `Stripe refund failed: ${stripeErr instanceof Error ? stripeErr.message : "Unknown error"}` },
            { status: 500 }
          );
        }
      }

      // 4. Update refund status to "processing" (not "approved")
      const updatedRefund = await db.refund.update({
        where: { id: refundId },
        data: {
          status: "processing",
          stripeRefundId: stripeRefundId ?? undefined,
          adminNotes,
          processedAt: new Date(),
        },
      });

      // 5. Send email to customer about refund status
      const customerEmail = refund.booking?.user
        ? (refund.booking.user as { name?: string; email?: string }).email
        : refund.booking?.guestEmail;
      const customerName = refund.booking?.user
        ? (refund.booking.user as { name?: string; email?: string }).name || "Customer"
        : refund.booking?.guestName || "Customer";

      if (customerEmail) {
        sendRefundEmail(customerEmail, customerName, {
          refundId: refund.id,
          amount: refund.amount,
          reason: refund.reason,
          status: "processing",
        }).catch((err) => {
          console.error("[Admin Refund] Failed to send refund email:", err);
        });
      }

      return NextResponse.json({ refund: updatedRefund });
    }

    if (action === "reject") {
      // 1. Fetch the refund with its booking
      const refund = await db.refund.findUnique({
        where: { id: refundId },
        include: {
          booking: {
            select: {
              id: true,
              userId: true,
              guestName: true,
              guestEmail: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      });

      if (!refund) {
        return NextResponse.json({ error: "Refund not found" }, { status: 404 });
      }

      // 2. Update status to rejected
      const updatedRefund = await db.refund.update({
        where: { id: refundId },
        data: {
          status: "rejected",
          adminNotes,
          processedAt: new Date(),
        },
      });

      // 3. Send email to customer
      const customerEmail = refund.booking?.user?.email || refund.booking?.guestEmail;
      const customerName = refund.booking?.user?.name || refund.booking?.guestName || "Customer";

      if (customerEmail) {
        sendRefundEmail(customerEmail, customerName, {
          refundId: refund.id,
          amount: refund.amount,
          reason: refund.reason,
          status: "rejected",
        }).catch((err) => {
          console.error("[Admin Refund] Failed to send rejection email:", err);
        });
      }

      return NextResponse.json({ refund: updatedRefund });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating refund:", error);
    return NextResponse.json(
      { error: "Failed to update refund" },
      { status: 500 }
    );
  }
}
