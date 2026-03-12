/**
 * Auth Helper Functions
 * Uses Supabase for session validation.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string | null
  role?: string
}

/**
 * Get the authenticated user from the Supabase session.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
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
  return getAuthUser()
}
