import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    // ── Auth check: admin only ──
    await requireAuth(['admin']);

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

    // Total bookings
    const totalBookings = await db.booking.count();

    // Total revenue (completed bookings)
    const revenueData = await db.booking.aggregate({
      _sum: { totalPrice: true },
      where: {
        bookingStatus: { in: ["completed", "confirmed"] },
      },
    });

    // Monthly revenue
    const monthlyRevenueData = await db.booking.aggregate({
      _sum: { totalPrice: true },
      where: {
        bookingStatus: { in: ["completed", "confirmed"] },
        bookingDate: { gte: firstOfMonth },
      },
    });

    // Pending bookings
    const pendingBookings = await db.booking.count({
      where: { bookingStatus: "pending" },
    });

    // Pending refunds
    const pendingRefunds = await db.refund.count({
      where: { status: "pending" },
    });

    // Total customers
    const totalCustomers = await db.user.count();

    // Total staff
    const totalStaff = await db.staff.count({
      where: { isActive: true },
    });

    // Today's assignments
    const todayAssignments = await db.bookingAssignment.findMany({
      where: {
        booking: { bookingDate: today },
        status: { in: ["assigned", "in_progress"] },
      },
      include: {
        booking: {
          include: {
            service: { select: { name: true } },
            user: { select: { name: true, email: true } },
          },
        },
        staff: { select: { name: true, phone: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    const todayAssignmentsCount = todayAssignments.length;

    // Recent bookings (5 most recent)
    const recentBookings = await db.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
        assignedStaff: { select: { name: true } },
      },
    });

    // Pending bookings needing attention (5)
    const pendingAttention = await db.booking.findMany({
      where: { bookingStatus: "pending" },
      take: 5,
      orderBy: { createdAt: "asc" },
      include: {
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    // Booking status counts
    const statusCounts = await db.booking.groupBy({
      by: ["bookingStatus"],
      _count: { id: true },
    });

    return NextResponse.json({
      stats: {
        totalBookings,
        totalRevenue: revenueData._sum.totalPrice || 0,
        monthlyRevenue: monthlyRevenueData._sum.totalPrice || 0,
        pendingBookings,
        pendingRefunds,
        totalCustomers,
        totalStaff,
        todayAssignments: todayAssignmentsCount,
      },
      recentBookings,
      pendingAttention,
      todayAssignments,
      statusCounts: statusCounts.reduce(
        (acc, item) => {
          acc[item.bookingStatus] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("redirect")) {
      throw error; // Let auth redirects pass through
    }
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
