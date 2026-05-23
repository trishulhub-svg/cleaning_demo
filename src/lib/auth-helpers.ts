import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import type { UserType } from '@/lib/constants'

// ============ Custom Session (bypasses broken next-auth signIn) ============

interface SessionUser {
  id: number
  name: string
  email: string
  role: string
  userType: UserType
}

interface CustomSession {
  user: SessionUser
}

/**
 * Read the session from the next-auth cookie directly.
 * This bypasses getServerSession which depends on next-auth internals
 * that may not work with Next.js 16.
 */
export async function getAuthSession(): Promise<CustomSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('next-auth.session-token')?.value
    if (!token) return null

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) return null

    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as Record<string, unknown>

    const id = typeof decoded.id === 'number' ? decoded.id
      : typeof decoded.sub === 'string' ? parseInt(decoded.sub, 10)
      : null
    const name = typeof decoded.name === 'string' ? decoded.name : null
    const email = typeof decoded.email === 'string' ? decoded.email : null
    const role = typeof decoded.role === 'string' ? decoded.role : null
    const userType = typeof decoded.userType === 'string' ? decoded.userType as UserType : null

    if (!id || !name || !email || !userType) return null

    return {
      user: { id, name, email, role: role || '', userType },
    }
  } catch {
    return null
  }
}

// ============ Session Inactivity ============

// Cookie maxAge: 5 minutes of inactivity. The cookie gets re-set on each
// authenticated page load (sliding window). JWT itself has a 30-day exp
// as a hard ceiling — the cookie is the inactivity gate.
const SESSION_INACTIVITY_SECONDS = 5 * 60 // 5 minutes

/**
 * Re-issue the session cookie to reset the inactivity timer.
 * Called inside requireAuth so every authenticated page/view extends the session.
 * Fire-and-forget — errors are swallowed.
 */
async function refreshSessionCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    const isProduction = process.env.NODE_ENV === 'production'
    cookieStore.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_INACTIVITY_SECONDS,
    })
  } catch {
    // Swallow — non-critical
  }
}

/**
 * Require the user to be authenticated. Redirects to /login if not.
 * Optionally restrict to specific user types.
 *
 * Side-effect: re-sets the session cookie (sliding inactivity window).
 */
export async function requireAuth(
  allowedTypes?: UserType[]
): Promise<{
  id: number
  name: string
  email: string
  role: string
  userType: UserType
} | never> {
  const cookieStore = await cookies()
  const token = cookieStore.get('next-auth.session-token')?.value
    || cookieStore.get('__Secure-next-auth.session-token')?.value

  if (!token) {
    redirect('/login')
  }

  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    redirect('/login')
  }

  let decoded: Record<string, unknown>
  try {
    decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as Record<string, unknown>
  } catch {
    redirect('/login')
  }

  const id = typeof decoded.id === 'number' ? decoded.id
    : typeof decoded.sub === 'string' ? parseInt(decoded.sub, 10)
    : null
  const name = typeof decoded.name === 'string' ? decoded.name : null
  const email = typeof decoded.email === 'string' ? decoded.email : null
  const role = typeof decoded.role === 'string' ? decoded.role : null
  const userType = typeof decoded.userType === 'string' ? decoded.userType as UserType : null

  if (!id || !name || !email || !userType) {
    redirect('/login')
  }

  const user = {
    id,
    name,
    email,
    role: role || '',
    userType,
  }

  if (
    allowedTypes &&
    allowedTypes.length > 0 &&
    !allowedTypes.includes(user.userType)
  ) {
    redirect('/unauthorized')
  }

  // Re-set cookie to extend inactivity window (fire-and-forget)
  refreshSessionCookie(token)

  return user
}

/**
 * Get the current authenticated user from the database.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const session = await getAuthSession()
  if (!session?.user) return null

  const { userType, id } = session.user

  switch (userType) {
    case 'customer': {
      const user = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
          address: true,
          createdAt: true,
        },
      })
      if (!user) return null
      return { ...user, userType: 'customer' as const }
    }
    case 'admin': {
      const admin = await db.admin.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })
      if (!admin) return null
      return { ...admin, userType: 'admin' as const }
    }
    case 'staff': {
      const staff = await db.staff.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
        },
      })
      if (!staff) return null
      return { ...staff, userType: 'staff' as const }
    }
    default:
      return null
  }
}

// ============ Password Utilities ============

const SALT_ROUNDS = 12

/**
 * Hash a plain-text password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
