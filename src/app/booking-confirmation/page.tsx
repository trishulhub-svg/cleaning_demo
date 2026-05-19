import { requireAuth, getCurrentUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { CURRENCY, APP_NAME } from '@/lib/constants'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  CheckCircle2,
  CalendarDays,
  Clock,
  MapPin,
  CreditCard,
  ArrowRight,
  Home,
  FileText,
  Phone,
  Mail,
  Shield,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ============ Props ============

type Props = {
  searchParams: Promise<{ bookingId?: string }>
}

// ============ Page Component ============

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const params = await searchParams
  const authUser = await requireAuth(['customer'])

  if (!params.bookingId) {
    redirect('/dashboard')
  }

  const bookingId = parseInt(params.bookingId, 10)
  if (isNaN(bookingId)) {
    redirect('/dashboard')
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: {
        select: { name: true, description: true },
      },
    },
  })

  if (!booking || booking.userId !== authUser.id) {
    redirect('/dashboard')
  }

  const bookingDate = format(new Date(`${booking.bookingDate}T${booking.bookingTime}`), 'EEEE, d MMMM yyyy')
  const bookingTime = format(new Date(`2000-01-01T${booking.bookingTime}`), 'h:mm a')

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending Confirmation', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    confirmed: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200' },
    cash_pending: { label: 'Cash Pending', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  }

  const paymentConfig: Record<string, { label: string; className: string }> = {
    paid: { label: 'Paid Online', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    pending: { label: 'Payment Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    cash_on_service: { label: 'Cash on Service', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  }

  const status = statusConfig[booking.bookingStatus] || statusConfig.pending
  const payment = paymentConfig[booking.paymentStatus] || paymentConfig.pending

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Booking Confirmed!</h1>
          <p className="text-muted-foreground mt-2">
            Your cleaning service has been booked successfully. We&apos;ll send a confirmation email shortly.
          </p>
        </div>

        {/* Booking Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Booking Details</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Booking ID:</span>
                <span className="font-mono text-sm font-medium">GL-{String(booking.id).padStart(5, '0')}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service */}
            <div className="flex items-start gap-4 rounded-lg bg-muted/30 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{booking.service.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{booking.service.description}</p>
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{bookingDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium">{bookingTime}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">{booking.address}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Price & Status */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Price</p>
                <p className="text-2xl font-bold text-primary">
                  {CURRENCY}{booking.totalPrice.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={status.className}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <Badge variant="outline" className={payment.className}>
                  <CreditCard className="h-3 w-3 mr-1" />
                  {payment.label}
                </Badge>
              </div>
            </div>

            {/* Cash on service notice */}
            {booking.paymentStatus === 'cash_on_service' && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30 p-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Cash Payment</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Please have <strong>{CURRENCY}{booking.totalPrice.toFixed(2)}</strong> in cash ready
                      for our cleaning team when they arrive. You can also pay via bank transfer on the day.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pending payment notice */}
            {booking.paymentStatus === 'pending' && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Payment Pending</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Your booking is confirmed but payment is still pending. You can pay online or choose
                      cash on service.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="bg-primary">
                        Pay Online
                      </Button>
                      <Button size="sm" variant="outline">
                        Pay Cash on Service
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  icon: Mail,
                  title: 'Confirmation Email',
                  description: `We'll send a confirmation email to your registered email with all booking details.`,
                },
                {
                  step: 2,
                  icon: Shield,
                  title: 'Staff Assignment',
                  description: 'Our team will assign a professional cleaner to your booking. You\'ll be notified once confirmed.',
                },
                {
                  step: 3,
                  icon: Star,
                  title: 'Day of Cleaning',
                  description: 'Our team will arrive at your address on the scheduled date. Make sure someone is available to provide access.',
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <item.icon className="h-3.5 w-3.5" />
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/dashboard">
              Go to Dashboard
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/services">
              Browse More Services
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
