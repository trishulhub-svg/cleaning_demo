import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

// Prevent Vercel from caching this route
export const dynamic = "force-dynamic";

// ============ GET /api/admin/staff/status ============
// Returns all staff with their current working status
export async function GET() {
  try {
    const admin = await requireAuth(["admin"]);

    const allStaff = await db.staff.findMany({
      include: {
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Get all in-progress assignments
    const inProgressAssignments = await db.bookingAssignment.findMany({
      where: {
        status: "in_progress",
      },
      select: {
        staffId: true,
      },
      distinct: ["staffId"],
    });

    const workingStaffIds = new Set(inProgressAssignments.map((a) => a.staffId));

    const staffWithStatus = allStaff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      isActive: s.isActive,
      createdAt: s.createdAt,
      _count: s._count,
      status: !s.isActive ? ("off_duty" as const) : workingStaffIds.has(s.id) ? ("working" as const) : ("available" as const),
    }));

    return NextResponse.json({ staff: staffWithStatus });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Error fetching staff status:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff status" },
      { status: 500 }
    );
  }
}
