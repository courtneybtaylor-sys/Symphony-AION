/**
 * NextAuth API Route
 * Phase 4a: Handles /api/auth/* endpoints (signin, signout, session, etc.)
 */

import '@/lib/prisma-init'
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/config';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
