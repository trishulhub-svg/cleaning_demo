import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth-helpers";

// Prevent Vercel from caching this route
export const dynamic = "force-dynamic";

// ============ GET /api/staff/dashboard ============
// Returns the staff member's assignments for the dashboard.
// Auth is verified server-side via the custom JWT cookie.
export async function GET() {
  // --- Auth check ---
  let session;
  try {
    session = await getAuthSession();
  } catch (authErr) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    console.error("[API] /api/staff/dashboard auth error:", msg);
    return NextResponse.json(
      { success: false, message: `Auth error: ${msg}` },
      { status: 401 }
    );
  }

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  if (session.user.userType !== "staff") {
    return NextResponse.json(
      { success: false, message: "Forbidden: staff access required." },
      { status: 403 }
    );
  }

  const staffId = session.user.id;

  // --- DB query (isolated try-catch) ---
  let assignments;
  try {
    assignments = await db.bookingAssignment.findMany({
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
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    const stack = dbErr instanceof Error ? dbErr.stack : undefined;
    console.error("[API] /api/staff/dashboard DB error:", msg, stack);
    // Return empty dashboard with error visible instead of 500
    return NextResponse.json({
      success: true,
      staff: { id: session.user.id, name: session.user.name },
      assignments: [],
      _dbError: msg,
    });
  }

  // --- Safe serialization ---
  let safeAssignments;
  try {
    safeAssignments = assignments.map((a) => ({
      ...a,
      assignedAt: a.assignedAt instanceof Date ? a.assignedAt.toISOString() : (a.assignedAt ?? null),
      startedAt: a.startedAt instanceof Date ? a.startedAt.toISOString() : (a.startedAt ?? null),
      completedAt: a.completedAt instanceof Date ? a.completedAt.toISOString() : (a.completedAt ?? null),
      booking: a.booking
        ? {
            ...a.booking,
            createdAt: a.booking.createdAt instanceof Date ? a.booking.createdAt.toISOString() : (a.booking.createdAt ?? null),
            updatedAt: a.booking.updatedAt instanceof Date ? a.booking.updatedAt.toISOString() : (a.booking.updatedAt ?? null),
            completedAt: a.booking.completedAt instanceof Date ? a.booking.completedAt.toISOString() : (a.booking.completedAt ?? null),
            cancelledAt: a.booking.cancelledAt instanceof Date ? a.booking.cancelledAt.toISOString() : (a.booking.cancelledAt ?? null),
          }
        : null,
    }));
  } catch (serErr) {
    const msg = serErr instanceof Error ? serErr.message : String(serErr);
    console.error("[API] /api/staff/dashboard serialization error:", msg);
    // Fall back: return raw assignments (Prisma Dates serialize via JSON.stringify)
    safeAssignments = assignments;
  }

  return NextResponse.json({
    success: true,
    staff: {
      id: session.user.id,
      name: session.user.name,
    },
    assignments: safeAssignments,
  });
}
