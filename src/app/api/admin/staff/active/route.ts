import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    // ── Auth check: admin only ──
    await requireAuth(['admin']);

    const staff = await db.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, phone: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ staff });
  } catch (error) {
    if (error instanceof Error && error.message.includes("redirect")) {
      throw error; // Let auth redirects pass through
    }
    console.error("Error fetching active staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}
