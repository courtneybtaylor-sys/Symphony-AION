/**
 * Async Audit Processor
 * Processes paid audits: generates PDF, sends email with secure download
 */

import { buildRunViewModel } from './telemetry';
import { calculateAEI } from './aei-score';
import { calculateGEI } from './gei-score';
import { calculateSHI } from './shi-score';
import { generateRecommendations } from './recommendations';
import { generateAuditReport } from './pdf-report';
import { generateTestament } from './testament';
import { anchorTestament } from './orda-client';
import crypto from 'crypto';

// Vercel Blob is only available on server side
let put: ((path: string, data: any, options: any) => Promise<{ url: string }>) | null = null;
if (typeof fetch !== 'undefined') {
  try {
    const blob = require('@vercel/blob');
    put = blob.put;
  } catch {
    // @vercel/blob not available in test environment
  }
}

export interface AuditJob {
  id: string;
  telemetryHash: string;
  customerEmail: string;
  paymentIntentId: string;
  stripeSessionId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed' | 'refunded';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  reportToken?: string;
  reportTokenExpiresAt?: string;
  reportFilePath?: string;
  reportBlobUrl?: string;
  aeiScore?: number;
  geiScore?: number;
  shiScore?: number;
  shiStatus?: 'healthy' | 'caution' | 'critical';
  recommendations?: any[];
  totalCostUSD?: number;
  projectedSavingsMonthly?: number;
  runCount?: number;
  frameworkDetected?: string;
  testament_id?: string;
  testament_sc_timestamp?: string;
  maat_all_pass?: boolean;
  orda_anchor_hash?: string;
}

/**
 * Process a paid audit job
 * This runs asynchronously after Stripe payment confirms
 */
