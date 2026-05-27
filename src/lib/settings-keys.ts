/**
 * Client-safe settings keys.
 * Use these string constants in "use client" components
 * to reference settings by their key names.
 *
 * NEVER import from @/lib/settings in a "use client" file.
 */

export const SETTINGS_KEYS = {
  // Company info
  COMPANY_NAME: 'company_name',
  COMPANY_EMAIL: 'company_email',
  COMPANY_PHONE: 'company_phone',
  COMPANY_ADDRESS: 'company_address',
  WHATSAPP_NUMBER: 'whatsapp_number',

  // Stripe
  STRIPE_PUBLISHABLE_KEY: 'stripe_publishable_key',
  STRIPE_SECRET_KEY: 'stripe_secret_key',
  STRIPE_WEBHOOK_SECRET: 'stripe_webhook_secret',

  // SMTP / Email
  SMTP_HOST: 'smtp_host',
  SMTP_PORT: 'smtp_port',
  SMTP_USER: 'smtp_user',
  SMTP_PASS: 'smtp_pass',
  SMTP_FROM_NAME: 'smtp_from_name',
  SMTP_FROM_EMAIL: 'smtp_from_email',

  // Pricing
  DISCOUNT_PERCENTAGE: 'discount_percentage',
} as const

/** Sensitive keys that should be masked in the UI */
export const SENSITIVE_SETTINGS_KEYS = [
  SETTINGS_KEYS.STRIPE_SECRET_KEY,
  SETTINGS_KEYS.STRIPE_WEBHOOK_SECRET,
  SETTINGS_KEYS.SMTP_PASS,
  SETTINGS_KEYS.SMTP_USER,
] as const

/** Settings that have corresponding env vars */
export const ENV_BACKED_SETTINGS_KEYS = [
  SETTINGS_KEYS.STRIPE_PUBLISHABLE_KEY,
  SETTINGS_KEYS.STRIPE_SECRET_KEY,
  SETTINGS_KEYS.STRIPE_WEBHOOK_SECRET,
  SETTINGS_KEYS.SMTP_HOST,
  SETTINGS_KEYS.SMTP_PORT,
  SETTINGS_KEYS.SMTP_USER,
  SETTINGS_KEYS.SMTP_PASS,
  SETTINGS_KEYS.SMTP_FROM_NAME,
  SETTINGS_KEYS.SMTP_FROM_EMAIL,
] as const
