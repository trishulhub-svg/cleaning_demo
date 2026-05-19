'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, CalendarDays, Clock, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { rescheduleBooking } from './actions'

// ============ Types ============

export type BookingForReschedule = {
  id: number
  service: { name: string }
  bookingDate: string
  bookingTime: string
  totalPrice: number
  bookingStatus: string
}

type RescheduleModalProps = {
  booking: BookingForReschedule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRescheduled?: () => void
}

// ============ Constants ============

const TIME_SLOTS = [
  '08:00:00',
  '08:30:00',
  '09:00:00',
  '09:30:00',
  '10:00:00',
  '10:30:00',
  '11:00:00',
  '11:30:00',
  '12:00:00',
  '12:30:00',
  '13:00:00',
  '13:30:00',
  '14:00:00',
  '14:30:00',
  '15:00:00',
  '15:30:00',
  '16:00:00',
  '16:30:00',
  '17:00:00',
  '17:30:00',
  '18:00:00',
]

// ============ Component ============

export function RescheduleModal({
  booking,
  open,
  onOpenChange,
  onRescheduled,
}: RescheduleModalProps) {
  const [newDate, setNewDate] = React.useState<Date | undefined>(undefined)
  const [newTime, setNewTime] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [calendarOpen, setCalendarOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setNewDate(undefined)
      setNewTime('')
      setCalendarOpen(false)
    }
  }, [open])

  if (!booking) return null

  const currentDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`)
  const formattedCurrentDate = format(currentDateTime, 'EEEE, d MMMM yyyy')
  const formattedCurrentTime = format(currentDateTime, 'h:mm a')

  // Can't book in the past or today
  const minDate = new Date()
  minDate.setHours(0, 0, 0, 0)
  minDate.setDate(minDate.getDate() + 1) // At least tomorrow

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!newDate) {
      toast.error('Please select a new date.')
      return
    }
    if (!newTime) {
      toast.error('Please select a new time.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await rescheduleBooking({
        bookingId: booking.id,
        newDate: format(newDate, 'yyyy-MM-dd'),
        newTime,
      })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        onRescheduled?.()
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
            <CalendarDays className="h-5 w-5 text-primary" />
            Reschedule Booking
          </DialogTitle>
          <DialogDescription>
            Choose a new date and time for your cleaning service.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Booking Info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Service</span>
              <p className="font-medium">{booking.service.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Current Date</span>
                <p className="font-medium">{formattedCurrentDate}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Current Time</span>
                <p className="font-medium">{formattedCurrentTime}</p>
              </div>
            </div>
          </div>

          {/* Free rescheduling notice */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Free rescheduling is available when changes are made more than 24 hours before
                your booking. Select a new date and time below.
              </p>
            </div>
          </div>

          {/* New Date Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              New Date <span className="text-destructive">*</span>
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {newDate ? format(newDate, 'EEEE, d MMMM yyyy') : 'Select a date...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={(date) => {
                    setNewDate(date)
                    setCalendarOpen(false)
                  }}
                  disabled={{ before: minDate }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* New Time Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              New Time <span className="text-destructive">*</span>
            </Label>
            <Select value={newTime} onValueChange={setNewTime}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a time..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TIME_SLOTS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {newDate && newTime && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">New Schedule</p>
              <p className="text-sm font-semibold text-primary">
                {format(newDate, 'EEEE, d MMMM yyyy')} at{' '}
                {format(new Date(`2000-01-01T${newTime}`), 'h:mm a')}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !newDate || !newTime}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
