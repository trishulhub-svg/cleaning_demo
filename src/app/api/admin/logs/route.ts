import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

// GET /api/admin/logs — list activity logs with filters
export async function GET(req: NextRequest) {
  try {
    await requireAuth(["admin"]);

    const { searchParams } = req.nextUrl;
    const category = searchParams.get("category") || "all";
    const severity = searchParams.get("severity") || "all";
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");

    const where: Record<string, unknown> = { isArchived: false };

    if (category !== "all") {
      where.category = category;
    }

    if (severity !== "all") {
      where.severity = severity;
    }

    if (search) {
      where.OR = [
        { actorName: { contains: search } },
        { actorEmail: { contains: search } },
        { action: { contains: search } },
        { targetName: { contains: search } },
        { details: { contains: search } },
      ];
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate + "T00:00:00"),
        lte: new Date(endDate + "T23:59:59"),
      };
    } else if (startDate) {
      where.createdAt = {
        gte: new Date(startDate + "T00:00:00"),
      };
    } else if (endDate) {
      where.createdAt = {
        lte: new Date(endDate + "T23:59:59"),
      };
    }

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
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
