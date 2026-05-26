"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  CreditCard,
  Loader2,
  Banknote,
  Shield,
  CheckCircle2,
  ArrowLeft,
  Leaf,
  Percent,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CURRENCY, APP_NAME } from "@/lib/constants";

// ============ Types ============

interface BookingInfo {
  id: number;
  service: string;
  date: string;
  time: string;
  address: string;
  totalPrice: number;
  customerName: string;
}

// ============ Component ============

export default function PublicCompleteBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read booking data from URL params (passed from scan-qr page)
  const bookingIdParam = searchParams.get("bookingId");
  const serviceParam = searchParams.get("service");
  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");
  const addressParam = searchParams.get("address");
  const totalPriceParam = searchParams.get("totalPrice");
  const customerNameParam = searchParams.get("customerName");

  // Parse booking data from URL params
  const [booking, setBooking] = React.useState<BookingInfo | null>(() => {
    if (bookingIdParam && totalPriceParam) {
      return {
        id: parseInt(bookingIdParam, 10),
        service: serviceParam || "Cleaning Service",
        date: dateParam || "",
        time: timeParam || "",
        address: addressParam || "",
        totalPrice: parseFloat(totalPriceParam) || 0,
        customerName: customerNameParam || "Customer",
      };
    }
    return null;
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [completed, setCompleted] = React.useState(false);

  // ── Handle payment selection ──
  async function handlePaymentSelection(paymentMethod: "cash" | "stripe") {
    if (!bookingIdParam) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/public/complete-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: parseInt(bookingIdParam, 10),
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (paymentMethod === "cash") {
        setCompleted(true);
        toast.success("Cash payment selected. Please pay your cleaner on site!");
      } else if (paymentMethod === "stripe" && data.redirect) {
        // Redirect to checkout with booking data
        const params = new URLSearchParams();
        params.set("bookingId", bookingIdParam);
        router.push(`${data.redirect}?${params.toString()}`);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: No booking data ──
  if (!booking) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <CreditCard className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">No Booking Found</h1>
            <p className="text-sm text-gray-500">
              Please scan the QR code again to access your booking.
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Completed (Cash selected) ──
  if (completed) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-xl border-green-200 bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cash Payment Selected</h1>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Please have the exact amount ready for your cleaner.
                Your booking will be confirmed as complete once payment is collected.
              </p>
            </div>

            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-medium">Booking ID</span>
                <span className="text-green-800 font-bold">#{booking.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-medium">Amount Due</span>
                <span className="text-green-800 font-bold">{CURRENCY}{booking.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Payment Selection ──
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CreditCard className="h-7 w-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose how you would like to pay for your service.
          </p>
        </div>

        {/* Booking ID Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="text-sm px-4 py-1">
            Booking #{booking.id}
          </Badge>
        </div>

        {/* Booking Summary */}
        {booking.service && (
          <div className="rounded-xl bg-gray-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Leaf className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Service</p>
                <p className="text-sm font-semibold text-gray-900">{booking.service}</p>
              </div>
            </div>
            {(booking.date || booking.time) && (
              <div className="grid grid-cols-2 gap-3">
                {booking.date && (
                  <div className="flex items-start gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-medium text-gray-900">{booking.date}</p>
                    </div>
                  </div>
                )}
                {booking.time && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="text-sm font-medium text-gray-900">{booking.time}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {booking.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium text-gray-900">{booking.address}</p>
                </div>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-lg font-bold text-green-700">
                {CURRENCY}{booking.totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Payment Options */}
        <div className="space-y-4">
          {/* Pay Online - Stripe */}
          <Card className="cursor-pointer border-2 border-transparent hover:border-green-300 transition-all bg-white shadow-md hover:shadow-lg group">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors shrink-0">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    Pay Online
                    <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0">
                      5% OFF
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Secure payment via Stripe with instant confirmation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg bg-green-50 p-3 flex items-center gap-2 text-sm text-green-700">
                <Percent className="h-4 w-4 shrink-0" />
                <span className="font-medium">Save 5% when you pay online!</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handlePaymentSelection("stripe")}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Pay Online Securely
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Pay Cash */}
          <Card className="cursor-pointer border-2 border-transparent hover:border-amber-300 transition-all bg-white shadow-md hover:shadow-lg group">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 group-hover:bg-amber-200 transition-colors shrink-0">
                  <Banknote className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Pay Cash on Site</CardTitle>
                  <CardDescription className="text-xs">
                    Pay your cleaner directly when service is complete
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => handlePaymentSelection("cash")}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Banknote className="h-4 w-4 mr-2" />
                    Pay Cash on Service
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Error display */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Trust section */}
        <div className="text-center space-y-2 pt-2">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
            <Shield className="h-3 w-3" />
            <span>SSL Secured</span>
            <span className="mx-1">|</span>
            <Leaf className="h-3 w-3" />
            <span>{APP_NAME}</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
