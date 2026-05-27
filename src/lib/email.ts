import nodemailer from "nodemailer"
import { APP_NAME, SITE_URL } from "@/lib/constants"
import { getSetting } from "@/lib/settings"

// ============ SMTP Transport Setup ============

let transporter: nodemailer.Transporter | null = null

async function getSmtpConfig(): Promise<{
  host: string | undefined
  port: number
  user: string | undefined
  pass: string | undefined
  fromName: string
  fromEmail: string
}> {
  const host = await getSetting("smtp_host")
  const port = Number(await getSetting("smtp_port", "587"))
  const user = await getSetting("smtp_user")
  const pass = await getSetting("smtp_pass")
  const fromName = await getSetting("smtp_from_name", APP_NAME)
  const fromEmail = await getSetting("smtp_from_email")

  return {
    host: host || process.env.SMTP_HOST,
    port,
    user: user || process.env.SMTP_USER,
    pass: pass || process.env.SMTP_PASS,
    fromName: fromName || process.env.SMTP_FROM_NAME || APP_NAME,
    fromEmail: fromEmail || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "",
  }
}

// ============ Email Sending ============

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Invalidate cache to get fresh settings
    const smtpConfig = await getSmtpConfig()

    // Create a fresh transporter with settings-based config
    const freshTransporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    if (!smtpConfig.fromEmail) {
      console.error("[Email] No sender email configured")
      return { success: false, error: "No sender email configured" }
    }

    await freshTransporter.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to,
      subject,
      html,
    })

    console.log(`[Email] Sent to ${to}: ${subject}`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error"
    console.error(`[Email] Failed to send to ${to}:`, message)
    return { success: false, error: message }
  }
}

// ============ OTP Email Template ============

export async function sendOTPEmail(
  email: string,
  otp: string,
  purpose: string
): Promise<{ success: boolean; error?: string }> {
  const purposeLabels: Record<string, string> = {
    registration: "Complete Your Registration",
    email_verification: "Verify Your Email Address",
    phone_verification: "Verify Your Phone Number",
    password_reset: "Reset Your Password",
  }

  const label = purposeLabels[purpose] || "Your Verification Code"

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${label}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #16a34a; padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🌿 ${APP_NAME}</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #1a2e1a; font-size: 22px; font-weight: 600;">${label}</h2>
                    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      Hello,<br />
                      Use the verification code below to complete your request. This code will expire in 10 minutes.
                    </p>
                    <!-- OTP Code -->
                    <div style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #16a34a;">${otp}</span>
                    </div>
                    <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      If you did not request this code, please ignore this email. Your account remains secure.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #9ca3af; font-size: 13px;">
                      Thank you for choosing <strong>${APP_NAME}</strong>
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      <a href="${SITE_URL}" style="color: #16a34a; text-decoration: none;">${SITE_URL}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return sendEmail(email, `${label} — ${APP_NAME}`, html)
}

// ============ Password Reset Email Template ============

export async function sendPasswordResetEmail(
  email: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background-color: #16a34a; padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🌿 ${APP_NAME}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #1a2e1a; font-size: 22px; font-weight: 600;">Password Reset Request</h2>
                    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password. Use the code below to proceed. This code will expire in 10 minutes.
                    </p>
                    <div style="background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #dc2626;">${otp}</span>
                    </div>
                    <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      If you did not request a password reset, no further action is needed. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      <a href="${SITE_URL}" style="color: #16a34a; text-decoration: none;">${SITE_URL}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return sendEmail(email, `Reset Your Password — ${APP_NAME}`, html)
}

// ============ Shared HTML Template Helpers ============

