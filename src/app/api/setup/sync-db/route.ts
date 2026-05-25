import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * One-time setup route to sync missing columns from Prisma schema to Turso DB.
 * Visit /api/setup/sync-db once, then DELETE this file.
 *
 * This is needed because `prisma generate` only generates client code from the
 * schema — it does NOT alter the database. `prisma db push` would do that
 * but can't run inside a Vercel serverless function during build.
 *
 * All columns are nullable so ADD COLUMN is safe (no data loss).
 * SQLite doesn't support "IF NOT EXISTS" for ALTER TABLE ADD COLUMN,
 * so we wrap each in try-catch and ignore duplicate column errors.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const results: { column: string; table: string; status: string; error?: string }[] = [];

  const migrations = [
    // BookingAssignment missing columns
    { table: "BookingAssignment", column: "qrImageData", type: "TEXT" },
    // Booking missing columns
    { table: "Booking", column: "qrImageData", type: "TEXT" },
    { table: "Booking", column: "qrScannedAt", type: "DATETIME" },
  ];

  for (const mig of migrations) {
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "${mig.table}" ADD COLUMN "${mig.column}" ${mig.type}`
      );
      results.push({ ...mig, status: "added" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        results.push({ ...mig, status: "already_exists" });
      } else {
        results.push({ ...mig, status: "error", error: msg });
      }
    }
  }

  // Verify by running a query that selects the new columns
  const verifyErrors: string[] = [];
  try {
    await db.bookingAssignment.findFirst({
      select: { id: true, qrImageData: true },
    });
  } catch (err: unknown) {
    verifyErrors.push(err instanceof Error ? err.message : String(err));
  }

  try {
    await db.booking.findFirst({
      select: { id: true, qrImageData: true, qrScannedAt: true },
    });
  } catch (err: unknown) {
    verifyErrors.push(err instanceof Error ? err.message : String(err));
  }

  const hasErrors = results.some((r) => r.status === "error") || verifyErrors.length > 0;

  return NextResponse.json({
    success: !hasErrors,
    message: hasErrors
      ? "Some columns failed. See details."
      : "All missing columns added. You can now delete /api/setup/sync-db.",
    columns: results,
    verify: verifyErrors.length > 0 ? { errors: verifyErrors } : "ok",
  });
}
