/**
 * Auth Helper Functions
 * Uses Supabase for session validation.
 * Supports DEMO_MODE bypass for development.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEMO_MODE, DEMO_USER } from '@/lib/demo-mode'

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string | null
  role?: string
}

/**
 * Get the authenticated user from the Supabase session.
 * In demo mode, returns the demo user.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  if (DEMO_MODE) {
    return {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
    }
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) return null

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    role: 'user', // role is stored in Prisma — callers who need role should query Prisma
  }
}

/**
 * Require authentication for an API route.
 * Returns 401 if not authenticated, otherwise returns the Supabase user.
 */
export async function requireAuth(): Promise<
  { user: AuthenticatedUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  if (DEMO_MODE) {
    return {
      user: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        role: DEMO_USER.role,
      },
    }
  }

  const user = await getAuthUser()
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }
  return { user }
}

/**
 * Optional authentication — returns null (not an error) for unauthenticated requests.
 */
export async function optionalAuth(): Promise<AuthenticatedUser | null> {
  if (DEMO_MODE) {
    return {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
    }
  }
  return getAuthUser()
}
