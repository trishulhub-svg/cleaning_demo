import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.TURSO_DB_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  console.log('[db] TURSO_DB_URL:', dbUrl ? `${dbUrl.substring(0, 20)}...` : 'MISSING')
  console.log('[db] TURSO_AUTH_TOKEN:', authToken ? 'SET' : 'MISSING')

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

  const libsql = createClient({
    url: dbUrl,
    authToken: authToken,
  })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({
    adapter,
    log: ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
