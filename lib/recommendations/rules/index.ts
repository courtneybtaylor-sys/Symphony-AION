/**
 * Recommendations Rules Index
 * Phase 5a: Centralized export of all 8 recommendation rules
 * Each rule is independently testable and replaceable
 */

import { RunViewModel } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation } from '../types';
import { checkModelSubstitution } from './model-substitution';
import { checkPromptCaching } from './prompt-caching';
import { checkRetryElimination } from './retry-elimination';
import { checkRoutingFix } from './routing-fix';
import { checkHallucinationPrevention } from './hallucination-prevention';
import { checkTokenOptimization } from './token-optimization';
import { checkParallelExecution } from './parallel-execution';
import { checkFrameworkOverhead } from './framework-overhead';

export type { AuditRecommendation } from '../types';

// Rule can accept optional AEIScore
type RuleCheck = (data: RunViewModel, aeiScore?: AEIScore) => AuditRecommendation | null;

/**
 * Rule Registry - All available rules
 * Can be extended with custom rules
 */
export const RECOMMENDATION_RULES = [
  { name: 'model_substitution', check: checkModelSubstitution as RuleCheck },
  { name: 'prompt_caching', check: checkPromptCaching as RuleCheck },
  { name: 'retry_elimination', check: checkRetryElimination as RuleCheck },
  { name: 'routing_fix', check: checkRoutingFix as RuleCheck },
  { name: 'hallucination_prevention', check: checkHallucinationPrevention as RuleCheck },
  { name: 'token_optimization', check: checkTokenOptimization as RuleCheck },
  { name: 'parallel_execution', check: checkParallelExecution as RuleCheck },
  { name: 'framework_overhead', check: checkFrameworkOverhead as RuleCheck },
] as const;

/**
 * Execute all registered recommendation rules
 * Returns array of triggered recommendations sorted by priority and ROI
 */
export function executeRecommendationRules(
  data: RunViewModel,
  aeiScore?: AEIScore
): AuditRecommendation[] {
  const recommendations: AuditRecommendation[] = [];

  // Execute all rules
  for (const rule of RECOMMENDATION_RULES) {
    try {
      const recommendation = rule.check(data, aeiScore);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    } catch (error) {
      console.error(`Error executing rule ${rule.name}:`, error);
      // Continue with next rule on error
    }
  }

  // Sort by priority (critical > high > medium > low), then by ROI descending
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => {
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.roi - a.roi;
  });

  // Return top 8
  return recommendations.slice(0, 8);
}

/**
 * Get rule by name
 */
export function getRuleByName(name: string) {
  return RECOMMENDATION_RULES.find((r) => r.name === name);
}

/**
 * Get all rule names
 */
export function getRuleNames(): string[] {
  return RECOMMENDATION_RULES.map((r) => r.name as string);
}
