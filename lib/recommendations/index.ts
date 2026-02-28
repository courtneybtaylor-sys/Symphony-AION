/**
 * Recommendations Engine - Main Entry Point
 * Phase 5a: Modular recommendations architecture
 * Exports both modular rules and legacy API for backwards compatibility
 */

export {
  type RecommendationPriority,
  type RecommendationCategory,
  type RecommendationConfidence,
  type ProjectedSavings,
  type AuditRecommendation,
  type RuleFunction,
} from './types';

export { calculateROI, generateRecommendationId } from './utils';

export {
  RECOMMENDATION_RULES,
  executeRecommendationRules,
  getRuleByName,
  getRuleNames,
} from './rules/index';
