/**
 * Rate Limiting
 * Phase 4d: In-memory sliding window rate limiter
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  headers: Record<string, string>;
}

/** Default rate limits per endpoint pattern */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/upload-telemetry': { maxRequests: 100, windowMs: 60 * 60 * 1000 },   // 100/hour
  '/api/create-checkout': { maxRequests: 50, windowMs: 60 * 60 * 1000 },      // 50/hour
  '/api/download-report': { maxRequests: 1000, windowMs: 60 * 60 * 1000 },    // 1000/hour
  '/api/runs': { maxRequests: 1000, windowMs: 60 * 60 * 1000 },               // 1000/hour
  '/api/admin/stats': { maxRequests: 100, windowMs: 60 * 60 * 1000 },         // 100/hour
  default: { maxRequests: 500, windowMs: 60 * 60 * 1000 },                    // 500/hour fallback
};

/**
 * Check rate limit for a given key and config.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  cleanup(config.windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + config.windowMs
    : now + config.windowMs;

  if (entry.timestamps.length >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetAt,
      headers: {
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        'Retry-After': String(Math.ceil((resetAt - now) / 1000)),
      },
    };
  }

  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: remaining - 1,
    limit: config.maxRequests,
    resetAt,
    headers: {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(remaining - 1),
      'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    },
  };
}

/**
 * Get rate limit config for a given pathname.
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Check exact match first
  if (RATE_LIMITS[pathname]) return RATE_LIMITS[pathname];

  // Check prefix match
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern !== 'default' && pathname.startsWith(pattern)) return config;
  }

  return RATE_LIMITS.default;
}

/** Reset rate limit store (for testing) */
export function resetRateLimitStore() {
  store.clear();
}
