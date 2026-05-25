import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendOTPEmail } from "@/lib/email"
import {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_PURPOSES,
} from "@/lib/constants"

function generateOTP(length: number = OTP_LENGTH): string {
  const digits = "0123456789"
  let otp = ""
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)]
  }
  return otp
}

// ============ POST: Send OTP ============
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, purpose, userId } = body

    if (!email || !purpose) {
      return NextResponse.json(
        { success: false, error: "Email and purpose are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Validate purpose
    const validPurposes = Object.values(OTP_PURPOSES) as string[]
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { success: false, error: `Invalid purpose. Must be one of: ${validPurposes.join(", ")}` },
        { status: 400 }
      )
    }

    // Rate limiting: check for recent OTPs (within last 60 seconds)
    const recentOtp = await db.otpLog.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        sentAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { sentAt: "desc" },
    })

    if (recentOtp) {
      const elapsed = Math.floor((Date.now() - recentOtp.sentAt.getTime()) / 1000)
      const waitSeconds = 60 - elapsed
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting a new code`,
        },
        { status: 429 }
      )
    }

    // Generate OTP
    const otp = generateOTP()

    // Store OTP in database
    await db.otpLog.create({
      data: {
        email: normalizedEmail,
        otpCode: otp,
        otpType: "email",
        purpose,
        userId: userId || null,
        sentAt: new Date(),
      },
    })

    // Send OTP email
    const emailResult = await sendOTPEmail(normalizedEmail, otp, purpose)

    if (!emailResult.success) {
      console.warn(`[OTP] Failed to send OTP to ${normalizedEmail}: ${emailResult.error}`)
      // Still return success so we don't leak email info, but log the issue
    }

    return NextResponse.json({
      success: true,
      message: "Verification code has been sent to your email",
      data: {
        email: normalizedEmail,
        purpose,
        emailSent: emailResult.success,
      },
    })
  } catch (error) {
    console.error("[OTP] Send error:", error)

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

// ============ PUT: Verify OTP ============
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp, purpose } = body

    if (!email || !otp || !purpose) {
      return NextResponse.json(
        { success: false, error: "Email, OTP code, and purpose are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedOtp = otp.trim()

    // Find the most recent unverified OTP for this email and purpose
    const otpRecord = await db.otpLog.findFirst({
      where: {
        email: normalizedEmail,
        otpCode: normalizedOtp,
        purpose,
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

    // Increment attempt counter
    await db.otpLog.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    })

    // Verify the OTP code
    if (normalizedOtp !== otpRecord.otpCode) {
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

    // If this was an email verification OTP, update the user's emailVerified flag
    if (purpose === OTP_PURPOSES.EMAIL_VERIFICATION || purpose === OTP_PURPOSES.REGISTRATION) {
      if (otpRecord.userId) {
        await db.user.update({
          where: { id: otpRecord.userId },
          data: { emailVerified: true },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Verification code verified successfully",
      data: {
        email: normalizedEmail,
        purpose,
      },
    })
  } catch (error) {
    console.error("[OTP] Verify error:", error)

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
