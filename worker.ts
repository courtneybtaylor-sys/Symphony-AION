/**
 * Symphony-AION Audit Worker
 * Task 3: Async job processor for audit reports
 * Run separately: ts-node worker.ts
 */

import { auditQueue } from './lib/audit-queue'
import { prisma } from './lib/db'
import { buildRunViewModel } from './lib/telemetry'
import { calculateAEI } from './lib/aei-score'
import { executeRecommendationRules } from './lib/recommendations/rules'
import { generateAuditReport } from './lib/pdf-generator'
import { sendReportEmail } from './lib/email'
import crypto from 'crypto'

console.log('🚀 Symphony-AION Worker starting...')

// Process queue jobs (up to 3 concurrent)
auditQueue.process(3, async (job) => {
  const { uploadId, userId, userEmail, telemetryHash } = job.data

  try {
    console.log(
      `[Worker] Processing job ${job.id} for upload ${uploadId} (user ${userId})`
    )

    // 1. Update job status
    await prisma.auditJob.update({
      where: { uploadId },
      data: { status: 'processing' },
    })

    // 2. Fetch telemetry
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
    })

    if (!upload) {
      throw new Error(`Upload ${uploadId} not found`)
    }

    // 3. Build RunViewModel
    const runViewModel = buildRunViewModel(upload.telemetry as any)

    // 4. Calculate AEI
    const aeiScore = calculateAEI(runViewModel)

    // 5. Generate recommendations
    const recommendations = executeRecommendationRules(runViewModel, aeiScore)

    // 6. Generate PDF
    const { filePath } = await generateAuditReport(
      {
        workflowName: upload.id,
        framework: upload.framework || 'Generic',
        aeiScore: aeiScore.overall || 0,
        aeiGrade: (aeiScore.grade as string) || 'C',
        totalTokens: runViewModel.tokens.total,
        totalCostUSD: runViewModel.costs.total,
        recommendations: recommendations.slice(0, 8).map((r) => ({
          title: r.title,
          finding: r.finding,
          savings: r.projectedSavings.costUSDMonthly100Runs || 0,
        })),
        generatedAt: new Date().toISOString(),
      },
      process.env.REPORT_OUTPUT_DIR || '/tmp/reports'
    )

    // 7. Generate secure download token
    const reportToken = crypto.randomBytes(32).toString('hex')
    const reportTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // 8. Save results to database
    await prisma.auditJob.update({
      where: { uploadId },
      data: {
        status: 'completed',
        aeiScore: aeiScore as any,
        recommendations: recommendations as any,
        reportPath: filePath,
        reportToken,
        reportTokenExpiresAt,
        completedAt: new Date(),
      },
    })

    // 9. Send email
    try {
      await sendReportEmail({
        to: userEmail,
        jobId: String(job.id),
        reportToken,
        aeiScore: aeiScore.overall || 0,
        grade: (aeiScore.grade as 'A' | 'B' | 'C' | 'D' | 'F') || 'C',
        frameworkDetected: upload.framework || undefined,
        expiresAt: reportTokenExpiresAt.toISOString(),
      })
    } catch (emailError) {
      console.warn('[Worker] Email delivery failed:', emailError)
      // Continue - don't fail the job due to email
    }

    console.log(
      `[Worker] ✅ Job ${job.id} completed successfully (upload ${uploadId})`
    )

    return {
      uploadId,
      reportToken,
      aeiScore: aeiScore.overall,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(
      `[Worker] ❌ Job ${job.id} failed (attempt ${job.attemptsMade + 1}/3): ${message}`
    )

    // Update job status to failed if max attempts exceeded
    if (job.attemptsMade >= 2) {
      // 3 attempts total (0, 1, 2)
      try {
        await prisma.auditJob.update({
          where: { uploadId: job.data.uploadId },
          data: {
            status: 'failed',
            error: message,
          },
        })
      } catch (dbError) {
        console.error('[Worker] Failed to update job status:', dbError)
      }
    }

    throw error // Re-throw to let Bull handle retries
  }
})

// Event handlers
auditQueue.on('failed', (job, err) => {
  console.error(
    `[Worker] Job ${job.id} permanently failed after ${job.attemptsMade + 1} attempts: ${err.message}`
  )
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully...')
  await auditQueue.close()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, shutting down gracefully...')
  await auditQueue.close()
  await prisma.$disconnect()
  process.exit(0)
})

console.log('[Worker] Ready to process audit jobs')
