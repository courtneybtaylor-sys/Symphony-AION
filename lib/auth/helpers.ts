/**
 * Auth Helper Functions
 * Phase 4a: Session validation and route protection utilities
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './config';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Get the authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = session.user as { id?: string; email?: string; name?: string | null };
  if (!user.id) return null;

  return {
    id: user.id,
    email: user.email!,
    name: user.name,
  };
}

/**
 * Require authentication for an API route.
 * Returns 401 if not authenticated, otherwise returns the user.
 */
export async function requireAuth(): Promise<
  { user: AuthenticatedUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const user = await getAuthUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }
  return { user };
}
