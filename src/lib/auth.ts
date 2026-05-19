import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { USER_TYPES } from "@/lib/constants"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const email = credentials.email.toLowerCase().trim()

        // Try Customer (User table) first
        const customer = await db.user.findUnique({ where: { email } })
        if (customer) {
          const isValid = await bcrypt.compare(credentials.password, customer.password)
          if (!isValid) {
            throw new Error("Invalid email or password")
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
        const admin = await db.admin.findUnique({ where: { email } })
        if (admin) {
          const isValid = await bcrypt.compare(credentials.password, admin.password)
          if (!isValid) {
            throw new Error("Invalid email or password")
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
        const staff = await db.staff.findUnique({ where: { email } })
        if (staff) {
          if (!staff.isActive) {
            throw new Error("Your account has been deactivated. Please contact an administrator.")
          }
          const isValid = await bcrypt.compare(credentials.password, staff.password)
          if (!isValid) {
            throw new Error("Invalid email or password")
          }
          return {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            role: staff.role,
            userType: USER_TYPES.STAFF,
          }
        }

        throw new Error("No account found with this email address")
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, embed user data into the JWT token
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = user.role
        token.userType = user.userType
      }
      return token
    },
    async session({ session, token }) {
      // Pass token data through to the client session
      if (session.user) {
        session.user.id = token.id as number
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.role = token.role as string
        session.user.userType = token.userType as UserType
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
