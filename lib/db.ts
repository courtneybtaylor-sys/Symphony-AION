/**
 * Database Client Factory
 * Phase 4b: Prisma client with lazy async initialization
 * 
 * This module does NOT import Prisma at module load time.
 * All Prisma access is deferred until actually needed via async function calls.
 */

let prismaClient: any | null = null;

/**
 * Get or create the Prisma client.
 * This must be called from async contexts.
 */
export async function getPrisma() {
  if (prismaClient) return prismaClient;

  const { PrismaClient } = await import('@prisma/client');
  prismaClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return prismaClient;
}

/**
 * Backward compatibility export for old code that does:
 * const prisma = await import('@/lib/db').then(m => m.default);
 */
let defaultExport: any = null;
Object.defineProperty(module, 'exports', {
  get() {
    if (!defaultExport) {
      defaultExport = new Proxy({}, {
        get: (target, prop) => {
          if (prop === 'getPrisma' || prop === '__esModule') {
            return module.exports[prop];
          }
          throw new Error(
            `[Prisma] Cannot access prisma.${String(prop)} - Prisma was not generated.\n` +
            `Fix: Run "npm install" then restart the dev server.`
          );
        },
      });
    }
    return defaultExport;
  },
  set() {
    // Ignore set attempts
  },
});

// Make getPrisma available as default export for: const prisma = await require('@/lib/db').default()
exports.default = getPrisma;
exports.getPrisma = getPrisma;


