import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAuth } from "@/lib/auth-helpers";
import { logStaffActivity, logAuthActivity } from "@/lib/activity-logger";

export async function GET() {
  try {
    const staff = await db.staff.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });
    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth(["admin"]);
    const body = await req.json();
    const { name, email, phone, role } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    const existing = await db.staff.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Staff member with this email already exists" },
        { status: 409 }
      );
    }

    // Generate a temporary password
    const tempPass = "GreenLeaf" + Math.random().toString(36).slice(2, 8);
    const hashedPassword = await hashPassword(tempPass);

    const newStaff = await db.staff.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        phone,
        role: role || "cleaner",
        password: hashedPassword,
        tempPassword: tempPass,
        mustChangePassword: true,
      },
    });

    // Log staff creation (fire-and-forget)
    logStaffActivity('staff_created', { userType: 'admin', id: admin.id, name: admin.name, email: admin.email || '' }, newStaff.id, newStaff.name).catch(() => {})

    return NextResponse.json(
      { staff: newStaff, tempPassword: tempPass },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAuth(["admin"]);
    const body = await req.json();
    const { staffId, action, ...data } = body;

    if (!staffId) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    if (action === "update") {
      const { name, email, phone, role } = data;
      const staff = await db.staff.update({
        where: { id: staffId },
        data: { name, email, phone, role, updatedAt: new Date() },
      });
      return NextResponse.json({ staff });
    }

    if (action === "toggleActive") {
      const current = await db.staff.findUnique({ where: { id: staffId } });
      if (!current) {
        return NextResponse.json(
          { error: "Staff not found" },
          { status: 404 }
        );
      }
      const staff = await db.staff.update({
        where: { id: staffId },
        data: { isActive: !current.isActive, updatedAt: new Date() },
      });
      logStaffActivity('staff_status_changed', { userType: 'admin', id: admin.id, name: admin.name, email: admin.email || '' }, staffId, current.name, { newStatus: !current.isActive }).catch(() => {})
      return NextResponse.json({ staff });
    }

    if (action === "resetPassword") {
      const tempPass = "GreenLeaf" + Math.random().toString(36).slice(2, 8);
      const hashedPassword = await hashPassword(tempPass);
      const staff = await db.staff.update({
        where: { id: staffId },
        data: {
          password: hashedPassword,
          tempPassword: tempPass,
          mustChangePassword: true,
          updatedAt: new Date(),
        },
      });
      logAuthActivity('staff_password_reset', { userType: 'admin', id: admin.id, name: admin.name, email: admin.email || '' }, { targetStaffId: staffId, targetStaffName: staff.name }).catch(() => {})
      return NextResponse.json({ staff, tempPassword: tempPass });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json(
      { error: "Failed to update staff member" },
      { status: 500 }
    );
  }
}
