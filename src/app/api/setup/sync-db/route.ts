import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * One-time DB sync — creates tables and columns missing from Turso.
 * Visit /api/setup/sync-db once, then DELETE this file.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const results: { action: string; status: string; error?: string }[] = [];

  // ---- TABLES ----
  // InvoiceItem table (needed by booking flows)
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "invoiceId"   INTEGER NOT NULL,
        "bookingId"   INTEGER NOT NULL,
        "serviceName" TEXT NOT NULL,
        "amount"      REAL NOT NULL,
        FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE
      )
    `);
    results.push({ action: "CREATE TABLE InvoiceItem", status: "ok" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ action: "CREATE TABLE InvoiceItem", status: "error", error: msg });
  }

  // ---- INDEXES for InvoiceItem ----
  const indexes = [
    `CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId")`,
    `CREATE INDEX IF NOT EXISTS "InvoiceItem_bookingId_idx" ON "InvoiceItem"("bookingId")`,
  ];
  for (const sql of indexes) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch { /* index may already exist, ignore */ }
  }

  // ---- COLUMNS (same pattern as before) ----
  const columns = [
    { table: "BookingAssignment", column: "qrImageData", type: "TEXT" },
    { table: "Booking", column: "qrImageData", type: "TEXT" },
    { table: "Booking", column: "qrScannedAt", type: "DATETIME" },
  ];
  for (const col of columns) {
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "${col.table}" ADD COLUMN "${col.column}" ${col.type}`
      );
      results.push({ action: `ADD ${col.table}.${col.column}`, status: "added" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate column") || msg.includes("already exists")) {
        results.push({ action: `ADD ${col.table}.${col.column}`, status: "already_exists" });
      } else {
        results.push({ action: `ADD ${col.table}.${col.column}`, status: "error", error: msg });
      }
    }
  }

  // ---- VERIFY ----
  const verifyErrors: string[] = [];
  try {
    await db.invoiceItem.findFirst({ select: { id: true } });
    results.push({ action: "VERIFY InvoiceItem query", status: "ok" });
  } catch (err: unknown) {
    verifyErrors.push(err instanceof Error ? err.message : String(err));
    results.push({ action: "VERIFY InvoiceItem query", status: "error", error: verifyErrors[0] });
  }

  try {
    await db.bookingAssignment.findFirst({ select: { id: true, qrImageData: true } });
    results.push({ action: "VERIFY BookingAssignment.qrImageData", status: "ok" });
  } catch (err: unknown) {
    verifyErrors.push(err instanceof Error ? err.message : String(err));
  }

  const hasErrors = results.some((r) => r.status === "error");

  return NextResponse.json({
    success: !hasErrors,
    message: hasErrors ? "Some operations failed." : "DB fully synced. Delete /api/setup/sync-db.",
    results,
  });
}
