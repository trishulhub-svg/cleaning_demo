import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.TURSO_DB_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!dbUrl) {
    throw new Error(
      '[db] TURSO_DB_URL is not set in environment variables. ' +
      'Please add it in Vercel Dashboard > Settings > Environment Variables. ' +
      'Required name: TURSO_DB_URL'
    )
  }
  if (!authToken) {
    throw new Error(
      '[db] TURSO_AUTH_TOKEN is not set in environment variables. ' +
      'Please add it in Vercel Dashboard > Settings > Environment Variables. ' +
      'Required name: TURSO_AUTH_TOKEN'
    )
  }

  // Pass config object (NOT a pre-created client) to the adapter.
  // The adapter's connect() method calls createClient(this.#config) internally,
  // so it needs { url, authToken }, not a LibSQLClient instance.
  const adapter = new PrismaLibSQL({
    url: dbUrl,
    authToken: authToken,
  })

  return new PrismaClient({
    adapter,
    log: ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
