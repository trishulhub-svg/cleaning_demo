'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  QrCode,
  Search,
  CheckCircle2,
  Loader2,
  CalendarDays,
  MapPin,
  Clock,
  User,
  ArrowLeft,
  CreditCard,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CURRENCY } from '@/lib/constants'

// ============ Types ============

type BookingInfo = {
  id: number
  service: string
  date: string
  time: string
  address: string
  price: number
  status: string
  paymentStatus: string
  customerName: string
}

// ============ Component ============

export default function ScanQrPage() {
  const router = useRouter()
  const [bookingCode, setBookingCode] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [bookingInfo, setBookingInfo] = React.useState<BookingInfo | null>(null)
  const [isCompleting, setIsCompleting] = React.useState(false)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()

    if (!bookingCode.trim()) {
      toast.error('Please enter a booking code.')
      return
    }

    setIsLoading(true)
    setBookingInfo(null)

    try {
      const res = await fetch(`/api/booking/lookup?code=${encodeURIComponent(bookingCode.trim())}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || 'Booking not found.')
        return
      }

      const data = await res.json()
      setBookingInfo(data.booking)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleComplete() {
    if (!bookingInfo) return

    setIsCompleting(true)
    try {
      const res = await fetch('/api/booking/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingInfo.id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || 'Failed to complete booking.')
        return
      }

      toast.success('Booking marked as completed successfully!')
      setBookingInfo((prev) => prev ? { ...prev, status: 'completed' } : null)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <QrCode className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">QR Code Scanner</h1>
          <p className="text-muted-foreground mt-2">
            Look up a booking by code and confirm service completion.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Look Up Booking</CardTitle>
            <CardDescription>
              Enter the booking code or QR completion code to find a booking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value)}
                  placeholder="Enter booking code (e.g., GL-00001) or QR code..."
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading || !bookingCode.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Booking Result */}
        {bookingInfo && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Booking Found</CardTitle>
                <Badge
                  variant="outline"
                  className={
                    bookingInfo.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : bookingInfo.status === 'cancelled'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }
                >
                  {bookingInfo.status === 'completed'
                    ? 'Completed'
                    : bookingInfo.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Active'}
                </Badge>
              </div>
              <CardDescription>Booking GL-{String(bookingInfo.id).padStart(5, '0')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Service</p>
                      <p className="font-medium">{bookingInfo.service}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Date & Time</p>
                      <p className="font-medium">{bookingInfo.date} at {bookingInfo.time}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-medium">{bookingInfo.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Customer</p>
                      <p className="font-medium">{bookingInfo.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-medium">{CURRENCY}{bookingInfo.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {bookingInfo.status !== 'completed' && bookingInfo.status !== 'cancelled' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleComplete}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={isCompleting}
                  >
                    {isCompleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark as Completed
                  </Button>
                </div>
              )}

              {bookingInfo.status === 'completed' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    This booking has already been completed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
