import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const staff = await db.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, phone: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Error fetching active staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}
