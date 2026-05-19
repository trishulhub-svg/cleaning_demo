import { db } from "@/lib/db";
import { CURRENCY, APP_NAME } from "@/lib/constants";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  CheckCircle2,
  CalendarDays,
  Clock,
  MapPin,
  ArrowRight,
  CreditCard,
  Shield,
  Mail,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ============ Types ============

type PageProps = {
  searchParams: Promise<{
    session_id?: string;
    bookingId?: string;
  }>;
};

// ============ Page Component ============

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Determine which ID we have
  const sessionId = params.session_id;
  const fallbackBookingId = params.bookingId
    ? parseInt(params.bookingId, 10)
    : null;

  // If no identifiers, redirect
  if (!sessionId && !fallbackBookingId) {
    redirect("/dashboard");
  }

  // Try to verify with Stripe first, then fall back to DB
  let booking = null;
  let isVerified = false;

  if (sessionId) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-04-30.basil",
      });

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid" && session.metadata?.bookingId) {
        isVerified = true;
        booking = await db.booking.findUnique({
          where: { id: Number(session.metadata.bookingId) },
          include: {
            service: { select: { name: true, description: true } },
            user: { select: { name: true, email: true } },
          },
        });
      }
    } catch (error) {
      console.error("[Payment Success] Error verifying session:", error);
    }
  }

  // Fallback: use bookingId directly from URL
  if (!booking && fallbackBookingId) {
    booking = await db.booking.findUnique({
      where: { id: fallbackBookingId },
      include: {
        service: { select: { name: true, description: true } },
        user: { select: { name: true, email: true } },
      },
    });

    // If booking is paid, consider it verified
    if (booking?.paymentStatus === "paid") {
      isVerified = true;
    }
  }

  // If still no booking, redirect
  if (!booking) {
    redirect("/dashboard");
  }

  // Format booking data
  const bookingDate = format(
    new Date(`${booking.bookingDate}T${booking.bookingTime}`),
    "EEEE, d MMMM yyyy"
  );
  const bookingTime = format(
    new Date(`2000-01-01T${booking.bookingTime}`),
    "h:mm a"
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-green-50/50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-200">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Payment Successful! 🎉
          </h1>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Your payment has been processed and your cleaning service booking
            is confirmed.
          </p>
        </div>

        {/* Payment Verified Badge */}
        {isVerified && (
          <div className="flex justify-center mb-6">
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 px-4 py-1.5 text-sm"
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Payment Verified
            </Badge>
          </div>
        )}

        {/* Booking Details Card */}
        <Card className="mb-6 overflow-hidden border-green-100">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <ReceiptText className="h-5 w-5" />
                Booking Confirmation
              </h2>
              <span className="text-green-100 text-sm font-mono">
                GL-{String(booking.id).padStart(5, "0")}
              </span>
            </div>
          </div>
          <CardContent className="p-6 space-y-5">
            {/* Service */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <CalendarDays className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {booking.service.name}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {booking.service.description}
                </p>
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium">{bookingDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm font-medium">{bookingTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium">{booking.address}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Info */}
            <div className="flex items-center justify-between rounded-xl bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-green-700 font-medium uppercase tracking-wider">
                    Amount Paid
                  </p>
                  <p className="text-xs text-green-600">Online via Stripe</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {CURRENCY}
                {booking.totalPrice.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-500" />
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "Confirmation Email",
                  description:
                    "We'll send a confirmation email with all your booking details and payment receipt.",
                },
                {
                  step: 2,
                  title: "Staff Assignment",
                  description:
                    "Our team will assign a professional cleaner to your booking. You'll be notified once confirmed.",
                },
                {
                  step: 3,
                  title: "Day of Cleaning",
                  description:
                    "Our cleaner will arrive at your address on the scheduled date. Please ensure someone is available for access.",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="rounded-full bg-green-600 hover:bg-green-700">
            <Link href="/dashboard">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/services">Browse More Services</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
