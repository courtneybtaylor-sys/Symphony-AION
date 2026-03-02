/**
 * Queue Service Module
 * Initializes and manages Bull queue with fallback to in-memory queue
 * Can be integrated into Next.js App Router or API handlers
 */

import { initializeQueues, processAuditJobs, closeQueue } from '@/lib/bull-queue';

let queueInitialized = false;
let isProcessing = false;

/**
 * Initialize the async job queue system
 * Should be called once at application startup
 */
export async function initializeQueueSystem() {
  if (queueInitialized) {
    console.log('[QueueService] Queue system already initialized');
    return;
  }

  try {
    // Initialize Bull queue
    initializeQueues();
    
    // Start processing jobs
    if (!isProcessing) {
      isProcessing = true;
      processAuditJobs();
      console.log('[QueueService] Queue system initialized and processing started');
    }

    queueInitialized = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[QueueService] Failed to initialize queue system: ${message}`);
    console.log('[QueueService] Falling back to in-memory queue');
  }
}

/**
 * Check if queue system is ready
 */
export function isQueueReady(): boolean {
  return queueInitialized && isProcessing;
}

/**
 * Shutdown the queue system gracefully
 */
export async function shutdownQueueSystem() {
  try {
    await closeQueue();
    queueInitialized = false;
    isProcessing = false;
    console.log('[QueueService] Queue system shut down');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[QueueService] Error shutting down queue: ${message}`);
  }
}

export { initializeQueues, processAuditJobs, closeQueue } from '@/lib/bull-queue';
export {
  enqueueAuditJob,
  getJobStatus,
  getQueueStats,
  type AuditJobData,
} from '@/lib/bull-queue';
