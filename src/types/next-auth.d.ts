import type { DefaultSession, DefaultUser } from "next-auth"
import type { UserType } from "@/lib/constants"

declare module "next-auth" {
  interface Session {
    user: {
      id: number
      name: string
      email: string
      role: string
      userType: UserType
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    userType: UserType
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number
    name: string
    email: string
    role: string
    userType: UserType
  }
}
