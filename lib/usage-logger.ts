/**
 * Usage Logging Module
 * Anonymous usage tracking for admin analytics
 * In production: would write to analytics database or service
 * In test mode: logs to console
 */

export interface UsageEvent {
  type: 'upload' | 'qualified' | 'not_qualified' | 'checkout_started' | 'payment_completed' | 'report_generated' | 'report_downloaded';
  timestamp: string;
  metadata?: {
    aeiScore?: number;
    projectedROI?: number;
    framework?: string;
    modelCount?: number;
    totalCostUSD?: number;
  };
}

export interface DailyStats {
  date: string;
  uploads: number;
  qualificationRate: number; // percentage 0-100
  auditCompletionRate: number; // percentage 0-100
  averageAEIScore: number;
  averageProjectedROI: number;
  totalRevenueUSD: number;
}

// In-memory storage for demo (in production: database)
const events: UsageEvent[] = [];
const startDate = new Date('2024-01-01');

/**
 * Log a usage event
 */
export function logUsageEvent(event: Omit<UsageEvent, 'timestamp'>): void {
  const fullEvent: UsageEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  events.push(fullEvent);

  // Log to console in test mode
  console.log(`[Usage] ${event.type}:`, event.metadata || '');

  // In production: send to analytics service
  // await analyticsService.track(fullEvent);
}

/**
 * Get daily statistics
 * Returns aggregated stats for a date range
 */
export function getDailyStats(days: number = 30): DailyStats[] {
  const now = new Date();
  const stats: DailyStats[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayEvents = events.filter((e) => e.timestamp.startsWith(dateStr));

    if (dayEvents.length === 0) continue;

    const uploads = dayEvents.filter((e) => e.type === 'upload').length;
    const qualified = dayEvents.filter((e) => e.type === 'qualified').length;
    const completed = dayEvents.filter((e) => e.type === 'report_generated').length;
    const payments = dayEvents.filter((e) => e.type === 'payment_completed').length;

    const aeiScores = dayEvents
      .filter((e) => e.metadata?.aeiScore !== undefined)
      .map((e) => e.metadata!.aeiScore!);
    const averageAEI = aeiScores.length > 0
      ? Math.round((aeiScores.reduce((a, b) => a + b, 0) / aeiScores.length) * 100) / 100
      : 0;

    const rois = dayEvents
      .filter((e) => e.metadata?.projectedROI !== undefined)
      .map((e) => e.metadata!.projectedROI!);
    const averageROI = rois.length > 0
      ? Math.round((rois.reduce((a, b) => a + b, 0) / rois.length) * 100) / 100
      : 0;

    stats.push({
      date: dateStr,
      uploads,
      qualificationRate: uploads > 0 ? Math.round((qualified / uploads) * 100) : 0,
      auditCompletionRate: qualified > 0 ? Math.round((completed / qualified) * 100) : 0,
      averageAEIScore: averageAEI,
      averageProjectedROI: averageROI,
      totalRevenueUSD: payments * 750, // $750 per audit
    });
  }

  return stats;
}

/**
 * Get summary stats
 */
export function getSummaryStats() {
  const uploadEvents = events.filter((e) => e.type === 'upload').length;
  const qualifiedEvents = events.filter((e) => e.type === 'qualified').length;
  const completedEvents = events.filter((e) => e.type === 'report_generated').length;
  const downloadedEvents = events.filter((e) => e.type === 'report_downloaded').length;
  const paymentEvents = events.filter((e) => e.type === 'payment_completed').length;

  return {
    totalUploads: uploadEvents,
    totalQualified: qualifiedEvents,
    totalCompleted: completedEvents,
    totalDownloaded: downloadedEvents,
    totalPayments: paymentEvents,
    totalRevenueUSD: paymentEvents * 750,
    qualificationRate: uploadEvents > 0 ? Math.round((qualifiedEvents / uploadEvents) * 100) : 0,
    completionRate: qualifiedEvents > 0 ? Math.round((completedEvents / qualifiedEvents) * 100) : 0,
    downloadRate: completedEvents > 0 ? Math.round((downloadedEvents / completedEvents) * 100) : 0,
  };
}

/**
 * Reset all events (for testing)
 */
export function resetEvents(): void {
  events.length = 0;
  console.log('[Usage] Events reset');
}

/**
 * Get all events (for debugging)
 */
export function getAllEvents(): UsageEvent[] {
  return [...events];
}
