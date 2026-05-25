import crypto from "crypto"

/**
 * Generate a unique invoice number in the format INV-YYYYMMDD-XXXXXXXX
 * where XXXXXXXX is 8 random hexadecimal characters.
 *
 * @example
 * generateInvoiceNumber() // "INV-20250115-a3f7b2c1"
 */
export function generateInvoiceNumber(): string {
  const now = new Date()
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("")

  const randomHex = crypto.randomBytes(4).toString("hex").toLowerCase()

  return `INV-${dateStr}-${randomHex}`
}

/**
 * Generate a unique transaction ID based on the payment method.
 *
 * - Cash payments: CASH-{unix_timestamp_ms}-{bookingId}
 * - Stripe payments: STRIPE-{stripeSessionId} (if sessionId is provided)
 *
 * @param method - The payment method ("cash_on_service" or "stripe")
 * @param bookingId - The booking ID
 * @param sessionId - Optional Stripe Checkout Session ID (for Stripe payments)
 *
 * @example
 * generateTransactionId("cash_on_service", 123)
 * // "CASH-1705312800000-123"
 *
 * generateTransactionId("stripe", 456, "cs_test_abc123")
 * // "STRIPE-cs_test_abc123"
 */
export function generateTransactionId(
  method: string,
  bookingId: number,
  sessionId?: string
): string {
  if (method === "stripe" && sessionId) {
    return `STRIPE-${sessionId}`
  }

  const timestamp = Date.now()
  return `CASH-${timestamp}-${bookingId}`
}

/**
 * Format a currency amount with the correct symbol and decimal places.
 * This is a simple helper to keep formatting consistent across the app.
 *
 * @param amount - The numeric amount
 * @param currency - Currency symbol (defaults to £)
 *
 * @example
 * formatCurrency(59.99) // "£59.99"
 * formatCurrency(60)    // "£60.00"
 */
export function formatCurrency(
  amount: number,
  currency: string = "£"
): string {
  return `${currency}${amount.toFixed(2)}`
}
