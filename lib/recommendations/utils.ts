/**
 * Recommendations Engine - Utility Functions
 * Phase 5a: Shared utilities for all rules
 */

export function calculateROI(savings: number, effort: string): number {
  const effortCosts = {
    trivial: 0.01,
    low: 0.25,
    medium: 1.0,
    high: 3.0,
  };

  const cost = effortCosts[effort as keyof typeof effortCosts] || 1;
  return Math.round((savings / Math.max(cost, 0.01)) * 100);
}

/**
 * Generate a unique ID for a recommendation
 */
export function generateRecommendationId(category: string, runId: string): string {
  return `rec_${category}_${runId}_${Date.now()}`;
}
