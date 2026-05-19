'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cancelBooking } from './actions'

// ============ Types ============

export type BookingForCancel = {
  id: number
  service: { name: string }
  bookingDate: string
  bookingTime: string
  totalPrice: number
  bookingStatus: string
  paymentStatus: string
  address: string
}

type CancelBookingModalProps = {
  booking: BookingForCancel | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled?: () => void
}

// ============ Helper ============

function calculateRefund(booking: BookingForCancel) {
  const now = new Date()
  const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`)
  const diffMs = bookingDateTime.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours > 24) {
    const refundPercent = 90
    const refundAmount = (booking.totalPrice * refundPercent) / 100
    return {
      eligible: true,
      refundPercent,
      refundAmount,
      message: `You are eligible for a ${refundPercent}% refund.`,
    }
  }

  if (diffHours > 0) {
    return {
      eligible: false,
      refundPercent: 0,
      refundAmount: 0,
      message: 'Cancellations within 24 hours are not eligible for a refund.',
    }
  }

  return {
    eligible: false,
    refundPercent: 0,
    refundAmount: 0,
    message: 'This booking has already passed and cannot be cancelled.',
  }
}

function formatBookingDate(date: string, time: string) {
  return new Date(`${date}T${time}`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============ Component ============

export function CancelBookingModal({
  booking,
  open,
  onOpenChange,
  onCancelled,
}: CancelBookingModalProps) {
  const [reason, setReason] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) setReason('')
  }, [open])

  if (!booking) return null

  const refund = calculateRefund(booking)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error('Please provide a reason for cancellation.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await cancelBooking({
        bookingId: booking.id,
        reason: reason.trim(),
      })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        onCancelled?.()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Booking Details */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Service</span>
                <p className="font-medium">{booking.service.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date & Time</span>
                <p className="font-medium">
                  {formatBookingDate(booking.bookingDate, booking.bookingTime)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Price</span>
                <p className="font-medium">£{booking.totalPrice.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment</span>
                <p className="font-medium capitalize">
                  {booking.paymentStatus.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Refund Info */}
          <div
            className={`rounded-lg border p-4 ${
              refund.eligible
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  refund.eligible ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {refund.eligible ? 'Refund Information' : 'No Refund Available'}
                </p>
                <p className="text-sm text-muted-foreground">{refund.message}</p>
                {refund.eligible && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-lg font-bold text-green-700 dark:text-green-400">
                      £{refund.refundAmount.toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {refund.refundPercent}% refund
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">
              Reason for cancellation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please let us know why you're cancelling this booking..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Keep Booking
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
