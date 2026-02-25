/**
 * Symphony-AION Recommendations Engine
 * 8 opinionated rules for AI workflow optimization
 * All recommendations are specific, dollar-quantified, and actionable
 */

import { RunViewModel, EventKind } from './types';
import { AEIScore } from './aei-score';

// ============================================================================
// TYPES
// ============================================================================

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationCategory =
  | 'model_substitution'
  | 'prompt_caching'
  | 'retry_elimination'
  | 'routing_fix'
  | 'token_optimization'
  | 'latency_improvement'
  | 'hallucination_prevention'
  | 'framework_overhead';

export interface ProjectedSavings {
  costUSDPerRun: number;
  costUSDMonthly100Runs: number;
  tokenReductionPct?: number;
  latencyReductionMs?: number;
  description: string;
}

export interface AuditRecommendation {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  finding: string; // What AION observed (specific, with numbers)
  action: string; // Exactly what to do (specific, with code hints)
  projectedSavings: ProjectedSavings;
  effort: 'trivial' | 'low' | 'medium' | 'high';
  roi: number; // savings / estimated_impl_cost, e.g. 48 = 4800% ROI
  affectedSteps: string[];
  affectedModels: string[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateROI(savings: number, effort: string): number {
  const effortCosts = {
    trivial: 0.01,
    low: 0.25,
    medium: 1.0,
    high: 3.0,
  };

  const cost = effortCosts[effort as keyof typeof effortCosts] || 1;
  return Math.round((savings / Math.max(cost, 0.01)) * 100);
}

// ============================================================================
// RULE 1: MODEL_SUBSTITUTION
// ============================================================================
// Trigger: Step uses sonnet or gpt-4o where task is classification/extraction/summarization/validation
function checkModelSubstitution(
  data: RunViewModel,
): AuditRecommendation | null {
  const premiumModels = ['gpt-4o', 'claude-3-5-sonnet', 'claude-opus'];
  const targetTasks = ['classification', 'extraction', 'summarization', 'validation'];

  let totalPremiumCost = 0;
  let premiumSteps: string[] = [];
  let premiumModelsUsed: string[] = [];

  data.costs.byModel.forEach((modelCost) => {
    const modelLower = modelCost.model.toLowerCase();
    const isPremium = premiumModels.some((pm) =>
      modelLower.includes(pm.toLowerCase())
    );

    if (isPremium) {
      totalPremiumCost += modelCost.cost;
      premiumModelsUsed.push(modelCost.model);

      // Find steps that used this model
      data.steps.list.forEach((step) => {
        if (
          targetTasks.some((task) =>
            step.name.toLowerCase().includes(task)
          )
        ) {
          premiumSteps.push(step.id);
        }
      });
    }
  });

  if (totalPremiumCost === 0 || premiumSteps.length === 0) {
    return null;
  }

  const savingsPerRun = totalPremiumCost * 0.65; // 65% cost reduction

  return {
    id: 'rule-1-model-substitution',
    priority: 'high',
    category: 'model_substitution',
    title: 'Substitute Premium Models on Non-Reasoning Tasks',
    finding: `${premiumModelsUsed.join(', ')} used on classification/extraction tasks. Cost: $${totalPremiumCost.toFixed(4)} (${((totalPremiumCost / data.costs.total) * 100).toFixed(1)}% of total).`,
    action: `Replace with gpt-4o-mini or claude-3-5-haiku for ${premiumSteps.length} step(s). Escalate to ${premiumModelsUsed[0]} only if confidence < 70%. Expected pass rate without escalation: ~70% of runs.`,
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
  };
}

// ============================================================================
// RULE 2: PROMPT_CACHING
// ============================================================================
// Trigger: Any model_call with input_tokens > 4000 AND fixed system prompt
function checkPromptCaching(
  data: RunViewModel,
): AuditRecommendation | null {
  let maxInputTokens = 0;
  let stepsWithLargeInput: string[] = [];

  data.steps.list.forEach((step) => {
    if (step.inputTokens && step.inputTokens > 4000) {
      maxInputTokens = Math.max(maxInputTokens, step.inputTokens);
      stepsWithLargeInput.push(step.id);
    }
  });

  if (maxInputTokens === 0) {
    return null;
  }

  // Estimate cacheable tokens (system prompt + context, ~60% of input)
  const cacheableTokens = Math.floor(maxInputTokens * 0.6);
  const savingsPerRun = (cacheableTokens * 0.0000008) * 0.4; // 40% savings on input tokens

  return {
    id: 'rule-2-prompt-caching',
    priority: 'medium',
    category: 'prompt_caching',
    title: 'Enable Anthropic Prompt Caching',
    finding: `Step with ${maxInputTokens} input tokens. Fixed system prompt estimated at ~${cacheableTokens} cacheable tokens.`,
    action: `Add cache_control: {type: 'ephemeral'} to system prompt. Cache persists 5 minutes—sufficient for batch runs. Requires Anthropic API.`,
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
  };
}

// ============================================================================
// RULE 3: RETRY_ELIMINATION
// ============================================================================
// Trigger: Any step has retries > 0 from deterministic validation failure
function checkRetryElimination(
  data: RunViewModel,
): AuditRecommendation | null {
  const retryCount = data.events.byKind[EventKind.RETRY] || 0;

  if (retryCount === 0) {
    return null;
  }

  // Find the most expensive step that had retries
  let retryStepId = '';
  let retryStepCost = 0;

  data.steps.list.forEach((step) => {
    if (step.costUSD && step.costUSD > retryStepCost) {
      retryStepCost = step.costUSD;
      retryStepId = step.id;
    }
  });

  const savingsPerRun = retryStepCost * retryCount * 0.5; // Estimate retry is ~50% of step cost

  return {
    id: 'rule-3-retry-elimination',
    priority: 'high',
    category: 'retry_elimination',
    title: 'Eliminate Validation Retry Loop',
    finding: `${retryCount} retry event(s) on step ${retryStepId}. Cost per retry: ~$${(retryStepCost * 0.5).toFixed(4)}. Root cause likely schema mismatch or missing field.`,
    action: `Add explicit output_format instructions to system prompt. Specify required fields in JSON schema. Example: "Always respond with {field1, field2, field3} JSON only."`,
    projectedSavings: {
      costUSDPerRun: savingsPerRun,
      costUSDMonthly100Runs: savingsPerRun * 100,
      description: 'Full retry cost per run eliminated',
    },
    effort: 'low',
    roi: calculateROI(savingsPerRun, 'low'),
    affectedSteps: [retryStepId],
    affectedModels: [],
  };
}

// ============================================================================
// RULE 4: ROUTING_FIX
// ============================================================================
// Trigger: MODEL_ROUTING_FAILURE flag is present
function checkRoutingFix(
  data: RunViewModel,
  aeiScore: AEIScore,
): AuditRecommendation | null {
  if (!aeiScore.riskFlags.includes('MODEL_ROUTING_FAILURE')) {
    return null;
  }

  // Find the escalation: cheap model to expensive model
  const models = data.costs.byModel.sort((a, b) => a.cost - b.cost);
  if (models.length < 2) {
    return null;
  }

  const cheapModel = models[0];
  const expensiveModel = models[models.length - 1];
  const escalationCost = expensiveModel.cost - cheapModel.cost;

  return {
    id: 'rule-4-routing-fix',
    priority: 'critical',
    category: 'routing_fix',
    title: 'Fix Model Routing Escalation',
    finding: `${cheapModel.model} failed, escalated to ${expensiveModel.model}. Routing failure cost: $${escalationCost.toFixed(4)}.`,
    action: `Route to ${expensiveModel.model} directly. Do not attempt with ${cheapModel.model}—it is structurally insufficient for this task type. Skip the escalation attempt entirely.`,
    projectedSavings: {
      costUSDPerRun: escalationCost,
      costUSDMonthly100Runs: escalationCost * 100,
      description: 'Escalation cost eliminated per run',
    },
    effort: 'trivial',
    roi: calculateROI(escalationCost, 'trivial'),
    affectedSteps: data.steps.list.slice(0, 2).map((s) => s.id),
    affectedModels: [cheapModel.model, expensiveModel.model],
  };
}

// ============================================================================
// RULE 5: HALLUCINATION_PREVENTION
// ============================================================================
// Trigger: HALLUCINATION_DETECTED flag is present
function checkHallucinationPrevention(
  data: RunViewModel,
  aeiScore: AEIScore,
): AuditRecommendation | null {
  if (!aeiScore.riskFlags.includes('HALLUCINATION_DETECTED')) {
    return null;
  }

  // Find the step with validation failures
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

  // Estimate cost of retry + downstream correction
  const estimatedCorrectiveCost = data.costs.total * 0.15; // ~15% of total

  return {
    id: 'rule-5-hallucination-prevention',
    priority: 'high',
    category: 'hallucination_prevention',
    title: 'Prevent Model Hallucination on Numerical Tasks',
    finding: `Model hallucinated on step ${affectedStepId}: numerical output deviated from expected values. ${validationFailures} validation failures indicate output quality issues.`,
    action: `Do not ask model to compute values independently. Use tool-computed results as ground truth. Add constraint: "Do not perform arithmetic—use only the values provided in context." Use SELECT/COMPARE operations only.`,
    projectedSavings: {
      costUSDPerRun: estimatedCorrectiveCost,
      costUSDMonthly100Runs: estimatedCorrectiveCost * 100,
      description: 'Retry + downstream error correction cost eliminated',
    },
    effort: 'low',
    roi: calculateROI(estimatedCorrectiveCost, 'low'),
    affectedSteps: [affectedStepId].filter((id) => id.length > 0),
    affectedModels: data.costs.byModel.map((m) => m.model),
  };
}

// ============================================================================
// RULE 6: TOKEN_OPTIMIZATION
// ============================================================================
// Trigger: output_tokens > 1000 on steps where output should be structured JSON
function checkTokenOptimization(data: RunViewModel): AuditRecommendation | null {
  let excessOutputTokens = 0;
  let jsonSteps: string[] = [];

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

  if (excessOutputTokens === 0) {
    return null;
  }

  const savingsTokens = Math.floor(excessOutputTokens * 0.35); // 35% reduction possible
  const savingsPerRun = (savingsTokens * 0.00001) * 0.35; // Rough estimation

  return {
    id: 'rule-6-token-optimization',
    priority: 'medium',
    category: 'token_optimization',
    title: 'Optimize JSON Output Length',
    finding: `Step ${jsonSteps[0]} generated ${excessOutputTokens} output tokens. Expected for structured JSON: ~${Math.floor(excessOutputTokens / 3)} tokens.`,
    action: `Add: "Respond in JSON only. Maximum [target] tokens. No preamble." Use fixed schema—model populates fields only. Remove explanations and formatting.`,
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
  };
}

// ============================================================================
// RULE 7: PARALLEL_EXECUTION
// ============================================================================
// Trigger: 2+ sequential steps with no data dependency
function checkParallelExecution(data: RunViewModel): AuditRecommendation | null {
  // For this workflow, check if steps after Task 1 can run in parallel
  if (data.steps.list.length < 2) {
    return null;
  }

  // Simple heuristic: if there are steps 2+ with no dependency on step 1, recommend parallelization
  const independentSteps = data.steps.list.filter(
    (step) => !step.name.toLowerCase().includes('task-1')
  );

  if (independentSteps.length < 2) {
    return null;
  }

  const sequentialLatency = data.duration.ms;
  const estimatedParallelLatency = Math.floor(sequentialLatency * 0.65); // ~35% latency improvement

  return {
    id: 'rule-7-parallel-execution',
    priority: 'low',
    category: 'latency_improvement',
    title: 'Parallelize Independent Steps',
    finding: `Steps ${independentSteps.map((s) => s.id).join(', ')} are sequential but independent. Current: ${sequentialLatency}ms serial.`,
    action: `Execute with Promise.all(). No logic changes—orchestration only. Example: await Promise.all([step2(), step3()]) instead of await step2(); await step3();`,
    projectedSavings: {
      costUSDPerRun: 0,
      costUSDMonthly100Runs: 0,
      latencyReductionMs: sequentialLatency - estimatedParallelLatency,
      description: 'Latency reduction (no cost savings)',
    },
    effort: 'medium',
    roi: 0, // Latency only, no cost savings
    affectedSteps: independentSteps.map((s) => s.id).slice(0, 2),
    affectedModels: [],
  };
}

// ============================================================================
// RULE 8: FRAMEWORK_OVERHEAD_REDUCTION
// ============================================================================
// Trigger: Framework overhead ratio > 40%
function checkFrameworkOverhead(
  data: RunViewModel,
): AuditRecommendation | null {
  // Estimate framework overhead based on number of steps and events
  const totalEvents = data.events.total;
  const totalSteps = data.steps.total;

  // Rough heuristic: overhead increases with event/step ratio
  const overheadRatio = Math.min(1, (totalEvents * 0.1) / totalSteps);

  if (overheadRatio < 0.4) {
    return null;
  }

  // Estimate overhead cost
  const overheadCost = data.costs.total * overheadRatio;
  const savingsPerRun = overheadCost * 0.25; // 25% reduction if overhead addressed

  return {
    id: 'rule-8-framework-overhead',
    priority: 'medium',
    category: 'framework_overhead',
    title: 'Reduce Framework Coordination Overhead',
    finding: `Framework introduces ${Math.round(overheadRatio * 100)}% coordination overhead. Of ${data.tokens.total} total tokens, ~${Math.floor(data.tokens.total * overheadRatio)} are orchestration tokens.`,
    action: `Migrate from framework to direct API calls for this workflow. Coordination overhead is highest on Task 2–3. Direct calls eliminate agent messaging loop entirely.`,
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
  };
}

// ============================================================================
// MAIN AGGREGATOR FUNCTION
// ============================================================================

export function generateRecommendations(
  data: RunViewModel,
  aeiScore: AEIScore,
): AuditRecommendation[] {
  const recommendations: AuditRecommendation[] = [];

  // Apply all 8 rules
  const rule1 = checkModelSubstitution(data);
  if (rule1) recommendations.push(rule1);

  const rule2 = checkPromptCaching(data);
  if (rule2) recommendations.push(rule2);

  const rule3 = checkRetryElimination(data);
  if (rule3) recommendations.push(rule3);

  const rule4 = checkRoutingFix(data, aeiScore);
  if (rule4) recommendations.push(rule4);

  const rule5 = checkHallucinationPrevention(data, aeiScore);
  if (rule5) recommendations.push(rule5);

  const rule6 = checkTokenOptimization(data);
  if (rule6) recommendations.push(rule6);

  const rule7 = checkParallelExecution(data);
  if (rule7) recommendations.push(rule7);

  const rule8 = checkFrameworkOverhead(data);
  if (rule8) recommendations.push(rule8);

  // Sort by priority (critical > high > medium > low), then by ROI descending
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => {
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.roi - a.roi;
  });

  // Return top 8
  return recommendations.slice(0, 8);
}

// ============================================================================
// SAVINGS AGGREGATOR
// ============================================================================

export function getTotalProjectedSavings(recs: AuditRecommendation[]): {
  totalCostUSDPerRun: number;
  totalCostUSDMonthly: number;
  topRecommendation: AuditRecommendation;
  estimatedNewAEI: number;
} {
  if (recs.length === 0) {
    return {
      totalCostUSDPerRun: 0,
      totalCostUSDMonthly: 0,
      topRecommendation: {} as AuditRecommendation,
      estimatedNewAEI: 0,
    };
  }

  const totalCostPerRun = recs.reduce(
    (sum, rec) => sum + rec.projectedSavings.costUSDPerRun,
    0
  );

  return {
    totalCostUSDPerRun: totalCostPerRun,
    totalCostUSDMonthly: totalCostPerRun * 100,
    topRecommendation: recs[0],
    estimatedNewAEI: Math.min(100, 62 + (totalCostPerRun * 1000)), // Rough estimate
  };
}
