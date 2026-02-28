/**
 * Rule 4: Routing Fix
 * Direct route to correct model, skip cheap failures
 */

import { RunViewModel } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation, calculateROI } from '../types';

export function checkRoutingFix(
  data: RunViewModel,
  aeiScore: AEIScore,
): AuditRecommendation | null {
  if (!aeiScore.riskFlags.includes('MODEL_ROUTING_FAILURE')) return null;

  const models = data.costs.byModel.sort((a, b) => a.cost - b.cost);
  if (models.length < 2) return null;

  const cheapModel = models[0];
  const expensiveModel = models[models.length - 1];
  const escalationCost = expensiveModel.cost - cheapModel.cost;

  return {
    id: 'rule-4-routing-fix',
    priority: 'critical',
    category: 'routing_fix',
    title: 'Fix Model Routing Escalation',
    finding: `${cheapModel.model} failed, escalated to ${expensiveModel.model}. Routing failure cost: $${escalationCost.toFixed(4)}.`,
    action: `Route to ${expensiveModel.model} directly. Skip the escalation attempt entirely.`,
    projectedSavings: {
      costUSDPerRun: escalationCost,
      costUSDMonthly100Runs: escalationCost * 100,
      description: 'Escalation cost eliminated per run',
    },
    effort: 'trivial',
    roi: calculateROI(escalationCost, 'trivial'),
    affectedSteps: data.steps.list.slice(0, 2).map((s) => s.id),
    affectedModels: [cheapModel.model, expensiveModel.model],
    confidence: 'high',
    confidenceRationale: 'Escalation path confirmed in retry events.',
  };
}
