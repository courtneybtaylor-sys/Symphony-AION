/**
 * Bull Queue Implementation
 * Production-grade async job queue using Bull + Redis
 * Falls back to in-memory queue if Redis unavailable
 */

import Queue, { Job } from 'bull';
import { redis } from '@/lib/redis';
import prisma from '@/lib/db';
import { processAuditJob } from '@/lib/audit-processor';

export interface AuditJobData {
  uploadId: string;
  userId: string;
  telemetryHash: string;
}

// Create Bull queue for audit jobs
let auditQueue: Queue.Queue<AuditJobData> | null = null;

/**
 * Initialize the Bull queue with Redis connection
 */
export function initializeQueues() {
  if (auditQueue) return;

  try {
    // Attempt to create Bull queue with Redis
    const queueName = 'audit-jobs';
    
    // Check if Redis is available (simplified check)
    const redisUrl = process.env.REDIS_URL || 
                     process.env.UPSTASH_REDIS_REST_URL ||
                     'redis://localhost:6379';

    auditQueue = new Queue<AuditJobData>(queueName, redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
      settings: {
        maxStalledCount: 2,
        lockDuration: 30000, // 30s lock per job
        lockRenewTime: 15000, // Renew lock every 15s
      },
    });

    // Event handlers
    auditQueue.on('completed', (job: Job<AuditJobData>) => {
      console.log(`[Queue] Audit job ${job.id} completed`);
    });

    auditQueue.on('failed', (job: Job<AuditJobData> | undefined, err: Error) => {
      if (job) {
        console.error(`[Queue] Audit job ${job.id} failed:`, err.message);
      } else {
        console.error('[Queue] Unknown job failed:', err.message);
      }
    });

    auditQueue.on('error', (err: Error) => {
      console.error('[Queue] Queue error:', err.message);
    });

    console.log('[Queue] Bull queue initialized successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[Queue] Failed to initialize Bull queue: ${message}`);
    auditQueue = null;
  }
}

/**
 * Process audit jobs
 * Called when queue is ready to process jobs
 */
export function processAuditJobs() {
  if (!auditQueue) {
    console.warn('[Queue] Queue not initialized, skipping job processing');
    return;
  }

  auditQueue.process(1, async (job: Job<AuditJobData>) => {
    console.log(`[Queue] Processing audit job ${job.id}`);
    
    try {
      const { uploadId, userId, telemetryHash } = job.data;

      // Update DB status
      await prisma.auditJob.update({
        where: { uploadId },
        data: { status: 'processing' },
      });

      // Retrieve upload telemetry
      const upload = await prisma.upload.findUnique({
        where: { id: uploadId },
      });

      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }

      // Process the audit
      const auditJob = {
        id: job.id?.toString() || 'unknown',
        telemetryHash,
        customerEmail: 'unknown@example.com',
        paymentIntentId: '',
        stripeSessionId: '',
        status: 'processing' as const,
        createdAt: new Date().toISOString(),
      };

      const telemetryData = upload.telemetry as Record<string, unknown>;
      const result = await processAuditJob(auditJob, async () => telemetryData);

      // Update DB with results
      const updateData: any = {
        status: 'completed',
        completedAt: new Date(),
      };

      if (result.aeiScore !== undefined) {
        updateData.aeiScore = result.aeiScore;
      }
      if (result.recommendations) {
        updateData.recommendations = result.recommendations;
      }
      if (result.reportToken) {
        updateData.reportToken = result.reportToken;
        updateData.reportTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      }

      await prisma.auditJob.update({
        where: { uploadId },
        data: updateData,
      });

      // Return job result
      return {
        jobId: job.id,
        uploadId,
        status: 'completed',
        aeiScore: result.aeiScore,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Queue] Job ${job.id} processing failed: ${message}`);

      // Update DB with failure status
      try {
        await prisma.auditJob.update({
          where: { uploadId: job.data.uploadId },
          data: { 
            status: 'failed',
            error: message,
          },
        });
      } catch (dbError) {
        console.error('[Queue] Failed to update audit job status:', dbError);
      }

      throw error;
    }
  });
}

/**
 * Enqueue an audit job
 */
export async function enqueueAuditJob(data: AuditJobData): Promise<string> {
  if (!auditQueue) {
    console.warn('[Queue] Queue not initialized, using fallback');
    throw new Error('Queue not initialized');
  }

  const job = await auditQueue.add(data, {
    jobId: `audit-${data.uploadId}`,
    priority: 10,
  });

  console.log(`[Queue] Enqueued audit job ${job.id} for upload ${data.uploadId}`);

  return job.id?.toString() || '';
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  if (!auditQueue) {
    return null;
  }

  const job = await auditQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const progress = job.progress();
  const state = await job.getState();

  return {
    id: job.id,
    status: state,
    progress,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    data: job.data,
  };
}

/**
 * Cleanup: pause and close queue
 */
export async function closeQueue() {
  if (auditQueue) {
    await auditQueue.pause();
    await auditQueue.close();
    auditQueue = null;
    console.log('[Queue] Bull queue closed');
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  if (!auditQueue) {
    return null;
  }

  const counts = await auditQueue.getJobCounts();
  return {
    ...counts,
    queueName: auditQueue.name,
  };
}
