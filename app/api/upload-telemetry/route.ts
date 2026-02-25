/**
 * Telemetry Upload Handler
 * Accepts JSON telemetry, validates against intake gate, returns qualification summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateUpload } from '@/lib/intake-gate';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telemetry = body.telemetry || body;

    // Validate telemetry against intake gate
    const result = validateUpload(telemetry);

    // Generate a hash for telemetry storage (in production: store in S3/DB)
    const telemetryHash = crypto.randomBytes(16).toString('hex');

    return NextResponse.json({
      qualified: result.qualified,
      reason: result.reason,
      warningOnly: result.warningOnly,
      summary: result.summary,
      projectedROI: result.projectedROI,
      telemetryHash, // Used for checkout/processing
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
