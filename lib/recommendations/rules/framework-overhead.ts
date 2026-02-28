/**
 * Rule 8: Framework Overhead Reduction
 * Direct API calls vs framework (25% token reduction)
 */

import { RunViewModel } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation, calculateROI } from '../types';

export function checkFrameworkOverhead(
  data: RunViewModel,
  _aeiScore: AEIScore,
): AuditRecommendation | null {
  const totalEvents = data.events.total;
  const totalSteps = data.steps.total;
  const overheadRatio = Math.min(1, (totalEvents * 0.1) / totalSteps);

  if (overheadRatio < 0.4) return null;

  const overheadCost = data.costs.total * overheadRatio;
  const savingsPerRun = overheadCost * 0.25;

  return {
    id: 'rule-8-framework-overhead',
    priority: 'medium',
    category: 'framework_overhead',
    title: 'Reduce Framework Coordination Overhead',
    finding: `Framework introduces ${Math.round(overheadRatio * 100)}% coordination overhead. Of ${data.tokens.total} total tokens, ~${Math.floor(data.tokens.total * overheadRatio)} are orchestration tokens.`,
    action: `Migrate from framework to direct API calls for this workflow.`,
    projectedSavings: {
      costUSDPerRun: savingsPerRun,
      costUSDMonthly100Runs: savingsPerRun * 100,
      tokenReductionPct: 25,
      description: '20-35% token reduction if overhead addressed',
    },
    effort: 'high',
    roi: calculateROI(savingsPerRun, 'high'),
    affectedSteps: data.steps.list.slice(1, 3).map((s) => s.id),
    affectedModels: data.costs.byModel.map((m) => m.model),
    confidence: 'experimental',
    confidenceRationale: 'Overhead measurement is approximate. Migration effort is significant.',
  };
}
