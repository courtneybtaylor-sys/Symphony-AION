#!/usr/bin/env node

/**
 * Prisma Client Generation Script
 * Generates the Prisma client from the schema
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('[v0] Starting Prisma client generation...');

try {
  console.log('[v0] Running: npx prisma generate');
  execSync('npx prisma generate', {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  console.log('[v0] ✅ Prisma client generated successfully');
  process.exit(0);
} catch (error) {
  console.error('[v0] ❌ Prisma generation failed:', error.message);
  process.exit(1);
}
