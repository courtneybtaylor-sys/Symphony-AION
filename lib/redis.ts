/**
 * Redis Client Configuration
 * Task 2: Distributed rate limiting & caching
 * Supports local Redis, Upstash (serverless), and test mocks
 *
 * LAZY INITIALIZATION: Redis is only initialized if explicitly requested
 * (not at module load time, which would crash on Vercel serverless)
 */

import Redis from 'ioredis'

let _redisClient: Redis | any = null
let initAttempted = false

function initializeRedis(): Redis | any {
  if (_redisClient) return _redisClient
  if (initAttempted && !_redisClient) return null // Already tried, Redis unavailable

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
    _redisClient = new RedisMock()
    console.log('[Redis] Using in-memory mock for tests')
  } else if (process.env.UPSTASH_REDIS_REST_URL) {
    // Production: Upstash (serverless-compatible)
    try {
      const { Redis: UpstashRedis } = require('@upstash/redis')
      _redisClient = new UpstashRedis({
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
      _redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
        enableReadyCheck: false,
        enableOfflineQueue: false,
      })

      _redisClient.on('error', (err: any) => {
        console.warn('[Redis] Connection error:', err.message)
      })

      _redisClient.on('connect', () => {
        console.log('[Redis] Connected to', redisUrl)
      })
    } catch (err: any) {
      console.warn('[Redis] Failed to initialize:', err.message)
      return null
    }
  }

  return _redisClient
}

/**
 * Get Redis client, initializing on first call if available
 * Returns null if Redis is not configured
 */
export function getRedis(): Redis | any | null {
  return initializeRedis()
}

/**
 * Named export for direct import — uses lazy getter so no connection
 * is attempted until the value is actually read.
 * Satisfies: import { redis } from './redis'
 */
export const redis = new Proxy({} as any, {
  get(_target, prop) {
    const client = initializeRedis()
    if (!client) return undefined
    const val = client[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})
