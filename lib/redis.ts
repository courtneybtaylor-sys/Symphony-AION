/**
 * Redis Client Configuration
 * Task 2: Distributed rate limiting & caching
 * Supports local Redis, Upstash (serverless), and test mocks
 */

import Redis from 'ioredis'

let redis: Redis | any = null

function initializeRedis(): Redis | any {
  if (redis) return redis

  if (process.env.NODE_ENV === 'test') {
    // Use in-memory mock for tests
    const RedisMock = require('ioredis-mock')
    redis = new RedisMock()
    console.log('[Redis] Using in-memory mock for tests')
  } else if (process.env.UPSTASH_REDIS_REST_URL) {
    // Production: Upstash (serverless-compatible)
    const { Redis: UpstashRedis } = require('@upstash/redis')
    redis = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    console.log('[Redis] Connected to Upstash')
  } else {
    // Local development: standard Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
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
  }

  return redis
}

const redisClient = initializeRedis()

export { redisClient as redis }
