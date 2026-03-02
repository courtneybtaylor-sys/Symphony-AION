// Emergency stub Prisma client for development
// This allows the app to start even if prisma generate hasn't run yet
// The stub provides mock responses for all database operations

export class PrismaClient {
  constructor(options?: any) {
    console.warn('[Prisma Stub] Using stub client - database operations will fail. Run: npm install && npm run prisma:generate');
  }

  $connect() {
    console.warn('[Prisma Stub] $connect called');
    return Promise.resolve();
  }

  $disconnect() {
    console.warn('[Prisma Stub] $disconnect called');
    return Promise.resolve();
  }

  $queryRaw() {
    throw new Error('[Prisma Stub] Raw queries not supported - run: npm run prisma:generate');
  }

  // Proxy all table operations
  [key: string]: any;

  constructor(options?: any) {
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === '$connect' || prop === '$disconnect' || prop === '$queryRaw') {
          return target[prop as string];
        }
        
        // Return mock table operations
        return {
          findUnique: () => {
            console.warn('[Prisma Stub] findUnique called');
            return Promise.resolve(null);
          },
          findMany: () => {
            console.warn('[Prisma Stub] findMany called');
            return Promise.resolve([]);
          },
          create: () => {
            console.warn('[Prisma Stub] create called');
            return Promise.resolve({});
          },
          update: () => {
            console.warn('[Prisma Stub] update called');
            return Promise.resolve({});
          },
          delete: () => {
            console.warn('[Prisma Stub] delete called');
            return Promise.resolve({});
          },
          upsert: () => {
            console.warn('[Prisma Stub] upsert called');
            return Promise.resolve({});
          },
        };
      },
    });
  }
}

export default PrismaClient;
