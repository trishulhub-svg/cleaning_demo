'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'
import { hashPassword, verifyPassword } from '@/lib/auth-helpers'
import { sendCancellationEmail, sendRescheduleEmail } from '@/lib/email'
import { logBookingActivity, logPaymentActivity } from '@/lib/activity-logger'
import { format } from 'date-fns'
import type { UserType } from '@/lib/constants'

// ============ Types ============

export type ActionResult<T = void> = {
  success: boolean
  message: string
  data?: T
}

export type ProfileUpdateData = {
  name: string
  phone: string
  address: string
}

export type PasswordChangeData = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type CancelBookingData = {
  bookingId: number
  reason: string
}

export type RescheduleBookingData = {
  bookingId: number
  newDate: string
  newTime: string
}

// ============ Helper: Calculate refund percentage ============

function getRefundPercentage(bookingDate: string, bookingTime: string): number {
  const now = new Date()
  const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`)
  const diffMs = bookingDateTime.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  // 90% refund if >24h before, 0% if <24h
  if (diffHours > 24) return 90
  if (diffHours > 0) return 0
  return 0 // already past
}

// ============ Update Profile ============

export async function updateProfile(
  data: ProfileUpdateData
): Promise<ActionResult> {
  try {
    const authUser = await requireAuth(['customer'] as UserType[])
    const { name, phone, address } = data

    if (!name.trim()) {
      return { success: false, message: 'Name is required.' }
    }

    await db.user.update({
      where: { id: authUser.id },
      data: {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        updatedAt: new Date(),
      },
    })

    revalidatePath('/dashboard')
    return { success: true, message: 'Profile updated successfully.' }
  } catch (error) {
    console.error('Update profile error:', error)
    return { success: false, message: 'Failed to update profile. Please try again.' }
  }
}

// ============ Change Password ============

export async function changePassword(
  data: PasswordChangeData
): Promise<ActionResult> {
  try {
    const authUser = await requireAuth(['customer'] as UserType[])
    const { currentPassword, newPassword, confirmPassword } = data

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, message: 'All password fields are required.' }
    }

    if (newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters long.' }
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: 'New password and confirmation do not match.' }
    }

    // Fetch the user with password
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { password: true },
    })

    if (!user) {
      return { success: false, message: 'User not found.' }
    }

    const isValid = await verifyPassword(currentPassword, user.password)
    if (!isValid) {
      return { success: false, message: 'Current password is incorrect.' }
    }

    const hashedPassword = await hashPassword(newPassword)

    await db.user.update({
      where: { id: authUser.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    })

    return { success: true, message: 'Password changed successfully.' }
  } catch (error) {
    console.error('Change password error:', error)
    return { success: false, message: 'Failed to change password. Please try again.' }
  }
}

// ============ Cancel Booking (Enhanced) ============

export async function cancelBooking(
  data: CancelBookingData
): Promise<ActionResult<{ refundAmount: number; refundPercent: number }>> {
  try {
    const authUser = await requireAuth(['customer'] as UserType[])
    const { bookingId, reason } = data

    if (!reason.trim()) {
      return { success: false, message: 'Please provide a reason for cancellation.' }
    }

    // Fetch the booking with service and assignment info
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { name: true } },
        assignment: { select: { id: true, status: true } },
        user: { select: { name: true, email: true } },
      },
    })

    if (!booking) {
      return { success: false, message: 'Booking not found.' }
    }

    if (booking.userId !== authUser.id) {
      return { success: false, message: 'You do not have permission to cancel this booking.' }
    }

    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') {
      return { success: false, message: 'This booking cannot be cancelled.' }
    }

    // Check if less than 24 hours before the service — only admin can cancel
    const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`)
    const diffMs = bookingDateTime.getTime() - Date.now()
    const diffHours = diffMs / (1000 * 60 * 60)
    if (diffHours > 0 && diffHours <= 24) {
      return { success: false, message: 'Less than 24 hours before the service. Please contact admin to cancel this booking.' }
    }

    // Calculate refund
    const refundPercent = getRefundPercentage(booking.bookingDate, booking.bookingTime)
    const refundAmount = (booking.totalPrice * refundPercent) / 100

    // Use transaction for multi-table operations
    await db.$transaction(async (tx) => {
      // 1. Update booking status
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          bookingStatus: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason.trim(),
          cancellationType: 'customer',
          refundStatus: refundAmount > 0 && booking.paymentStatus === 'paid' ? 'requested' : 'none',
          updatedAt: new Date(),
        },
      })

      // 2. Create CancellationLog record
      await tx.cancellationLog.create({
        data: {
          bookingId,
          userId: authUser.id,
          cancelledBy: 'customer',
          reason: reason.trim(),
          refundAmount,
          refundProcessed: false,
        },
      })

      // 3. Create Refund record if payment was made AND >24h before booking
      if (refundAmount > 0 && booking.paymentStatus === 'paid') {
        await tx.refund.create({
          data: {
            userId: authUser.id,
            bookingId,
            invoiceId: booking.invoiceId ?? 0,
            amount: refundAmount,
            refundType: 'partial',
            status: 'pending',
            reason: reason.trim(),
            requestedAt: new Date(),
          },
        })
      }

      // 4. Update bookingAssignments: set status='cancelled' for active assignments
      if (booking.assignment && booking.assignment.status !== 'cancelled' && booking.assignment.status !== 'completed') {
        await tx.bookingAssignment.update({
          where: { id: booking.assignment.id },
          data: {
            status: 'cancelled',
            notes: `Cancelled by customer: ${reason.trim()}`,
          },
        })
      }
    })

    // 5. Send cancellation email to customer (outside transaction — non-critical)
    const customerEmail = booking.user?.email
    const customerName = booking.user?.name || 'Customer'

    if (customerEmail) {
      const originalDate = format(
        new Date(`${booking.bookingDate}T${booking.bookingTime}`),
        'EEEE, d MMMM yyyy \'at\' h:mm a'
      )

      // Fire-and-forget — don't block on email
      sendCancellationEmail(customerEmail, customerName, {
        bookingId,
        serviceName: booking.service.name,
        originalDate,
        refundAmount: refundAmount > 0 ? refundAmount : undefined,
        reason: reason.trim(),
      }).catch((emailErr) => {
        console.error('[CancelBooking] Failed to send cancellation email:', emailErr)
      })
    }

    // 6. Log activity (outside transaction — non-critical)
    logBookingActivity(
      'booking_cancelled',
      {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        userType: 'customer',
      },
      bookingId,
      `Booking #${bookingId}`,
      {
        reason: reason.trim(),
        refundAmount,
        refundPercent,
        paymentStatus: booking.paymentStatus,
        serviceName: booking.service.name,
      }
    )

    // 7. Log payment activity if refund was created
    if (refundAmount > 0 && booking.paymentStatus === 'paid') {
      logPaymentActivity(
        'refund_requested',
        {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          userType: 'customer',
        },
        bookingId,
        `Refund for Booking #${bookingId}`,
        {
          amount: refundAmount,
          refundType: 'partial',
          refundPercent,
        }
      )
    }

    revalidatePath('/dashboard')
    return {
      success: true,
      message: `Booking cancelled successfully. ${refundAmount > 0 ? `Refund of £${refundAmount.toFixed(2)} (${refundPercent}%) will be processed within 5–10 business days.` : 'No refund is available for this cancellation.'}`,
      data: { refundAmount, refundPercent },
    }
  } catch (error) {
    console.error('Cancel booking error:', error)
    return { success: false, message: 'Failed to cancel booking. Please try again.' }
  }
}

