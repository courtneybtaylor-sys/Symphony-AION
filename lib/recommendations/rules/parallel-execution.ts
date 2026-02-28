/**
 * Rule 7: Parallel Execution
 * Run independent steps concurrently (latency only)
 */

import { RunViewModel } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { AuditRecommendation } from '../types';

export function checkParallelExecution(
  data: RunViewModel,
  _aeiScore: AEIScore,
): AuditRecommendation | null {
  if (data.steps.list.length < 2) return null;

  const independentSteps = data.steps.list.filter(
    (step) => !step.name.toLowerCase().includes('task-1')
  );

  if (independentSteps.length < 2) return null;

  const sequentialLatency = data.duration.ms;
  const estimatedParallelLatency = Math.floor(sequentialLatency * 0.65);

  return {
    id: 'rule-7-parallel-execution',
    priority: 'low',
    category: 'latency_improvement',
    title: 'Parallelize Independent Steps',
    finding: `Steps ${independentSteps.map((s) => s.id).join(', ')} are sequential but independent. Current: ${sequentialLatency}ms serial.`,
    action: `Execute with Promise.all(). No logic changes.`,
    projectedSavings: {
      costUSDPerRun: 0,
      costUSDMonthly100Runs: 0,
      latencyReductionMs: sequentialLatency - estimatedParallelLatency,
      description: 'Latency reduction (no cost savings)',
    },
    effort: 'medium',
    roi: 0,
    affectedSteps: independentSteps.map((s) => s.id).slice(0, 2),
    affectedModels: [],
    confidence: 'medium',
    confidenceRationale: 'Requires confirming absence of data dependency at runtime.',
  };
}
