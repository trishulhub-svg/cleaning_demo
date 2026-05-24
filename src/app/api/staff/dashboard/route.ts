import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth-helpers";

// Prevent Vercel from caching this route
export const dynamic = "force-dynamic";

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

    // Fetch staff assignments with booking details
    const rawAssignments = await db.bookingAssignment.findMany({
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

    // Safely serialize DateTime fields to ISO strings to prevent JSON.stringify failures
    const assignments = rawAssignments.map((a) => ({
      ...a,
      assignedAt: a.assignedAt ? new Date(a.assignedAt).toISOString() : null,
      startedAt: a.startedAt ? new Date(a.startedAt).toISOString() : null,
      completedAt: a.completedAt ? new Date(a.completedAt).toISOString() : null,
      booking: a.booking
        ? {
            ...a.booking,
            createdAt: a.booking.createdAt ? new Date(a.booking.createdAt).toISOString() : null,
            updatedAt: a.booking.updatedAt ? new Date(a.booking.updatedAt).toISOString() : null,
            completedAt: a.booking.completedAt ? new Date(a.booking.completedAt).toISOString() : null,
            cancelledAt: a.booking.cancelledAt ? new Date(a.booking.cancelledAt).toISOString() : null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      staff: {
        id: session.user.id,
        name: session.user.name,
      },
      assignments,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[API] GET /api/staff/dashboard error:", errorMessage, errorStack);
    return NextResponse.json(
      { success: false, message: "Internal server error.", debug: errorMessage },
      { status: 500 }
    );
  }
}
