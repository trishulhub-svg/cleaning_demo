"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { generateCompletionCode, generateQRImage } from "@/lib/qr-generator";
import { CURRENCY } from "@/lib/constants";
import { logBookingActivity, logPaymentActivity } from "@/lib/activity-logger";

// ============ Types ============

export type ActionResult = {
  success: boolean;
  message: string;
};

// ============ State Machine Transitions ============
//
// Valid transitions:
//   assigned       → in_progress    (generates QR code, sets startedAt)
//   in_progress    → cash_pending   (cash-on-service bookings only)
//   in_progress    → completed      (non-cash bookings, creates invoice + payment)
//   cash_pending   → completed      (staff confirms cash received, creates invoice + payment)
//
// NO backward transitions are allowed.

// ============ Start Assignment ============

/**
 * Mark an assignment as in_progress.
 * Generates a QR completion code and saves it to both the assignment and booking.
 * Sets status to 'in_progress', records the startedAt timestamp.
 */
export async function startAssignment(
  assignmentId: number
): Promise<ActionResult> {
  try {
    const staff = await requireAuth(["staff"]);

    // Verify this assignment belongs to the current staff member
    const assignment = await db.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: { booking: { select: { id: true, bookingStatus: true } } },
    });

    if (!assignment) {
      return { success: false, message: "Assignment not found." };
    }

    if (assignment.staffId !== staff.id) {
      return {
        success: false,
        message: "You do not have permission to update this assignment.",
      };
    }

    // State machine: only assigned → in_progress is allowed
    if (assignment.status !== "assigned") {
      return {
        success: false,
        message: "This assignment cannot be started. It may have already been started or completed.",
      };
    }

    if (assignment.booking.bookingStatus === "cancelled") {
      return { success: false, message: "This booking has been cancelled." };
    }

    // Generate QR completion code + actual scannable QR image
    const qrCode = generateCompletionCode();
    // Generate QR code image
    let qrImageData: string | null = null;
    try {
      qrImageData = await generateQRImage(qrCode);
    } catch (err) {
      console.error("[Staff] Failed to generate QR image:", err);
    }

    // Update assignment status + QR code + QR image, and booking status + QR code + QR image
    await db.$transaction([
      db.bookingAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "in_progress",
          startedAt: new Date(),
          qrCode,
          qrImageData,
        },
      }),
      db.booking.update({
        where: { id: assignment.bookingId },
        data: {
          bookingStatus: "confirmed",
          qrCompletionCode: qrCode,
          qrImageData,
          updatedAt: new Date(),
        },
      }),
    ]);

    revalidatePath("/staff");
    revalidatePath(`/staff/booking-details/${assignmentId}`);
    logBookingActivity('assignment_started', { userType: 'staff', id: staff.id, name: staff.name, email: staff.email || '' }, assignmentId, `Assignment #${assignmentId}`).catch(() => {})
    return { success: true, message: "Job started successfully!" };
  } catch (error) {
    console.error("[Staff] startAssignment error:", error);
    return {
      success: false,
      message: "Failed to start job. Please try again.",
    };
  }
}

// ============ Complete Assignment ============

/**
 * Mark an assignment as completed.
 *
 * State machine:
 *   in_progress → cash_pending  (if payment_method is cash/cash_on_service)
 *   in_progress → completed     (if payment_method is NOT cash, creates invoice + payment)
 *
 * Invoice format: INV-YYYYMMDD-{padded_booking_id}
 * Payment format: CASH-{timestamp}-{booking_id}
 */
