import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { generateCompletionCode } from "@/lib/qr-generator";
import { CURRENCY } from "@/lib/constants";

// Prevent Vercel from caching this route
export const dynamic = "force-dynamic";

// ============ GET /api/staff/assignments/[id] ============
// Fetch a single assignment with full booking details for the current staff member.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.userType !== "staff") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Staff access required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const assignmentId = parseInt(id, 10);
    if (isNaN(assignmentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid assignment ID." },
        { status: 400 }
      );
    }

    const assignment = await db.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        booking: {
          include: {
            service: { select: { name: true, price: true, durationHours: true } },
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        admin: { select: { name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Assignment not found." },
        { status: 404 }
      );
    }

    if (assignment.staffId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Access denied. This assignment is not assigned to you." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error("[API] GET /api/staff/assignments/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

// ============ PUT /api/staff/assignments/[id] ============
// Update assignment status via the state machine.
// Body: { status: "in_progress" | "completed" }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.userType !== "staff") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Staff access required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const assignmentId = parseInt(id, 10);
    if (isNaN(assignmentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid assignment ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status: newStatus } = body as { status: string };

    // Fetch the current assignment with booking
    const assignment = await db.bookingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        booking: {
          select: {
            id: true,
            bookingStatus: true,
            paymentStatus: true,
            paymentMethod: true,
            totalPrice: true,
            userId: true,
            invoiceId: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Assignment not found." },
        { status: 404 }
      );
    }

    if (assignment.staffId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Access denied. This assignment is not assigned to you." },
        { status: 403 }
      );
    }

    // ============ State Machine ============

    if (newStatus === "in_progress") {
      // assigned → in_progress
      if (assignment.status !== "assigned") {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot start: assignment is "${assignment.status}", must be "assigned".`,
          },
          { status: 400 }
        );
      }

      if (assignment.booking.bookingStatus === "cancelled") {
        return NextResponse.json(
          { success: false, message: "This booking has been cancelled." },
          { status: 400 }
        );
      }

      // Generate QR code
      const qrCode = generateCompletionCode();

      await db.$transaction([
        // Update assignment
        db.bookingAssignment.update({
          where: { id: assignmentId },
          data: {
            status: "in_progress",
            startedAt: new Date(),
            qrCode,
          },
        }),
        // Update booking
        db.booking.update({
          where: { id: assignment.bookingId },
          data: {
            bookingStatus: "confirmed",
            qrCompletionCode: qrCode,
            updatedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Job started successfully!",
        data: { qrCode },
      });
    }

    if (newStatus === "completed") {
      // in_progress → completed OR cash_pending → completed
      if (assignment.status !== "in_progress" && assignment.status !== "cash_pending") {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot complete: assignment is "${assignment.status}", must be "in_progress" or "cash_pending".`,
          },
          { status: 400 }
        );
      }

      const isCashBooking =
        assignment.booking.paymentMethod === "cash_on_service" ||
        assignment.booking.paymentMethod === "cash";

      // For cash bookings that are currently in_progress, go to cash_pending
      if (isCashBooking && assignment.status === "in_progress") {
        await db.$transaction([
          db.bookingAssignment.update({
            where: { id: assignmentId },
            data: { status: "cash_pending", completedAt: null },
          }),
          db.booking.update({
            where: { id: assignment.bookingId },
            data: {
              bookingStatus: "cash_pending",
              updatedAt: new Date(),
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          message: "Job completed! Awaiting cash payment confirmation from customer.",
        });
      }

      // For non-cash bookings OR cash_pending confirmation
      const now = new Date();
      const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(assignment.booking.id).padStart(5, "0")}`;
      const transactionId = `CASH-${Date.now()}-${assignment.booking.id}`;

      let invoiceId = assignment.booking.invoiceId;

      // Create invoice if needed (always for cash_on_service)
      if (!invoiceId) {
        const invoice = await db.invoice.create({
          data: {
            userId: assignment.booking.userId ?? 0,
            bookingId: assignment.booking.id,
            invoiceNumber,
            totalAmount: assignment.booking.totalPrice,
            paymentMethod: isCashBooking ? "cash_on_service" : "stripe",
            paymentStatus: "paid",
            paidAt: now,
          },
        });
        invoiceId = invoice.id;
      } else {
        await db.invoice.update({
          where: { id: invoiceId },
          data: { paymentStatus: "paid", paidAt: now },
        });
      }

      // Create payment record
      await db.payment.create({
        data: {
          userId: assignment.booking.userId ?? 0,
          bookingId: assignment.booking.id,
          invoiceId,
          amount: assignment.booking.totalPrice,
          paymentMethod: isCashBooking ? "cash" : "stripe",
          paymentStatus: "completed",
          transactionId: isCashBooking ? transactionId : undefined,
          paidAt: now,
        },
      });

      // Update assignment and booking
      await db.$transaction([
        db.bookingAssignment.update({
          where: { id: assignmentId },
          data: { status: "completed", completedAt: now },
        }),
        db.booking.update({
          where: { id: assignment.bookingId },
          data: {
            bookingStatus: "completed",
            paymentStatus: "paid",
            completedBy: session.user.name,
            completedAt: now,
            invoiceId,
            updatedAt: now,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: isCashBooking
          ? `Cash payment of ${CURRENCY}${assignment.booking.totalPrice.toFixed(2)} confirmed! Job completed.`
          : "Job completed successfully!",
      });
    }

    return NextResponse.json(
      { success: false, message: `Invalid target status: "${newStatus}".` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API] PUT /api/staff/assignments/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
