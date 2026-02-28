/**
 * Rule 6: Token Optimization
 * Reduce JSON output verbosity (25-40% reduction)
 */

import { RunViewModel } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation, calculateROI } from '../types';

export function checkTokenOptimization(
  data: RunViewModel,
  _aeiScore: AEIScore,
): AuditRecommendation | null {
  let excessOutputTokens = 0;
  const jsonSteps: string[] = [];

  data.steps.list.forEach((step) => {
    const isJsonStep =
      step.name.toLowerCase().includes('summary') ||
      step.name.toLowerCase().includes('classification') ||
      step.name.toLowerCase().includes('extract');

    if (isJsonStep && step.outputTokens && step.outputTokens > 1000) {
      excessOutputTokens += step.outputTokens;
      jsonSteps.push(step.id);
    }
  });

  if (excessOutputTokens === 0) return null;

  const savingsTokens = Math.floor(excessOutputTokens * 0.35);
  const savingsPerRun = savingsTokens * 0.00001 * 0.35;

  return {
    id: 'rule-6-token-optimization',
    priority: 'medium',
    category: 'token_optimization',
    title: 'Optimize JSON Output Length',
    finding: `Step ${jsonSteps[0]} generated ${excessOutputTokens} output tokens. Expected: ~${Math.floor(excessOutputTokens / 3)} tokens.`,
    action: `Add: "Respond in JSON only. Maximum [target] tokens. No preamble."`,
    projectedSavings: {
      costUSDPerRun: savingsPerRun,
      costUSDMonthly100Runs: savingsPerRun * 100,
      tokenReductionPct: 35,
      description: '25-40% output token reduction',
    },
    effort: 'trivial',
    roi: calculateROI(savingsPerRun, 'trivial'),
    affectedSteps: jsonSteps.slice(0, 2),
    affectedModels: [],
    confidence: 'medium',
    confidenceRationale: 'Savings vary by content type. Estimate is conservative.',
  };
}
