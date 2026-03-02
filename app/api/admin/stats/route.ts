/**
 * Admin Statistics Endpoint
 * Returns aggregated usage and performance metrics
 * Phase 4a: Protected with authentication
 * Phase 4e: Validated with Zod
 */

import '@/lib/prisma-init'
import { NextRequest, NextResponse } from 'next/server';
import { getDailyStats, getSummaryStats } from '@/lib/usage-logger';
import { requireAuth } from '@/lib/auth/helpers';
import { AdminStatsSchema } from '@/lib/validation/schemas';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  // Phase 4a: Require authentication
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const searchParams = request.nextUrl.searchParams;

  // Phase 4e: Validate query params
  const parsed = AdminStatsSchema.safeParse({
    days: searchParams.get('days') || '30',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const days = parsed.data.days;

  try {
    const dailyStats = getDailyStats(days);
    const summary = getSummaryStats();

    // Phase 4b: Augment with database stats if available
    let dbStats = null;
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [totalUploads, totalJobs, completedJobs, totalUsers] = await Promise.all([
        prisma.upload.count({ where: { createdAt: { gte: since } } }),
        prisma.auditJob.count({ where: { createdAt: { gte: since } } }),
        prisma.auditJob.count({ where: { status: 'complete', createdAt: { gte: since } } }),
        prisma.user.count(),
      ]);

      dbStats = {
        totalUploads,
        totalJobs,
        completedJobs,
        completionRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
        totalUsers,
      };
    } catch {
      // DB may not be available
    }

    return NextResponse.json({
      summary,
      daily: dailyStats,
      database: dbStats,
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
