/**
 * Rule 5: Hallucination Prevention
 * Use ground truth values, disable arithmetic
 */

import { RunViewModel, EventKind } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation } from '../types'
import { calculateROI } from '../utils';

export function checkHallucinationPrevention(
  data: RunViewModel,
  aeiScore: AEIScore,
): AuditRecommendation | null {
  if (!aeiScore.riskFlags.includes('HALLUCINATION_DETECTED')) return null;

  const validationFailures = data.events.byKind[EventKind.GOVERNANCE] || 0;
  let affectedStepId = '';

  data.steps.list.forEach((step) => {
    if (step.output && typeof step.output === 'object') {
      const output = step.output as Record<string, unknown>;
      if ('error' in output || 'validation_failed' in output) {
        affectedStepId = step.id;
      }
    }
  });

  const estimatedCorrectiveCost = data.costs.total * 0.15;

  return {
    id: 'rule-5-hallucination-prevention',
    priority: 'high',
    category: 'hallucination_prevention',
    title: 'Prevent Model Hallucination on Numerical Tasks',
    finding: `Model hallucinated on step ${affectedStepId}: ${validationFailures} validation failures indicate output quality issues.`,
    action: `Use tool-computed results as ground truth. Add constraint: "Do not perform arithmetic."`,
    projectedSavings: {
      costUSDPerRun: estimatedCorrectiveCost,
      costUSDMonthly100Runs: estimatedCorrectiveCost * 100,
      description: 'Retry + downstream error correction cost eliminated',
    },
    effort: 'low',
    roi: calculateROI(estimatedCorrectiveCost, 'low'),
    affectedSteps: [affectedStepId].filter((id) => id.length > 0),
    affectedModels: data.costs.byModel.map((m) => m.model),
    confidence: 'high',
    confidenceRationale: 'Ground-truth constraint pattern eliminates the failure class.',
  };
}