export async function completeAssignment(
  assignmentId: number
): Promise<ActionResult> {
  try {
    const staff = await requireAuth(["staff"]);

    // Verify this assignment belongs to the current staff member
    const assignment = await db.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        booking: {
          select: {
            id: true,
            bookingStatus: true,
            paymentStatus: true,
            paymentMethod: true,
            totalPrice: true,
            userId: true,
            invoiceId: true,
          },
        },
      },
    });

    if (!assignment) {
      return { success: false, message: "Assignment not found." };
    }

    if (assignment.staffId !== staff.id) {
      return {
        success: false,
        message: "You do not have permission to update this assignment.",
      };
    }

    // State machine: only in_progress can proceed
    if (assignment.status !== "in_progress") {
      return {
        success: false,
        message: "This assignment must be started before it can be completed.",
      };
    }

    // Determine if this is a cash-on-service booking
    const isCashPayment =
      assignment.booking.paymentMethod === "cash_on_service" ||
      assignment.booking.paymentMethod === "cash";

    if (isCashPayment) {
      // Cash bookings go to cash_pending state (staff must confirm cash received)
      await db.$transaction([
        db.bookingAssignment.update({
          where: { id: assignmentId },
          data: { status: "cash_pending" },
        }),
        db.booking.update({
          where: { id: assignment.bookingId },
          data: {
            bookingStatus: "cash_pending",
            updatedAt: new Date(),
          },
        }),
      ]);

      revalidatePath("/staff");
      revalidatePath(`/staff/booking-details/${assignmentId}`);
      logBookingActivity('assignment_completed', { userType: 'staff', id: staff.id, name: staff.name, email: staff.email || '' }, assignmentId, `Assignment #${assignmentId}`, { paymentMethod: 'cash' }).catch(() => {})
      return {
        success: true,
        message: "Job completed! Waiting for cash payment confirmation from customer.",
      };
    }

    // Non-cash bookings: create invoice + payment, mark as completed
    const now = new Date();
    const invoiceNumber = buildInvoiceNumber(assignment.booking.id);

    let invoiceId = assignment.booking.invoiceId;

    if (invoiceId) {
      // Update existing invoice
      await db.invoice.update({
        where: { id: invoiceId },
        data: { paymentStatus: "paid", paidAt: now },
      });
    } else {
      // Create new invoice
      const invoice = await db.invoice.create({
        data: {
          userId: assignment.booking.userId ?? 0,
          bookingId: assignment.booking.id,
          invoiceNumber,
          totalAmount: assignment.booking.totalPrice,
          paymentMethod: assignment.booking.paymentMethod ?? "stripe",
          paymentStatus: "paid",
          paidAt: now,
        },
      });
      invoiceId = invoice.id;
    }

    // Create payment record
    await db.payment.create({
      data: {
        userId: assignment.booking.userId ?? 0,
        bookingId: assignment.booking.id,
        invoiceId,
        amount: assignment.booking.totalPrice,
        paymentMethod: assignment.booking.paymentMethod ?? "stripe",
        paymentStatus: "completed",
        paidAt: now,
      },
    });

    // Update assignment and booking
    await db.$transaction([
      db.bookingAssignment.update({
        where: { id: assignmentId },
        data: { status: "completed", completedAt: now },
      }),
      db.booking.update({
        where: { id: assignment.bookingId },
        data: {
          bookingStatus: "completed",
          paymentStatus: "paid",
          completedBy: staff.name,
          completedAt: now,
          invoiceId,
          updatedAt: now,
        },
      }),
    ]);

    revalidatePath("/staff");
    revalidatePath(`/staff/booking-details/${assignmentId}`);
    logBookingActivity('assignment_completed', { userType: 'staff', id: staff.id, name: staff.name, email: staff.email || '' }, assignmentId, `Assignment #${assignmentId}`, { paymentMethod: assignment.booking.paymentMethod }).catch(() => {})
    logPaymentActivity('payment_completed', { userType: 'staff', id: staff.id, name: staff.name, email: staff.email || '' }, assignment.booking.id, `Booking #${assignment.booking.id}`).catch(() => {})
    return {
      success: true,
      message: "Job completed successfully!",
    };
  } catch (error) {
    console.error("[Staff] completeAssignment error:", error);
    return {
      success: false,
      message: "Failed to complete job. Please try again.",
    };
  }
}

// ============ Confirm Cash Payment ============

