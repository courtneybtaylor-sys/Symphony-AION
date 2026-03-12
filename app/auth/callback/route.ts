/**
 * GET /auth/callback
 * Supabase OAuth callback handler.
 * Exchanges the auth code for a session, syncs the Prisma user record,
 * then routes: admin/super_admin → /admin, everyone else → returnTo or /dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=missing_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
  }

  const authUser = data.user

  // Sync with Prisma — find or create the User record keyed by email.
  // This bridges Supabase identity with the existing Prisma schema.
  try {
    const { default: getPrisma } = await import('@/lib/db')
    const prisma = await getPrisma()

    const dbUser = await prisma.user.upsert({
      where: { email: authUser.email! },
      create: {
        email: authUser.email!,
        name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email!.split('@')[0],
        role: 'user',
      },
      update: {
        // Keep name fresh from OAuth provider if available
        ...(authUser.user_metadata?.full_name
          ? { name: authUser.user_metadata.full_name }
          : {}),
      },
      select: { id: true, role: true, email: true },
    })

    // Auto-promote known super-admin emails
    const { isAdminEmail } = await import('@/lib/auth/config')
    if (isAdminEmail(dbUser.email) && dbUser.role !== 'super_admin') {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: 'super_admin' },
      })
      return NextResponse.redirect(`${origin}/admin`)
    }

    // Role-based routing
    if (dbUser.role === 'admin' || dbUser.role === 'super_admin') {
      return NextResponse.redirect(`${origin}/admin`)
    }
  } catch (err) {
    console.error('[Auth] Prisma sync error:', err)
    // Non-fatal — continue to dashboard
  }

  // Validate returnTo is a relative path to prevent open redirects
  const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/dashboard'
  return NextResponse.redirect(`${origin}${safeReturnTo}`)
}
