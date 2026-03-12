/**
 * Redis-backed Rate Limiter
 * Task 2: Distributed rate limiting across multiple server instances
 * Uses sliding window algorithm for accuracy
 */

import { redis } from './redis'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
  retryAfter?: number
}

const LIMITS = {
  '/api/upload-telemetry': { requests: 10, windowMs: 60_000 },      // 10 per minute
  '/api/create-checkout': { requests: 5, windowMs: 60_000 },        // 5 per minute
  '/api/validate-upload': { requests: 20, windowMs: 60_000 },       // 20 per minute
  '/api/webhook': { requests: 100, windowMs: 60_000 },              // 100 per minute (webhooks)
  '/api/free-preview': { requests: 5, windowMs: 24 * 60 * 60_000 }, // 5 per day per IP
  '/api/check-free-preview': { requests: 60, windowMs: 60_000 },    // 60 per minute (status check)
  default: { requests: 100, windowMs: 60_000 },
}

/**
 * Check rate limit using Redis sliding window
 * Returns whether request is allowed and remaining quota
 */
export async function checkRateLimit(
  ip: string,
  path: string
): Promise<RateLimitResult> {
  const config = LIMITS[path as keyof typeof LIMITS] || LIMITS.default
  const now = Date.now()

  // If Redis is not configured, fail open (allow all requests)
  const client = redis && typeof redis.pipeline === 'function' ? redis : null
  if (!client) {
    return {
      allowed: true,
      remaining: config.requests,
      resetAt: now + config.windowMs,
      limit: config.requests,
    }
  }

  const windowStart = now - config.windowMs
  const key = `rl:${ip}:${path}`

  try {
    // Sliding window using Redis sorted set
    // Each request is stored as: {timestamp}-{random}
    const pipeline = redis.pipeline()

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart)

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`)

    // Count requests in window
    pipeline.zcard(key)

    // Set expiry (TTL = window size)
    pipeline.expire(key, Math.ceil(config.windowMs / 1000))

    const results = await pipeline.exec()

    if (!results) {
      throw new Error('Pipeline execution failed')
    }

    const [, , countResult] = results
    const count = (countResult[1] as number) || 0

    const allowed = count <= config.requests
    const remaining = Math.max(0, config.requests - count + 1) // +1 because we added current
    const resetAt = now + config.windowMs
    const retryAfter = allowed ? undefined : Math.ceil((resetAt - now) / 1000)

    return {
      allowed,
      remaining,
      resetAt,
      limit: config.requests,
      retryAfter,
    }
  } catch (error) {
    // If Redis fails, allow request (fail open, don't block traffic)
    console.warn('[RateLimit] Redis error, allowing request:', error)
    return {
      allowed: true,
      remaining: config.requests,
      resetAt: now + config.windowMs,
      limit: config.requests,
    }
  }
}

/**
 * Get current rate limit status for a user (informational)
 */
export async function getRateLimitStatus(
  ip: string,
  path: string
): Promise<RateLimitResult> {
  return checkRateLimit(ip, path)
}

/**
 * Reset rate limit for a user (admin function)
 */
export async function resetRateLimit(ip: string, path?: string): Promise<void> {
  if (path) {
    const key = `rl:${ip}:${path}`
    await redis.del(key)
  } else {
    // Reset all paths for this IP
    const keys = await redis.keys(`rl:${ip}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}
