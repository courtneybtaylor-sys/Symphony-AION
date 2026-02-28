/**
 * Phase 4e/5b: Zod Validation Schema Tests
 */

import {
  TelemetryUploadSchema,
  CheckoutRequestSchema,
  DownloadRequestSchema,
  AdminStatsSchema,
  StripeEventSchema,
} from '@/lib/validation/schemas';

describe('Zod Validation Schemas', () => {
  describe('CheckoutRequestSchema', () => {
    it('accepts valid checkout request', () => {
      const result = CheckoutRequestSchema.safeParse({
        telemetryHash: 'abc123def456',
        customerEmail: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing telemetryHash', () => {
      const result = CheckoutRequestSchema.safeParse({
        customerEmail: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty telemetryHash', () => {
      const result = CheckoutRequestSchema.safeParse({
        telemetryHash: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = CheckoutRequestSchema.safeParse({
        telemetryHash: 'abc123',
        customerEmail: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('accepts request with runSummary', () => {
      const result = CheckoutRequestSchema.safeParse({
        telemetryHash: 'abc123',
        runSummary: {
          runCount: 5,
          modelCallCount: 10,
          totalCostUSD: 1.5,
          totalTokens: 50000,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('DownloadRequestSchema', () => {
    it('accepts valid token', () => {
      const result = DownloadRequestSchema.safeParse({
        token: 'a1b2c3d4e5f6g7h8i9j0',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short token', () => {
      const result = DownloadRequestSchema.safeParse({
        token: 'abc',
      });
      expect(result.success).toBe(false);
    });

    it('rejects null token', () => {
      const result = DownloadRequestSchema.safeParse({
        token: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('AdminStatsSchema', () => {
    it('accepts valid days', () => {
      const result = AdminStatsSchema.safeParse({ days: '30' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.days).toBe(30);
    });

    it('uses default when not provided', () => {
      const result = AdminStatsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.days).toBe(30);
    });

    it('rejects negative days', () => {
      const result = AdminStatsSchema.safeParse({ days: '-5' });
      expect(result.success).toBe(false);
    });

    it('rejects days > 365', () => {
      const result = AdminStatsSchema.safeParse({ days: '500' });
      expect(result.success).toBe(false);
    });
  });

  describe('StripeEventSchema', () => {
    it('accepts valid Stripe event', () => {
      const result = StripeEventSchema.safeParse({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: { id: 'cs_123', amount: 75000 },
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects event with missing type', () => {
      const result = StripeEventSchema.safeParse({
        id: 'evt_123',
        data: { object: {} },
      });
      expect(result.success).toBe(false);
    });

    it('rejects event with missing id', () => {
      const result = StripeEventSchema.safeParse({
        type: 'checkout.session.completed',
        data: { object: {} },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TelemetryUploadSchema', () => {
    it('accepts valid upload with passthrough', () => {
      const result = TelemetryUploadSchema.safeParse({
        telemetry: {
          id: 'run-1',
          name: 'test-run',
          status: 'COMPLETED',
          startedAt: Date.now(),
          steps: [{ id: 's1', name: 'step1', status: 'COMPLETED', startedAt: Date.now() }],
          events: [
            { id: 'e1', kind: 'run_start', timestamp: Date.now(), runId: 'run-1', data: {} },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts raw body without telemetry wrapper', () => {
      const result = TelemetryUploadSchema.safeParse({
        id: 'run-1',
        name: 'test-run',
        status: 'COMPLETED',
        startedAt: Date.now(),
        steps: [{ id: 's1', name: 'step1', status: 'COMPLETED', startedAt: Date.now() }],
        events: [
          { id: 'e1', kind: 'run_start', timestamp: Date.now(), runId: 'run-1', data: {} },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
