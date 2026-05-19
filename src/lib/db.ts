import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.TURSO_DB_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!dbUrl) {
    throw new Error(
      '[db] TURSO_DB_URL is not set. Please add it to your .env or Vercel env vars.'
    )
  }
  if (!authToken) {
    throw new Error(
      '[db] TURSO_AUTH_TOKEN is not set. Please add it to your .env or Vercel env vars.'
    )
  }

  const libsql = createClient({
    url: dbUrl,
    authToken: authToken,
  })
  const adapter = new PrismaLibSql(libsql)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
