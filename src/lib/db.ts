import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always create a fresh client to avoid caching issues
// In development, we need to ensure we're always reading fresh data
export const db = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Only cache in production
if (process.env.NODE_ENV === 'production') {
  globalForPrisma.prisma = db
}
