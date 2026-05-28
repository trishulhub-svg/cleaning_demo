import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logBookingActivity, logStaffActivity } from "@/lib/activity-logger";

// ============ POST /api/admin/bookings/unassign ============
// Removes a staff assignment from a booking
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth(["admin"]);

    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Booking ID is required." },
        { status: 400 }
      );
    }

    // ── Get booking with assignment ──
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        assignment: true,
        assignedStaff: { select: { id: true, name: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    if (!booking.assignment) {
      return NextResponse.json(
        { success: false, error: "This booking has no staff assignment." },
        { status: 400 }
      );
    }

    // ── Prevent unassigning completed or cancelled bookings ──
    if (booking.bookingStatus === "completed") {
      return NextResponse.json(
        { success: false, error: "Cannot unassign a completed booking." },
        { status: 400 }
      );
    }

    if (booking.bookingStatus === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot unassign a cancelled booking." },
        { status: 400 }
      );
    }

    const staffName = booking.assignedStaff?.name || "Unknown";

    // ── Delete assignment and update booking ──
    await db.$transaction([
      db.bookingAssignment.delete({
        where: { id: booking.assignment.id },
      }),
      db.booking.update({
        where: { id: bookingId },
        data: {
          assignedStaffId: null,
          bookingStatus: booking.paymentStatus === "paid" ? "confirmed" : "pending",
          updatedAt: new Date(),
        },
      }),
    ]);

    // ── Log activities ──
    const sessionActor = {
      userType: admin.userType,
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    await logBookingActivity(
      "booking_unassigned",
      sessionActor,
      bookingId,
      `Booking #${bookingId}`,
      {
        staffId: booking.assignedStaffId,
        staffName,
      }
    );

    await logStaffActivity(
      "staff_unassigned_from_booking",
      sessionActor,
      booking.assignedStaffId!,
      staffName,
      { bookingId }
    );

    return NextResponse.json({
      success: true,
      message: "Staff unassigned successfully.",
      bookingId,
      staffName,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("[Unassign] Error unassigning booking:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unassign booking. Please try again." },
      { status: 500 }
    );
  }
}
