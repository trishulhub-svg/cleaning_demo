import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { sendEmail, sendRefundEmail, sendPaymentReceipt } from "@/lib/email";
import { APP_NAME } from "@/lib/constants";
import { logPaymentActivity } from "@/lib/activity-logger";
import { getSetting } from "@/lib/settings";

// ============ Stripe Instance ============

async function getStripe() {
  const secretKey = await getSetting("stripe_secret_key")
    || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-04-30.basil",
  });
}

// ============ Webhook Handler ============

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const stripe = await getStripe();

    // Get the signature from headers
    const sig = request.headers.get("stripe-signature");
    if (!sig) {
      console.error("[Stripe Webhook] Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    // Verify the webhook signature
    const webhookSecret = await getSetting("stripe_webhook_secret")
      || process.env.STRIPE_WEBHOOK_SECRET;

    // If webhook secret is not configured (test mode), construct event from body
    if (!webhookSecret || webhookSecret === "whsec_YOUR_WEBHOOK_SECRET_HERE") {
      console.warn("[Stripe Webhook] Webhook secret not configured, skipping verification (test mode)");
      event = JSON.parse(body) as Stripe.Event;
    } else {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Stripe Webhook] Signature verification failed: ${message}`);
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        );
      }
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "payment_intent.succeeded": {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case "payment_intent.payment_failed": {
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case "charge.refund.updated": {
        await handleChargeRefundUpdated(event.data.object as Stripe.Charge, event.data.object.refunds as unknown as Stripe.ApiList<Stripe.Refund>);
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// ============ Event Handlers ============

/**
 * Handle successful checkout completion.
 * Creates invoice + payment records, updates booking status, sends confirmation email.
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;

  if (!bookingId) {
    console.error("[Stripe Webhook] No bookingId in session metadata");
    return;
  }

  console.log(
    `[Stripe Webhook] Processing checkout complete for booking ${bookingId}, session ${session.id}`
  );

  // Fetch the booking
  const booking = await db.booking.findUnique({
    where: { id: Number(bookingId) },
    include: {
      service: { select: { name: true } },
      user: { select: { name: true, email: true } },
      invoice: true,
    },
  });

  if (!booking) {
    console.error(
      `[Stripe Webhook] Booking ${bookingId} not found`
    );
    return;
  }

  // Skip if already paid
  if (booking.paymentStatus === "paid") {
    console.log(`[Stripe Webhook] Booking ${bookingId} already paid, skipping`);
    return;
  }

  const amount = (session.amount_total ?? 0) / 100;
  const paymentIntentId = session.payment_intent as string;
  const invoiceNumber = `INV-${Date.now()}-${String(booking.id).padStart(5, "0")}`;

  // ── Wrap all DB writes in a transaction to ensure consistency ──
  // If the webhook fires twice or one operation fails mid-way, data stays consistent.
  const { invoiceId: finalInvoiceId, isPostServicePayment } = await db.$transaction(async (tx) => {
    // Create invoice if not exists
    let txnInvoiceId = booking.invoiceId;
    if (!txnInvoiceId) {
      const invoice = await tx.invoice.create({
        data: {
          userId: booking.userId ?? 0,
          bookingId: booking.id,
          invoiceNumber,
          totalAmount: amount,
          paymentMethod: "stripe",
          paymentStatus: "paid",
        },
      });
      txnInvoiceId = invoice.id;

      // Link invoice to booking
      await tx.booking.update({
        where: { id: booking.id },
        data: { invoiceId: invoice.id },
      });
    } else {
      // Update existing invoice
      await tx.invoice.update({
        where: { id: txnInvoiceId },
        data: {
          paymentStatus: "paid",
          totalAmount: amount,
          updatedAt: new Date(),
        },
      });
    }

    // Create payment record
    await tx.payment.create({
      data: {
        userId: booking.userId ?? 0,
        bookingId: booking.id,
        invoiceId: txnInvoiceId!,
        amount,
        paymentMethod: "stripe",
        transactionId: session.id,
        paymentStatus: "completed",
        paidAt: new Date(),
      },
    });

    // ── Check if service has already started BEFORE updating booking ──
    const activeAssignment = await tx.bookingAssignment.findFirst({
      where: {
        bookingId: booking.id,
        status: { in: ["in_progress", "cash_pending"] },
      },
    });

    const txnIsPostServicePayment = !!activeAssignment;
    const newBookingStatus = txnIsPostServicePayment ? "completed" : "confirmed";
    const now = new Date();

    // Update booking status
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: "paid",
        bookingStatus: newBookingStatus,
        paymentMethod: "stripe",
        ...(txnIsPostServicePayment ? {
          completedAt: now,
          completedBy: "Customer (Online)",
          qrScannedAt: now,
        } : {}),
        updatedAt: now,
      },
    });

    // Update assignment status only if still in "assigned" state (don't reset in_progress!)
    await tx.bookingAssignment.updateMany({
      where: {
        bookingId: booking.id,
        status: "assigned",
      },
      data: { status: "assigned" },
    });

    // If this is a post-service payment, also complete the assignment
    if (txnIsPostServicePayment) {
      await tx.bookingAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          status: "completed",
          completedAt: now,
        },
      });
    }

    return { invoiceId: txnInvoiceId, isPostServicePayment: txnIsPostServicePayment };
  });

  logPaymentActivity('payment_completed_stripe', null, booking.id, `Booking #${booking.id}`, { amount, sessionId: session.id, isPostServicePayment }).catch(() => {})

  // Send confirmation email
  const customerEmail = booking.user?.email || booking.guestEmail;
  const customerName = booking.user?.name || booking.guestName || "Customer";

  if (isPostServicePayment) {
    // ── Post-service payment: send SERVICE COMPLETION email ──
    // The service was already done; customer just paid afterwards.
    const { sendBookingCompletionEmail } = await import("@/lib/email");
    if (customerEmail) {
      await sendBookingCompletionEmail(customerEmail, customerName, {
        bookingId: booking.id,
        serviceName: booking.service.name,
        date: booking.bookingDate,
      }).catch((err) => {
        console.error("[Stripe Webhook] Failed to send completion email:", err);
      });
    }

    // Send payment receipt for post-service card payment
    if (customerEmail && finalInvoiceId) {
      const invoice = await db.invoice.findUnique({ where: { id: finalInvoiceId } });
      sendPaymentReceipt(customerEmail, customerName, {
        invoiceNumber: invoice?.invoiceNumber || `INV-${booking.id}`,
        date: new Date().toLocaleDateString(),
        amount: amount,
        paymentMethod: "Card (Stripe)",
        transactionId: session.id,
        items: [{ serviceName: booking.service.name, amount }],
      }).catch((err) => {
        console.error("[Stripe Webhook] Failed to send receipt email:", err);
      });
    }

    // Also log the completion
    const { logBookingActivity } = await import("@/lib/activity-logger");
    logBookingActivity(
      "booking_completed_via_qr_online_payment",
      null,
      booking.id,
      `Booking #${booking.id}`,
      { paymentMethod: "stripe", sessionId: session.id }
    ).catch(() => {});

    console.log(`[Stripe Webhook] Booking ${bookingId} completed (post-service payment)`);
    return;
  }

  // ── Pre-service payment (normal booking flow): send payment confirmation email ──
  if (customerEmail) {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Payment Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background-color: #16a34a; padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🌿 ${APP_NAME}</h1>
                      <p style="margin: 8px 0 0; color: #bbf7d0; font-size: 14px;">Payment Confirmed</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #1a2e1a; font-size: 22px; font-weight: 600;">
                        Thank you, ${customerName}!
                      </h2>
                      <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        Your payment has been received and your booking is now confirmed. Our team will be in touch soon.
                      </p>
                      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Service</td>
                            <td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">${booking.service.name}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Date</td>
                            <td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">${booking.bookingDate}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Booking ID</td>
                            <td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">GL-${String(booking.id).padStart(5, "0")}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0 4px; border-top: 1px solid #e5e7eb; font-weight: 700; font-size: 16px; color: #16a34a;">Amount Paid</td>
                            <td style="padding: 12px 0 4px; text-align: right; border-top: 1px solid #e5e7eb; font-weight: 700; font-size: 16px; color: #16a34a;">£${amount.toFixed(2)}</td>
                          </tr>
                        </table>
                      </div>
                      <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                        If you have any questions, don&apos;t hesitate to reach out to us.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px; color: #9ca3af; font-size: 13px;">
                        Thank you for choosing <strong>${APP_NAME}</strong>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await sendEmail(
      customerEmail,
      `Payment Confirmed — ${APP_NAME}`,
      emailHtml
    );
  }

  console.log(
    `[Stripe Webhook] Successfully processed payment for booking ${bookingId}`
  );
}

/**
 * Handle payment intent succeeded (fallback).
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(
    `[Stripe Webhook] Payment intent succeeded: ${paymentIntent.id}`
  );

  // If metadata contains bookingId, process it
  const bookingId = paymentIntent.metadata?.bookingId;
  if (bookingId) {
    const booking = await db.booking.findUnique({
      where: { id: Number(bookingId) },
    });

    if (booking && booking.paymentStatus !== "paid") {
      // The checkout.session.completed should handle the full flow
      // This is a safety net
      console.log(
        `[Stripe Webhook] Payment intent fallback: updating booking ${bookingId}`
      );
    }
  }
}

/**
 * Handle payment failure.
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(
    `[Stripe Webhook] Payment failed for intent: ${paymentIntent.id}`
  );

  const bookingId = paymentIntent.metadata?.bookingId;
  if (bookingId) {
    // Could notify admin or update booking status
    console.log(
      `[Stripe Webhook] Payment failed for booking ${bookingId}`
    );
  }
}

/**
 * Handle charge refund updated event.
 * Updates the Refund record status based on the Stripe refund status.
 * When Stripe confirms refund (status = "succeeded"), update to "completed".
 */
async function handleChargeRefundUpdated(charge: Stripe.Charge, refunds: Stripe.ApiList<Stripe.Refund>) {
  console.log(`[Stripe Webhook] Charge refund updated for charge: ${charge.id}`);

  try {
    // Get the most recent refund
    const refundsList = Array.isArray(refunds) ? refunds : (refunds?.data || []);
    if (refundsList.length === 0) return;

    const latestRefund = refundsList[0];
    const refundId = latestRefund.metadata?.refundId;

    if (!refundId) {
      console.log("[Stripe Webhook] No refundId in refund metadata, skipping");
      return;
    }

    // Find our refund record
    const refund = await db.refund.findUnique({
      where: { id: Number(refundId) },
      include: {
        booking: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
          },
        },
      },
    });

    if (!refund) {
      console.log(`[Stripe Webhook] Refund ${refundId} not found in DB`);
      return;
    }

    // Map Stripe refund status to our status
    const statusMap: Record<string, string> = {
      pending: "processing",
      succeeded: "completed",
      failed: "rejected",
      canceled: "rejected",
    };

    const newStatus = statusMap[latestRefund.status];
    if (!newStatus || refund.status === newStatus) {
      console.log(`[Stripe Webhook] Refund ${refundId} status already ${refund.status}, no update needed`);
      return;
    }

    // Update refund status
    await db.refund.update({
      where: { id: Number(refundId) },
      data: {
        status: newStatus,
        stripeRefundId: latestRefund.id,
        processedAt: newStatus === "completed" ? new Date() : refund.processedAt,
      },
    });

    console.log(`[Stripe Webhook] Updated refund ${refundId} status: ${refund.status} → ${newStatus}`);

    // Send email notification on completion
    if (newStatus === "completed") {
      const customerEmail = refund.booking?.user?.email || refund.booking?.guestEmail;
      const customerName = refund.booking?.user?.name || refund.booking?.guestName || "Customer";

      if (customerEmail) {
        sendRefundEmail(customerEmail, customerName, {
          refundId: refund.id,
          amount: refund.amount,
          reason: refund.reason,
          status: "completed",
        }).catch((err) => {
          console.error("[Stripe Webhook] Failed to send refund completion email:", err);
        });
      }
    }
  } catch (error) {
    console.error("[Stripe Webhook] Error handling charge.refund.updated:", error);
  }
}
