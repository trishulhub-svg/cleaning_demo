import { requireAuth, getCurrentUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { CURRENCY } from '@/lib/constants'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

// ============ Types ============

type BookingWithService = {
  id: number
  serviceId: number
  service: { id: number; name: string; description: string }
  bookingDate: string
  bookingTime: string
  address: string
  accessNotes: string | null
  totalPrice: number
  paymentStatus: string
  paymentMethod: string | null
  bookingStatus: string
  assignedStaffId: number | null
  qrCompletionCode: string | null
  createdAt: Date
  updatedAt: Date | null
}

type RefundWithBooking = {
  id: number
  bookingId: number
  amount: number
  refundType: string
  status: string
  reason: string | null
  requestedAt: Date
  processedAt: Date | null
  booking: {
    id: number
    service: { name: string }
    bookingDate: string
  }
}

type UserProfile = {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  role: string
  emailVerified: boolean
  createdAt: Date
}

// ============ Data Fetching ============

async function getUserBookings(userId: number): Promise<BookingWithService[]> {
  return db.booking.findMany({
    where: { userId },
    include: {
      service: {
        select: { id: true, name: true, description: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

async function getUserRefunds(userId: number): Promise<RefundWithBooking[]> {
  return db.refund.findMany({
    where: { userId },
    include: {
      booking: {
        select: {
          id: true,
          service: { select: { name: true } },
          bookingDate: true,
        },
      },
    },
    orderBy: { requestedAt: 'desc' },
  })
}

// ============ Page Component ============

export default async function DashboardPage() {
  const authUser = await requireAuth(['customer'])
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const [bookings, refunds] = await Promise.all([
    getUserBookings(authUser.id),
    getUserRefunds(authUser.id),
  ])

  return (
    <DashboardClient
      user={user as UserProfile}
      bookings={JSON.parse(JSON.stringify(bookings))}
      refunds={JSON.parse(JSON.stringify(refunds))}
    />
  )
}
