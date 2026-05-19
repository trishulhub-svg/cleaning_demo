"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

// ============ Types ============

export type ActionResult = {
  success: boolean;
  message: string;
};

// ============ Start Assignment ============

/**
 * Mark an assignment as in_progress.
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

    if (assignment.status !== "assigned") {
      return {
        success: false,
        message: "This assignment cannot be started. It may have already been started or completed.",
      };
    }

    if (assignment.booking.bookingStatus === "cancelled") {
      return { success: false, message: "This booking has been cancelled." };
    }

    // Update assignment status
    await db.bookingAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "in_progress",
        startedAt: new Date(),
      },
    });

    // Also update the booking status
    await db.booking.update({
      where: { id: assignment.bookingId },
      data: {
        bookingStatus: "confirmed",
        updatedAt: new Date(),
      },
    });

    revalidatePath("/staff");
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
 * Sets assignment status to 'completed', updates booking to completed.
 * If payment is cash, sets booking status to 'cash_pending'.
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

    if (assignment.status !== "in_progress") {
      return {
        success: false,
        message: "This assignment must be started before it can be completed.",
      };
    }

    // Determine booking status based on payment method
    const isCashPayment =
      assignment.booking.paymentStatus === "cash_on_service" ||
      assignment.booking.paymentMethod === "cash";
    const newBookingStatus = isCashPayment ? "cash_pending" : "completed";

    // Update assignment status
    await db.bookingAssignment.update({
      where: { id: assignmentId },
      data: {
        status: isCashPayment ? "cash_pending" : "completed",
        completedAt: new Date(),
      },
    });

    // Update booking status
    await db.booking.update({
      where: { id: assignment.bookingId },
      data: {
        bookingStatus: newBookingStatus,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/staff");
    return {
      success: true,
      message: isCashPayment
        ? "Job completed! Waiting for cash payment confirmation."
        : "Job completed successfully!",
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
 * Updates booking paymentStatus to 'paid', bookingStatus to 'completed',
 * and creates/updates invoice and payment records.
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
        invoice: true,
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

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${String(booking.id).padStart(5, "0")}`;

    // Create or update invoice
    let invoiceId = booking.invoiceId;

    if (invoiceId) {
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: "paid",
          updatedAt: new Date(),
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
        },
      });
      invoiceId = invoice.id;

      // Link invoice to booking
      await db.booking.update({
        where: { id: bookingId },
        data: { invoiceId: invoice.id },
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
        transactionId: `CASH-${Date.now()}`,
        paidAt: new Date(),
      },
    });

    // Update booking status
    await db.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "paid",
        bookingStatus: "completed",
        updatedAt: new Date(),
      },
    });

    // Update assignment status
    if (booking.assignment) {
      await db.bookingAssignment.update({
        where: { id: booking.assignment.id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });
    }

    revalidatePath("/staff");
    return {
      success: true,
      message: `Cash payment of £${booking.totalPrice.toFixed(2)} confirmed!`,
    };
  } catch (error) {
    console.error("[Staff] confirmCashPayment error:", error);
    return {
      success: false,
      message: "Failed to confirm payment. Please try again.",
    };
  }
}
