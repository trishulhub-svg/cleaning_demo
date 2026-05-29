import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

// One-time endpoint to sync missing DB tables/columns to Turso.
// Run once, then delete this file.
// This handles the recurring pattern where the Prisma schema defines
// tables that don't exist in the Turso DB (migrated from MySQL).

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ── Auth check: admin only ──
    await requireAuth(['admin']);

    const results: string[] = [];

    // ── 1. ActivityLog table ──
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ActivityLog" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "actorType" TEXT NOT NULL,
          "actorId" INTEGER NOT NULL,
          "actorName" TEXT NOT NULL,
          "actorEmail" TEXT,
          "action" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "severity" TEXT NOT NULL DEFAULT 'medium',
          "targetType" TEXT,
          "targetId" INTEGER,
          "targetName" TEXT,
          "details" TEXT,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "requestUri" TEXT,
          "sessionId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "isArchived" BOOLEAN NOT NULL DEFAULT 0
        )
      `);
      results.push("ActivityLog table created/verified");
    } catch (err) {
      results.push(`ActivityLog: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 2. ActivityLog indexes ──
    try {
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ActivityLog_actorType_actorId" ON "ActivityLog"("actorType", "actorId")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ActivityLog_action" ON "ActivityLog"("action")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ActivityLog_category" ON "ActivityLog"("category")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ActivityLog_createdAt" ON "ActivityLog"("createdAt")`);
      results.push("ActivityLog indexes created/verified");
    } catch (err) {
      results.push(`ActivityLog indexes: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 3. ActivityLogArchive table ──
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ActivityLogArchive" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "actorType" TEXT NOT NULL,
          "actorId" INTEGER NOT NULL,
          "actorName" TEXT NOT NULL,
          "actorEmail" TEXT,
          "action" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "severity" TEXT NOT NULL DEFAULT 'medium',
          "targetType" TEXT,
          "targetId" INTEGER,
          "targetName" TEXT,
          "details" TEXT,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "requestUri" TEXT,
          "sessionId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "isArchived" BOOLEAN NOT NULL DEFAULT 0
        )
      `);
      results.push("ActivityLogArchive table created/verified");
    } catch (err) {
      results.push(`ActivityLogArchive: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 4. Check ActivityLogArchive indexes ──
    try {
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ActivityLogArchive_actorType_actorId" ON "ActivityLogArchive"("actorType", "actorId")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ActivityLogArchive_category" ON "ActivityLogArchive"("category")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_ActivityLogArchive_createdAt" ON "ActivityLogArchive"("createdAt")`);
      results.push("ActivityLogArchive indexes created/verified");
    } catch (err) {
      results.push(`ActivityLogArchive indexes: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 5. Verify BookingAssignment has qrCode and qrImageData columns ──
    try {
      const cols = await db.$queryRawUnsafe<Array<{ name: string }>>(
        `PRAGMA table_info("BookingAssignment")`
      );
      const colNames = cols.map((c) => c.name);

      if (!colNames.includes("qrCode")) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "BookingAssignment" ADD COLUMN "qrCode" TEXT`
        );
        results.push("Added qrCode column to BookingAssignment");
      } else {
        results.push("BookingAssignment.qrCode already exists");
      }

      if (!colNames.includes("qrImageData")) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "BookingAssignment" ADD COLUMN "qrImageData" TEXT`
        );
        results.push("Added qrImageData column to BookingAssignment");
      } else {
        results.push("BookingAssignment.qrImageData already exists");
      }
    } catch (err) {
      results.push(`BookingAssignment columns: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 6. Verify Booking has qrScannedAt, completedBy, qrImageData columns ──
    try {
      const cols = await db.$queryRawUnsafe<Array<{ name: string }>>(
        `PRAGMA table_info("Booking")`
      );
      const colNames = cols.map((c) => c.name);

      if (!colNames.includes("qrScannedAt")) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "Booking" ADD COLUMN "qrScannedAt" DATETIME`
        );
        results.push("Added qrScannedAt column to Booking");
      } else {
        results.push("Booking.qrScannedAt already exists");
      }

      if (!colNames.includes("completedBy")) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "Booking" ADD COLUMN "completedBy" TEXT`
        );
        results.push("Added completedBy column to Booking");
      } else {
        results.push("Booking.completedBy already exists");
      }

      if (!colNames.includes("completedAt")) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "Booking" ADD COLUMN "completedAt" DATETIME`
        );
        results.push("Added completedAt column to Booking");
      } else {
        results.push("Booking.completedAt already exists");
      }

      if (!colNames.includes("qrImageData")) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "Booking" ADD COLUMN "qrImageData" TEXT`
        );
        results.push("Added qrImageData column to Booking");
      } else {
        results.push("Booking.qrImageData already exists");
      }
    } catch (err) {
      results.push(`Booking columns: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 7. Verify InvoiceItem table exists ──
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "InvoiceItem" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "invoiceId" INTEGER NOT NULL,
          "bookingId" INTEGER NOT NULL,
          "serviceName" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      results.push("InvoiceItem table created/verified");
    } catch (err) {
      results.push(`InvoiceItem: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 8. Verify InvoiceItem indexes ──
    try {
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_InvoiceItem_invoiceId" ON "InvoiceItem"("invoiceId")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_InvoiceItem_bookingId" ON "InvoiceItem"("bookingId")`);
      results.push("InvoiceItem indexes created/verified");
    } catch (err) {
      results.push(`InvoiceItem indexes: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 9. Verify StaffSession table exists ──
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StaffSession" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "staffId" INTEGER NOT NULL,
          "sessionToken" TEXT NOT NULL,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" DATETIME NOT NULL,
          CONSTRAINT "StaffSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      results.push("StaffSession table created/verified");
    } catch (err) {
      results.push(`StaffSession: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 10. Verify StaffPasswordReset table exists ──
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StaffPasswordReset" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "staffId" INTEGER NOT NULL,
          "token" TEXT NOT NULL,
          "tempPasswordHash" TEXT,
          "emailSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "usedAt" DATETIME,
          "expiredAt" DATETIME NOT NULL,
          "ipAddress" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "StaffPasswordReset_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      results.push("StaffPasswordReset table created/verified");
    } catch (err) {
      results.push(`StaffPasswordReset: ${err instanceof Error ? err.message : String(err)}`);
    }

    return NextResponse.json({
      success: true,
      message: "DB sync completed",
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("redirect")) {
      throw error; // Let auth redirects pass through
    }
    console.error("[Setup] DB sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
