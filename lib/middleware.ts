/**
 * Middleware for rate limiting and request handling
 * Task 2: Apply rate limiting to protected endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from './rate-limiter'

/**
 * Wrapper to apply rate limiting to an API endpoint
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Get client IP from headers (considering proxies)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1'

  const pathname = request.nextUrl.pathname

  // Check rate limit
  const limitResult = await checkRateLimit(ip, pathname)

  if (!limitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please retry after ${limitResult.retryAfter} seconds.`,
        retryAfter: limitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': limitResult.resetAt.toString(),
          'Retry-After': limitResult.retryAfter?.toString() || '60',
        },
      }
    )
  }

  // Call the actual handler
  const response = await handler(request)

  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Limit', limitResult.limit.toString())
  response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString())
  response.headers.set('X-RateLimit-Reset', limitResult.resetAt.toString())

  return response
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}
