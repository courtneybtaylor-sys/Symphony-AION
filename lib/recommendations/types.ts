/**
 * Recommendations Engine - Shared Types
 * Phase 5a: Modular recommendations architecture
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
  finding: string; // What AION observed (specific, with numbers)
  action: string; // Exactly what to do (specific, with code hints)
  projectedSavings: ProjectedSavings;
  effort: 'trivial' | 'low' | 'medium' | 'high';
  roi: number; // savings / estimated_impl_cost, e.g. 48 = 4800% ROI
  affectedSteps: string[];
  affectedModels: string[];
  confidence: RecommendationConfidence; // high | medium | experimental
  confidenceRationale: string; // one sentence explaining confidence
}

/**
 * Rule function signature - all rules implement this
 */
export type RuleFunction = (
  data: any, // RunViewModel
  aeiScore?: any // AEIScore (optional for some rules)
) => AuditRecommendation | null;
