/**
 * POST /api/free-preview
 * Generates free preview with AEI, GEI, SHI scores
 * Captures email address for marketing
 */

import { NextResponse } from 'next/server';
import { checkPayloadSize } from '@/lib/payload-limits';

export async function POST(request: Request) {
  // Check payload size
  const contentLength = request.headers.get('content-length');
  const sizeCheck = checkPayloadSize(contentLength, '/api/free-preview');
  if (!sizeCheck.allowed) {
    return NextResponse.json(
      { error: sizeCheck.error || 'Payload too large' },
      { status: 413 }
    );
  }

  try {
    const body = await request.json();
    const { telemetryHash, email, consentMarketing } = body;

    if (!telemetryHash || !email) {
      return NextResponse.json(
        { error: 'Missing telemetryHash or email' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: In production, retrieve telemetry from storage using telemetryHash
    // For now, generate sample preview data
    const previewData = {
      success: true,
      aei: 72,
      gei: 18,
      shi: 59,
      grade: 'C',
      estimatedMonthlySavings: 125,
      recommendationCount: 4,
    };

    // TODO: Store email and telemetry hash in database
    // Example: await prisma.freePreviewRequest.create({
    //   data: {
    //     telemetryHash,
    //     email,
    //     consentMarketing,
    //     aei: previewData.aei,
    //     gei: previewData.gei,
    //     shi: previewData.shi,
    //   },
    // });

    // TODO: Send thank you email with preview link

    return NextResponse.json(previewData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Free Preview] Error:', message);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: message },
      { status: 500 }
    );
  }
}
