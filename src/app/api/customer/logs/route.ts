import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

// GET /api/customer/logs — list activity logs for the current customer
export async function GET(req: NextRequest) {
  try {
    const customer = await requireAuth(["customer"]);

    const { searchParams } = req.nextUrl;
    const category = searchParams.get("category") || "all";
    const severity = searchParams.get("severity") || "all";
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");

    const conditions: Prisma.ActivityLogWhereInput[] = [
      { isArchived: false },
      { actorId: customer.id },
    ];

    if (category !== "all") {
      conditions.push({ category });
    }

    if (severity !== "all") {
      conditions.push({ severity });
    }

    if (search) {
      conditions.push({
        OR: [
          { actorName: { contains: search } },
          { action: { contains: search } },
          { targetName: { contains: search } },
          { details: { contains: search } },
        ],
      });
    }

    if (startDate && endDate) {
      conditions.push({
        createdAt: {
          gte: new Date(startDate + "T00:00:00"),
          lte: new Date(endDate + "T23:59:59"),
        },
      });
    } else if (startDate) {
      conditions.push({
        createdAt: {
          gte: new Date(startDate + "T00:00:00"),
        },
      });
    } else if (endDate) {
      conditions.push({
        createdAt: {
          lte: new Date(endDate + "T23:59:59"),
        },
      });
    }

    const where: Prisma.ActivityLogWhereInput = { AND: conditions };

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Error fetching customer activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
