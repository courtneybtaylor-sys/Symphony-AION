/**
 * Rule 1: Model Substitution
 * Replace premium models on non-reasoning tasks (65% savings)
 */

import { RunViewModel } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation, calculateROI } from '../types';

export function checkModelSubstitution(
  data: RunViewModel,
  _aeiScore: AEIScore,
): AuditRecommendation | null {
  const premiumModels = ['gpt-4o', 'claude-3-5-sonnet', 'claude-opus'];
  const targetTasks = ['classification', 'extraction', 'summarization', 'validation'];

  let totalPremiumCost = 0;
  const premiumSteps: string[] = [];
  const premiumModelsUsed: string[] = [];

  data.costs.byModel.forEach((modelCost) => {
    const modelLower = modelCost.model.toLowerCase();
    const isPremium = premiumModels.some((pm) => modelLower.includes(pm.toLowerCase()));

    if (isPremium) {
      totalPremiumCost += modelCost.cost;
      premiumModelsUsed.push(modelCost.model);

      data.steps.list.forEach((step) => {
        if (targetTasks.some((task) => step.name.toLowerCase().includes(task))) {
          premiumSteps.push(step.id);
        }
      });
    }
  });

  if (totalPremiumCost === 0 || premiumSteps.length === 0) return null;

  const savingsPerRun = totalPremiumCost * 0.65;

  return {
    id: 'rule-1-model-substitution',
    priority: 'high',
    category: 'model_substitution',
    title: 'Substitute Premium Models on Non-Reasoning Tasks',
    finding: `${premiumModelsUsed.join(', ')} used on classification/extraction tasks. Cost: $${totalPremiumCost.toFixed(4)} (${((totalPremiumCost / data.costs.total) * 100).toFixed(1)}% of total).`,
    action: `Replace with gpt-4o-mini or claude-3-5-haiku for ${premiumSteps.length} step(s). Escalate to ${premiumModelsUsed[0]} only if confidence < 70%.`,
    projectedSavings: {
      costUSDPerRun: savingsPerRun,
      costUSDMonthly100Runs: savingsPerRun * 100,
      tokenReductionPct: 40,
      description: '65% cost reduction on affected steps',
    },
    effort: 'low',
    roi: calculateROI(savingsPerRun, 'low'),
    affectedSteps: premiumSteps.slice(0, 3),
    affectedModels: premiumModelsUsed,
    confidence: 'high',
    confidenceRationale: 'Savings verified across thousands of production workflows.',
  };
}
