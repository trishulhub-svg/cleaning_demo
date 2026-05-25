import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

// GET /api/admin/todays-bookings — all non-cancelled bookings for today
export async function GET() {
  try {
    await requireAuth(["admin"]);

    const today = new Date().toISOString().split("T")[0];

    const bookings = await db.booking.findMany({
      where: {
        bookingDate: today,
        bookingStatus: { not: "cancelled" },
      },
      orderBy: [{ bookingTime: "asc" }, { createdAt: "asc" }],
      include: {
        service: { select: { name: true, price: true } },
        user: { select: { name: true, email: true, phone: true } },
        assignedStaff: { select: { id: true, name: true, phone: true } },
        assignment: true,
      },
    });

    // Stats
    const completedCount = bookings.filter(
      (b) => b.bookingStatus === "completed"
    ).length;
    const pendingCount = bookings.filter(
      (b) =>
        b.bookingStatus === "pending" ||
        b.bookingStatus === "confirmed" ||
        b.bookingStatus === "in_progress"
    ).length;

    // Calculate urgency for each booking
    const now = new Date();
    const enrichedBookings = bookings.map((b) => {
      const [hours, minutes] = (b.bookingTime || "00:00:00")
        .split(":")
        .map(Number);
      const bookingDateTime = new Date();
      bookingDateTime.setHours(hours, minutes, 0, 0);
      const diffMs = bookingDateTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      const diffHours = diffMinutes / 60;

      let urgency: "overdue" | "urgent" | "soon" | "ok" | "done" = "ok";
      if (b.bookingStatus === "completed") {
        urgency = "done";
      } else if (diffMs < 0) {
        urgency = "overdue";
      } else if (diffMinutes < 60) {
        urgency = "urgent";
      } else if (diffHours < 2) {
        urgency = "soon";
      }

      const isRescheduled =
        b.updatedAt &&
        new Date(b.updatedAt).getTime() > new Date(b.createdAt).getTime();

      return { ...b, urgency, diffMinutes, isRescheduled };
    });

    return NextResponse.json({
      bookings: enrichedBookings,
      stats: {
        total: bookings.length,
        completed: completedCount,
        pending: pendingCount,
        date: today,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Error fetching today's bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's bookings" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/todays-bookings — update booking status
export async function PUT(req: NextRequest) {
  try {
    await requireAuth(["admin"]);

    const body = await req.json();
    const { bookingId, bookingStatus } = body;

    if (!bookingId || !bookingStatus) {
      return NextResponse.json(
        { error: "Booking ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "cash_pending",
    ];

    if (!validStatuses.includes(bookingStatus)) {
      return NextResponse.json(
        { error: "Invalid booking status" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      bookingStatus,
      updatedAt: new Date(),
    };

    if (bookingStatus === "cancelled") {
      updateData.cancelledAt = new Date();
      updateData.cancellationType = "admin";
    }

    if (bookingStatus === "completed") {
      updateData.completedAt = new Date();
    }

    const booking = await db.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
