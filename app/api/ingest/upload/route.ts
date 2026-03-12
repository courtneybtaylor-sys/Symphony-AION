/**
 * POST /api/ingest/upload
 * Accepts telemetry files in multiple formats.
 * Auth: Supabase session required — unauthenticated requests receive 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processIngestion } from '@/lib/ingestion/ingestion-processor';
import { processFromIngestion } from '@/lib/audit-processor';

export async function POST(request: NextRequest) {
  try {
    // Auth check — Supabase session required
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', loginUrl: '/login' },
        { status: 401 }
      );
    }

    const { default: getPrismaAuth } = await import('@/lib/db');
    const prismaAuth = await getPrismaAuth();

    // Find or create Prisma User record keyed by email (bridge from Supabase auth)
    const dbUser = await prismaAuth.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email.split('@')[0],
        role: 'user',
      },
      update: {},
      select: { id: true, email: true },
    });

    const currentUser = { id: dbUser.id, email: dbUser.email };
    const authUser = currentUser;

    // Get prisma client for subsequent DB operations
    const { default: getPrisma } = await import('@/lib/db');
    const prisma = await getPrisma();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file as text and parse JSON
    const fileText = await file.text();
    let rawData: unknown;

    try {
      rawData = JSON.parse(fileText);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in file' },
        { status: 400 }
      );
    }

    // Create IngestionJob in DB with status='processing'
    const ingestionJob = await prisma.ingestionJob.create({
      data: {
        userId: authUser.id,
        status: 'processing',
        sourceFormat: 'generic', // Will be updated during processing
        rawPath: file.name,
        normalizedCount: 0,
        runCount: 0,
        progress: 10,
      },
    });

    // Process ingestion asynchronously
    // This returns immediately, processing happens in background
    (async () => {
      try {
        const freshPrisma = await getPrisma();

        const result = await processIngestion(rawData, ingestionJob.id);

        // Update IngestionJob with results
        const isSuccess = !result.error && result.events.length > 0;
        await freshPrisma.ingestionJob.update({
          where: { id: ingestionJob.id },
          data: {
            status: isSuccess ? 'completed' : 'failed',
            sourceFormat: result.format || 'generic',
            normalizedCount: result.events.length || 0,
            runCount: result.runGraph.runs.size || 0,
            progress: isSuccess ? 100 : 50,
            error: result.error,
            completedAt: new Date(),
          },
        });

        // If successful, create AuditJob and process scoring
        if (isSuccess && result.events && result.runGraph) {
          const auditJob = await freshPrisma.auditJob.create({
            data: {
              uploadId: 'ingestion-' + ingestionJob.id,
              userId: authUser.id,
              ingestionId: ingestionJob.id,
              status: 'processing',
            },
          });

          // Process the audit report generation
          try {
            await processFromIngestion(ingestionJob.id, auditJob.id, authUser.email, freshPrisma);

            // Update audit job with completion status
            await freshPrisma.auditJob.update({
              where: { id: auditJob.id },
              data: { status: 'completed', completedAt: new Date() },
            });
          } catch (scoreError) {
            console.error('[API] Audit processing failed:', scoreError);
            await freshPrisma.auditJob.update({
              where: { id: auditJob.id },
              data: {
                status: 'failed',
                error: scoreError instanceof Error ? scoreError.message : 'Unknown error',
              },
            });
          }
        }
      } catch (error) {
        console.error('[API] Ingestion processing failed:', error);
        const freshPrisma = await getPrisma();
        await freshPrisma.ingestionJob.update({
          where: { id: ingestionJob.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        });
      }
    })();

    return NextResponse.json(
      {
        success: true,
        data: {
          ingestionId: ingestionJob.id,
          status: 'processing',
          estimatedWaitSeconds: 30,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[API] Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
