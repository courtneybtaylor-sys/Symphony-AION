/**
 * Next.js Middleware
 * - Refreshes Supabase auth session (keeps cookies fresh on every request)
 * - Protects /admin, /dashboard, /billing, /api/ingest/upload — redirects unauthenticated users to /login
 * - Rate limiting for API routes
 * - CORS headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit, getRateLimitConfig } from '@/lib/rate-limit'

/** Allowed origins for CORS */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://symphony-aion.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

/** Routes that require an active session */
const PROTECTED_ROUTES = ['/dashboard', '/admin', '/billing', '/api/ingest/upload']

/** Routes that are always public — skip auth check entirely */
const PUBLIC_ROUTES = ['/login', '/auth', '/api/upload-telemetry', '/api/checkout', '/api/stripe-webhook']

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  }

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  // Always public — skip auth check
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Build a response object we'll mutate as needed
  let response = NextResponse.next({ request })

  // Attach CORS headers to every response
  const corsHeaders = getCorsHeaders(origin)
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }

  // ── Supabase session refresh ──────────────────────────────────────────────
  // Refreshes the session cookie on every request so it stays valid.
  // Skip for static assets.
  if (
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/favicon')
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            for (const [key, value] of Object.entries(corsHeaders)) {
              response.headers.set(key, value)
            }
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // This call refreshes the session token in the cookie store
    const { data: { user } } = await supabase.auth.getUser()

    // ── Protected route guard ───────────────────────────────────────────────
    // Middleware checks that a session exists; pages do full role checks.
    const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
    if (isProtected && !user) {
      // API routes return 401 with a loginUrl hint
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', loginUrl: '/login' },
          { status: 401 }
        )
      }
      // UI routes redirect to /login with returnTo
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('returnTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Rate limiting for API routes ─────────────────────────────────────────
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth') &&
    pathname !== '/api/webhook' &&
    pathname !== '/api/upload-telemetry'
  ) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const rateLimitKey = `${ip}:${pathname}`
    const config = getRateLimitConfig(pathname)
    const result = checkRateLimit(rateLimitKey, config)

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: result.headers['Retry-After'],
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...result.headers,
            ...corsHeaders,
          },
        }
      )
    }

    for (const [key, value] of Object.entries(result.headers)) {
      response.headers.set(key, value)
    }
  }

  return response
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
