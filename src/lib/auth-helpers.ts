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

/**
 * Require the user to be authenticated. Redirects to /login if not.
 * Optionally restrict to specific user types.
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
  const session = await getAuthSession()

  if (!session?.user) {
    redirect('/login')
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    userType: session.user.userType,
  }

  if (
    allowedTypes &&
    allowedTypes.length > 0 &&
    !allowedTypes.includes(user.userType)
  ) {
    redirect('/unauthorized')
  }

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
