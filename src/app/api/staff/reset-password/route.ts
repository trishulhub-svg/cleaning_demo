import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-helpers";

// ============ POST /api/staff/reset-password ============
// Two-step flow:
//  Step 1: Validate token — body: { token, action: "validate" }
//  Step 2: Reset password — body: { token, action: "reset", newPassword, confirmPassword }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, newPassword, confirmPassword } = body as {
      token: string;
      action: "validate" | "reset";
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!token || !action) {
      return NextResponse.json(
        { success: false, message: "Token and action are required." },
        { status: 400 }
      );
    }

    // Look up the reset record
    const resetRecord = await db.staffPasswordReset.findUnique({
      where: { token },
      include: {
        staff: { select: { id: true, name: true, email: true, isActive: true } },
      },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, message: "Invalid or unknown reset token." },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetRecord.usedAt) {
      return NextResponse.json(
        { success: false, message: "This reset link has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > resetRecord.expiredAt) {
      return NextResponse.json(
        { success: false, message: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if staff member is active
    if (!resetRecord.staff.isActive) {
      return NextResponse.json(
        { success: false, message: "Your account has been deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    // ============ Step 1: Validate token ============
    if (action === "validate") {
      return NextResponse.json({
        success: true,
        message: "Token is valid.",
        data: {
          staffName: resetRecord.staff.name,
          staffEmail: resetRecord.staff.email,
        },
      });
    }

    // ============ Step 2: Reset password ============
    if (action === "reset") {
      if (!newPassword || !confirmPassword) {
        return NextResponse.json(
          { success: false, message: "New password and confirmation are required." },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, message: "Passwords do not match." },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(newPassword);

      // Update staff password and clear reset fields, mark token as used — all in a transaction
      await db.$transaction([
        db.staff.update({
          where: { id: resetRecord.staffId },
          data: {
            password: hashedPassword,
            tempPassword: null,
            mustChangePassword: false,
            passwordResetToken: null,
            passwordResetExpires: null,
            updatedAt: new Date(),
          },
        }),
        db.staffPasswordReset.update({
          where: { id: resetRecord.id },
          data: { usedAt: new Date() },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Password has been reset successfully. You will be redirected to login.",
      });
    }

    return NextResponse.json(
      { success: false, message: `Invalid action: "${action}".` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API] POST /api/staff/reset-password error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
