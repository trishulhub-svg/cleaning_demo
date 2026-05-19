import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { APP_NAME } from "@/lib/constants";

// ============ POST: Create Booking ============

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      serviceId,
      bookingDate,
      bookingTime,
      address,
      accessNotes,
      paymentMethod,
      totalPrice,
      guestName,
      guestEmail,
      guestPhone,
    } = body;

    // ============ Validation ============

    if (!serviceId || !bookingDate || !bookingTime || !address || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: serviceId, bookingDate, bookingTime, address, paymentMethod" },
        { status: 400 }
      );
    }

    // Validate service exists
    const service = await db.service.findUnique({
      where: { id: Number(serviceId) },
    });

    if (!service || !service.isActive) {
      return NextResponse.json(
        { error: "Selected service is not available" },
        { status: 400 }
      );
    }

    // Validate date is in the future
    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    if (bookingDateTime <= new Date()) {
      return NextResponse.json(
        { error: "Booking date and time must be in the future" },
        { status: 400 }
      );
    }

    // Calculate final price
    const basePrice = service.price;
    const isOnlinePayment = paymentMethod === "stripe";
    const discountPercent = isOnlinePayment ? 5 : 0;
    const finalPrice = isOnlinePayment
      ? basePrice - basePrice * (discountPercent / 100)
      : basePrice;
    const effectivePrice = totalPrice ?? finalPrice;

    // ============ Determine User ID ============

    // Check if user is authenticated from session cookie
    // We need to get the session from the request headers
    const sessionCookie = request.cookies.get("next-auth.session-token")
      || request.cookies.get("__Secure-next-auth.session-token");

    let userId: number | null = null;
    let userName: string | null = null;
    let userEmail: string | null = null;

    if (sessionCookie) {
      // Try to get user from session
      const { getServerSession } = await import("next-auth");
      const { authOptions } = await import("@/lib/auth");
      const session = await getServerSession(authOptions);

      if (session?.user) {
        userId = session.user.id;
        userName = session.user.name;
        userEmail = session.user.email;
      }
    }

    // ============ Create Booking ============

    const paymentStatus = isOnlinePayment ? "pending" : "cash_on_service";
    const bookingStatus = isOnlinePayment ? "pending" : "confirmed";

    const booking = await db.booking.create({
      data: {
        userId: userId ?? null,
        guestName: guestName || userName || null,
        guestEmail: guestEmail || userEmail || null,
        guestPhone: guestPhone || null,
        serviceId: Number(serviceId),
        bookingDate,
        bookingTime,
        address: address.trim(),
        accessNotes: accessNotes?.trim() || null,
        totalPrice: effectivePrice,
        paymentStatus,
        paymentMethod: isOnlinePayment ? "stripe" : "cash",
        bookingStatus,
      },
    });

    // ============ Handle Payment ============

    if (!isOnlinePayment) {
      // Cash payment: create invoice and payment records immediately
      const invoiceNumber = `INV-${Date.now()}-${String(booking.id).padStart(5, "0")}`;

      const invoice = await db.invoice.create({
        data: {
          userId: userId ?? 0,
          bookingId: booking.id,
          invoiceNumber,
          totalAmount: effectivePrice,
          paymentMethod: "cash",
          paymentStatus: "pending", // Pending until staff confirms cash received
        },
      });

      // Link invoice to booking
      await db.booking.update({
        where: { id: booking.id },
        data: { invoiceId: invoice.id },
      });

      // Create payment record (pending)
      await db.payment.create({
        data: {
          userId: userId ?? 0,
          bookingId: booking.id,
          invoiceId: invoice.id,
          amount: effectivePrice,
          paymentMethod: "cash",
          paymentStatus: "pending",
        },
      });
    }

    // ============ Send Confirmation Email ============

    const customerEmail = guestEmail || userEmail;
    const customerName = guestName || userName || "Customer";

    if (customerEmail) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Booking Confirmed</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f7f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background-color: #16a34a; padding: 32px 40px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🌿 ${APP_NAME}</h1>
                        <p style="margin: 8px 0 0; color: #bbf7d0; font-size: 14px;">Booking Confirmed</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 16px; color: #1a2e1a; font-size: 22px; font-weight: 600;">
                          Thank you, ${customerName}!
                        </h2>
                        <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                          Your cleaning service has been booked successfully. Below are your booking details.
                        </p>
                        <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Booking ID</td>
                              <td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">GL-${String(booking.id).padStart(5, "0")}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Service</td>
                              <td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">${service.name}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Date</td>
                              <td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">${bookingDate}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #4a5568; font-size: 14px;">Time</td>
                              <td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 14px;">${bookingTime}</td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0 4px; border-top: 1px solid #e5e7eb; font-weight: 700; font-size: 16px; color: #16a34a;">Total</td>
                              <td style="padding: 12px 0 4px; text-align: right; border-top: 1px solid #e5e7eb; font-weight: 700; font-size: 16px; color: #16a34a;">£${effectivePrice.toFixed(2)}</td>
                            </tr>
                          </table>
                        </div>
                        ${
                          !isOnlinePayment
                            ? `
                        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
                          <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                            💰 Pay After Service
                          </p>
                          <p style="margin: 4px 0 0; color: #3b82f6; font-size: 13px;">
                            Please have £${effectivePrice.toFixed(2)} in cash ready for our cleaning team, or pay via bank transfer on the day.
                          </p>
                        </div>
                        `
                            : `
                        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                            ⏳ Payment Pending
                          </p>
                          <p style="margin: 4px 0 0; color: #b45309; font-size: 13px;">
                            Please complete your payment to confirm the booking.
                          </p>
                        </div>
                        `
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px; color: #9ca3af; font-size: 13px;">
                          Thank you for choosing <strong>${APP_NAME}</strong>
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                          Questions? Reply to this email or call us.
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
        `Booking Confirmed — GL-${String(booking.id).padStart(5, "0")} — ${APP_NAME}`,
        emailHtml
      );
    }

    // ============ Return Response ============

    if (isOnlinePayment) {
      // For Stripe payments, redirect to checkout page
      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        nextStep: "checkout",
        checkoutUrl: `/checkout?bookingId=${booking.id}`,
      });
    } else {
      // For cash payments, redirect to confirmation
      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        nextStep: "confirmed",
        checkoutUrl: `/booking-confirmation?bookingId=${booking.id}`,
      });
    }
  } catch (error) {
    console.error("[Bookings API] Error creating booking:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create booking. Please try again." },
      { status: 500 }
    );
  }
}
