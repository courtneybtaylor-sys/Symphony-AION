/**
 * Rule 3: Retry Elimination
 * Fix validation loops with output format specs
 */

import { RunViewModel, EventKind } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation } from '../types'
import { calculateROI } from '../utils';

export function checkRetryElimination(
  data: RunViewModel,
  _aeiScore: AEIScore,
): AuditRecommendation | null {
  const retryCount = data.events.byKind[EventKind.RETRY] || 0;
  if (retryCount === 0) return null;

  let retryStepId = '';
  let retryStepCost = 0;

  data.steps.list.forEach((step) => {
    if (step.costUSD && step.costUSD > retryStepCost) {
      retryStepCost = step.costUSD;
      retryStepId = step.id;
    }
  });

  const savingsPerRun = retryStepCost * retryCount * 0.5;

  return {
    id: 'rule-3-retry-elimination',
    priority: 'high',
    category: 'retry_elimination',
    title: 'Eliminate Validation Retry Loop',
    finding: `${retryCount} retry event(s) on step ${retryStepId}. Cost per retry: ~$${(retryStepCost * 0.5).toFixed(4)}.`,
    action: `Add explicit output_format instructions to system prompt. Specify required fields in JSON schema.`,
    projectedSavings: {
      costUSDPerRun: savingsPerRun,
      costUSDMonthly100Runs: savingsPerRun * 100,
      description: 'Full retry cost per run eliminated',
    },
    effort: 'low',
    roi: calculateROI(savingsPerRun, 'low'),
    affectedSteps: [retryStepId],
    affectedModels: [],
    confidence: 'high',
    confidenceRationale: 'Root cause identified in telemetry. Fix is deterministic.',
  };
}
