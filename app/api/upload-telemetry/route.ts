/**
 * Telemetry Upload Handler — Symphony-AION v2.2
 * PUBLIC endpoint — no authentication required
 * Auth is enforced downstream at Stripe payment for PDF only
 *
 * Fixes applied:
 * - Removed requireAuth() [was causing 401 for all anonymous uploads]
 * - Removed Redis/BullMQ queue dependency [Redis not available on Vercel serverless]
 * - Scoring runs synchronously in-process (sub-500ms for typical payloads)
 * - Prisma writes are best-effort (non-fatal if DB unavailable)
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateUpload } from '@/lib/intake-gate';
import { TelemetryUploadSchema } from '@/lib/validation/schemas';
import { checkPayloadSize, validateTelemetrySize } from '@/lib/payload-limits';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  // Check payload size (no auth needed for this check)
  const contentLength = request.headers.get('content-length');
  const sizeCheck = checkPayloadSize(contentLength, '/api/upload-telemetry');
  if (!sizeCheck.allowed) {
    return NextResponse.json(
      { error: sizeCheck.error || 'Payload too large' },
      { status: 413 }
    );
  }

  // NO AUTH CHECK — public upload endpoint
  // PDF report download is gated behind Stripe payment ($750)

  try {
    const contentType = request.headers.get('content-type') || '';
    let telemetry: unknown;

    // Handle FormData or JSON uploads
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      try {
        telemetry = JSON.parse(await file.text());
      } catch {
        return NextResponse.json({ error: 'Invalid JSON in uploaded file' }, { status: 400 });
      }
    } else {
      try {
        const body = await request.json();
        telemetry = body.telemetry || body;
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    // Validate input schema
    const parsed = TelemetryUploadSchema.safeParse({ telemetry });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Validate telemetry structure sizes
    const telemetrySizeCheck = validateTelemetrySize(telemetry, '/api/upload-telemetry');
    if (!telemetrySizeCheck.valid) {
      return NextResponse.json(
        { error: telemetrySizeCheck.error || 'Telemetry structure too large' },
        { status: 413 }
      );
    }

    // Run scoring synchronously — no queue, no Redis
    const result = validateUpload(telemetry);

    // Generate job ID for tracking
    const telemetryHash = crypto.randomBytes(16).toString('hex');

    // Best-effort DB write (non-fatal — Prisma/DB may not be configured yet)
    try {
      const { getPrisma } = await import('@/lib/db');
      const prisma = await getPrisma();
      await prisma.upload.create({
        data: {
          telemetry: telemetry as any,
          hash: telemetryHash,
          framework: result.summary?.frameworkDetected || null,
          modelCount: result.summary?.modelsDetected?.length || null,
          totalCostUSD: result.summary?.totalCostUSD || null,
        },
      });
    } catch {
      // Non-fatal: DB write failure does not block the upload response
    }

    return NextResponse.json({
      qualified: result.qualified,
      reason: result.reason,
      warningOnly: result.warningOnly,
      summary: result.summary,
      projectedROI: result.projectedROI,
      telemetryHash,
      message: result.qualified
        ? `Workflow qualifies for audit. Estimated monthly savings: $${Math.round(
            result.summary.estimatedSavingsRangeLow
          )}–$${Math.round(result.summary.estimatedSavingsRangeHigh)}.`
        : result.reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
