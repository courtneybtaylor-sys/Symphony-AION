/**
 * Recommendation Types
 * Phase 5a: Shared types for recommendation rules
 */

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationCategory =
  | 'model_substitution'
  | 'prompt_caching'
  | 'retry_elimination'
  | 'routing_fix'
  | 'token_optimization'
  | 'latency_improvement'
  | 'hallucination_prevention'
  | 'framework_overhead';
export type RecommendationConfidence = 'high' | 'medium' | 'experimental';

export interface ProjectedSavings {
  costUSDPerRun: number;
  costUSDMonthly100Runs: number;
  tokenReductionPct?: number;
  latencyReductionMs?: number;
  description: string;
}

export interface AuditRecommendation {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  finding: string;
  action: string;
  projectedSavings: ProjectedSavings;
  effort: 'trivial' | 'low' | 'medium' | 'high';
  roi: number;
  affectedSteps: string[];
  affectedModels: string[];
  confidence: RecommendationConfidence;
  confidenceRationale: string;
}

export function calculateROI(savings: number, effort: string): number {
  const effortCosts: Record<string, number> = {
    trivial: 0.01,
    low: 0.25,
    medium: 1.0,
    high: 3.0,
  };
  const cost = effortCosts[effort] || 1;
  return Math.round((savings / Math.max(cost, 0.01)) * 100);
}
