/**
 * Database Client Singleton
 * Phase 4b: Prisma client with connection pooling
 * 
 * This module provides lazy initialization of the Prisma client.
 * The client is not created until it's actually needed, which allows
 * the app to start even if prisma generate hasn't run yet.
 */

let prismaClient: any = null;
let initError: Error | null = null;

function initializePrisma() {
  if (prismaClient) return prismaClient;
  if (initError) throw initError;

  try {
    // Try to import the generated Prisma client
    const { PrismaClient } = require('@prisma/client');
    
    const globalForPrisma = globalThis as unknown as {
      prisma: any;
    };

    prismaClient =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });

    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient;
    
    return prismaClient;
  } catch (error: any) {
    initError = error;
    console.error('[Prisma] Client initialization failed:', error.message);
    
    // Provide helpful error message
    if (error.message?.includes('.prisma/client')) {
      console.error('[Prisma] The Prisma client has not been generated yet.');
      console.error('[Prisma] Run: npm run prisma:generate');
      console.error('[Prisma] Or install dependencies: npm install');
    }
    
    throw error;
  }
}

export const prisma = new Proxy({}, {
  get: (target, prop) => {
    const client = initializePrisma();
    return (client as any)[prop];
  },
}) as any;

export default prisma;

