import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth-helpers"
import { getSetting, getSettings, setSetting, invalidateSettingCache } from "@/lib/settings"

// Keys that are sensitive and need password verification to save
const SENSITIVE_KEYS = new Set([
  "stripe_secret_key",
  "stripe_webhook_secret",
  "smtp_pass",
  "smtp_user",
])

// Map internal key to env var name
const KEY_TO_ENV: Record<string, string> = {
  stripe_publishable_key: "STRIPE_PUBLISHABLE_KEY",
  stripe_secret_key: "STRIPE_SECRET_KEY",
  stripe_webhook_secret: "STRIPE_WEBHOOK_SECRET",
  smtp_host: "SMTP_HOST",
  smtp_port: "SMTP_PORT",
  smtp_user: "SMTP_USER",
  smtp_pass: "SMTP_PASS",
  smtp_from_name: "SMTP_FROM_NAME",
  smtp_from_email: "SMTP_FROM_EMAIL",
}

// Keys that should be masked in GET responses
const MASKED_KEYS = new Set([
  "stripe_secret_key",
  "stripe_webhook_secret",
  "smtp_pass",
  "smtp_user",
])

function maskValue(value: string): string {
  if (!value || value.length <= 4) return value ? "••••" : ""
  const prefix = value.startsWith("sk_test_") || value.startsWith("sk_live_")
    ? value.split("_").slice(0, 2).join("_") + "_"
    : ""
  const last4 = value.slice(-4)
  return `${prefix}••••${last4}`
}

// ============ GET: Read Settings ============
export async function GET() {
  try {
    const admin = await requireAuth(["admin"])

    if (admin.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // All keys we want to fetch
    const allKeys = [
      // Company
      "company_name",
      "company_email",
      "company_phone",
      "company_address",
      "whatsapp_number",
      // Stripe
      "stripe_publishable_key",
      "stripe_secret_key",
      "stripe_webhook_secret",
      // SMTP
      "smtp_host",
      "smtp_port",
      "smtp_user",
      "smtp_pass",
      "smtp_from_name",
      "smtp_from_email",
      // Pricing
      "discount_percentage",
    ]

    const values = await getSettings(allKeys)

    const result: Record<string, { value: string; masked: boolean; source: "db" | "env" | "default" }> = {}

    for (const key of allKeys) {
      const dbSetting = await db.siteSettings.findUnique({ where: { key } })
      const envKey = KEY_TO_ENV[key]
      const envValue = envKey ? process.env[envKey] : undefined

      let source: "db" | "env" | "default" = "default"
      let displayValue = values[key]

      if (dbSetting) {
        source = "db"
      } else if (envValue) {
        source = "env"
      }

      const masked = MASKED_KEYS.has(key) && !!displayValue
      result[key] = {
        value: masked ? maskValue(displayValue) : displayValue,
        masked,
        source,
      }
    }

    // Defaults for company settings if not set
    if (!result["company_name"].value) result["company_name"].value = "GreenLeaf Cleaning"
    if (!result["discount_percentage"].value) result["discount_percentage"].value = "5"

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("redirect") || error.message.includes("login"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[Admin Settings] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// ============ PUT: Update Settings ============
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAuth(["admin"])

    if (admin.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { settings, confirmPassword } = body as {
      settings: Record<string, string>
      confirmPassword?: string
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings object" }, { status: 400 })
    }

    // Check if any sensitive keys are being saved
    const sensitiveEntries = Object.entries(settings).filter(([key]) => SENSITIVE_KEYS.has(key))

    if (sensitiveEntries.length > 0) {
      // Require password verification for sensitive keys
      if (!confirmPassword) {
        return NextResponse.json(
          { error: "Password confirmation required to save sensitive settings" },
          { status: 400 }
        )
      }

      // Look up the admin from DB
      const adminRecord = await db.admin.findUnique({
        where: { id: admin.id },
        select: { password: true },
      })

      if (!adminRecord) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 })
      }

      const valid = await verifyPassword(confirmPassword, adminRecord.password)
      if (!valid) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 403 })
      }
    }

    // Validate discount_percentage
    if (settings.discount_percentage !== undefined) {
      const num = Number(settings.discount_percentage)
      if (isNaN(num) || num < 0 || num > 100) {
        return NextResponse.json(
          { error: "Discount percentage must be between 0 and 100" },
          { status: 400 }
        )
      }
    }

    // Save each setting
    for (const [key, value] of Object.entries(settings)) {
      if (value === undefined || value === null) continue
      await setSetting(key, String(value))
    }

    // Invalidate relevant caches
    invalidateSettingCache()

    return NextResponse.json({ success: true, message: "Settings saved successfully" })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("redirect") || error.message.includes("login"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[Admin Settings] PUT error:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
