"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * Update the status of a booking.
 * Server-side action used by the bookings API route.
 */
export async function updateBookingStatus(bookingId: number, status: string) {
  const admin = await requireAuth(["admin"]);

  const booking = await db.booking.update({
    where: { id: bookingId },
    data: {
      bookingStatus: status,
      updatedAt: new Date(),
      ...(status === "cancelled"
        ? { cancelledAt: new Date(), cancellationType: "admin" }
        : {}),
    },
  });

  return booking;
}

/**
 * Update the payment status of a booking.
 */
export async function updatePaymentStatus(bookingId: number, status: string) {
  await requireAuth(["admin"]);

  const booking = await db.booking.update({
    where: { id: bookingId },
    data: { paymentStatus: status, updatedAt: new Date() },
  });

  return booking;
}

/**
 * Assign a staff member to a booking.
 */
export async function assignBooking(
  bookingId: number,
  staffId: number,
  notes?: string
) {
  const admin = await requireAuth(["admin"]);

  const existing = await db.bookingAssignment.findUnique({
    where: { bookingId },
  });

  if (existing) {
    const assignment = await db.bookingAssignment.update({
      where: { bookingId },
      data: {
        staffId,
        notes,
        assignedBy: admin.id,
        status: "assigned",
        assignedAt: new Date(),
      },
    });
    const booking = await db.booking.update({
      where: { id: bookingId },
      data: { assignedStaffId: staffId, updatedAt: new Date() },
    });
    return { assignment, booking };
  }

  const assignment = await db.bookingAssignment.create({
    data: {
      bookingId,
      staffId,
      notes,
      assignedBy: admin.id,
      status: "assigned",
    },
  });

  const booking = await db.booking.update({
    where: { id: bookingId },
    data: { assignedStaffId: staffId, updatedAt: new Date() },
  });

  return { assignment, booking };
}

/**
 * Reassign a booking to a different staff member.
 */
export async function reassignBooking(
  bookingId: number,
  newStaffId: number,
  notes?: string
) {
  const admin = await requireAuth(["admin"]);

  const assignment = await db.bookingAssignment.update({
    where: { bookingId },
    data: {
      staffId: newStaffId,
      notes,
      assignedBy: admin.id,
      status: "assigned",
      assignedAt: new Date(),
      startedAt: null,
      completedAt: null,
    },
  });

  const booking = await db.booking.update({
    where: { id: bookingId },
    data: { assignedStaffId: newStaffId, updatedAt: new Date() },
  });

  return { assignment, booking };
}
