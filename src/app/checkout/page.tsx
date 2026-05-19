import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CURRENCY } from "@/lib/constants";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { CheckoutClient } from "./checkout-client";

// ============ Types ============

type PageProps = {
  searchParams: Promise<{ bookingId?: string; cancelled?: string }>;
};

// ============ Page Component ============

export default async function CheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Auth check — must be logged in for online payment
  const user = await requireAuth();

  // Check if cancelled
  if (params.cancelled === "1") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-8 w-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Cancelled
          </h1>
          <p className="text-gray-500">
            Your payment was not processed. You can try again or choose to pay
            after the service.
          </p>
          {params.bookingId && (
            <a
              href={`/checkout?bookingId=${params.bookingId}`}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              Try Again
            </a>
          )}
          <a
            href="/dashboard"
            className="block text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Get booking
  if (!params.bookingId) {
    redirect("/dashboard");
  }

  const bookingId = parseInt(params.bookingId, 10);
  if (isNaN(bookingId)) {
    redirect("/dashboard");
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: {
        select: {
          name: true,
          description: true,
          durationHours: true,
        },
      },
    },
  });

  if (!booking) {
    redirect("/dashboard");
  }

  // Verify ownership
  if (user.userType === "customer" && booking.userId !== user.id) {
    redirect("/dashboard");
  }

  // Already paid
  if (booking.paymentStatus === "paid") {
    redirect(`/payment-success?bookingId=${booking.id}`);
  }

  // Format data
  const bookingDate = format(
    new Date(`${booking.bookingDate}T${booking.bookingTime}`),
    "EEEE, d MMMM yyyy"
  );
  const bookingTime = format(
    new Date(`2000-01-01T${booking.bookingTime}`),
    "h:mm a"
  );

  const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-7 w-7 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Complete Your Payment
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review your booking and choose a payment method
          </p>
        </div>

        {/* Booking Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              Booking Summary
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Service */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <svg
                  className="h-5 w-5 text-green-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {booking.service.name}
                </p>
                <p className="text-sm text-gray-500">
                  {booking.service.description}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                  Date
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {bookingDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                  Time
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {bookingTime}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                  Address
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {booking.address}
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-xs text-gray-400">
                  Including 5% online discount
                </p>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {CURRENCY}
                {booking.totalPrice.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <CheckoutClient
          bookingId={booking.id}
          totalPrice={booking.totalPrice}
          isStripeConfigured={isStripeConfigured}
        />

        {/* Trust Badges */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            {
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              label: "SSL Secured",
            },
            {
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              label: "Buyer Protection",
            },
            {
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              ),
              label: "Stripe Payment",
            },
          ].map((badge) => (
            <div
              key={badge.label}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <div className="text-green-600">{badge.icon}</div>
              <span className="text-xs text-gray-500 font-medium">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
