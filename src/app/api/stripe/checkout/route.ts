import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { CURRENCY } from "@/lib/constants";
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

// ============ POST: Create Checkout Session ============

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, amount } = body;

    // Validate required fields
    if (!bookingId || !amount) {
      return NextResponse.json(
        { error: "Missing bookingId or amount" },
        { status: 400 }
      );
    }

    // Fetch booking with service details
    const booking = await db.booking.findUnique({
      where: { id: Number(bookingId) },
      include: {
        service: { select: { name: true } },
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

    // Determine customer email
    const customerEmail = booking.guestEmail || undefined;

    // Create Stripe Checkout Session
    const stripe = await getStripe();
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: booking.service.name,
              description: `Cleaning Service — Booking GL-${String(booking.id).padStart(5, "0")}`,
            },
            unit_amount: Number(amount),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: String(booking.id),
        bookingDate: booking.bookingDate,
        serviceId: String(booking.serviceId),
      },
      success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?bookingId=${booking.id}&cancelled=1`,
      customer_email: customerEmail,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    // Update booking payment method to stripe (but keep status as pending until webhook confirms)
    await db.booking.update({
      where: { id: Number(bookingId) },
      data: {
        paymentMethod: "stripe",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[Stripe Checkout] Error creating session:", error);

    if (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: "Payment system is not configured. Please pay after service." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
