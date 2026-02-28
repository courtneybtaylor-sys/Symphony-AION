/**
 * Recommendation Rules Registry
 * Phase 5a: Each rule is independently testable and discoverable
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

export type RuleFunction = (
  data: RunViewModel,
  aeiScore: AEIScore,
) => AuditRecommendation | null;

/** All registered rules in evaluation order */
export const rules: RuleFunction[] = [
  checkModelSubstitution,
  checkPromptCaching,
  checkRetryElimination,
  checkRoutingFix,
  checkHallucinationPrevention,
  checkTokenOptimization,
  checkParallelExecution,
  checkFrameworkOverhead,
];

export {
  checkModelSubstitution,
  checkPromptCaching,
  checkRetryElimination,
  checkRoutingFix,
  checkHallucinationPrevention,
  checkTokenOptimization,
  checkParallelExecution,
  checkFrameworkOverhead,
};
