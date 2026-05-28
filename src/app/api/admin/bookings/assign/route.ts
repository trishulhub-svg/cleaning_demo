import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logBookingActivity, logStaffActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    // ── Auth check: admin only ──
    const admin = await requireAuth(["admin"]);

    const body = await req.json();
    const { bookingId, staffId, notes } = body;

    // ── Validate input ──
    if (!bookingId || !staffId) {
      return NextResponse.json(
        { success: false, error: "Booking ID and Staff ID are required." },
        { status: 400 }
      );
    }

    // ── Validate booking exists ──
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { name: true } },
        assignedStaff: { select: { id: true, name: true } },
        assignment: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    // ── Check booking is not cancelled or completed ──
    if (booking.bookingStatus === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot assign a cancelled booking." },
        { status: 400 }
      );
    }

    if (booking.bookingStatus === "completed") {
      return NextResponse.json(
        { success: false, error: "Cannot assign a completed booking." },
        { status: 400 }
      );
    }

    // ── Check not already assigned ──
    if (booking.assignment) {
      return NextResponse.json(
        {
          success: false,
          error: "This booking is already assigned. Use the reassign endpoint instead.",
          code: "ALREADY_ASSIGNED",
        },
        { status: 409 }
      );
    }

    // ── Double-booking prevention: check if staff already has assignment at same date/time ──
    const existingAssignment = await db.bookingAssignment.findFirst({
      where: {
        staffId,
        status: { notIn: ["completed", "cancelled"] },
        booking: {
          bookingDate: booking.bookingDate,
          bookingTime: booking.bookingTime,
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingDate: true,
            bookingTime: true,
            service: { select: { name: true } },
          },
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        {
          success: false,
          error: `This staff member already has an assignment on ${existingAssignment.booking.bookingDate} at ${existingAssignment.booking.bookingTime?.slice(0, 5)} (Booking #${existingAssignment.booking.id}: ${existingAssignment.booking.service.name}). Double-booking is not allowed.`,
          code: "DOUBLE_BOOKING",
        },
        { status: 409 }
      );
    }

    // ── Validate staff is active ──
    const staff = await db.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff member not found." },
        { status: 404 }
      );
    }

    if (!staff.isActive) {
      return NextResponse.json(
        { success: false, error: "This staff member is not active." },
        { status: 400 }
      );
    }

    // ── Create assignment ──
    const assignment = await db.bookingAssignment.create({
      data: {
        bookingId,
        staffId,
        assignedBy: admin.id,
        status: "assigned",
        notes: notes || null,
      },
    });

    // ── Update booking ──
    await db.booking.update({
      where: { id: bookingId },
      data: {
        assignedStaffId: staffId,
        bookingStatus: "confirmed",
        updatedAt: new Date(),
      },
    });

    // ── Log activities ──
    const sessionActor = {
      userType: admin.userType,
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    await logBookingActivity(
      "booking_assigned",
      sessionActor,
      bookingId,
      `Booking #${bookingId}`,
      {
        staffId,
        staffName: staff.name,
        notes: notes || null,
      }
    );

    await logStaffActivity(
      "staff_assigned_to_booking",
      sessionActor,
      staffId,
      staff.name,
      {
        bookingId,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Staff assigned successfully.",
      assignment: {
        id: assignment.id,
      },
      bookingId,
      staffId,
      staffName: staff.name,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("redirect")) {
      throw error; // Let auth redirects pass through
    }
    console.error("[Assign] Error assigning booking:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign booking. Please try again." },
      { status: 500 }
    );
  }
}
