import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth-helpers"

// ============ GET: Admin Profile ============
export async function GET() {
  try {
    const admin = await requireAuth(["admin"])
    const record = await db.admin.findUnique({
      where: { id: admin.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    if (!record) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("redirect") || error.message.includes("login"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// ============ PUT: Update Admin Profile ============
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAuth(["admin"])
    const body = await request.json()
    const { name, email, confirmPassword } = body as {
      name?: string
      email?: string
      confirmPassword?: string
    }

    if (!confirmPassword) {
      return NextResponse.json(
        { error: "Current password is required to update profile" },
        { status: 400 }
      )
    }

    const record = await db.admin.findUnique({
      where: { id: admin.id },
      select: { password: true },
    })
    if (!record) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    const valid = await verifyPassword(confirmPassword, record.password)
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 })
    }

    const updates: Record<string, string> = {}
    if (name && name.trim()) updates.name = name.trim()
    if (email && email.trim()) updates.email = email.trim()
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 })
    }

    const updated = await db.admin.update({
      where: { id: admin.id },
      data: { ...updates, updatedAt: new Date() },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("redirect") || error.message.includes("login"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
