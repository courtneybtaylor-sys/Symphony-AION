/**
 * Async Audit Processor
 * Processes paid audits: generates PDF, sends email with secure download
 */

import { buildRunViewModel } from './telemetry';
import { calculateAEI } from './aei-score';
import { generateRecommendations } from './recommendations';
import { generateAuditReport } from './pdf-report';
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
  recommendations?: any[];
  totalCostUSD?: number;
  projectedSavingsMonthly?: number;
  runCount?: number;
  frameworkDetected?: string;
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

    // Step 4: Generate recommendations
    const recommendations = generateRecommendations(runViewModel, aeiScore);

    // Step 5: Generate PDF
    const pdfBlob = await generateAuditReport(runViewModel, aeiScore, recommendations, {
      reportId: job.id,
      customerEmail: job.customerEmail,
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

    // Step 8: Update job (in production: save to DB)
    const updatedJob: AuditJob = {
      ...job,
      status: 'complete',
      startedAt,
      completedAt: new Date().toISOString(),
      reportToken,
      reportTokenExpiresAt: expiresAt,
      reportBlobUrl,
      aeiScore: aeiScore.overall,
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
