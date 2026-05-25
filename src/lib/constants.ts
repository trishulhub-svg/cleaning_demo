export const APP_NAME = "GreenLeaf Cleaning";

export const CURRENCY = "£";

export const SITE_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || "https://localhost:3000";

// ============ User Types ============
export type UserType = "customer" | "admin" | "staff";

export const USER_TYPES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
  STAFF: "staff",
} as const;

// ============ OTP ============
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_PURPOSES = {
  REGISTRATION: "registration",
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
  LOGIN_2FA: "login_2fa",
  PHONE_VERIFICATION: "phone_verification",
} as const;

// ============ Password Reset ============
export const PASSWORD_RESET_EXPIRY_MINUTES = 30;

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
] as const;

export const WHATSAPP_NUMBER = "447700000000";

export const COMPANY_EMAIL = "hello@greenleafcleaning.co.uk";

export const COMPANY_PHONE = "07700 000 000";

export const COMPANY_ADDRESS = "123 Green Lane, London, EC1A 1BB";
