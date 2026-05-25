"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  MapPin,
  PoundSterling,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react"

// Re-import the server-side type for use on client
import type { EligibleBooking } from "./page"

interface RefundClientPageProps {
  bookings: EligibleBooking[]
  currency: string
}

export function RefundClientPage({ bookings, currency }: RefundClientPageProps) {
  const router = useRouter()
  const [selectedBooking, setSelectedBooking] = useState<EligibleBooking | null>(null)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openRefundDialog(booking: EligibleBooking) {
    setSelectedBooking(booking)
    setAmount(booking.totalPrice.toString())
    setReason("")
    setError(null)
  }

  function closeRefundDialog() {
    setSelectedBooking(null)
    setAmount("")
    setReason("")
    setError(null)
  }

  async function handleSubmit() {
    if (!selectedBooking) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid refund amount.")
      return
    }

    if (amountNum > selectedBooking.totalPrice) {
      setError(`Amount cannot exceed the total price of ${currency}${selectedBooking.totalPrice.toFixed(2)}.`)
      return
    }

    if (reason.trim().length < 10) {
      setError("Please provide a reason with at least 10 characters.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/refunds/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          invoiceId: selectedBooking.invoice?.id || 0,
          amount: amountNum,
          reason: reason.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to submit refund request. Please try again.")
        return
      }

      closeRefundDialog()
      router.push("/dashboard?tab=refunds")
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  function formatTime(timeStr: string): string {
    // Convert HH:MM:SS to HH:MM AM/PM
    const [hours, minutes] = timeStr.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Request a Refund</h1>
          <p className="mt-2 text-muted-foreground">
            You can request a refund for cancelled bookings that were paid online.
            Refund requests are reviewed within 1–2 business days.
          </p>
        </div>

        {/* Info banner */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Eligibility Criteria</p>
              <ul className="mt-1.5 space-y-1 list-disc list-inside">
                <li>Booking must have been cancelled at least 24 hours before the scheduled date</li>
                <li>Payment must have been made online (card payment)</li>
                <li>No previous approved refund for this booking</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Bookings list */}
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <RefreshCcw className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Eligible Bookings</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                You don&apos;t have any cancelled bookings that are eligible for a refund.
                Bookings must be cancelled at least 24 hours before the scheduled date
                and paid online to qualify.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link href="/dashboard">View My Bookings</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {bookings.length} eligible {bookings.length === 1 ? "booking" : "bookings"} found
            </p>

            {bookings.map((booking) => (
              <Card key={booking.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Booking info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {booking.service.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          #{booking.id}
                        </Badge>
                        {booking.refundStatus === "rejected" && (
                          <Badge variant="destructive" className="text-xs">
                            Previously Rejected
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(booking.bookingDate)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(booking.bookingTime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {booking.address.length > 30
                            ? `${booking.address.substring(0, 30)}...`
                            : booking.address}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <PoundSterling className="h-3.5 w-3.5" />
                          {currency}{booking.totalPrice.toFixed(2)}
                        </span>
                        {booking.invoice && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            {booking.invoice.invoiceNumber}
                          </span>
                        )}
                      </div>

                      {booking.cancellationReason && (
                        <p className="text-xs text-muted-foreground">
                          Cancelled: {booking.cancellationReason}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    <Button
                      onClick={() => openRefundDialog(booking)}
                      className="shrink-0"
                    >
                      Request Refund
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Refund request dialog */}
      <Dialog
        open={!!selectedBooking}
        onOpenChange={(open) => {
          if (!open) closeRefundDialog()
        }}
      >
        {selectedBooking && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Refund</DialogTitle>
              <DialogDescription>
                Submit a refund request for your {selectedBooking.service.name} booking (#{selectedBooking.id}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Booking summary */}
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{selectedBooking.service.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formatDate(selectedBooking.bookingDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid Amount</span>
                  <span className="font-medium">{currency}{selectedBooking.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Amount field */}
              <div className="space-y-2">
                <Label htmlFor="refund-amount">Refund Amount ({currency})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {currency}
                  </span>
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedBooking.totalPrice}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum refundable: {currency}{selectedBooking.totalPrice.toFixed(2)}
                </p>
              </div>

              {/* Reason field */}
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason for Refund</Label>
                <Textarea
                  id="refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please explain why you're requesting a refund (minimum 10 characters)..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {reason.trim().length < 10
                    ? `${10 - reason.trim().length} more character${10 - reason.trim().length !== 1 ? "s" : ""} needed`
                    : "Minimum requirement met"}
                </p>
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={closeRefundDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || reason.trim().length < 10 || !amount || parseFloat(amount) <= 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </main>
  )
}
