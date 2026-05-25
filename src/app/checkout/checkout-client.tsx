"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CURRENCY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Banknote,
  Loader2,
  CheckCircle2,
  Shield,
} from "lucide-react";

// ============ Types ============

interface CheckoutClientProps {
  bookingId: number;
  totalPrice: number;
  isStripeConfigured: boolean;
  fromQrScan?: boolean;
}

// ============ Component ============

export function CheckoutClient({
  bookingId,
  totalPrice,
  isStripeConfigured,
  fromQrScan = false,
}: CheckoutClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cashConfirmed, setCashConfirmed] = React.useState(false);

  const handlePayOnline = async () => {
    if (!isStripeConfigured) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount: Math.round(totalPrice * 100), // Stripe expects cents
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setIsProcessing(false);
    }
  };

  const handlePayAfterService = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings/pay-after-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update payment method");
      }

      setCashConfirmed(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push(
          `/booking-confirmation?bookingId=${bookingId}`
        );
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setIsProcessing(false);
    }
  };

  // When coming from QR scan, only show online payment option (cash is handled separately)
  if (fromQrScan) {
    return (
      <div className="space-y-3">
        {isStripeConfigured ? (
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePayOnline}
            className="w-full rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-green-300 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shrink-0 group-hover:from-green-200 group-hover:to-emerald-200 transition-colors">
                <CreditCard className="h-6 w-6 text-green-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">
                    Pay with Card Online
                  </p>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    Secure
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Pay {CURRENCY}{totalPrice.toFixed(2)} securely via Stripe. Instant confirmation.
                </p>
              </div>
              {isProcessing ? (
                <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
              ) : (
                <svg
                  className="h-5 w-5 text-gray-300 group-hover:text-green-500 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>
          </button>
        ) : null}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!isStripeConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700">
                Online card payment is temporarily unavailable. Please choose to pay cash to the cleaner instead.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cashConfirmed ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
          <h3 className="font-semibold text-emerald-800">
            Payment Method Updated
          </h3>
          <p className="text-sm text-emerald-600 mt-1">
            You&apos;ll pay after the service is completed. Redirecting to
            your booking...
          </p>
        </div>
      ) : (
        <>
          {/* Pay Online — Card */}
          {isStripeConfigured && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePayOnline}
              className="w-full rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-green-300 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shrink-0 group-hover:from-green-200 group-hover:to-emerald-200 transition-colors">
                  <CreditCard className="h-6 w-6 text-green-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      Pay with Card
                    </p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      5% OFF
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Pay securely via Stripe. Instant confirmation.
                  </p>
                </div>
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                ) : (
                  <svg
                    className="h-5 w-5 text-gray-300 group-hover:text-green-500 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          )}

          {/* Pay After Service */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePayAfterService}
            className="w-full rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-300 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                <Banknote className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  Pay After Service
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Pay in cash or card directly to the cleaner after completion.
                </p>
              </div>
              {isProcessing ? (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              ) : (
                <svg
                  className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>
          </button>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Stripe not configured notice */}
          {!isStripeConfigured && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700">
                  Online card payment is temporarily unavailable. Please choose
                  &quot;Pay After Service&quot; to complete your booking.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
