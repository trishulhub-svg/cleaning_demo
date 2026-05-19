import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { generateCompletionCode } from "@/lib/qr-generator";
import { sendStaffAssignmentEmail } from "@/lib/email";
import { logBookingActivity, logStaffActivity } from "@/lib/activity-logger";
import { SITE_URL, APP_NAME } from "@/lib/constants";

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
        user: { select: { name: true, email: true, phone: true } },
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

    // ── Generate QR code ──
    const qrCode = generateCompletionCode();

    // ── Create assignment with QR code ──
    const assignment = await db.bookingAssignment.create({
      data: {
        bookingId,
        staffId,
        assignedBy: admin.id,
        status: "assigned",
        qrCode,
        notes: notes || null,
      },
    });

    // ── Update booking ──
    await db.booking.update({
      where: { id: bookingId },
      data: {
        assignedStaffId: staffId,
        qrCompletionCode: qrCode,
        bookingStatus: "confirmed",
        updatedAt: new Date(),
      },
    });

    // ── Build QR code URL for email ──
    const qrCodeUrl = `${SITE_URL}/public/scan-qr?code=${encodeURIComponent(qrCode)}`;

    // ── Send staff assignment email ──
    const customerName = booking.user?.name || booking.guestName || "N/A";
    const customerPhone = booking.user?.phone || booking.guestPhone || "N/A";

    await sendStaffAssignmentEmail(staff.email, staff.name, {
      bookingId: booking.id,
      serviceName: booking.service.name,
      date: booking.bookingDate,
      time: booking.bookingTime.slice(0, 5),
      customerName,
      customerPhone,
      address: booking.address,
      notes: notes || undefined,
      qrCode,
      qrCodeUrl,
    }).catch((err) => {
      console.error("[Assign] Failed to send staff assignment email:", err);
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
        qrCode,
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
        qrCode,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Staff assigned successfully with QR code generated.",
      assignment: {
        id: assignment.id,
        qrCode,
        qrCodeUrl,
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
