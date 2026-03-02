/**
 * Prisma Client Generator
 * This file is imported at the top of app to ensure Prisma is generated
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const prismaGeneratedPath = join(process.cwd(), 'node_modules', '.prisma', 'client');

export function ensurePrismaGenerated() {
  // Check if Prisma client has been generated
  if (existsSync(prismaGeneratedPath)) {
    console.log('[Prisma] Client already generated');
    return;
  }

  console.log('[Prisma] Client not found, generating...');
  
  try {
    execSync('npx prisma generate', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    console.log('[Prisma] Client generated successfully');
  } catch (error: any) {
    console.error('[Prisma] Generation failed:', error.message);
    console.error('[Prisma] Continuing without database access');
  }
}

// Auto-generate on import if in dev mode
if (process.env.NODE_ENV === 'development') {
  try {
    ensurePrismaGenerated();
  } catch (e) {
    // Silently fail in dev
  }
}
