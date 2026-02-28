/**
 * Phase 4d/5b: Rate Limiting Tests
 */

import {
  checkRateLimit,
  getRateLimitConfig,
  resetRateLimitStore,
  RATE_LIMITS,
} from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  describe('checkRateLimit', () => {
    it('allows requests under the limit', () => {
      const config = { maxRequests: 10, windowMs: 60000 };
      const result = checkRateLimit('test-key', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it('tracks remaining correctly', () => {
      const config = { maxRequests: 3, windowMs: 60000 };

      const r1 = checkRateLimit('test-key', config);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit('test-key', config);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit('test-key', config);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);
    });

    it('rejects requests over the limit', () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      checkRateLimit('test-key', config);
      checkRateLimit('test-key', config);
      const result = checkRateLimit('test-key', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('returns rate limit headers', () => {
      const config = { maxRequests: 10, windowMs: 60000 };
      const result = checkRateLimit('test-key', config);

      expect(result.headers['X-RateLimit-Limit']).toBe('10');
      expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
      expect(result.headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('returns Retry-After header when limit exceeded', () => {
      const config = { maxRequests: 1, windowMs: 60000 };

      checkRateLimit('test-key', config);
      const result = checkRateLimit('test-key', config);

      expect(result.allowed).toBe(false);
      expect(result.headers['Retry-After']).toBeDefined();
      expect(parseInt(result.headers['Retry-After'])).toBeGreaterThan(0);
    });

    it('isolates different keys', () => {
      const config = { maxRequests: 1, windowMs: 60000 };

      const r1 = checkRateLimit('key-1', config);
      expect(r1.allowed).toBe(true);

      const r2 = checkRateLimit('key-2', config);
      expect(r2.allowed).toBe(true);

      const r3 = checkRateLimit('key-1', config);
      expect(r3.allowed).toBe(false);
    });
  });

  describe('getRateLimitConfig', () => {
    it('returns config for upload endpoint', () => {
      const config = getRateLimitConfig('/api/upload-telemetry');
      expect(config.maxRequests).toBe(100);
    });

    it('returns config for checkout endpoint', () => {
      const config = getRateLimitConfig('/api/create-checkout');
      expect(config.maxRequests).toBe(50);
    });

    it('returns default config for unknown endpoints', () => {
      const config = getRateLimitConfig('/api/unknown');
      expect(config).toEqual(RATE_LIMITS.default);
    });

    it('matches prefix patterns', () => {
      const config = getRateLimitConfig('/api/runs/some-id');
      expect(config.maxRequests).toBe(1000);
    });
  });
});
