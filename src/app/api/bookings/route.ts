import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { APP_NAME } from "@/lib/constants";
import { generateInvoiceNumber, generateTransactionId } from "@/lib/invoice";
import { sendBookingConfirmation } from "@/lib/email";
import { logBookingActivity } from "@/lib/activity-logger";

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

    // ============ Create Booking with Transaction ============

    const paymentStatus = isOnlinePayment ? "pending" : "cash_on_service";
    const bookingStatus = isOnlinePayment ? "pending" : "confirmed";

    // Use transaction for multi-table operations
    const booking = await db.$transaction(async (tx) => {
      // Create the booking
      const newBooking = await tx.booking.create({
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
          paymentMethod: isOnlinePayment ? "stripe" : "cash_on_service",
          bookingStatus,
        },
      });

      if (!isOnlinePayment) {
        // Cash payment: create invoice and payment records in the same transaction
        const invoiceNumber = generateInvoiceNumber();

        const invoice = await tx.invoice.create({
          data: {
            userId: userId ?? 0,
            bookingId: newBooking.id,
            invoiceNumber,
            totalAmount: effectivePrice,
            paymentMethod: "cash_on_service",
            paymentStatus: "pending",
          },
        });

        // Link invoice to booking
        await tx.booking.update({
          where: { id: newBooking.id },
          data: { invoiceId: invoice.id },
        });

        // Create InvoiceItem
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            bookingId: newBooking.id,
            serviceName: service.name,
            amount: effectivePrice,
          },
        });

        // Create Payment record with proper transaction ID
        const transactionId = generateTransactionId("cash_on_service", newBooking.id);

        await tx.payment.create({
          data: {
            userId: userId ?? 0,
            bookingId: newBooking.id,
            invoiceId: invoice.id,
            amount: effectivePrice,
            paymentMethod: "cash_on_service",
            transactionId,
            paymentStatus: "pending",
            paidAt: new Date(), // Will be updated when actually paid
          },
        });
      }

      return newBooking;
    });

    // ============ Send Confirmation Email (outside transaction) ============

    const customerEmail = guestEmail || userEmail;
    const customerName = guestName || userName || "Customer";

    if (customerEmail) {
      // Use the proper sendBookingConfirmation function for structured email
      const invoiceForEmail = await db.invoice.findFirst({
        where: { bookingId: booking.id },
        select: { invoiceNumber: true },
      });

      const formattedDate = new Date(`${bookingDate}T${bookingTime}`).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const formattedTime = new Date(`${bookingDate}T${bookingTime}`).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

      sendBookingConfirmation(customerEmail, customerName, {
        bookingId: booking.id,
        invoiceNumber: invoiceForEmail?.invoiceNumber || "N/A",
        serviceName: service.name,
        date: formattedDate,
        time: formattedTime,
        address: address.trim(),
        accessNotes: accessNotes?.trim() || undefined,
        totalPrice: effectivePrice,
        paymentStatus: paymentStatus,
        paymentMethod: isOnlinePayment ? "stripe" : "cash_on_service",
      }).catch((emailErr) => {
        console.error("[Bookings API] Failed to send booking confirmation email:", emailErr);
      });
    }

    // ============ Log Activity (outside transaction) ============

    logBookingActivity(
      "booking_created",
      userId
        ? {
            id: userId,
            name: customerName,
            email: customerEmail || "",
            userType: "customer",
          }
        : null,
      booking.id,
      `Booking #${booking.id}`,
      {
        serviceName: service.name,
        totalPrice: effectivePrice,
        paymentMethod: isOnlinePayment ? "stripe" : "cash_on_service",
        paymentStatus,
        bookingStatus,
        isGuest: !userId,
        guestName: guestName || null,
        guestEmail: guestEmail || null,
      }
    );

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
