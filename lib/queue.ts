/**
 * Background Job Queue
 * Phase 4c: In-memory job queue with retry logic
 * In production, replace with Bull + Redis
 */

import prisma from '@/lib/db';
import { processAuditJob } from '@/lib/audit-processor';

export interface QueueJob {
  id: string;
  data: {
    uploadId: string;
    userId: string;
    telemetryHash: string;
  };
  attempts: number;
  maxAttempts: number;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

const jobQueue: QueueJob[] = [];
let processing = false;

/**
 * Add a job to the queue.
 */
export async function enqueueAuditJob(data: QueueJob['data']): Promise<string> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const job: QueueJob = {
    id: jobId,
    data,
    attempts: 0,
    maxAttempts: 3,
    status: 'queued',
    createdAt: new Date(),
  };

  jobQueue.push(job);

  // Update DB status
  try {
    await prisma.auditJob.update({
      where: { uploadId: data.uploadId },
      data: { status: 'queued' },
    });
  } catch {
    // DB record may not exist yet in test mode
  }

  // Process asynchronously
  processQueue();

  return jobId;
}

/**
 * Process jobs from the queue with exponential backoff retry.
 */
async function processQueue() {
  if (processing) return;
  processing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.find((j) => j.status === 'queued');
    if (!job) break;

    job.status = 'processing';
    job.attempts++;

    try {
      // Update DB status
      await prisma.auditJob.update({
        where: { uploadId: job.data.uploadId },
        data: { status: 'processing' },
      });

      // Retrieve upload telemetry
      const upload = await prisma.upload.findUnique({
        where: { id: job.data.uploadId },
      });

      if (!upload) throw new Error(`Upload ${job.data.uploadId} not found`);

      const telemetryData = JSON.parse(upload.telemetry);

      // Process the audit
      const auditJob = {
        id: job.id,
        uploadId: job.data.uploadId,
        userId: job.data.userId,
        status: 'processing' as const,
        createdAt: job.createdAt,
      };

      const result = await processAuditJob(auditJob, async () => telemetryData);

      // Update DB with results
      await prisma.auditJob.update({
        where: { uploadId: job.data.uploadId },
        data: {
          status: 'complete',
          aeiScore: result.aeiScore ?? null,
          reportToken: result.reportToken ?? null,
          reportTokenExpiresAt: result.reportTokenExpiresAt
            ? new Date(result.reportTokenExpiresAt)
            : null,
          reportFilePath: result.reportFilePath ?? null,
          completedAt: new Date(),
        },
      });

      job.status = 'complete';
      job.processedAt = new Date();

      console.log(`[Queue] Job ${job.id} completed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Queue] Job ${job.id} attempt ${job.attempts} failed: ${message}`);

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.error = message;

        try {
          await prisma.auditJob.update({
            where: { uploadId: job.data.uploadId },
            data: { status: 'failed' },
          });
        } catch {
          // Ignore DB errors on failure update
        }

        console.error(`[Queue] Job ${job.id} permanently failed after ${job.maxAttempts} attempts`);
      } else {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, job.attempts) * 1000;
        job.status = 'queued';
        console.log(`[Queue] Retrying job ${job.id} in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  processing = false;
}

/**
 * Get job status by ID.
 */
export function getJobStatus(jobId: string): QueueJob | undefined {
  return jobQueue.find((j) => j.id === jobId);
}
