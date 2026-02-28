/**
 * Bull Job Queue for Audit Processing
 * Task 3: Async PDF generation and recommendation processing
 */

import Bull from 'bull'

export interface AuditJobData {
  uploadId: string
  userId: string
  telemetryHash: string
  userEmail: string
}

export type AuditJobType = Bull.Job<AuditJobData>

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * Create or get the audit job queue
 * Queue will be backed by Redis for persistence
 */
export const auditQueue = new Bull<AuditJobData>('audit-jobs', redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 second initial delay
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
    removeOnFail: {
      age: 7200, // Keep failed jobs for 2 hours
    },
  },
})

// Queue event handlers
auditQueue.on('failed', (job, err) => {
  console.error(
    `[AuditQueue] Job ${job.id} (upload ${job.data.uploadId}) failed: ${err.message}`
  )
})

auditQueue.on('completed', (job) => {
  console.log(
    `[AuditQueue] Job ${job.id} (upload ${job.data.uploadId}) completed successfully`
  )
})

auditQueue.on('error', (error) => {
  console.error('[AuditQueue] Queue error:', error)
})

/**
 * Enqueue an audit job
 */
export async function enqueueAuditJob(
  data: AuditJobData
): Promise<string> {
  const job = await auditQueue.add(data, {
    jobId: `audit-${data.uploadId}`,
  })
  console.log(`[AuditQueue] Enqueued job ${job.id} for upload ${data.uploadId}`)
  return String(job.id)
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<AuditJobType | null> {
  return auditQueue.getJob(jobId)
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const counts = await auditQueue.getJobCounts()
  return {
    active: counts.active,
    waiting: counts.waiting,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
  }
}