export async function processAuditJob(
  job: AuditJob,
  getTelemetryData: (hash: string) => unknown
): Promise<AuditJob> {
  const startedAt = new Date().toISOString();

  try {
    console.log(`[Processor] Starting audit job ${job.id}`);

    // Step 1: Load telemetry
    const telemetryData = getTelemetryData(job.telemetryHash);
    if (!telemetryData) {
      throw new Error('Telemetry data not found');
    }

    // Step 2: Build RunViewModel
    const runViewModel = buildRunViewModel(telemetryData as any);

    // Step 3: Calculate AEI
    const aeiScore = calculateAEI(runViewModel);

    // Step 3a: Calculate GEI
    const geiScore = calculateGEI(runViewModel);

    // Step 3b: Calculate SHI
    const shiScore = calculateSHI(aeiScore, geiScore);

    // Step 4: Generate recommendations
    const recommendations = generateRecommendations(runViewModel, aeiScore);

    // Step 5: Generate PDF
    const pdfBlob = await generateAuditReport(runViewModel, aeiScore, recommendations, {
      reportId: job.id,
      customerEmail: job.customerEmail,
      geiScore,
      shiScore,
    });

    // Step 6: Generate secure token
    const reportToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Step 7: Store PDF in Vercel Blob
    let reportBlobUrl: string | undefined;
    if (put) {
      try {
        const blob = await put(`reports/${reportToken}.pdf`, pdfBlob, { access: 'public' });
        reportBlobUrl = blob.url;
        console.log(`[Processor] Stored PDF at: ${reportBlobUrl}`);
      } catch (blobError) {
        console.error('[Processor] Failed to store PDF in Blob:', blobError);
        throw new Error('Failed to store audit report');
      }
    } else {
      console.warn('[Processor] Vercel Blob not configured, PDF will not be persisted');
    }

    // Step 7a: Generate Testament
    // Testament is generated AFTER PDF so its hash can include the PDF payload
    let pdfBuffer: Buffer;
    try {
      if (Buffer.isBuffer(pdfBlob)) {
        pdfBuffer = pdfBlob;
      } else if (typeof pdfBlob === 'string') {
        pdfBuffer = Buffer.from(pdfBlob);
      } else if (pdfBlob instanceof Blob && typeof (pdfBlob as any).arrayBuffer === 'function') {
        pdfBuffer = Buffer.from(await (pdfBlob as any).arrayBuffer());
      } else {
        // Last resort: convert to Buffer as-is (handles Uint8Array, etc.)
        pdfBuffer = Buffer.from(pdfBlob as any);
      }
    } catch {
      // If all else fails, create a minimal buffer with a hash of the object
      console.warn('[Testament] Could not convert pdfBlob to Buffer, using fallback');
      pdfBuffer = Buffer.from(JSON.stringify(pdfBlob).substring(0, 1000));
    }

    const testament = generateTestament({
      auditId: job.id,
      aeiScore: aeiScore.overall,
      geiScore: geiScore.overall,
      shiScore: shiScore.overall,
      shiStatus: shiScore.status,
      pdfBuffer,
    });

    // Step 7b: Store testament as JSON in Vercel Blob
    if (put) {
      try {
        await put(
          `testaments/${job.id}.json`,
          Buffer.from(JSON.stringify(testament, null, 2)),
          { access: 'public' }
        );
        console.log(`[Testament] Generated: ${testament.testament_id}`);
      } catch (err) {
        // Testament storage failure is non-blocking
        console.error('[Testament] Storage failed:', err);
      }
    }

    // Step 7c: Anchor testament to ORDA registry (Phase 2 stub)
    const ordaResult = await anchorTestament(testament);
    console.log(`[ORDA] Anchor: ${ordaResult.anchor_hash.slice(0, 16)}...`);

    // Update testament with real anchor hash
    testament.orda_anchor = ordaResult.anchor_hash;

    // Step 8: Update job (in production: save to DB)
    const maat_all_pass = Object.values(testament.maat_result).every(v => v === 'PASS');
    const updatedJob: AuditJob = {
      ...job,
      status: 'complete',
      startedAt,
      completedAt: new Date().toISOString(),
      reportToken,
      reportTokenExpiresAt: expiresAt,
      reportBlobUrl,
      aeiScore: aeiScore.overall,
      geiScore: geiScore.overall,
      shiScore: shiScore.overall,
      shiStatus: shiScore.status,
      testament_id: testament.testament_id,
      testament_sc_timestamp: testament.sc_timestamp,
      maat_all_pass,
      orda_anchor_hash: ordaResult.anchor_hash,
      recommendations,
      totalCostUSD: runViewModel.costs.total,
      frameworkDetected: (telemetryData as any).framework || 'generic',
      runCount: 1,
    };

    console.log(`[Processor] Completed audit job ${job.id}`);

    // Step 8: In production: send email with download link
    // await sendReportEmail({
    //   to: job.customerEmail,
    //   jobId: job.id,
    //   reportToken,
    //   aeiScore: aeiScore.overall,
    //   grade: aeiScore.grade,
    //   expiresAt,
    // });

    return updatedJob;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Processor] Failed audit job ${job.id}:`, reason);

    return {
      ...job,
      status: 'failed',
      startedAt,
      failedAt: new Date().toISOString(),
      failureReason: reason,
    };
  }
}

/**
 * Process audit from ingestion job
 * Fetches normalized events and generates audit report
 */
export async function processFromIngestion(
  ingestionId: string,
  auditJobId: string,
  customerEmail: string,
  prisma: any // PrismaClient
): Promise<AuditJob> {
  const startedAt = new Date().toISOString();

  try {
    console.log(`[Processor] Starting ingestion audit ${auditJobId}`);

    // Step 1: Fetch normalized events from DB
    const events = await prisma.normalizedEvent.findMany({
      where: { ingestionId },
      orderBy: { timestamp: 'asc' },
    });

    if (events.length === 0) {
      throw new Error('No events found for ingestion');
    }

    // Step 2: Convert events to telemetry format for RunViewModel
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

    // Step 3: Build RunViewModel
    const runViewModel = buildRunViewModel(telemetryData as any);

    // Step 4: Calculate scores
    const aeiScore = calculateAEI(runViewModel);
    const geiScore = calculateGEI(runViewModel);
    const shiScore = calculateSHI(aeiScore, geiScore);

    // Step 5: Generate recommendations
    const recommendations = generateRecommendations(runViewModel, aeiScore);

    // Step 6: Generate PDF
    const pdfBlob = await generateAuditReport(runViewModel, aeiScore, recommendations, {
      reportId: auditJobId,
      customerEmail,
      geiScore,
      shiScore,
    });

    // Step 7: Generate secure token
    const reportToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Step 8: Store PDF in Vercel Blob
    let reportBlobUrl: string | undefined;
    if (put) {
      try {
        const blob = await put(`reports/${reportToken}.pdf`, pdfBlob, { access: 'public' });
        reportBlobUrl = blob.url;
        console.log(`[Processor] Stored PDF at: ${reportBlobUrl}`);
      } catch (blobError) {
        console.error('[Processor] Failed to store PDF in Blob:', blobError);
        throw new Error('Failed to store audit report');
      }
    } else {
      console.warn('[Processor] Vercel Blob not configured, PDF will not be persisted');
    }

    // Step 9: Generate Testament
    let pdfBuffer: Buffer;
    try {
      if (Buffer.isBuffer(pdfBlob)) {
        pdfBuffer = pdfBlob;
      } else if (typeof pdfBlob === 'string') {
        pdfBuffer = Buffer.from(pdfBlob);
      } else if (pdfBlob instanceof Blob && typeof (pdfBlob as any).arrayBuffer === 'function') {
        pdfBuffer = Buffer.from(await (pdfBlob as any).arrayBuffer());
      } else {
        pdfBuffer = Buffer.from(pdfBlob as any);
      }
    } catch {
      console.warn('[Testament] Could not convert pdfBlob to Buffer, using fallback');
      pdfBuffer = Buffer.from(JSON.stringify(pdfBlob).substring(0, 1000));
    }

    const testament = generateTestament({
      auditId: auditJobId,
      aeiScore: aeiScore.overall,
      geiScore: geiScore.overall,
      shiScore: shiScore.overall,
      shiStatus: shiScore.status,
      pdfBuffer,
    });

    // Step 10: Store testament
    if (put) {
      try {
        await put(
          `testaments/${auditJobId}.json`,
          Buffer.from(JSON.stringify(testament, null, 2)),
          { access: 'public' }
        );
        console.log(`[Testament] Generated: ${testament.testament_id}`);
      } catch (err) {
        console.error('[Testament] Storage failed:', err);
      }
    }

    // Step 11: Anchor testament to ORDA
    const ordaResult = await anchorTestament(testament);
    console.log(`[ORDA] Anchor: ${ordaResult.anchor_hash.slice(0, 16)}...`);
    testament.orda_anchor = ordaResult.anchor_hash;

    // Step 12: Prepare return job
    const maat_all_pass = Object.values(testament.maat_result).every((v: any) => v === 'PASS');
    const updatedJob: AuditJob = {
      id: auditJobId,
      telemetryHash: ingestionId,
      customerEmail,
      paymentIntentId: 'ingestion-' + ingestionId,
      stripeSessionId: 'ingestion-' + ingestionId,
      status: 'complete',
      createdAt: startedAt,
      startedAt,
      completedAt: new Date().toISOString(),
      reportToken,
      reportTokenExpiresAt: expiresAt,
      reportBlobUrl,
      aeiScore: aeiScore.overall,
      geiScore: geiScore.overall,
      shiScore: shiScore.overall,
      shiStatus: shiScore.status,
      testament_id: testament.testament_id,
      testament_sc_timestamp: testament.sc_timestamp,
      maat_all_pass,
      orda_anchor_hash: ordaResult.anchor_hash,
      recommendations,
      totalCostUSD: runViewModel.costs.total,
      runCount: 1, // Single run for ingestion audit
      frameworkDetected: 'generic',
    };

    console.log(`[Processor] Completed ingestion audit ${auditJobId}`);
    return updatedJob;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Processor] Failed ingestion audit ${auditJobId}:`, reason);

    return {
      id: auditJobId,
      telemetryHash: ingestionId,
      customerEmail,
      paymentIntentId: 'ingestion-' + ingestionId,
      stripeSessionId: 'ingestion-' + ingestionId,
      status: 'failed',
      createdAt: startedAt,
      startedAt,
      failedAt: new Date().toISOString(),
      failureReason: reason,
    };
  }
}

/**
 * Generate secure download token
 */
export function generateReportToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate and retrieve report download
 */
export function validateReportToken(
  token: string,
  expiresAt: string,
  currentTime: Date = new Date()
): boolean {
  // Check token exists
  if (!token) return false;

  // Check not expired
  const expireTime = new Date(expiresAt);
  if (currentTime > expireTime) return false;

  return true;
}
