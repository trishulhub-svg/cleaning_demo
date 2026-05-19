import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || "all";

    const where: Record<string, unknown> = {};
    if (status !== "all") {
      where.status = status;
    }

    const refunds = await db.refund.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            bookingDate: true,
            address: true,
            service: { select: { name: true } },
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
          },
        },
      },
    });

    const statusCounts = await db.refund.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const counts = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<string, number>
    );
    counts.all = Object.values(counts).reduce((a, b) => a + b, 0);

    return NextResponse.json({ refunds, statusCounts: counts });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { refundId, action, adminNotes } = body;

    if (!refundId) {
      return NextResponse.json(
        { error: "Refund ID is required" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const refund = await db.refund.update({
        where: { id: refundId },
        data: {
          status: "approved",
          adminNotes,
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ refund });
    }

    if (action === "reject") {
      const refund = await db.refund.update({
        where: { id: refundId },
        data: {
          status: "rejected",
          adminNotes,
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ refund });
    }

    if (action === "complete") {
      const refund = await db.refund.update({
        where: { id: refundId },
        data: {
          status: "completed",
          adminNotes,
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ refund });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating refund:", error);
    return NextResponse.json(
      { error: "Failed to update refund" },
      { status: 500 }
    );
  }
}
