/**
 * Auth Helper Functions
 * Phase 4a: Session validation and route protection utilities
 * Phase 6: Demo mode support for development and testing
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './config';
import { DEMO_MODE, DEMO_USER } from '@/lib/demo-mode';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
}

/**
 * Get the authenticated user from the session.
 * In demo mode, returns the demo user.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  // Demo mode: always return demo user
  if (DEMO_MODE) {
    return {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
    };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = session.user as { id?: string; email?: string; name?: string | null; role?: string };
  if (!user.id) return null;

  return {
    id: user.id,
    email: user.email!,
    name: user.name,
    role: user.role || 'user',
  };
}

/**
 * Require authentication for an API route.
 * In demo mode, always succeeds with demo user.
 * Returns 401 if not authenticated, otherwise returns the user.
 */
export async function requireAuth(): Promise<
  { user: AuthenticatedUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  // Demo mode: always succeed
  if (DEMO_MODE) {
    return {
      user: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        role: DEMO_USER.role,
      },
    };
  }

  const user = await getAuthUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { 
          error: 'Authentication required',
          hint: 'Enable demo mode with NEXT_PUBLIC_DEMO_MODE=true for development',
        },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Optional authentication for public API routes.
 * In demo mode, returns demo user.
 * Returns null (not an error) if not authenticated — anonymous users allowed.
 */
export async function optionalAuth(): Promise<AuthenticatedUser | null> {
  if (DEMO_MODE) {
    return {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
    };
  }
  return getAuthUser();
}
