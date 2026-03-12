/**
 * GET /api/ingest/[ingestionId]/status
 * Returns the status of an ingestion job
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
      include: {
        _count: {
          select: { normalizedEvents: true, chunks: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Ingestion job not found' },
        { status: 404 }
      );
    }

    // Check authorization (user owns this job)
    if (job.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        sourceFormat: job.sourceFormat,
        normalizedCount: job.normalizedCount,
        runCount: job.runCount,
        progress: job.progress,
        error: job.error,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[API] Status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
