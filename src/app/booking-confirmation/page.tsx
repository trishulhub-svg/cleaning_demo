import { CURRENCY, APP_NAME } from '@/lib/constants'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { getAuthSession } from '@/lib/auth-helpers'
import {
  CheckCircle2,
  CalendarDays,
  Clock,
  MapPin,
  CreditCard,
  ArrowRight,
  Mail,
  Shield,
  Star,
  UserCheck,
  AlertCircle,
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
import { PayCashButton } from './pay-cash-button'

// ============ Types ============

type BookingWithService = {
  id: number
  userId: number | null
  guestName: string | null
  guestEmail: string | null
  service: { name: string; description: string }
  bookingDate: string
  bookingTime: string
  address: string
  accessNotes: string | null
  totalPrice: number
  bookingStatus: string
  paymentStatus: string
  paymentMethod: string | null
  invoiceId: number | null
}

// ============ Props ============

type Props = {
  searchParams: Promise<{ bookingId?: string }>
}

// ============ Page Component ============

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const params = await searchParams

  if (!params.bookingId) {
    redirect('/')
  }

  const bookingId = parseInt(params.bookingId, 10)
  if (isNaN(bookingId)) {
    redirect('/')
  }

  // Check auth (non-blocking — guest bookings are supported)
  const session = await getAuthSession()
  const isLoggedIn = !!session?.user

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: {
        select: { name: true, description: true },
      },
    },
  })

  if (!booking) {
    redirect('/')
  }

  // If the booking has a userId, verify ownership (for logged-in bookings)
  // IDOR fix: If the booking belongs to a registered user, the viewer MUST be
  // logged in AND must be the owner (or admin/staff).
  if (booking.userId) {
    if (!isLoggedIn || !session?.user) {
      // Booking belongs to a registered user but viewer is not logged in — redirect to login
      redirect(`/login?callbackUrl=/booking-confirmation%3FbookingId%3D${bookingId}`)
    }
    if (
      session.user.userType === 'customer' &&
      booking.userId !== session.user.id
    ) {
      // Logged-in customer trying to view someone else's booking
      redirect('/')
    }
  }
  // If booking.userId is null (guest booking), allow viewing without auth

  const typedBooking = booking as unknown as BookingWithService
  const bookingDate = format(new Date(`${booking.bookingDate}T${booking.bookingTime}`), 'EEEE, d MMMM yyyy')
  const bookingTime = format(new Date(`2000-01-01T${booking.bookingTime}`), 'h:mm a')

  // Status configs
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending Confirmation', className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' },
    confirmed: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
    completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
    cash_pending: { label: 'Cash Pending', className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' },
  }

  const paymentConfig: Record<string, { label: string; className: string; icon: string }> = {
    paid: { label: 'Paid Online', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800', icon: '✓' },
    pending: { label: 'Payment Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800', icon: '⏳' },
    cash_on_service: { label: 'Cash on Service', className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800', icon: '💰' },
  }

  const status = statusConfig[booking.bookingStatus] || statusConfig.pending
  const payment = paymentConfig[booking.paymentStatus] || paymentConfig.pending
  const isPendingPayment = booking.paymentStatus === 'pending'
  const isCashOnService = booking.paymentStatus === 'cash_on_service'
  const isPaid = booking.paymentStatus === 'paid'

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {isPaid ? 'Payment Confirmed!' : isCashOnService ? 'Booking Confirmed!' : 'Booking Received!'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isPaid
              ? 'Your payment has been processed and your cleaning service is confirmed.'
              : isCashOnService
                ? 'Your cleaning service has been booked. Please have payment ready on the day.'
                : 'Your booking has been received. Please complete payment to confirm your service.'}
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

              {/* Customer info for guest bookings */}
              {!isLoggedIn && typedBooking.guestName && (
                <div className="flex items-center gap-3 sm:col-span-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium">{typedBooking.guestName}</p>
                    {typedBooking.guestEmail && (
                      <p className="text-xs text-muted-foreground">{typedBooking.guestEmail}</p>
                    )}
                  </div>
                </div>
              )}
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
              <div className="flex items-center gap-2 flex-wrap">
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

            {/* Payment Action Cards */}

            {/* Paid — Success message */}
            {isPaid && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Payment Successful</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Your payment of <strong>{CURRENCY}{booking.totalPrice.toFixed(2)}</strong> has been received. Your booking is confirmed and a cleaner will be assigned shortly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cash on Service */}
            {isCashOnService && (
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

            {/* Pending Payment — show action links */}
            {isPendingPayment && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Payment Pending</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Your booking is saved but payment is still pending. Complete your payment to confirm the booking.
                    </p>
                    <div className="flex gap-2 mt-3">
                      {isLoggedIn ? (
                        <Button size="sm" className="bg-primary" asChild>
                          <Link href={`/checkout?bookingId=${booking.id}`}>
                            <CreditCard className="h-4 w-4 mr-1" />
                            Proceed to Payment
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" className="bg-primary" asChild>
                          <Link href={`/login?callbackUrl=/checkout%3FbookingId%3D${booking.id}`}>
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Login to Pay
                          </Link>
                        </Button>
                      )}
                      <PayCashButton bookingId={booking.id} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What Happens Next — 4 Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">What Happens Next?</CardTitle>
            <CardDescription>Here&apos;s what to expect after your booking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {[
                {
                  step: 1,
                  icon: Mail,
                  title: 'Confirmation Email',
                  description: `We'll send a confirmation email with all your booking details. Please check your inbox (and spam folder!) within a few minutes.`,
                },
                {
                  step: 2,
                  icon: Shield,
                  title: 'Staff Assignment',
                  description: 'Our team will assign a professional cleaner to your booking. You\'ll be notified via email once the assignment is confirmed.',
                },
                {
                  step: 3,
                  icon: UserCheck,
                  title: 'Day of Cleaning',
                  description: 'Our cleaning team will arrive at your address on the scheduled date. Please ensure someone is available to provide access.',
                },
                {
                  step: 4,
                  icon: Star,
                  title: 'Leave a Review',
                  description: 'After the service is complete, we\'d love to hear your feedback! Your review helps us improve and assists other customers.',
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

        {/* Spam Folder Warning */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Check Your Spam Folder</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                If you don&apos;t receive a confirmation email within 5 minutes, please check your spam or junk folder.
                You can also add <strong>hello@greenleafcleaning.co.uk</strong> to your contacts to ensure future emails arrive in your inbox.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isLoggedIn ? (
            <Button asChild size="lg" className="rounded-full">
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="rounded-full">
              <Link href="/">
                Back to Home
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/services">
              Browse More Services
            </Link>
          </Button>
        </div>

        {/* Guest CTA: Create Account */}
        {!isLoggedIn && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to manage your bookings, track payments, and earn loyalty rewards?
            </p>
            <Button variant="outline" asChild>
              <Link href="/register">
                Create a Free Account
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
