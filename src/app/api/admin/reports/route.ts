import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const dateFrom = searchParams.get("from") || "";
    const dateTo = searchParams.get("to") || "";

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

    // Build date filter
    const dateWhere: Record<string, unknown> = {};
    if (dateFrom && dateTo) {
      dateWhere.bookingDate = { gte: dateFrom, lte: dateTo };
    }

    // Revenue summaries
    const [totalRevenue, monthlyRevenue, weeklyRevenue, todayRevenue] = await Promise.all([
      db.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          bookingStatus: { in: ["completed", "confirmed"] },
          ...dateWhere,
        },
      }),
      db.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          bookingStatus: { in: ["completed", "confirmed"] },
          bookingDate: { gte: firstOfMonth },
        },
      }),
      db.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          bookingStatus: { in: ["completed", "confirmed"] },
          bookingDate: { gte: startOfWeekStr },
        },
      }),
      db.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          bookingStatus: { in: ["completed", "confirmed"] },
          bookingDate: todayStr,
        },
      }),
    ]);

    // Revenue by payment method
    const paymentMethodRevenue = await db.booking.groupBy({
      by: ["paymentMethod"],
      where: {
        bookingStatus: { in: ["completed", "confirmed"] },
        ...dateWhere,
      },
      _sum: { totalPrice: true },
      _count: { id: true },
    });

    // Booking status breakdown
    const statusBreakdown = await db.booking.groupBy({
      by: ["bookingStatus"],
      where: dateWhere,
      _count: { id: true },
      _sum: { totalPrice: true },
    });

    // Top services by revenue
    const topServices = await db.booking.groupBy({
      by: ["serviceId"],
      where: {
        bookingStatus: { in: ["completed", "confirmed"] },
        ...dateWhere,
      },
      _sum: { totalPrice: true },
      _count: { id: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 10,
    });

    // Get service names for top services
    const serviceIds = topServices.map((s) => s.serviceId);
    const serviceNames = await db.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });

    const serviceNameMap = serviceNames.reduce(
      (acc, s) => ({ ...acc, [s.id]: s.name }),
      {} as Record<number, string>
    );

    // Refund summary
    const refundSummary = await db.refund.aggregate({
      _sum: { amount: true },
      where: {
        status: { in: ["approved", "processing", "completed"] },
      },
    });

    const pendingRefunds = await db.refund.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { status: "pending" },
    });

    // Daily revenue for the last 30 days (for chart)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const dailyRevenue = await db.booking.groupBy({
      by: ["bookingDate"],
      where: {
        bookingStatus: { in: ["completed", "confirmed"] },
        bookingDate: { gte: thirtyDaysAgoStr },
      },
      _sum: { totalPrice: true },
      _count: { id: true },
      orderBy: { bookingDate: "asc" },
    });

    return NextResponse.json({
      revenue: {
        total: totalRevenue._sum.totalPrice || 0,
        thisMonth: monthlyRevenue._sum.totalPrice || 0,
        thisWeek: weeklyRevenue._sum.totalPrice || 0,
        today: todayRevenue._sum.totalPrice || 0,
      },
      paymentMethods: paymentMethodRevenue.map((p) => ({
        method: p.paymentMethod || "Unknown",
        revenue: p._sum.totalPrice || 0,
        count: p._count.id,
      })),
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.bookingStatus,
        count: s._count.id,
        revenue: s._sum.totalPrice || 0,
      })),
      topServices: topServices.map((s) => ({
        serviceId: s.serviceId,
        serviceName: serviceNameMap[s.serviceId] || "Unknown",
        revenue: s._sum.totalPrice || 0,
        bookings: s._count.id,
      })),
      refunds: {
        totalProcessed: refundSummary._sum.amount || 0,
        pendingAmount: pendingRefunds._sum.amount || 0,
        pendingCount: pendingRefunds._count.id,
      },
      dailyRevenue,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
