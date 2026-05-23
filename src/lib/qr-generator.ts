import crypto from "crypto";
import QRCode from "qrcode";

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

/**
 * Generate a QR code image as a base64 data URL string.
 * @param data - The data to encode (typically the completion code)
 * @returns Base64 data URL string like "data:image/png;base64,iVBOR..."
 */
export async function generateQRImage(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
