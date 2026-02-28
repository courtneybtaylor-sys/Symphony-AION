/**
 * Symphony-AION Recommendations Engine
 * 8 opinionated rules for AI workflow optimization
 * All recommendations are specific, dollar-quantified, and actionable
 *
 * Phase 5a: Modular architecture - each rule is in lib/recommendations/rules/
 * This file provides backwards-compatible API
 */

import { RunViewModel } from './types';
import { AEIScore } from './aei-score';
import {
  executeRecommendationRules,
  type AuditRecommendation,
  type RecommendationPriority,
  type RecommendationCategory,
  type RecommendationConfidence,
  type ProjectedSavings,
} from './recommendations/index';

// Re-export types for backwards compatibility
export type {
  RecommendationPriority,
  RecommendationCategory,
  RecommendationConfidence,
  ProjectedSavings,
  AuditRecommendation,
};

/**
 * Legacy API: generateRecommendations
 * Delegates to modular executeRecommendationRules
 */
export function generateRecommendations(
  data: RunViewModel,
  aeiScore: AEIScore,
): AuditRecommendation[] {
  return executeRecommendationRules(data, aeiScore);
}

// ============================================================================
// SAVINGS AGGREGATOR
// ============================================================================

export function getTotalProjectedSavings(recs: AuditRecommendation[]): {
  totalCostUSDPerRun: number;
  totalCostUSDMonthly: number;
  topRecommendation: AuditRecommendation;
  estimatedNewAEI: number;
} {
  if (recs.length === 0) {
    return {
      totalCostUSDPerRun: 0,
      totalCostUSDMonthly: 0,
      topRecommendation: {} as AuditRecommendation,
      estimatedNewAEI: 0,
    };
  }

  const totalCostPerRun = recs.reduce(
    (sum, rec) => sum + rec.projectedSavings.costUSDPerRun,
    0
  );

  return {
    totalCostUSDPerRun: totalCostPerRun,
    totalCostUSDMonthly: totalCostPerRun * 100,
    topRecommendation: recs[0],
    estimatedNewAEI: Math.min(100, 62 + (totalCostPerRun * 1000)), // Rough estimate
  };
}
