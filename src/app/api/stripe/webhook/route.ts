import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { APP_NAME } from "@/lib/constants";
import { logPaymentActivity } from "@/lib/activity-logger";

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

// ============ Webhook Handler ============

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const stripe = getStripe();

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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

  // Create invoice if not exists
  let invoiceId = booking.invoiceId;
  if (!invoiceId) {
    const invoice = await db.invoice.create({
      data: {
        userId: booking.userId ?? 0,
        bookingId: booking.id,
        invoiceNumber,
        totalAmount: amount,
        paymentMethod: "stripe",
        paymentStatus: "paid",
      },
    });
    invoiceId = invoice.id;

    // Link invoice to booking
    await db.booking.update({
      where: { id: booking.id },
      data: { invoiceId: invoice.id },
    });
  } else {
    // Update existing invoice
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentStatus: "paid",
        totalAmount: amount,
        updatedAt: new Date(),
      },
    });
  }

  // Create payment record
  await db.payment.create({
    data: {
      userId: booking.userId ?? 0,
      bookingId: booking.id,
      invoiceId: invoiceId!,
      amount,
      paymentMethod: "stripe",
      transactionId: session.id,
      paymentStatus: "completed",
      paidAt: new Date(),
    },
  });

  // Update booking status
  await db.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: "paid",
      bookingStatus: "confirmed",
      paymentMethod: "stripe",
      updatedAt: new Date(),
    },
  });

  // Update assignment status if exists
  await db.bookingAssignment.updateMany({
    where: { bookingId: booking.id },
    data: { status: "assigned" },
  });

  logPaymentActivity('payment_completed_stripe', null, booking.id, `Booking #${booking.id}`, { amount, sessionId: session.id }).catch(() => {})

  // Send confirmation email
  const customerEmail = booking.user?.email || booking.guestEmail;
  const customerName = booking.user?.name || booking.guestName || "Customer";

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
