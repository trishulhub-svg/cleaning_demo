import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { sendEmail } from "@/lib/email"
import { getSetting } from "@/lib/settings"

// ============ POST: Send Test Email ============
export async function POST() {
  try {
    const admin = await requireAuth(["admin"])

    if (admin.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Try sending a test email to the admin's email
    const to = admin.email
    const appName = await getSetting("company_name", "GreenLeaf Cleaning")

    const result = await sendEmail(
      to,
      `SMTP Test — ${appName}`,
      `
      <div style="padding: 20px; text-align: center;">
        <h2 style="color: #16a34a;">Email Configuration Test</h2>
        <p>SMTP settings are working correctly!</p>
        <p style="color: #666; font-size: 14px;">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
      `
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send test email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Test email sent to " + to })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("redirect") || error.message.includes("login"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[Test Email] POST error:", error)
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 })
  }
}
