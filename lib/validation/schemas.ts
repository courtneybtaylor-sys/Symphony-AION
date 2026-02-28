/**
 * Zod Validation Schemas
 * Phase 4e: Input validation for all API endpoints
 */

import { z } from 'zod';

/** Event schema for telemetry events */
const EventSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  timestamp: z.number().positive(),
  runId: z.string().min(1),
  stepId: z.string().optional(),
  data: z.record(z.unknown()),
  metadata: z
    .object({
      userId: z.string().optional(),
      sessionId: z.string().optional(),
      environment: z.string().optional(),
    })
    .optional(),
});

/** Step schema */
const StepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  startedAt: z.number().positive(),
  completedAt: z.number().optional(),
  durationMs: z.number().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stackTrace: z.string().optional(),
    })
    .optional(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
});

/** Run schema for telemetry uploads */
const RunSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  startedAt: z.number().positive(),
  completedAt: z.number().optional(),
  durationMs: z.number().optional(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  steps: z.array(StepSchema).min(1, 'At least one step is required'),
  events: z.array(EventSchema).min(1, 'At least one event is required'),
  metadata: z
    .object({
      userId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      externalId: z.string().optional(),
    })
    .optional(),
});

/** Upload telemetry request body */
export const TelemetryUploadSchema = z.object({
  telemetry: RunSchema.optional(),
  // Allow direct run object as body
}).passthrough();

/** Create checkout request body */
export const CheckoutRequestSchema = z.object({
  telemetryHash: z.string().min(1, 'telemetryHash is required'),
  customerEmail: z.string().email().optional(),
  runSummary: z
    .object({
      runCount: z.number().int().positive().optional(),
      modelCallCount: z.number().int().nonnegative().optional(),
      totalCostUSD: z.number().nonnegative().optional(),
      totalTokens: z.number().int().nonnegative().optional(),
      frameworkDetected: z.string().optional(),
      estimatedSavingsRangeLow: z.number().nonnegative().optional(),
      estimatedSavingsRangeHigh: z.number().nonnegative().optional(),
    })
    .optional(),
});

/** Download report query params */
export const DownloadRequestSchema = z.object({
  token: z.string().min(10, 'Token must be at least 10 characters'),
});

/** Admin stats query params */
export const AdminStatsSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/** Stripe webhook event (basic validation - Stripe SDK does full validation) */
export const StripeEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});

export { RunSchema, EventSchema, StepSchema };
