/**
 * Next.js Middleware
 * Phase 4d: Rate limiting
 * Phase 4h: CORS headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitConfig } from '@/lib/rate-limit';

/** Allowed origins for CORS */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://symphony-aion.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // Skip rate limiting for auth routes and static assets
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    const response = NextResponse.next();
    const corsHeaders = getCorsHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for webhooks (Stripe needs reliable delivery)
    if (pathname === '/api/webhook') {
      const response = NextResponse.next();
      const corsHeaders = getCorsHeaders(origin);
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `${ip}:${pathname}`;
    const config = getRateLimitConfig(pathname);
    const result = checkRateLimit(rateLimitKey, config);

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
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    const response = NextResponse.next();
    for (const [key, value] of Object.entries(result.headers)) {
      response.headers.set(key, value);
    }
    const corsHeaders = getCorsHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Add CORS headers to all other responses
  const response = NextResponse.next();
  const corsHeaders = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
