import crypto from "crypto";

/**
 * Generate a unique QR completion code.
 * Format: QR-YYYYMMDD-{10 random hex characters}
 * Uses crypto.randomBytes for cryptographically secure randomness.
 */
export function generateCompletionCode(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const randomHex = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `QR-${dateStr}-${randomHex}`;
}

/**
 * Validate a QR completion code format.
 * Expected format: /^QR-\d{8}-[A-F0-9]{10}$/
 */
export function validateCode(code: string): boolean {
  const pattern = /^QR-\d{8}-[A-F0-9]{10}$/;
  return pattern.test(code);
}
