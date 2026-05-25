import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { CURRENCY } from "@/lib/constants"
import { RefundClientPage } from "./refund-client"

export const metadata = {
  title: "Request Refund — GreenLeaf Cleaning",
  description: "Request a refund for your cancelled booking.",
}

export type EligibleBooking = {
  id: number
  bookingDate: string
  bookingTime: string
  address: string
  totalPrice: number
  paymentStatus: string
  paymentMethod: string | null
  cancellationReason: string | null
  cancelledAt: Date | null
  refundStatus: string
  service: {
    name: string
  }
  invoice: {
    id: number
    invoiceNumber: string
  } | null
}

async function getEligibleBookings(userId: number): Promise<EligibleBooking[]> {
  // Fetch all cancelled bookings for this user that are:
  // - paymentStatus = 'paid' (they actually paid)
  // - cancelled > 24h ago
  // - refundStatus IN ('none', 'rejected')
  const allBookings = await db.booking.findMany({
    where: {
      userId,
      bookingStatus: "cancelled",
      paymentStatus: "paid",
    },
    include: {
      service: {
        select: { name: true },
      },
      invoice: {
        select: { id: true, invoiceNumber: true },
      },
    },
    orderBy: { cancelledAt: "desc" },
  })

  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  return allBookings
    .filter((booking) => {
      // Must have been cancelled more than 24 hours ago
      if (!booking.cancelledAt) return false
      if (new Date(booking.cancelledAt) > twentyFourHoursAgo) return false
      // Must have eligible refund status
      return booking.refundStatus === "none" || booking.refundStatus === "rejected"
    })
    .map((booking) => ({
      id: booking.id,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      address: booking.address,
      totalPrice: booking.totalPrice,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      cancellationReason: booking.cancellationReason,
      cancelledAt: booking.cancelledAt,
      refundStatus: booking.refundStatus,
      service: booking.service,
      invoice: booking.invoice,
    }))
}

export default async function RequestRefundPage() {
  let user: Awaited<ReturnType<typeof requireAuth>>
  try {
    user = await requireAuth(["customer"])
  } catch {
    redirect("/login")
  }

  const bookings = await getEligibleBookings(user.id)

  return (
    <RefundClientPage
      bookings={bookings}
      currency={CURRENCY}
    />
  )
}
