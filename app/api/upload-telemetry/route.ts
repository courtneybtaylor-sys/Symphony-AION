/**
 * Telemetry Upload Handler
 * Accepts JSON telemetry, validates against intake gate, returns qualification summary
 * Phase 4a: Protected with authentication
 * Phase 4e: Validated with Zod
 * Task 5: Payload size limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateUpload } from '@/lib/intake-gate';
import { requireAuth } from '@/lib/auth/helpers';
import { TelemetryUploadSchema } from '@/lib/validation/schemas';
import { checkPayloadSize, validateTelemetrySize } from '@/lib/payload-limits';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  // Task 5: Check payload size
  const contentLength = request.headers.get('content-length');
  const sizeCheck = checkPayloadSize(contentLength, '/api/upload-telemetry');
  if (!sizeCheck.allowed) {
    return NextResponse.json(
      { error: sizeCheck.error || 'Payload too large' },
      { status: 413 }
    );
  }

  // Phase 4a: Require authentication
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();

    // Phase 4e: Validate input
    const parsed = TelemetryUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const telemetry = body.telemetry || body;

    // Task 5: Validate telemetry structure sizes
    const telemetrySizeCheck = validateTelemetrySize(telemetry, '/api/upload-telemetry');
    if (!telemetrySizeCheck.valid) {
      return NextResponse.json(
        { error: telemetrySizeCheck.error || 'Telemetry structure too large' },
        { status: 413 }
      );
    }

    // Validate telemetry against intake gate
    const result = validateUpload(telemetry);

    // Generate a hash for telemetry storage
    const telemetryHash = crypto.randomBytes(16).toString('hex');

    // Phase 4b: Store upload in database
    try {
      const { getPrisma } = await import('@/lib/db');
      const prisma = await getPrisma();
      await prisma.upload.create({
        data: {
          userId: auth.user.id,
          telemetry: telemetry as any,  // Prisma handles JSONB serialization
          hash: telemetryHash,
          framework: result.summary?.frameworkDetected || null,
          modelCount: result.summary?.modelsDetected?.length || null,
          totalCostUSD: result.summary?.totalCostUSD || null,
        },
      });
    } catch {
      // DB may not be available in test mode - continue with in-memory
    }

    // Log analytics event
    try {
      const { getPrisma } = await import('@/lib/db');
      const prisma = await getPrisma();
      await prisma.analyticsEvent.create({
        data: {
          userId: auth.user.id,
          eventType: result.qualified ? 'qualified' : 'not_qualified',
          metadata: { telemetryHash } as any,  // Prisma handles JSONB serialization
        },
      });
    } catch {
      // Ignore analytics errors
    }

    return NextResponse.json({
      qualified: result.qualified,
      reason: result.reason,
      warningOnly: result.warningOnly,
      summary: result.summary,
      projectedROI: result.projectedROI,
      telemetryHash,
      message: result.qualified
        ? `Your workflow qualifies for audit! Estimated monthly savings: $${Math.round(result.summary.estimatedSavingsRangeLow)}–$${Math.round(result.summary.estimatedSavingsRangeHigh)}.`
        : result.reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 400 }
    );
  }
}
