import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Instance
 * Singleton pattern to avoid multiple instances
 * 
 * In development: Prevents hot-reload from creating new connections
 * In production: Single client instance for performance
 */

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown
 * Disconnect from database when application terminates
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

// Handle termination signals
process.on('beforeExit', disconnectDatabase);
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
