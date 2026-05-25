"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  QrCode,
  CheckCircle2,
  Loader2,
  CalendarDays,
  MapPin,
  Clock,
  User,
  CreditCard,
  AlertTriangle,
  XCircle,
  Shield,
  Leaf,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CURRENCY, APP_NAME } from "@/lib/constants";

// ============ Types ============

interface BookingInfo {
  id: number;
  service: string;
  date: string;
  time: string;
  address: string;
  totalPrice: number;
  paymentStatus: string;
  customerName: string;
}

type ScanState =
  | "loading"
  | "success"
  | "needs_payment"
  | "error"
  | "not_found"
  | "already_completed"
  | "not_yours";

// ============ Component ============

export default function PublicScanQrPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [state, setState] = React.useState<ScanState>("loading");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [autoCompleted, setAutoCompleted] = React.useState(false);
  const [bookingId, setBookingId] = React.useState<number | null>(null);
  const [booking, setBooking] = React.useState<BookingInfo | null>(null);

  // ── Scan code function ──
  async function scanCode(qrCode: string) {
    setState("loading");

    try {
      const res = await fetch("/api/public/qr-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: qrCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Map error codes to states
        if (data.code === "ALREADY_COMPLETED") {
          setState("already_completed");
          return;
        }
        // If user is not logged in, redirect to login with callback
        if (data.needsLogin) {
          setState("error");
          setErrorMessage("You need to be logged in to verify a QR code. Redirecting to login...");
          setTimeout(() => {
            window.location.href = `/login?callbackUrl=/public/scan-qr%3Fcode%3D${encodeURIComponent(qrCode)}`;
          }, 1500);
          return;
        }
        setState("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (data.autoCompleted) {
        setState("success");
        setAutoCompleted(true);
        setBookingId(data.bookingId);
        toast.success("Service completed successfully!");
      } else if (data.requiresPayment) {
        setState("needs_payment");
        setBooking(data.booking);
        setBookingId(data.booking.id);
      }
    } catch {
      setState("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  }

  // ── Auto-scan on mount ──
  React.useEffect(() => {
    if (!code) {
      setState("error");
      setErrorMessage("No QR code provided. Please scan a valid QR code.");
      return;
    }
    scanCode(code);
  }, [code]);

  // ── Render: Loading ──
  if (state === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 animate-pulse">
            <QrCode className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Verifying QR Code...</h2>
            <p className="text-sm text-gray-500 mt-1">Please wait while we validate your code.</p>
          </div>
          <Loader2 className="h-6 w-6 text-green-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ── Render: Success (Auto-completed) ──
  if (state === "success") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-xl border-green-200 bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            {/* Success Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Completed!</h1>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                {autoCompleted
                  ? "Your cleaning service has been marked as completed. A confirmation email has been sent to you."
                  : "Your cleaning service is now complete. Thank you for choosing GreenLeaf!"}
              </p>
            </div>

            {bookingId && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="text-sm font-medium text-green-800">
                  Booking #{bookingId}
                </p>
              </div>
            )}

            <Separator />

            {/* Actions */}
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

  // ── Render: Needs Payment ──
  if (state === "needs_payment" && booking) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-xl border-amber-200 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-2">
              <CreditCard className="h-7 w-7 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Payment Required</CardTitle>
            <CardDescription>
              Your booking needs payment to complete the service.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Booking Summary */}
            <div className="rounded-xl bg-gray-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Leaf className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="text-sm font-semibold text-gray-900">{booking.service}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-medium text-gray-900">{booking.date}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-sm font-medium text-gray-900">{booking.time}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium text-gray-900">{booking.address}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-bold text-green-700">
                  {CURRENCY}{booking.totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-3 pt-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-sm font-semibold"
                onClick={() => {
                  router.push(
                    `/public/complete-booking?bookingId=${booking.id}`
                  );
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Choose Payment Method
              </Button>
            </div>

            <p className="text-xs text-center text-gray-400">
              Your service has been verified via QR code.
            </p>
          </CardContent>

          <CardFooter className="flex justify-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Render: Already Completed ──
  if (state === "already_completed") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-xl bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle2 className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Already Completed</h1>
              <p className="text-sm text-gray-500 mt-2">
                This service has already been completed. No further action is needed.
              </p>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Error ──
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-xl bg-white/95 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {state === "not_yours" ? "Access Denied" : "QR Code Error"}
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {errorMessage ||
                "We couldn't process your QR code. Please make sure you scanned the correct code."}
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Troubleshooting</p>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-700">
                  <li>Make sure you scanned the correct QR code</li>
                  <li>Check that your booking has not been cancelled</li>
                  <li>Try scanning the code again</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => code && scanCode(code)}
              className="w-full"
            >
              Try Again
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
