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

    if (session.user.userType !== "staff") {
      return NextResponse.json(
        { success: false, message: "Forbidden: staff access required." },
        { status: 403 }
      );
    }

    const assignments = await db.bookingAssignment.findMany({
      where: { staffId: session.user.id },
      include: {
        booking: {
          select: {
            id: true,
            bookingDate: true,
            bookingTime: true,
            address: true,
            accessNotes: true,
            totalPrice: true,
            bookingStatus: true,
            paymentStatus: true,
            paymentMethod: true,
            guestName: true,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[API] GET /api/staff/dashboard error:", errorMessage);
    return NextResponse.json(
      { success: false, message: "Internal server error.", debug: errorMessage },
      { status: 500 }
    );
  }
}
