'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { USER_TYPES } from '@/lib/constants'
import type { UserType } from '@/lib/constants'
import jwt from 'jsonwebtoken'
import { logAuthActivity, logSecurityActivity } from '@/lib/activity-logger'

export interface LoginActionResult {
  success: boolean
  error?: string
  url?: string
}

interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  userType: UserType
  mustChangePassword?: boolean
}

async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser> {
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Try Customer (User table) first
  const customer = await db.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (customer) {
    const isValid = await bcrypt.compare(password, customer.password)
    if (!isValid) {
      throw new Error('Invalid email or password')
    }
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      role: customer.role,
      userType: USER_TYPES.CUSTOMER,
    }
  }

  // Try Admin table
  const admin = await db.admin.findUnique({
    where: { email: normalizedEmail },
  })
  if (admin) {
    const isValid = await bcrypt.compare(password, admin.password)
    if (!isValid) {
      throw new Error('Invalid email or password')
    }
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      userType: USER_TYPES.ADMIN,
    }
  }

  // Try Staff table
  const staff = await db.staff.findUnique({
    where: { email: normalizedEmail },
  })
  if (staff) {
    if (!staff.isActive) {
      throw new Error(
        'Your account has been deactivated. Please contact an administrator.'
      )
    }
    const isValid = await bcrypt.compare(password, staff.password)
    if (!isValid) {
      throw new Error('Invalid email or password')
    }
    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      userType: USER_TYPES.STAFF,
      mustChangePassword: staff.mustChangePassword,
    }
  }

  throw new Error('No account found with this email address')
}

export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    const user = await authenticateUser(email, password)

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      throw new Error('Authentication system is not properly configured.')
    }

    const now = Math.floor(Date.now() / 1000)
    const tokenPayload = {
      sub: String(user.id),
      name: user.name,
      email: user.email,
      picture: null,
      id: user.id,
      role: user.role,
      userType: user.userType,
      mustChangePassword: user.mustChangePassword ?? false,
      iat: now,
      exp: now + 30 * 24 * 60 * 60,
    }

    const token = jwt.sign(tokenPayload, secret, { algorithm: 'HS256' })

    const cookieStore = await cookies()
    const isProduction = process.env.NODE_ENV === 'production'
    // Cookie maxAge: 30 minutes of inactivity (sliding window, refreshed on each auth page load)
    // JWT exp remains 30 days as hard ceiling
    cookieStore.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60, // 30 minutes — matches refreshSessionCookie()
    })

    // Validate callbackUrl to prevent open redirect attacks.
    // Only allow relative paths starting with "/" — reject absolute URLs.
    const rawCallbackUrl = formData.get('callbackUrl') as string | null
    if (rawCallbackUrl) {
      const url = rawCallbackUrl.trim()
      // Must start with / and NOT start with // (protocol-relative URL)
      if (url.startsWith('/') && !url.startsWith('//')) {
        return { success: true, url }
      }
      // Silently ignore invalid callbackUrl — fall through to role-based redirect
    }

    // Staff with mustChangePassword → redirect to set password page
    if (user.userType === USER_TYPES.STAFF && user.mustChangePassword) {
      logAuthActivity('user_login', {
        userType: user.userType,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      } as any, { note: 'First login, redirected to change password' }).catch(() => {})
      return { success: true, url: '/staff/change-password' }
    }

    // Log successful login (fire-and-forget)
    logAuthActivity('user_login', {
      userType: user.userType,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    } as any).catch(() => {})

    switch (user.userType) {
      case 'admin':
        return { success: true, url: '/admin' }
      case 'staff':
        return { success: true, url: '/staff' }
      case 'customer':
      default:
        return { success: true, url: '/dashboard' }
    }
  } catch (error: unknown) {
    console.error('[Login] Error:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred. Please try again.'

    // Log failed login attempts (fire-and-forget)
    const emailVal = formData.get('email') as string
    if (emailVal) {
      logSecurityActivity('failed_login', null, {
        email: emailVal,
        error: message,
      }).catch(() => {})
    }

    return {
      success: false,
      error: message,
    }
  }
}
