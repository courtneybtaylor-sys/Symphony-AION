/**
 * Database Client Factory
 * Phase 4b: Prisma client with lazy async initialization
 * 
 * This module does NOT import Prisma at module load time.
 * All Prisma access is deferred until actually needed via getPrisma().
 * 
 * Usage:
 *   const { getPrisma } = await import('@/lib/db');
 *   const prisma = await getPrisma();
 *   const user = await prisma.user.findUnique({ where: { id: '123' } });
 */

let prismaClient: any | null = null;

/**
 * Get or create the Prisma client.
 * This must be called from async contexts and should be called inside
 * route handlers or API functions, never at module load time.
 */
export async function getPrisma() {
  if (prismaClient) return prismaClient;

  try {
    const { PrismaClient } = await import('@prisma/client');
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    return prismaClient;
  } catch (error: any) {
    if (error.message?.includes('.prisma/client')) {
      throw new Error(
        '[Prisma] The Prisma client was not generated. This usually means:\n' +
        '1. npm install has not completed, OR\n' +
        '2. The DATABASE_URL environment variable is not set\n' +
        'Fix: Ensure DATABASE_URL is set, then run: npm install && npm run prisma:generate'
      );
    }
    throw error;
  }
}

/**
 * Disconnect Prisma client (for cleanup)
 */
export async function disconnectPrisma() {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

// Re-export getPrisma as default for convenience
export default getPrisma;



