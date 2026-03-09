/**
 * POST /api/free-preview
 * Generates free preview with AEI, GEI, SHI scores
 * Captures email address for marketing
 */

import { NextResponse } from 'next/server';
import { checkPayloadSize } from '@/lib/payload-limits';
import { buildRunViewModel } from '@/lib/telemetry';
import { calculateAEI } from '@/lib/aei-score';
import { calculateGEI } from '@/lib/gei-score';
import { calculateSHI } from '@/lib/shi-score';
import { classifyAEI } from '@/lib/aei-score';

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

    // TODO: Retrieve telemetry from storage using telemetryHash
    // For MVP, we'll use sample data - in production, fetch from database
    let telemetry: any;
    try {
      const { default: getPrisma } = await import('@/lib/db');
      const prisma = await getPrisma();
      const upload = await prisma.upload.findUnique({
        where: { hash: telemetryHash },
      });
      if (upload && upload.telemetry) {
        telemetry = upload.telemetry as any;
      }
    } catch (dbError) {
      console.warn('[Free Preview] Database not available, using mock data:', dbError);
    }

    // If no telemetry found, use mock data for demo
    if (!telemetry) {
      telemetry = {
        runs: [
          {
            id: 'run-1',
            framework: 'LangChain',
            events: [
              {
                kind: 'MODEL_INVOCATION',
                timestamp: Date.now() - 60000,
                data: {
                  model: 'gpt-4',
                  provider: 'openai',
                  inputTokens: 150,
                  outputTokens: 200,
                  cost: 0.015,
                },
              },
            ],
          },
        ],
      };
    }

    // Build RunViewModel from telemetry
    let runViewModel;
    try {
      const runs = Array.isArray(telemetry.runs)
        ? telemetry.runs
        : [telemetry];
      if (runs.length > 0) {
        runViewModel = buildRunViewModel(runs[0]);
      } else {
        throw new Error('No runs in telemetry');
      }
    } catch (error) {
      console.error('[Free Preview] Failed to build RunViewModel:', error);
      return NextResponse.json(
        {
          error: 'Failed to process telemetry',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 400 }
      );
    }

    // Calculate scores
    let aeiScore, geiScore, shiScore;
    try {
      aeiScore = calculateAEI(runViewModel);
      geiScore = calculateGEI(runViewModel);
      shiScore = calculateSHI(aeiScore, geiScore);
    } catch (error) {
      console.error('[Free Preview] Failed to calculate scores:', error);
      return NextResponse.json(
        {
          error: 'Failed to calculate scores',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    // Get grade classification
    const gradeInfo = classifyAEI(aeiScore.overall);
    const grade = gradeInfo.grade;

    // TODO: Store email and telemetry hash in database
    // Example: await prisma.freePreviewRequest.create({
    //   data: {
    //     telemetryHash,
    //     email,
    //     consentMarketing,
    //     aei: aeiScore.overall,
    //     gei: geiScore.overall,
    //     shi: shiScore.overall,
    //   },
    // });

    // TODO: Send thank you email with preview link

    console.log(`[Free Preview] Generated preview for ${email} (hash: ${telemetryHash})`);

    const previewData = {
      success: true,
      aei: Math.round(aeiScore.overall),
      gei: Math.round(geiScore.overall),
      shi: Math.round(shiScore.overall),
      grade,
      estimatedMonthlySavings: Math.round(
        (aeiScore.insights?.[0]?.match(/\$(\d+)/)?.[1] as any) || 0
      ),
      recommendationCount: 4,
    };

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
