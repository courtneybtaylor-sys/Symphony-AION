/**
 * Rule 2: Prompt Caching
 * Enable Anthropic cache control on large inputs (40% input token reduction)
 */

import { RunViewModel } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation, calculateROI } from '../types';

export function checkPromptCaching(
  data: RunViewModel,
  _aeiScore: AEIScore,
): AuditRecommendation | null {
  let maxInputTokens = 0;
  const stepsWithLargeInput: string[] = [];

  data.steps.list.forEach((step) => {
    if (step.inputTokens && step.inputTokens > 4000) {
      maxInputTokens = Math.max(maxInputTokens, step.inputTokens);
      stepsWithLargeInput.push(step.id);
    }
  });

  if (maxInputTokens === 0) return null;

  const cacheableTokens = Math.floor(maxInputTokens * 0.6);
  const savingsPerRun = cacheableTokens * 0.0000008 * 0.4;

  return {
    id: 'rule-2-prompt-caching',
    priority: 'medium',
    category: 'prompt_caching',
    title: 'Enable Anthropic Prompt Caching',
    finding: `Step with ${maxInputTokens} input tokens. Fixed system prompt estimated at ~${cacheableTokens} cacheable tokens.`,
    action: `Add cache_control: {type: 'ephemeral'} to system prompt. Cache persists 5 minutes.`,
    projectedSavings: {
      costUSDPerRun: savingsPerRun,
      costUSDMonthly100Runs: savingsPerRun * 100,
      tokenReductionPct: 40,
      description: '40% input token reduction on cached steps',
    },
    effort: 'trivial',
    roi: calculateROI(savingsPerRun, 'trivial'),
    affectedSteps: stepsWithLargeInput.slice(0, 2),
    affectedModels: ['claude-3-5-sonnet', 'claude-opus'],
    confidence: 'high',
    confidenceRationale: 'Anthropic-documented 40% input token reduction on cached prefixes.',
  };
}