/**
 * Confirm that cash payment has been received for a booking.
 * State machine: cash_pending → completed
 *
 * Auto-creates Invoice (format: INV-YYYYMMDD-{padded_booking_id})
 * Auto-creates Payment (format: CASH-{timestamp}-{booking_id})
 * Updates booking paymentStatus to 'paid', bookingStatus to 'completed'.
 */
export async function confirmCashPayment(
  bookingId: number
): Promise<ActionResult> {
  try {
    const staff = await requireAuth(["staff"]);

    // Fetch the booking with its assignment
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        assignment: { select: { id: true, staffId: true, status: true } },
        service: { select: { name: true } },
      },
    });

    if (!booking) {
      return { success: false, message: "Booking not found." };
    }

    // Verify this booking's assignment belongs to the current staff member
    if (
      !booking.assignment ||
      booking.assignment.staffId !== staff.id
    ) {
      return {
        success: false,
        message: "You do not have permission to update this booking.",
      };
    }

    // State machine: only cash_pending can proceed
    if (booking.paymentStatus === "paid") {
      return {
        success: false,
        message: "This booking has already been paid.",
      };
    }

    if (booking.bookingStatus !== "cash_pending") {
      return {
        success: false,
        message: "This booking is not awaiting cash payment.",
      };
    }

    const now = new Date();
    const invoiceNumber = buildInvoiceNumber(booking.id);
    const transactionId = `CASH-${Date.now()}-${booking.id}`;

    // Create or update invoice
    let invoiceId = booking.invoiceId;

    if (invoiceId) {
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: "paid",
          paidAt: now,
        },
      });
    } else {
      const invoice = await db.invoice.create({
        data: {
          userId: booking.userId ?? 0,
          bookingId: booking.id,
          invoiceNumber,
          totalAmount: booking.totalPrice,
          paymentMethod: "cash",
          paymentStatus: "paid",
          paidAt: now,
        },
      });
      invoiceId = invoice.id;
    }

    // Link invoice to booking if not already linked
    if (!booking.invoiceId) {
      await db.booking.update({
        where: { id: bookingId },
        data: { invoiceId },
      });
    }

    // Create payment record
    await db.payment.create({
      data: {
        userId: booking.userId ?? 0,
        bookingId: booking.id,
        invoiceId,
        amount: booking.totalPrice,
        paymentMethod: "cash",
        paymentStatus: "completed",
        transactionId,
        paidAt: now,
      },
    });

    // Update booking status
    await db.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "paid",
        bookingStatus: "completed",
        completedBy: staff.name,
        completedAt: now,
        updatedAt: now,
      },
    });

    // Update assignment status
    if (booking.assignment) {
      await db.bookingAssignment.update({
        where: { id: booking.assignment.id },
        data: {
          status: "completed",
          completedAt: now,
        },
      });
    }

    revalidatePath("/staff");
    revalidatePath(`/staff/booking-details/${booking.assignment?.id}`);
    logBookingActivity('cash_payment_confirmed', { userType: 'staff', id: staff.id, name: staff.name, email: staff.email || '' }, bookingId, `Booking #${bookingId}`, { amount: booking.totalPrice }).catch(() => {})
    logPaymentActivity('cash_payment_received', { userType: 'staff', id: staff.id, name: staff.name, email: staff.email || '' }, bookingId, `Booking #${bookingId}`, { amount: booking.totalPrice }).catch(() => {})
    return {
      success: true,
      message: `Cash payment of ${CURRENCY}${booking.totalPrice.toFixed(2)} confirmed!`,
    };
  } catch (error) {
    console.error("[Staff] confirmCashPayment error:", error);
    return {
      success: false,
      message: "Failed to confirm payment. Please try again.",
    };
  }
}

// ============ Helpers ============

/**
 * Build invoice number in format: INV-YYYYMMDD-{padded_booking_id}
 * e.g., INV-20250115-00042
 */
function buildInvoiceNumber(bookingId: number): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `INV-${dateStr}-${String(bookingId).padStart(5, "0")}`;
}
