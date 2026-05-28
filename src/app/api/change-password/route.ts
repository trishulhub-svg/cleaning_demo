import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth-helpers"
import { getAuthSession } from "@/lib/auth-helpers"
import { OTP_EXPIRY_MINUTES } from "@/lib/constants"

// ============ POST: Change Password ============
export async function POST(request: NextRequest) {
  try {
    // Get session to determine user type and validate identity
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { email, newPassword, purpose } = body as {
      email?: string
      newPassword?: string
      purpose?: string
    }

    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Email and new password are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify email matches session
    if (normalizedEmail !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Email does not match your account" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters long" }, { status: 400 })
    }
    if (newPassword.length > 128) {
      return NextResponse.json({ success: false, error: "Password must be less than 128 characters" }, { status: 400 })
    }
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({ success: false, error: "Password must contain at least one uppercase letter" }, { status: 400 })
    }
    if (!/[a-z]/.test(newPassword)) {
      return NextResponse.json({ success: false, error: "Password must contain at least one lowercase letter" }, { status: 400 })
    }
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json({ success: false, error: "Password must contain at least one number" }, { status: 400 })
    }

    // Verify a verified OTP exists for this password reset
    const otpPurpose = purpose || "password_reset"
    const verifiedOtp = await db.otpLog.findFirst({
      where: {
        email: normalizedEmail,
        purpose: otpPurpose,
        verifiedAt: { not: null },
      },
      orderBy: { verifiedAt: "desc" },
    })

    if (!verifiedOtp) {
      return NextResponse.json(
        { success: false, error: "Please verify your email with a code before changing your password" },
        { status: 400 }
      )
    }

    // Check that the verified OTP is not too old
    const otpVerifiedMaxAge = OTP_EXPIRY_MINUTES * 60 * 1000
    if (
      verifiedOtp.verifiedAt &&
      Date.now() - verifiedOtp.verifiedAt.getTime() > otpVerifiedMaxAge
    ) {
      return NextResponse.json(
        { success: false, error: "Verification has expired. Please request a new code." },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password based on user type from session
    const { userType, id } = session.user

    if (userType === "admin") {
      await db.admin.update({
        where: { id },
        data: { password: hashedPassword },
      })
    } else if (userType === "staff") {
      await db.staff.update({
        where: { id },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      })
    } else if (userType === "customer") {
      await db.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      })
    }

    // Clear the verified OTP
    await db.otpLog.update({
      where: { id: verifiedOtp.id },
      data: { otpCode: `__used_${Date.now()}` },
    })

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    console.error("[Change Password] POST error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}
