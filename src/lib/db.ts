import { PrismaClient } from '@prisma/client'

// In development, create a new PrismaClient instance for each request
// to avoid stale data issues with hot reload

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Always use a fresh client to avoid caching issues
export const db = createPrismaClient()

// Only cache in production
if (process.env.NODE_ENV === 'production') {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = db
  }
}
