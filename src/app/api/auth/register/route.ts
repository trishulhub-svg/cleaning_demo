import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth-helpers"
import { sendOTPEmail } from "@/lib/email"
import { OTP_LENGTH, OTP_EXPIRY_MINUTES, OTP_PURPOSES } from "@/lib/constants"

function generateOTP(length: number = OTP_LENGTH): string {
  const digits = "0123456789"
  let otp = ""
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)]
  }
  return otp
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" }
  }
  if (password.length > 128) {
    return { valid: false, message: "Password must be less than 128 characters" }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" }
  }
  return { valid: true, message: "" }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, password } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    // Validate name
    if (name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Name must be at least 2 characters long" },
        { status: 400 }
      )
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be less than 100 characters" },
        { status: 400 }
      )
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim()
    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 }
      )
    }

    // Validate phone if provided
    if (phone && phone.trim().length > 0) {
      const cleanedPhone = phone.replace(/[\s\-()]/g, "")
      if (cleanedPhone.length < 7 || cleanedPhone.length > 20) {
        return NextResponse.json(
          { success: false, error: "Please provide a valid phone number" },
          { status: 400 }
        )
      }
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Check for duplicate email in User table
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Also check Admin and Staff tables to prevent cross-table duplicates
    const existingAdmin = await db.admin.findUnique({
      where: { email: normalizedEmail },
    })
    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const existingStaff = await db.staff.findUnique({
      where: { email: normalizedEmail },
    })
    if (existingStaff) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Create the user
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        password: hashedPassword,
        role: "customer",
        emailVerified: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })

    // Generate OTP for email verification
    const otp = generateOTP()

    // Store OTP in OtpLog
    await db.otpLog.create({
      data: {
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        otpCode: otp,
        otpType: "email",
        purpose: OTP_PURPOSES.REGISTRATION,
        userId: user.id,
        sentAt: new Date(),
      },
    })

    // Send OTP email
    const emailResult = await sendOTPEmail(normalizedEmail, otp, OTP_PURPOSES.REGISTRATION)
    if (!emailResult.success) {
      console.warn(`[Register] Failed to send OTP email to ${normalizedEmail}: ${emailResult.error}`)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully. Please verify your email with the OTP sent to your inbox.",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailSent: emailResult.success,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Register] Registration error:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
