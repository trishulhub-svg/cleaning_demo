import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

// GET /api/admin/export-bookings — stream CSV export of bookings
export async function GET(req: NextRequest) {
  try {
    await requireAuth(["admin"]);

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};

    if (status !== "all") {
      where.bookingStatus = status;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { guestName: { contains: search } },
        { guestEmail: { contains: search } },
        { id: isNaN(Number(search)) ? undefined : { equals: Number(search) } },
      ].filter(Boolean);
    }

    const bookings = await db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        service: { select: { name: true } },
        user: { select: { name: true, email: true, phone: true } },
        assignedStaff: { select: { name: true } },
      },
    });

    // CSV headers
    const headers = [
      "Booking ID",
      "Customer Name",
      "Email",
      "Phone",
      "Type",
      "Service",
      "Date",
      "Time",
      "Address",
      "Price",
      "Status",
      "Payment Status",
    ];

    // CSV rows
    const rows = bookings.map((b) => {
      const customerName = b.user?.name || b.guestName || "Guest";
      const email = b.user?.email || b.guestEmail || "";
      const phone = b.user?.phone || b.guestPhone || "";
      const type = b.user ? "Registered" : "Guest";

      return [
        b.id.toString(),
        `"${customerName.replace(/"/g, '""')}"`,
        `"${email.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        type,
        `"${b.service.name.replace(/"/g, '""')}"`,
        b.bookingDate,
        b.bookingTime?.slice(0, 5) || "",
        `"${b.address.replace(/"/g, '""')}"`,
        b.totalPrice.toFixed(2),
        b.bookingStatus.replace(/_/g, " "),
        b.paymentStatus.replace(/_/g, " "),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    const filename = `bookings-export-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Error exporting bookings:", error);
    return NextResponse.json(
      { error: "Failed to export bookings" },
      { status: 500 }
    );
  }
}
