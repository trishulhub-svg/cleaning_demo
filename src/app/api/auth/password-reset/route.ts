import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/auth-helpers"
import { sendPasswordResetEmail } from "@/lib/email"
import {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_PURPOSES,
  PASSWORD_RESET_EXPIRY_MINUTES,
} from "@/lib/constants"

function generateOTP(length: number = OTP_LENGTH): string {
  const digits = "0123456789"
  let otp = ""
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)]
  }
  return otp
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// ============ POST: Request Password Reset ============
// Accepts: { email }
// Creates an OTP log entry and sends a password reset email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if the email exists in any of the user tables
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    const admin = !user ? await db.admin.findUnique({ where: { email: normalizedEmail } }) : null
    const staff = !user && !admin ? await db.staff.findUnique({ where: { email: normalizedEmail } }) : null

    // Always return a generic success message to prevent email enumeration
    if (!user && !admin && !staff) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset code.",
      })
    }

    // Rate limiting: check for recent password reset OTPs (within last 60 seconds)
    const recentOtp = await db.otpLog.findFirst({
      where: {
        email: normalizedEmail,
        purpose: OTP_PURPOSES.PASSWORD_RESET,
        sentAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { sentAt: "desc" },
    })

    if (recentOtp) {
      const elapsed = Math.floor((Date.now() - recentOtp.sentAt.getTime()) / 1000)
      const waitSeconds = 60 - elapsed
      return NextResponse.json(
        {
          success: true,
          message: `Please wait ${waitSeconds} seconds before requesting another code`,
          retryAfter: waitSeconds,
        },
        { status: 429 }
      )
    }

    // Generate OTP and reset token
    const otp = generateOTP()
    const resetToken = generateResetToken()
    const resetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000)

    // Determine the user ID for the OTP log
    const userId = user ? user.id : admin ? admin.id : staff ? staff.id : null

    // Store OTP in database
    await db.otpLog.create({
      data: {
        email: normalizedEmail,
        otpCode: otp,
        otpType: "email",
        purpose: OTP_PURPOSES.PASSWORD_RESET,
        userId,
        sentAt: new Date(),
      },
    })

    // Store the reset token on the appropriate user record
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      })
    } else if (staff) {
      await db.staff.update({
        where: { id: staff.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      })
    }
    // Admin table does not have passwordResetToken fields, so we skip for admins
    // Admins can still use OTP to verify identity, and a separate flow handles their reset

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(normalizedEmail, otp)

    if (!emailResult.success) {
      console.warn(`[Password Reset] Failed to send email to ${normalizedEmail}: ${emailResult.error}`)
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset code.",
    })
  } catch (error) {
    console.error("[Password Reset] Request error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

// ============ PUT: Verify Reset OTP ============
// Accepts: { email, otp }
// Verifies the OTP code before allowing password reset
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp } = body

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and OTP code are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedOtp = otp.trim()

    // Find the most recent unverified OTP for password reset (NOT filtered by otpCode)
    const otpRecord = await db.otpLog.findFirst({
      where: {
        email: normalizedEmail,
        purpose: OTP_PURPOSES.PASSWORD_RESET,
        verifiedAt: null,
      },
      orderBy: { sentAt: "desc" },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification code" },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    const expiresAt = new Date(otpRecord.sentAt.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000)
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Check attempt limit
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new code." },
        { status: 429 }
      )
    }

    // Verify the OTP code manually (since query is not filtered by otpCode)
    if (normalizedOtp !== otpRecord.otpCode) {
      // Increment attempt counter for wrong code
      await db.otpLog.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      })
      const remainingAttempts = OTP_MAX_ATTEMPTS - otpRecord.attempts - 1
      return NextResponse.json(
        {
          success: false,
          error: `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`,
        },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await db.otpLog.update({
      where: { id: otpRecord.id },
      data: { verifiedAt: new Date() },
    })

    // Return the user type so the frontend knows where to reset the password
    let userType: string | null = null
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, passwordResetToken: true, passwordResetExpires: true },
    })
    if (user && user.passwordResetToken) {
      userType = "customer"
    } else {
      const staff = await db.staff.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, passwordResetToken: true, passwordResetExpires: true },
      })
      if (staff && staff.passwordResetToken) {
        userType = "staff"
      } else {
        const admin = await db.admin.findUnique({ where: { email: normalizedEmail } })
        if (admin) {
          userType = "admin"
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Verification code verified successfully. You may now reset your password.",
      data: { email: normalizedEmail, userType },
    })
  } catch (error) {
    console.error("[Password Reset] Verify OTP error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

// ============ PATCH: Reset Password ============
// Accepts: { email, newPassword }
// Requires that a valid OTP was verified and a reset token exists
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newPassword } = body

    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Email and new password are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }
    if (newPassword.length > 128) {
      return NextResponse.json(
        { success: false, error: "Password must be less than 128 characters" },
        { status: 400 }
      )
    }
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { success: false, error: "Password must contain at least one uppercase letter" },
        { status: 400 }
      )
    }
    if (!/[a-z]/.test(newPassword)) {
      return NextResponse.json(
        { success: false, error: "Password must contain at least one lowercase letter" },
        { status: 400 }
      )
    }
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { success: false, error: "Password must contain at least one number" },
        { status: 400 }
      )
    }

    // Verify a verified OTP exists for this password reset
    const verifiedOtp = await db.otpLog.findFirst({
      where: {
        email: normalizedEmail,
        purpose: OTP_PURPOSES.PASSWORD_RESET,
        verifiedAt: { not: null },
      },
      orderBy: { verifiedAt: "desc" },
    })

    if (!verifiedOtp) {
      return NextResponse.json(
        { success: false, error: "Please verify your email with a code before resetting your password" },
        { status: 400 }
      )
    }

    // Check that the verified OTP is not too old (within 10 minutes of verification)
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

    // Update password for the appropriate user type
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })

    if (user) {
      // Check for valid reset token and expiry
      if (!user.passwordResetToken || !user.passwordResetExpires) {
        return NextResponse.json(
          { success: false, error: "No valid reset request found. Please start the reset process again." },
          { status: 400 }
        )
      }
      if (new Date() > user.passwordResetExpires) {
        return NextResponse.json(
          { success: false, error: "Reset request has expired. Please request a new code." },
          { status: 400 }
        )
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      })
    } else {
      // Check staff
      const staff = await db.staff.findUnique({ where: { email: normalizedEmail } })
      if (staff) {
        if (!staff.passwordResetToken || !staff.passwordResetExpires) {
          return NextResponse.json(
            { success: false, error: "No valid reset request found. Please start the reset process again." },
            { status: 400 }
          )
        }
        if (new Date() > staff.passwordResetExpires) {
          return NextResponse.json(
            { success: false, error: "Reset request has expired. Please request a new code." },
            { status: 400 }
          )
        }

        await db.staff.update({
          where: { id: staff.id },
          data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null,
            mustChangePassword: false,
          },
        })
      } else {
        // Check admin (no reset token fields, rely on verified OTP)
        const admin = await db.admin.findUnique({ where: { email: normalizedEmail } })
        if (admin) {
          await db.admin.update({
            where: { id: admin.id },
            data: { password: hashedPassword },
          })
        } else {
          return NextResponse.json(
            { success: false, error: "No account found with this email" },
            { status: 404 }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now sign in with your new password.",
    })
  } catch (error) {
    console.error("[Password Reset] Reset error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
