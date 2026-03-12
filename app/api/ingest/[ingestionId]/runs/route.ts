/**
 * GET /api/ingest/[ingestionId]/runs
 * Returns the detected runs and their aggregated stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { ingestionId: string } }
) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get prisma client
    const { default: getPrisma } = await import('@/lib/db');
    const prisma = await getPrisma();

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    // Get all events grouped by run_id
    const events = await prisma.normalizedEvent.findMany({
      where: { ingestionId: params.ingestionId },
      orderBy: { timestamp: 'asc' },
    });

    // Group by run_id and calculate stats
    const runsMap = new Map<
      string,
      {
        run_id: string;
        event_count: number;
        token_input: number;
        token_output: number;
        cost_usd: number;
        providers: Set<string>;
        models: Set<string>;
        status_breakdown: Record<string, number>;
        first_event: Date;
        last_event: Date;
      }
    >();

    for (const event of events) {
      const run = runsMap.get(event.run_id) || {
        run_id: event.run_id,
        event_count: 0,
        token_input: 0,
        token_output: 0,
        cost_usd: 0,
        providers: new Set<string>(),
        models: new Set<string>(),
        status_breakdown: {} as Record<string, number>,
        first_event: event.timestamp,
        last_event: event.timestamp,
      };

      run.event_count += 1;
      run.token_input += event.tokens_input;
      run.token_output += event.tokens_output;
      run.cost_usd += event.cost_usd;
      if (event.provider) run.providers.add(event.provider);
      if (event.model) run.models.add(event.model);
      run.status_breakdown[event.status] = (run.status_breakdown[event.status] || 0) + 1;
      run.first_event = new Date(Math.min(run.first_event.getTime(), event.timestamp.getTime()));
      run.last_event = new Date(Math.max(run.last_event.getTime(), event.timestamp.getTime()));

      runsMap.set(event.run_id, run);
    }

    // Convert sets to arrays for JSON serialization
    const runs = Array.from(runsMap.values()).map((run) => ({
      run_id: run.run_id,
      event_count: run.event_count,
      token_input: run.token_input,
      token_output: run.token_output,
      cost_usd: Number(run.cost_usd.toFixed(6)),
      providers: Array.from(run.providers),
      models: Array.from(run.models),
      status_breakdown: run.status_breakdown,
      duration_ms: run.last_event.getTime() - run.first_event.getTime(),
      first_event: run.first_event.toISOString(),
      last_event: run.last_event.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        runs: runs.sort((a, b) => b.cost_usd - a.cost_usd),
        summary: {
          total_runs: runs.length,
          total_events: events.length,
          total_tokens: events.reduce((sum: number, e: any) => sum + e.tokens_input + e.tokens_output, 0),
          total_cost_usd: Number(events.reduce((sum: number, e: any) => sum + e.cost_usd, 0).toFixed(6)),
        },
      },
    });
  } catch (error) {
    console.error('[API] Runs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
