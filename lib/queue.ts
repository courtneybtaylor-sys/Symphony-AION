/**
 * Background Job Queue
 * Phase 4c: In-memory job queue with retry logic
 * In production, replace with Bull + Redis
 */

import { processAuditJob, type AuditJob } from '@/lib/audit-processor';

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
    const { default: getPrisma } = await import('@/lib/db');
    const prisma = await getPrisma();
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

  const { default: getPrisma } = await import('@/lib/db');
  const prisma = await getPrisma();

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

      // Telemetry is now stored as JSONB (Json type), no need to parse
      const telemetryData = upload.telemetry as Record<string, unknown>;

      // Process the audit
      const auditJob: AuditJob = {
        id: job.id,
        telemetryHash: job.data.telemetryHash,
        customerEmail: 'unknown@example.com', // Will be updated from audit job record if available
        paymentIntentId: '', // Will be populated from audit job if available
        stripeSessionId: '', // Will be populated from audit job if available
        status: 'processing',
        createdAt: job.createdAt.toISOString(),
      };

      const result = await processAuditJob(auditJob, async () => telemetryData);

      // Update DB with results
      const updateData: any = {
        status: 'complete',
        completedAt: new Date(),
      };

      if (result.aeiScore !== undefined) {
        updateData.aeiScore = result.aeiScore;
      }
      if (result.reportToken) {
        updateData.reportToken = result.reportToken;
      }
      if (result.reportTokenExpiresAt) {
        updateData.reportTokenExpiresAt = new Date(result.reportTokenExpiresAt);
      }
      if (result.reportFilePath) {
        updateData.reportFilePath = result.reportFilePath;
      }

      await prisma.auditJob.update({
        where: { uploadId: job.data.uploadId },
        data: updateData,
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
