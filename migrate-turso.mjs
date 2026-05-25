import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

// Parse .env manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.substring(0, eqIdx).trim();
  let val = trimmed.substring(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  envVars[key] = val;
}

async function migrateToTurso() {
  const db = createClient({
    url: envVars.TURSO_DB_URL,
    authToken: envVars.TURSO_AUTH_TOKEN,
  });

  console.log('Connected to Turso. Running migration on PascalCase tables...\n');

  const statements = [
    // User table additions
    `ALTER TABLE User ADD COLUMN otpCode TEXT DEFAULT NULL;`,
    `ALTER TABLE User ADD COLUMN otpExpiresAt DATETIME DEFAULT NULL;`,
    `ALTER TABLE User ADD COLUMN otpType TEXT DEFAULT NULL;`,

    // Booking table additions
    `ALTER TABLE Booking ADD COLUMN completedBy TEXT DEFAULT NULL;`,
    `ALTER TABLE Booking ADD COLUMN completedAt DATETIME DEFAULT NULL;`,
    `ALTER TABLE Booking ADD COLUMN paymentMethod TEXT DEFAULT NULL;`,

    // Invoice table additions
    `ALTER TABLE Invoice ADD COLUMN paidAt DATETIME DEFAULT NULL;`,

    // ActivityLog table additions
    `ALTER TABLE ActivityLog ADD COLUMN isArchived INTEGER DEFAULT 0;`,
  ];

  for (const sql of statements) {
    try {
      await db.execute(sql);
      console.log(`OK: ${sql.substring(0, 70)}`);
    } catch (err) {
      if (err.message?.includes('duplicate column name')) {
        console.log(`SKIP (exists): ${sql.substring(0, 50)}`);
      } else {
        console.error(`ERROR: ${err.message}`);
      }
    }
  }

  // Verify columns on User table
  console.log('\n--- Verifying User columns ---');
  const userCols = await db.execute("PRAGMA table_info(User);");
  for (const col of userCols.rows) {
    console.log(`  ${col.name} (${col.type})`);
  }

  // Verify columns on Booking table
  console.log('\n--- Verifying Booking columns ---');
  const bookingCols = await db.execute("PRAGMA table_info(Booking);");
  for (const col of bookingCols.rows) {
    console.log(`  ${col.name} (${col.type})`);
  }

  // Verify columns on Invoice table
  console.log('\n--- Verifying Invoice columns ---');
  const invoiceCols = await db.execute("PRAGMA table_info(Invoice);");
  for (const col of invoiceCols.rows) {
    console.log(`  ${col.name} (${col.type})`);
  }

  // List all tables
  console.log('\n--- All tables ---');
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  for (const row of tables.rows) {
    console.log(`  ${row.name}`);
  }

  console.log('\nMigration complete!');
}

migrateToTurso().catch(console.error);