// ============ Reschedule Booking (Enhanced) ============

export async function rescheduleBooking(
  data: RescheduleBookingData
): Promise<ActionResult> {
  try {
    const authUser = await requireAuth(['customer'] as UserType[])
    const { bookingId, newDate, newTime } = data

    if (!newDate || !newTime) {
      return { success: false, message: 'Please select a new date and time.' }
    }

    // Validate date is in the future
    const newDateTime = new Date(`${newDate}T${newTime}`)
    if (newDateTime <= new Date()) {
      return { success: false, message: 'Please select a future date and time.' }
    }

    // Fetch the booking with service and user info
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    })

    if (!booking) {
      return { success: false, message: 'Booking not found.' }
    }

    if (booking.userId !== authUser.id) {
      return { success: false, message: 'You do not have permission to reschedule this booking.' }
    }

    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') {
      return { success: false, message: 'This booking cannot be rescheduled.' }
    }

    // Check if rescheduling is >24h before original booking (24-hour rule)
    const originalDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`)
    const now = new Date()
    const diffHours = (originalDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffHours <= 24) {
      return {
        success: false,
        message: 'Rescheduling is only allowed more than 24 hours before the booking. Please contact us for assistance.',
      }
    }

    // Format old and new dates/times for email
    const oldDateFormatted = format(originalDateTime, 'EEEE, d MMMM yyyy')
    const oldTimeFormatted = format(originalDateTime, 'h:mm a')
    const newDateFormatted = format(newDateTime, 'EEEE, d MMMM yyyy')
    const newTimeFormatted = format(newDateTime, 'h:mm a')

    // Update booking
    await db.booking.update({
      where: { id: bookingId },
      data: {
        bookingDate: newDate,
        bookingTime: newTime,
        updatedAt: new Date(),
      },
    })

    // Send reschedule email with old/new dates (outside transaction — non-critical)
    const customerEmail = booking.user?.email
    const customerName = booking.user?.name || 'Customer'

    if (customerEmail) {
      // Fire-and-forget — don't block on email
      sendRescheduleEmail(customerEmail, customerName, {
        bookingId,
        serviceName: booking.service.name,
        oldDate: oldDateFormatted,
        oldTime: oldTimeFormatted,
        newDate: newDateFormatted,
        newTime: newTimeFormatted,
        address: booking.address,
      }).catch((emailErr) => {
        console.error('[RescheduleBooking] Failed to send reschedule email:', emailErr)
      })
    }

    // Log activity (outside transaction — non-critical)
    logBookingActivity(
      'booking_rescheduled',
      {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        userType: 'customer',
      },
      bookingId,
      `Booking #${bookingId}`,
      {
        oldDate: booking.bookingDate,
        oldTime: booking.bookingTime,
        newDate,
        newTime,
        serviceName: booking.service.name,
      }
    )

    revalidatePath('/dashboard')
    return {
      success: true,
      message: `Booking rescheduled to ${newDateFormatted} at ${newTimeFormatted}. A confirmation email will be sent shortly.`,
    }
  } catch (error) {
    console.error('Reschedule booking error:', error)
    return { success: false, message: 'Failed to reschedule booking. Please try again.' }
  }
}
