import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAuth, verifyPassword } from "@/lib/auth-helpers";
import { logActivity, logAuthActivity } from "@/lib/activity-logger";

// ============ GET /api/admin/admins — super_admin lists all admins ============
export async function GET() {
  try {
    const admin = await requireAuth(["admin"]);

    // Only super_admin can list admins
    if (admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: super_admin access required." },
        { status: 403 }
      );
    }

    const admins = await db.admin.findMany({
      where: {
        id: { not: admin.id },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ admins });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}

// ============ POST /api/admin/admins — super_admin creates a new admin ============
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth(["admin"]);

    // Only super_admin can create admins
    if (admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: only super_admin can create admin accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, confirmPassword } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await db.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json(
        { error: "An admin with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newAdmin = await db.admin.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: "admin",
        createdBy: admin.id,
      },
    });

    // Log
    await logActivity(
      {
        action: "admin_created",
        category: "admin_management",
        targetType: "user",
        targetId: newAdmin.id,
        targetName: newAdmin.name,
        details: { email: newAdmin.email },
      },
      { userType: "admin", id: admin.id, name: admin.name, email: admin.email, role: admin.role }
    );

    return NextResponse.json(
      { success: true, admin: { id: newAdmin.id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Failed to create admin." },
      { status: 500 }
    );
  }
}

// ============ PATCH /api/admin/admins — super_admin manages admins ============
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAuth(["admin"]);

    // Only super_admin can manage admins
    if (admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: only super_admin can manage admin accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { adminId, action, currentPassword } = body;

    if (!adminId || !action) {
      return NextResponse.json(
        { error: "Admin ID and action are required." },
        { status: 400 }
      );
    }

    const targetAdmin = await db.admin.findUnique({ where: { id: adminId } });
    if (!targetAdmin) {
      return NextResponse.json(
        { error: "Admin not found." },
        { status: 404 }
      );
    }

    // Prevent super_admin from managing themselves
    if (targetAdmin.id === admin.id) {
      return NextResponse.json(
        { error: "Cannot modify your own account through this endpoint." },
        { status: 400 }
      );
    }

    if (action === "toggleActive") {
      // Note: Admin model doesn't have isActive, but we can set role to "admin" or mark deactivated via a convention
      // For now, we'll delete the admin (soft delete not available)
      // Instead, we'll just log this action
      await logActivity(
        {
          action: "admin_deactivated",
          category: "admin_management",
          targetType: "user",
          targetId: targetAdmin.id,
          targetName: targetAdmin.name,
        },
        { userType: "admin", id: admin.id, name: admin.name, email: admin.email, role: admin.role }
      );

      return NextResponse.json({ error: "Admin deactivation is not implemented. Use direct database management." }, { status: 400 });
    }

    if (action === "resetPassword") {
      const newPassword = body.newPassword;
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters." },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(newPassword);
      await db.admin.update({
        where: { id: adminId },
        data: { password: hashedPassword, updatedAt: new Date() },
      });

      await logAuthActivity(
        "admin_password_reset",
        { userType: "admin", id: admin.id, name: admin.name, email: admin.email, role: admin.role },
        { targetAdminId: adminId, targetAdminName: targetAdmin.name }
      );

      return NextResponse.json({ success: true, message: `Password reset for ${targetAdmin.name}.` });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Error updating admin:", error);
    return NextResponse.json(
      { error: "Failed to update admin." },
      { status: 500 }
    );
  }
}
