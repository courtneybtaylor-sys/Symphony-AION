/**
 * Admin Statistics Endpoint
 * Returns aggregated usage and performance metrics
 * Protected route (in production: add API key authentication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDailyStats, getSummaryStats } from '@/lib/usage-logger';

export async function GET(request: NextRequest) {
  // In production: verify API key
  // const apiKey = request.headers.get('authorization');
  // if (!apiKey || !isValidAdminKey(apiKey)) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '30', 10);

  try {
    const dailyStats = getDailyStats(Math.min(days, 365));
    const summary = getSummaryStats();

    return NextResponse.json({
      summary,
      daily: dailyStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch stats: ${message}` },
      { status: 500 }
    );
  }
}