function emailWrapper(title: string, bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #16a34a; padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🌿 ${APP_NAME}</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    ${bodyHtml}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #9ca3af; font-size: 13px;">
                      Thank you for choosing <strong>${APP_NAME}</strong>
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      If you have any questions, reply to this email or contact us at
                      <a href="mailto:hello@greenleafcleaning.co.uk" style="color: #16a34a; text-decoration: none;">hello@greenleafcleaning.co.uk</a>
                    </p>
                    <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                      <a href="${SITE_URL}" style="color: #16a34a; text-decoration: none;">${SITE_URL}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function paymentBadge(status: string): string {
  const colors: Record<string, string> = {
    paid: "#16a34a",
    cash_on_service: "#d97706",
    pending: "#9ca3af",
    failed: "#dc2626",
    refunded: "#6366f1",
  }
  const labels: Record<string, string> = {
    paid: "Paid",
    cash_on_service: "Cash on Service",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
  }
  const color = colors[status] || "#9ca3af"
  const label = labels[status] || status
  return `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #ffffff; background-color: ${color};">${label}</span>`
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px; width: 40%; vertical-align: top;">
        ${label}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 14px; font-weight: 500;">
        ${value}
      </td>
    </tr>
  `
}

// ============ Booking Confirmation Email ============

interface BookingConfirmationData {
  bookingId: number
  invoiceNumber: string
  serviceName: string
  date: string
  time: string
  address: string
  accessNotes?: string
  totalPrice: number
  paymentStatus: string
  paymentMethod?: string
}

export async function sendBookingConfirmation(
  to: string,
  name: string,
  data: BookingConfirmationData
): Promise<{ success: boolean; error?: string }> {
  const { CURRENCY } = await import("@/lib/constants")
  const subject = `Booking Confirmed — #${data.bookingId}`

  const body = `
    <h2 style="margin: 0 0 8px; color: #1a2e1a; font-size: 22px; font-weight: 600;">Booking Confirmed!</h2>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Hi ${name}, your booking has been confirmed. Here are the details:
    </p>

    <!-- Success banner -->
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #16a34a; font-size: 14px; font-weight: 600;">✓ Your booking is confirmed and a cleaner will be assigned shortly.</p>
    </div>

    <!-- Booking details table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${infoRow("Booking ID", `#${data.bookingId}`)}
      ${infoRow("Invoice", data.invoiceNumber)}
      ${infoRow("Service", data.serviceName)}
      ${infoRow("Date", data.date)}
      ${infoRow("Time", data.time)}
      ${infoRow("Address", data.address)}
      ${data.accessNotes ? infoRow("Access Notes", data.accessNotes) : ""}
      ${infoRow("Total", `<strong>${CURRENCY}${data.totalPrice.toFixed(2)}</strong>`)}
      ${infoRow("Payment Status", paymentBadge(data.paymentStatus))}
      ${data.paymentMethod ? infoRow("Payment Method", data.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())) : ""}
    </table>

    <p style="margin: 0 0 8px; color: #4a5568; font-size: 14px; line-height: 1.6;">
      You can view and manage your booking from your dashboard at any time.
    </p>
    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
      If you need to make changes, please contact us at least 24 hours before your scheduled service.
    </p>
  `

  return sendEmail(to, `${subject} — ${APP_NAME}`, emailWrapper(subject, body))
}

// ============ Payment Receipt Email ============

interface PaymentReceiptData {
  invoiceNumber: string
  date: string
  amount: number
  paymentMethod: string
  transactionId: string
  items: { serviceName: string; amount: number }[]
}

export async function sendPaymentReceipt(
  to: string,
  name: string,
  data: PaymentReceiptData
): Promise<{ success: boolean; error?: string }> {
  const { CURRENCY } = await import("@/lib/constants")
  const subject = `Payment Receipt — ${data.invoiceNumber}`

  const itemsRows = data.items.map(
    (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 14px;">
        ${item.serviceName}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 14px; text-align: right; font-weight: 500;">
        ${CURRENCY}${item.amount.toFixed(2)}
      </td>
    </tr>
  `
  ).join("")

  const body = `
    <h2 style="margin: 0 0 8px; color: #1a2e1a; font-size: 22px; font-weight: 600;">Payment Receipt</h2>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Hi ${name}, thank you for your payment! Here is your receipt.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${infoRow("Invoice", data.invoiceNumber)}
      ${infoRow("Date", data.date)}
      ${infoRow("Payment Method", data.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))}
      ${infoRow("Transaction ID", `<span style="font-family: monospace; font-size: 13px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${data.transactionId}</span>`)}
    </table>

    <!-- Items table -->
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 0 16px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 12px 16px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Item</th>
            <th style="padding: 12px 16px; text-align: right; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      <div style="background-color: #f9fafb; padding: 16px; text-align: right; border-top: 2px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 14px; margin-right: 16px;">Total Paid</span>
        <span style="color: #16a34a; font-size: 20px; font-weight: 700;">${CURRENCY}${data.amount.toFixed(2)}</span>
      </div>
    </div>

    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
      Please keep this receipt for your records. If you have any questions about this payment, don't hesitate to reach out.
    </p>
  `

  return sendEmail(to, `${subject} — ${APP_NAME}`, emailWrapper(subject, body))
}

// ============ Cancellation Email ============

interface CancellationData {
  bookingId: number
  serviceName: string
  originalDate: string
  refundAmount?: number
  reason?: string
}

export async function sendCancellationEmail(
  to: string,
  name: string,
  data: CancellationData
): Promise<{ success: boolean; error?: string }> {
  const { CURRENCY } = await import("@/lib/constants")
  const subject = `Booking Cancelled — #${data.bookingId}`

  const refundSection = data.refundAmount && data.refundAmount > 0
    ? `
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-top: 16px;">
      <p style="margin: 0 0 4px; color: #92400e; font-size: 14px; font-weight: 600;">Refund Information</p>
      <p style="margin: 0; color: #78350f; font-size: 14px;">
        A refund of <strong>${CURRENCY}${data.refundAmount.toFixed(2)}</strong> has been initiated and will be processed within 5–10 business days.
      </p>
    </div>
  `
    : ""

  const body = `
    <h2 style="margin: 0 0 8px; color: #1a2e1a; font-size: 22px; font-weight: 600;">Booking Cancelled</h2>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Hi ${name}, your booking has been cancelled as requested. Here are the details:
    </p>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">✕ Booking #${data.bookingId} has been cancelled.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      ${infoRow("Booking ID", `#${data.bookingId}`)}
      ${infoRow("Service", data.serviceName)}
      ${infoRow("Original Date", data.originalDate)}
      ${data.reason ? infoRow("Reason", data.reason) : ""}
    </table>

    ${refundSection}

    <p style="margin: 16px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
      We're sorry to see you go. You can book a new cleaning anytime through our website.
    </p>
  `

  return sendEmail(to, `${subject} — ${APP_NAME}`, emailWrapper(subject, body))
}

// ============ Reschedule Email ============

interface RescheduleData {
  bookingId: number
  serviceName: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
  address: string
}

export async function sendRescheduleEmail(
  to: string,
  name: string,
  data: RescheduleData
): Promise<{ success: boolean; error?: string }> {
  const subject = `Booking Rescheduled — #${data.bookingId}`

  const body = `
    <h2 style="margin: 0 0 8px; color: #1a2e1a; font-size: 22px; font-weight: 600;">Booking Rescheduled</h2>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Hi ${name}, your booking has been successfully rescheduled. Please review the changes below.
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #16a34a; font-size: 14px; font-weight: 600;">✓ Your booking has been updated with the new schedule.</p>
    </div>

    <!-- Schedule change comparison -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${infoRow("Booking ID", `#${data.bookingId}`)}
      ${infoRow("Service", data.serviceName)}
    </table>

    <div style="display: flex; gap: 16px; margin-bottom: 24px;">
      <!-- Old schedule -->
      <div style="flex: 1; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0 0 4px; color: #991b1b; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Previous Schedule</p>
        <p style="margin: 0; color: #7f1d1d; font-size: 15px; font-weight: 600; text-decoration: line-through; opacity: 0.7;">${data.oldDate}</p>
        <p style="margin: 4px 0 0; color: #7f1d1d; font-size: 15px; font-weight: 600; text-decoration: line-through; opacity: 0.7;">${data.oldTime}</p>
      </div>
      <!-- New schedule -->
      <div style="flex: 1; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0 0 4px; color: #166534; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">New Schedule</p>
        <p style="margin: 0; color: #14532d; font-size: 15px; font-weight: 700;">${data.newDate}</p>
        <p style="margin: 4px 0 0; color: #14532d; font-size: 15px; font-weight: 700;">${data.newTime}</p>
      </div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      ${infoRow("Address", data.address)}
    </table>

    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
      If this change was made in error or you need further adjustments, please contact us as soon as possible.
    </p>
  `

  return sendEmail(to, `${subject} — ${APP_NAME}`, emailWrapper(subject, body))
}

// ============ Staff Assignment Email ============

interface StaffAssignmentData {
  bookingId: number
  serviceName: string
  date: string
  time: string
  customerName: string
  customerPhone: string
  address: string
  notes?: string
  qrCode?: string
  qrCodeUrl?: string
}

export async function sendStaffAssignmentEmail(
  to: string,
  name: string,
  data: StaffAssignmentData
): Promise<{ success: boolean; error?: string }> {
  const subject = `New Booking Assignment — #${data.bookingId}`

  const qrSection = data.qrCodeUrl
    ? `
    <div style="text-align: center; margin: 16px 0;">
      <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px; border-radius: 8px; border: 1px solid #e5e7eb;" />
      <p style="margin: 8px 0 0; color: #6b7280; font-size: 13px;">Scan this code when you arrive at the job site.</p>
      ${data.qrCode ? `<p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px; font-family: monospace;">Code: ${data.qrCode}</p>` : ""}
    </div>
  `
    : ""

  const body = `
    <h2 style="margin: 0 0 8px; color: #1a2e1a; font-size: 22px; font-weight: 600;">New Booking Assigned</h2>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Hi ${name}, you have been assigned a new cleaning job. Please review the details below.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${infoRow("Booking ID", `#${data.bookingId}`)}
      ${infoRow("Service", data.serviceName)}
      ${infoRow("Date", data.date)}
      ${infoRow("Time", data.time)}
      ${infoRow("Customer", data.customerName)}
      ${infoRow("Customer Phone", `<a href="tel:${data.customerPhone}" style="color: #16a34a; text-decoration: none;">${data.customerPhone}</a>`)}
      ${infoRow("Address", data.address)}
      ${data.notes ? infoRow("Notes", data.notes) : ""}
    </table>

    ${qrSection}

    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 16px;">
      <p style="margin: 0 0 4px; color: #1e40af; font-size: 14px; font-weight: 600;">Important</p>
      <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">
        Please arrive on time and contact the customer if you have any questions about the location or access instructions.
      </p>
    </div>
  `

  return sendEmail(to, `${subject} — ${APP_NAME}`, emailWrapper(subject, body))
}

// ============ Booking Completion Email ============

interface BookingCompletionData {
  bookingId: number
  serviceName: string
  date: string
}

export async function sendBookingCompletionEmail(
  to: string,
  name: string,
  data: BookingCompletionData
): Promise<{ success: boolean; error?: string }> {
  const subject = `Service Completed — #${data.bookingId}`

  const body = `
    <h2 style="margin: 0 0 8px; color: #1a2e1a; font-size: 22px; font-weight: 600;">Service Completed!</h2>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Hi ${name}, your cleaning service has been completed successfully. We hope you're happy with the results!
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #16a34a; font-size: 14px; font-weight: 600;">✓ Booking #${data.bookingId} has been marked as completed.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${infoRow("Booking ID", `#${data.bookingId}`)}
      ${infoRow("Service", data.serviceName)}
      ${infoRow("Date", data.date)}
    </table>

    <p style="margin: 0 0 16px; color: #4a5568; font-size: 14px; line-height: 1.6;">
      We'd love to hear your feedback! Your review helps us improve and helps other customers make informed decisions.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${SITE_URL}/dashboard" style="display: inline-block; padding: 12px 32px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Leave a Review
      </a>
    </div>

    <p style="margin: 16px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
      Thank you for choosing ${APP_NAME}. We look forward to serving you again!
    </p>
  `

  return sendEmail(to, `${subject} — ${APP_NAME}`, emailWrapper(subject, body))
}

// ============ Staff Welcome Email ============

interface StaffWelcomeData {
  tempPassword: string
  resetUrl: string
}

export async function sendStaffWelcomeEmail(
  to: string,
  name: string,
  data: StaffWelcomeData
): Promise<{ success: boolean; error?: string }> {
  const subject = "Welcome to the Team — Your Account is Ready"

  const body = `
    <h2 style="margin: 0 0 8px; color: #1a2e1a; font-size: 22px; font-weight: 600;">Welcome to ${APP_NAME}!</h2>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Hi ${name}, your staff account has been created successfully. Here are your login details:
    </p>

    <div style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Login Email</p>
      <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; font-weight: 600;">${to}</p>
      <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Temporary Password</p>
      <p style="margin: 0; color: #16a34a; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 2px;">${data.tempPassword}</p>
    </div>

    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; color: #92400e; font-size: 14px; font-weight: 600;">⚠ Security Notice</p>
      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
        For your security, you must change your password after your first login. Please use the link below to set up your new password.
      </p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Set Up Your Password
      </a>
    </div>

    <p style="margin: 16px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
      If you have any trouble logging in or have questions, please contact your administrator.
    </p>
  `

  return sendEmail(to, `${subject} — ${APP_NAME}`, emailWrapper(subject, body))
}

// ============ Refund Email ============

interface RefundEmailData {
  refundId: number
  amount: number
  reason: string
  status: string
  processingTime?: string
}

export async function sendRefundEmail(
  to: string,
  name: string,
  data: RefundEmailData
): Promise<{ success: boolean; error?: string }> {
  const { CURRENCY } = await import("@/lib/constants")

  const statusConfig: Record<string, { color: string; label: string; message: string }> = {
    pending: {
      color: "#d97706",
      label: "Pending Review",
      message: "Your refund request has been received and is being reviewed by our team.",
    },
    approved: {
      color: "#16a34a",
      label: "Approved",
      message: "Your refund has been approved and is being processed.",
    },
    processing: {
      color: "#2563eb",
      label: "Processing",
      message: `Your refund is being processed and should arrive within ${data.processingTime || "5–10 business days"}.`,
    },
    completed: {
      color: "#16a34a",
      label: "Completed",
      message: "Your refund has been successfully processed. The funds should appear in your account shortly.",
    },
    rejected: {
      color: "#dc2626",
      label: "Rejected",
      message: "Unfortunately, your refund request has been rejected. Please contact us for more details.",
    },
  }

  const config = statusConfig[data.status] || statusConfig.pending
  const subject = `Refund ${config.label} — #${data.refundId}`

  const body = `
    <h2 style="margin: 0 0 8px; color: #1a2e1a; font-size: 22px; font-weight: 600;">Refund ${config.label}</h2>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Hi ${name}, here's an update on your refund request.
    </p>

    <!-- Status banner -->
    <div style="background-color: ${config.color}11; border: 1px solid ${config.color}33; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: ${config.color}; font-size: 14px; font-weight: 600;">
        ${config.message}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${infoRow("Refund ID", `#${data.refundId}`)}
      ${infoRow("Amount", `<strong>${CURRENCY}${data.amount.toFixed(2)}</strong>`)}
      ${infoRow("Status", `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #ffffff; background-color: ${config.color};">${config.label}</span>`)}
      ${infoRow("Reason", data.reason)}
      ${data.processingTime ? infoRow("Processing Time", data.processingTime) : ""}
    </table>

    ${data.status === "rejected" ? `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.5;">
        If you believe this decision was made in error, please contact our support team with your refund ID (#${data.refundId}) for further assistance.
      </p>
    </div>
    ` : `
    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
      If you have any questions about this refund, please don't hesitate to contact us.
    </p>
    `}
  `

  return sendEmail(to, `${subject} — ${APP_NAME}`, emailWrapper(subject, body))
}
