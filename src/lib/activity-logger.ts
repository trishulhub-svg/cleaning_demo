import { db } from "@/lib/db"
import { headers } from "next/headers"

// ============ Types ============

export type ActorType = "super_admin" | "admin" | "staff" | "customer" | "system"
export type Category = "auth" | "admin_management" | "staff_management" | "booking" | "payment" | "system" | "security"
export type Severity = "low" | "medium" | "high" | "critical"
export type TargetType = "user" | "booking" | "payment" | "invoice" | "booking_assignment" | "staff" | "service" | "other"

interface SessionActor {
  userType: string
  id: number
  name: string
  email?: string
}

export interface LogParams {
  action: string
  category: Category
  targetType?: TargetType
  targetId?: number
  targetName?: string
  details?: Record<string, unknown>
}

// ============ Severity Detection ============

function determineSeverity(action: string): Severity {
  const criticalActions = [
    "admin_created",
    "admin_deleted",
    "super_admin_login",
    "super_admin_password_changed",
    "role_escalation",
    "data_export",
    "security_breach_detected",
    "system_compromised",
  ]

  const highActions = [
    "refund_approved",
    "refund_rejected",
    "refund_processed",
    "payment_failed",
    "payment_refunded",
    "booking_cancelled",
    "staff_deactivated",
    "staff_deleted",
    "customer_deleted",
    "mass_assignment",
    "failed_login_multiple",
    "password_reset_requested",
  ]

  const lowerAction = action.toLowerCase()

  if (criticalActions.some((a) => lowerAction.includes(a))) {
    return "critical"
  }

  if (highActions.some((a) => lowerAction.includes(a))) {
    return "high"
  }

  return "medium"
}

// ============ Map session userType to ActivityLog actorType ============

function mapActorType(userType: string): ActorType {
  switch (userType) {
    case "admin":
      return "admin"
    case "staff":
      return "staff"
    case "customer":
      return "customer"
    default:
      return "system"
  }
}

/**
 * Determine actorType from a session object that includes `role` field.
 * Admin users with role="super_admin" should be logged as "super_admin".
 */
function resolveActorType(session: SessionActor): ActorType {
  if (session.userType === "admin") {
    // We don't have `role` in SessionActor by default, but the session
    // object from auth-helpers.ts includes it. We check for it dynamically.
    const sessionWithRole = session as SessionActor & { role?: string }
    if (sessionWithRole.role === "super_admin") {
      return "super_admin"
    }
    return "admin"
  }
  return mapActorType(session.userType)
}

// ============ Context Extraction ============

async function getRequestContext(): Promise<{
  ipAddress: string | null
  userAgent: string | null
  requestUri: string | null
  sessionId: string | null
}> {
  try {
    const headersList = await headers()
    return {
      ipAddress: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip") || null,
      userAgent: headersList.get("user-agent") || null,
      requestUri: headersList.get("x-invoke-path") || headersList.get("x-nextjs-data") || null,
      sessionId: null, // Session ID can be populated by caller if available
    }
  } catch {
    // headers() can fail in non-request contexts (e.g., background jobs)
    return {
      ipAddress: null,
      userAgent: null,
      requestUri: null,
      sessionId: null,
    }
  }
}

// ============ Main Logger Function ============

/**
 * Log an activity event to the database.
 *
 * Can be used from server components, API routes, or server actions.
 * Automatically detects actor from session, severity from action, and
 * extracts request context (IP, user agent, URI) from headers.
 *
 * Errors are logged to console but never thrown — activity logging should
 * not break the primary operation.
 *
 * @example
 * // From an API route:
 * const session = await requireAuth()
 * await logActivity({
 *   action: "booking_cancelled",
 *   category: "booking",
 *   targetType: "booking",
 *   targetId: bookingId,
 *   targetName: `Booking #${bookingId}`,
 *   details: { reason, refundAmount },
 * }, session)
 *
 * @example
 * // System-generated log (no session):
 * await logActivity({
 *   action: "cron_cleanup_completed",
 *   category: "system",
 *   details: { recordsDeleted: 150 },
 * }, null)
 */
export async function logActivity(
  params: LogParams,
  session: SessionActor | null
): Promise<void> {
  const { action, category, targetType, targetId, targetName, details } = params

  try {
    const severity = determineSeverity(action)
    const ctx = await getRequestContext()

    let actorType: ActorType = "system"
    let actorId = 0
    let actorName = "System"
    let actorEmail: string | null = null

    if (session) {
      actorType = resolveActorType(session)
      actorId = session.id
      actorName = session.name || "Unknown"
      actorEmail = session.email || null
    }

    await db.activityLog.create({
      data: {
        actorType,
        actorId,
        actorName,
        actorEmail,
        action,
        category,
        severity,
        targetType: targetType || null,
        targetId: targetId ?? null,
        targetName: targetName || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        requestUri: ctx.requestUri,
        sessionId: ctx.sessionId,
      },
    })
  } catch (error) {
    // Activity logging should never break the primary operation.
    // Log the error to console for debugging but swallow it.
    console.error("[ActivityLogger] Failed to log activity:", {
      action: params.action,
      category: params.category,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

// ============ Convenience Wrappers ============

/**
 * Log an auth-related activity (login, logout, password change, etc.).
 */
export async function logAuthActivity(
  action: string,
  session: SessionActor | null,
  details?: Record<string, unknown>
): Promise<void> {
  return logActivity(
    { action, category: "auth", details },
    session
  )
}

/**
 * Log a booking-related activity (create, cancel, reschedule, complete, etc.).
 */
export async function logBookingActivity(
  action: string,
  session: SessionActor | null,
  targetId: number,
  targetName?: string,
  details?: Record<string, unknown>
): Promise<void> {
  return logActivity(
    {
      action,
      category: "booking",
      targetType: "booking",
      targetId,
      targetName,
      details,
    },
    session
  )
}

/**
 * Log a payment-related activity (payment received, refund, etc.).
 */
export async function logPaymentActivity(
  action: string,
  session: SessionActor | null,
  targetId?: number,
  targetName?: string,
  details?: Record<string, unknown>
): Promise<void> {
  return logActivity(
    {
      action,
      category: "payment",
      targetType: "payment",
      targetId,
      targetName,
      details,
    },
    session
  )
}

/**
 * Log a staff management activity (create, deactivate, assign, etc.).
 */
export async function logStaffActivity(
  action: string,
  session: SessionActor | null,
  targetId?: number,
  targetName?: string,
  details?: Record<string, unknown>
): Promise<void> {
  return logActivity(
    {
      action,
      category: "staff_management",
      targetType: "staff",
      targetId,
      targetName,
      details,
    },
    session
  )
}

/**
 * Log a security-related activity (failed login, suspicious activity, etc.).
 */
export async function logSecurityActivity(
  action: string,
  session: SessionActor | null,
  details?: Record<string, unknown>
): Promise<void> {
  return logActivity(
    { action, category: "security", details },
    session
  )
}
