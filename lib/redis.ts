/**
 * Redis Client Configuration
 * Task 2: Distributed rate limiting & caching
 * Supports local Redis, Upstash (serverless), and test mocks
 *
 * LAZY INITIALIZATION: Redis is only initialized if explicitly requested
 * (not at module load time, which would crash on Vercel serverless)
 */

import Redis from 'ioredis'

let redis: Redis | any = null
let initAttempted = false

function initializeRedis(): Redis | any {
  if (redis) return redis
  if (initAttempted && !redis) return null // Already tried, Redis unavailable

  initAttempted = true

  // If Redis is not configured at all, skip initialization
  if (
    !process.env.REDIS_URL &&
    !process.env.UPSTASH_REDIS_REST_URL &&
    process.env.NODE_ENV !== 'test'
  ) {
    console.warn('[Redis] Not configured (REDIS_URL or UPSTASH_REDIS_REST_URL not set) — queue unavailable')
    return null
  }

  if (process.env.NODE_ENV === 'test') {
    // Use in-memory mock for tests
    const RedisMock = require('ioredis-mock')
    redis = new RedisMock()
    console.log('[Redis] Using in-memory mock for tests')
  } else if (process.env.UPSTASH_REDIS_REST_URL) {
    // Production: Upstash (serverless-compatible)
    try {
      const { Redis: UpstashRedis } = require('@upstash/redis')
      redis = new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      console.log('[Redis] Connected to Upstash')
    } catch (err: any) {
      console.warn('[Redis] Failed to connect to Upstash:', err.message)
      return null
    }
  } else if (process.env.REDIS_URL) {
    // Local development or custom: standard Redis
    try {
      const redisUrl = process.env.REDIS_URL
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        enableReadyCheck: false,
        enableOfflineQueue: false,
      })

      redis.on('error', (err: any) => {
        console.warn('[Redis] Connection error:', err.message)
      })

      redis.on('connect', () => {
        console.log('[Redis] Connected to', redisUrl)
      })
    } catch (err: any) {
      console.warn('[Redis] Failed to initialize:', err.message)
      return null
    }
  }

  return redis
}

/**
 * Get Redis client, initializing on first call if available
 * Returns null if Redis is not configured
 */
export function getRedis(): Redis | any | null {
  return initializeRedis()
}

/**
 * Direct export for backward compatibility (lazy, checked)
 */
Object.defineProperty(exports, 'redis', {
  get() {
    return getRedis()
  },
})
