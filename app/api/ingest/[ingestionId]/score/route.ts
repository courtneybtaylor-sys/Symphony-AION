/**
 * GET /api/ingest/[ingestionId]/score
 * Returns the computed AEI/GEI/SHI scores for the ingestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildRunViewModel } from '@/lib/telemetry';
import { calculateAEI } from '@/lib/aei-score';
import { calculateGEI } from '@/lib/gei-score';
import { calculateSHI } from '@/lib/shi-score';

export async function GET(
  request: NextRequest,
  { params }: { params: { ingestionId: string } }
) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get prisma client
    const { default: getPrisma } = await import('@/lib/db');
    const prisma = await getPrisma();

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: authUser.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get ingestion job
    const job = await prisma.ingestionJob.findUnique({
      where: { id: params.ingestionId },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Ingestion job not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (job.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: `Cannot score job with status: ${job.status}` },
        { status: 400 }
      );
    }

    // Get all normalized events
    const events = await prisma.normalizedEvent.findMany({
      where: { ingestionId: params.ingestionId },
      orderBy: { timestamp: 'asc' },
    });

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'No events found for ingestion' },
        { status: 400 }
      );
    }

    // Convert normalized events to telemetry format for scoring
    const telemetryData = {
      events: events.map((e: any) => ({
        run_id: e.run_id,
        step_id: e.step_id,
        event_kind: e.event_kind,
        provider: e.provider,
        model: e.model,
        tokens_input: e.tokens_input,
        tokens_output: e.tokens_output,
        cost_usd: e.cost_usd,
        status: e.status,
        duration_ms: e.duration_ms || 0,
        error_type: e.error_type,
        metadata: e.metadata,
        timestamp: e.timestamp.toISOString(),
      })),
    };

    // Build RunViewModel
    const runViewModel = buildRunViewModel(telemetryData as any);

    // Calculate scores
    const aeiScore = calculateAEI(runViewModel);
    const geiScore = calculateGEI(runViewModel);
    const shiScore = calculateSHI(aeiScore, geiScore);

    return NextResponse.json({
      success: true,
      data: {
        aei: {
          overall: aeiScore.overall,
          grade: aeiScore.grade,
          breakdown: aeiScore,
        },
        gei: {
          overall: geiScore.overall,
          breakdown: geiScore,
        },
        shi: {
          overall: shiScore.overall,
          status: shiScore.status,
          breakdown: shiScore,
        },
        summary: {
          job_id: job.id,
          status: job.status,
          total_events: events.length,
          total_tokens: events.reduce((sum: number, e: any) => sum + e.tokens_input + e.tokens_output, 0),
          total_cost_usd: Number(
            events.reduce((sum: number, e: any) => sum + e.cost_usd, 0).toFixed(6)
          ),
        },
      },
    });
  } catch (error) {
    console.error('[API] Score error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
