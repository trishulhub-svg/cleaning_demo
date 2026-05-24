import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth-helpers";

// ============ GET /api/staff/dashboard ============
// Returns the staff member's assignments for the dashboard.
// Auth is verified server-side via the custom JWT cookie.
export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    // Verify user is staff type
    if (session.user.userType !== "staff") {
      return NextResponse.json(
        { success: false, message: "Forbidden: staff access required." },
        { status: 403 }
      );
    }

    const staffId = session.user.id;

    // Fetch staff assignments with booking details (same includes as original server component)
    const assignments = await db.bookingAssignment.findMany({
      where: { staffId },
      include: {
        booking: {
          include: {
            service: { select: { name: true, durationHours: true } },
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: session.user.id,
        name: session.user.name,
      },
      assignments,
    });
  } catch (error) {
    console.error("[API] GET /api/staff/dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
