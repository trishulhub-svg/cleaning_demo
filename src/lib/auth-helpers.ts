import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import type { UserType } from "@/lib/constants"

// ============ Session Helpers ============

/**
 * Get the current server session with extended user type information.
 */
export async function getAuthSession() {
  return getServerSession(authOptions)
}

/**
 * Require the user to be authenticated. Redirects to /login if not.
 * Optionally restrict to specific user types.
 */
export async function requireAuth(allowedTypes?: UserType[]): Promise<{
  id: number
  name: string
  email: string
  role: string
  userType: UserType
} | never> {
  const session = await getAuthSession()

  if (!session?.user) {
    redirect("/login")
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    userType: session.user.userType,
  }

  if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(user.userType)) {
    redirect("/unauthorized")
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
    case "customer": {
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
      return { ...user, userType: "customer" as const }
    }
    case "admin": {
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
      return { ...admin, userType: "admin" as const }
    }
    case "staff": {
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
      return { ...staff, userType: "staff" as const }
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
