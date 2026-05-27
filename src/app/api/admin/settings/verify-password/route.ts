import { NextRequest, NextResponse } from "next/server"
import { requireAuth, verifyPassword } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

// ============ POST: Verify Admin Password ============
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAuth(["admin"])

    if (admin.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { password } = body as { password?: string }

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const adminRecord = await db.admin.findUnique({
      where: { id: admin.id },
      select: { password: true },
    })

    if (!adminRecord) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    const valid = await verifyPassword(password, adminRecord.password)
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 })
    }

    return NextResponse.json({ success: true, message: "Password verified" })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("redirect") || error.message.includes("login"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[Verify Password] POST error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
