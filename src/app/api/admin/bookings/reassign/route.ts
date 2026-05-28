import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { logBookingActivity, logStaffActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    // ── Auth check: admin only ──
    const admin = await requireAuth(["admin"]);

    const body = await req.json();
    const { assignmentId, newStaffId, adminNotes } = body;

    // ── Validate input ──
    if (!assignmentId || !newStaffId) {
      return NextResponse.json(
        { success: false, error: "Assignment ID and new Staff ID are required." },
        { status: 400 }
      );
    }

    // ── Get existing assignment with full data ──
    const assignment = await db.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        booking: {
          include: {
            service: { select: { name: true } },
          },
        },
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found." },
        { status: 404 }
      );
    }

    // ── Prevent reassigning completed or cancelled assignments ──
    if (assignment.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Cannot reassign a completed booking." },
        { status: 400 }
      );
    }

    if (assignment.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot reassign a cancelled booking." },
        { status: 400 }
      );
    }

    // ── Store old staff info for logging ──
    const oldStaff = assignment.staff;
    const oldStaffName = oldStaff.name;
    const oldStaffId = oldStaff.id;

    // ── Validate new staff is active ──
    if (newStaffId === oldStaffId) {
      return NextResponse.json(
        { success: false, error: "New staff member must be different from the current one." },
        { status: 400 }
      );
    }

    const newStaff = await db.staff.findUnique({
      where: { id: newStaffId },
    });

    if (!newStaff) {
      return NextResponse.json(
        { success: false, error: "New staff member not found." },
        { status: 404 }
      );
    }

    if (!newStaff.isActive) {
      return NextResponse.json(
        { success: false, error: "The new staff member is not active." },
        { status: 400 }
      );
    }

    // ── Double-booking prevention: check if new staff has another assignment at same date/time ──
    const conflictingAssignment = await db.bookingAssignment.findFirst({
      where: {
        staffId: newStaffId,
        id: { not: assignmentId },
        status: { notIn: ["completed", "cancelled"] },
        booking: {
          bookingDate: assignment.booking.bookingDate,
          bookingTime: assignment.booking.bookingTime,
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

    if (conflictingAssignment) {
      return NextResponse.json(
        {
          success: false,
          error: `The new staff member already has an assignment on ${conflictingAssignment.booking.bookingDate} at ${conflictingAssignment.booking.bookingTime?.slice(0, 5)} (Booking #${conflictingAssignment.booking.id}: ${conflictingAssignment.booking.service.name}). Double-booking is not allowed.`,
          code: "DOUBLE_BOOKING",
        },
        { status: 409 }
      );
    }

    // ── Build updated notes ──
    const oldNotes = assignment.notes || "";
    const noteSeparator = oldNotes ? "\n\n--- Reassignment ---\n" : "";
    const newNotes = adminNotes
      ? `${oldNotes}${noteSeparator}[Reassigned by ${admin.name} on ${new Date().toISOString().split("T")[0]}]: ${adminNotes}`
      : oldNotes;

    // ── Update assignment ──
    const now = new Date();
    await db.$transaction([
      db.bookingAssignment.update({
        where: { id: assignmentId },
        data: {
          staffId: newStaffId,
          assignedBy: admin.id,
          notes: newNotes,
          status: "assigned",
          assignedAt: now,
          startedAt: null,
          completedAt: null,
        },
      }),
      db.booking.update({
        where: { id: assignment.bookingId },
        data: {
          assignedStaffId: newStaffId,
          updatedAt: now,
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
      "booking_reassigned",
      sessionActor,
      assignment.bookingId,
      `Booking #${assignment.bookingId}`,
      {
        oldStaffId,
        oldStaffName,
        newStaffId,
        newStaffName: newStaff.name,
        adminNotes: adminNotes || null,
      }
    );

    await logStaffActivity(
      "staff_reassigned_from_booking",
      sessionActor,
      oldStaffId,
      oldStaffName,
      {
        bookingId: assignment.bookingId,
        newStaffId,
        newStaffName: newStaff.name,
      }
    );

    await logStaffActivity(
      "staff_reassigned_to_booking",
      sessionActor,
      newStaffId,
      newStaff.name,
      {
        bookingId: assignment.bookingId,
        oldStaffId,
        oldStaffName,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Staff reassigned successfully.",
      assignmentId,
      oldStaff: { id: oldStaffId, name: oldStaffName },
      newStaff: { id: newStaffId, name: newStaff.name },
      bookingId: assignment.bookingId,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("redirect")) {
      throw error;
    }
    console.error("[Reassign] Error reassigning booking:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reassign booking. Please try again." },
      { status: 500 }
    );
  }
}
