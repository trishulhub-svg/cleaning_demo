import nodemailer from "nodemailer"
import { APP_NAME, SITE_URL } from "@/lib/constants"

// ============ SMTP Transport Setup ============

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.warn("[Email] SMTP credentials not configured. Email sending is disabled.")
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  return transporter
}

// ============ Email Sending ============

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = getTransporter()

    const fromName = process.env.SMTP_FROM_NAME || APP_NAME
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || ""

    if (!fromEmail) {
      console.error("[Email] No sender email configured")
      return { success: false, error: "No sender email configured" }
    }

    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
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
