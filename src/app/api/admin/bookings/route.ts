import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || "all";
    const dateFilter = searchParams.get("date") || "all";
    const search = searchParams.get("search") || "";
    const assignmentFilter = searchParams.get("assignment") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const today = new Date().toISOString().split("T")[0];

    const where: Record<string, unknown> = {};

    if (status !== "all") {
      where.bookingStatus = status;
    }

    if (dateFilter === "today") {
      where.bookingDate = today;
    } else if (dateFilter === "upcoming") {
      where.bookingDate = { gte: today };
    }

    if (assignmentFilter === "assigned") {
      where.assignedStaffId = { not: null };
    } else if (assignmentFilter === "unassigned") {
      where.assignedStaffId = null;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { guestName: { contains: search } },
        { guestEmail: { contains: search } },
        { id: isNaN(Number(search)) ? undefined : { equals: Number(search) } },
      ].filter(Boolean);
    }

    const [bookings, total, statusCounts] = await Promise.all([
      db.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          service: { select: { name: true } },
          user: { select: { name: true, email: true, phone: true } },
          assignedStaff: { select: { id: true, name: true, phone: true } },
          assignment: true,
        },
      }),
      db.booking.count({ where }),
      db.booking.groupBy({
        by: ["bookingStatus"],
        _count: { id: true },
      }),
    ]);

    const counts = statusCounts.reduce(
      (acc, item) => {
        acc[item.bookingStatus] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );
    counts.all = Object.values(counts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts: counts,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, action, ...data } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    if (action === "updateStatus") {
      const { status } = data;
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
      return NextResponse.json({ booking });
    }

    if (action === "updatePaymentStatus") {
      const { paymentStatus } = data;
      const booking = await db.booking.update({
        where: { id: bookingId },
        data: { paymentStatus, updatedAt: new Date() },
      });
      return NextResponse.json({ booking });
    }

    if (action === "assign") {
      const { staffId, notes, adminId } = data;
      const existing = await db.bookingAssignment.findUnique({
        where: { bookingId },
      });

      if (existing) {
        const assignment = await db.bookingAssignment.update({
          where: { bookingId },
          data: {
            staffId,
            notes,
            assignedBy: adminId,
            status: "assigned",
            assignedAt: new Date(),
          },
        });
        const booking = await db.booking.update({
          where: { id: bookingId },
          data: { assignedStaffId: staffId, updatedAt: new Date() },
        });
        return NextResponse.json({ assignment, booking });
      } else {
        const assignment = await db.bookingAssignment.create({
          data: {
            bookingId,
            staffId,
            notes,
            assignedBy: adminId,
            status: "assigned",
          },
        });
        const booking = await db.booking.update({
          where: { id: bookingId },
          data: { assignedStaffId: staffId, updatedAt: new Date() },
        });
        return NextResponse.json({ assignment, booking });
      }
    }

    if (action === "reassign") {
      const { staffId, notes, adminId } = data;
      const assignment = await db.bookingAssignment.update({
        where: { bookingId },
        data: {
          staffId,
          notes,
          assignedBy: adminId,
          status: "assigned",
          assignedAt: new Date(),
          startedAt: null,
          completedAt: null,
        },
      });
      const booking = await db.booking.update({
        where: { id: bookingId },
        data: { assignedStaffId: staffId, updatedAt: new Date() },
      });
      return NextResponse.json({ assignment, booking });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
