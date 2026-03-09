/**
 * AION Efficiency Index (AEI) Scoring Engine
 * Canonical Formula: AEI = max(0, 100 − Σwᵢpᵢ)
 * Where penalties are weighted and clipped to [0,100]
 */

import { RunViewModel, EventKind } from './types';

/**
 * AEI Threshold definitions — bands for audit qualification and pricing
 */
export const AEI_THRESHOLDS = {
  CERTIFIED: {
    min: 80,
    max: 100,
    grade: 'A' as const,
    label: 'Certified Efficiency',
    color: '#1A6B45',
    urgency: 'none' as const,
  },
  WARNING: {
    min: 60,
    max: 79,
    grade: 'B' as const,
    label: 'Warning - Optimization Needed',
    color: '#1A4A7A',
    urgency: 'monitor' as const,
  },
  DEGRADED: {
    min: 40,
    max: 59,
    grade: 'C' as const,
    label: 'Degraded Performance',
    color: '#B87A10',
    urgency: 'address' as const,
  },
  SUSPENDED: {
    min: 0,
    max: 39,
    grade: 'F' as const,
    label: 'Suspended - Immediate Action Required',
    color: '#8B1A1A',
    urgency: 'critical' as const,
  },
} as const;

/**
 * Boardroom statements — C-level language for AEI scores
 */
export const AEI_BOARDROOM_DEFINITIONS: Record<number, string> = {
  90: 'Workflow is operating at certified efficiency. Minimal optimization opportunities.',
  80: 'Certified efficiency achieved. Standard maintenance monitoring sufficient.',
  70: 'Warning-level performance. Targeted optimizations will yield meaningful improvements.',
  50: 'Degraded performance detected. Significant cost and efficiency improvements available.',
  0: 'Suspended status. Critical inefficiencies require immediate remediation and governance intervention.',
};

export type AEIUrgency = 'none' | 'monitor' | 'address' | 'critical';

/**
 * AEI Score result with component breakdown, grade, and insights
 */
export interface AEIScore {
  overall: number; // 0–100 composite score
  grade: 'A' | 'B' | 'C' | 'F'; // Letter grade
  label: string; // e.g., "Certified Efficiency"
  components: {
    loopTax: number; // C1: Loop penalty [0-100]
    frameworkOverhead: number; // C2: Framework overhead penalty [0-100]
    modelMisallocation: number; // C3: Model misallocation penalty [0-100]
    driftScore: number; // C4: Drift score penalty [0-100]
    gateViolationRate: number; // C5: Gate violation penalty [0-100]
  };
  insights: string[]; // 3–5 plain-English findings
  riskFlags: string[]; // Flags like "HIGH_LOOP_TAX"
  classification?: AEIClassification; // Added classification result
}

/**
 * AEI Classification for audit intake gate
 */
export interface AEIClassification {
  threshold: (typeof AEI_THRESHOLDS)[keyof typeof AEI_THRESHOLDS];
  boardroomStatement: string;
  urgency: AEIUrgency;
  minimumViableClient: boolean; // true if savings potential > $300/month
  projectedMonthlySavings?: number; // Conservative estimate for tier selection
}

/**
 * Clamp a number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * C1: Calculate LoopTax penalty (30% weight)
 * Penalty = (loop_tokens / total_tokens) × 100
 * Represents token waste from retry loops
 */
function calculateLoopTax(
  totalTokens: number,
  retryCount: number,
  riskFlags: string[]
): number {
  if (totalTokens === 0) return 0;

  // Estimate loop tokens based on retry count
  // Average assumption: each retry consumes ~20% of original tokens
  const estimatedLoopTokens = (retryCount * 0.2 * totalTokens) || 0;
  const penalty = clamp((estimatedLoopTokens / totalTokens) * 100, 0, 100);

  if (penalty > 30) {
    if (!riskFlags.includes('HIGH_LOOP_TAX')) {
      riskFlags.push('HIGH_LOOP_TAX');
    }
  }

  return penalty;
}

/**
 * C2: Calculate FrameworkOverhead penalty (20% weight)
 * Penalty = (framework_tokens / total_tokens) × 100
 * Represents inefficient prompt engineering and boilerplate
 */
function calculateFrameworkOverhead(
  inputTokens: number,
  outputTokens: number,
  totalTokens: number,
  riskFlags: string[]
): number {
  if (totalTokens === 0) return 0;

  // Estimate framework overhead as portion of input tokens that exceeds useful context
  // Ideal input ratio: 40% input, 60% output for efficient workflows
  const idealInputRatio = 0.4;
  const actualInputRatio = inputTokens / totalTokens;

  if (actualInputRatio > idealInputRatio) {
    const overhead = actualInputRatio - idealInputRatio;
    const penalty = clamp(overhead * 100, 0, 100);

    if (penalty > 20) {
      if (!riskFlags.includes('FRAMEWORK_BLOAT')) {
        riskFlags.push('FRAMEWORK_BLOAT');
      }
    }

    return penalty;
  }

  return 0;
}

/**
 * C3: Calculate ModelMisallocation penalty (25% weight)
 * Penalty = (frontier_calls_on_simple_tasks / total_calls) × 100
 * Represents routing expensive models to simple tasks
 */
function calculateModelMisallocation(
  modelsByCount: Map<string, number>,
  totalCost: number,
  inputTokens: number,
  riskFlags: string[]
): number {
  // Heuristic: if using premium models (Opus, GPT-4) on low token counts, likely misallocation
  const premiumModels = ['gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-opus'];
  const modelList = Array.from(modelsByCount.keys());

  if (modelList.length === 0) return 0;

  const hasPremiumOnly = modelList.every(model =>
    premiumModels.some(pm => model.toLowerCase().includes(pm.toLowerCase()))
  );

  let penalty = 0;

  if (hasPremiumOnly && inputTokens < 5000) {
    // Using expensive models on simple tasks
    penalty = clamp(50, 0, 100);
    if (!riskFlags.includes('PREMIUM_ON_SIMPLE_TASK')) {
      riskFlags.push('PREMIUM_ON_SIMPLE_TASK');
    }
  } else if (modelList.length === 1 && hasPremiumOnly) {
    // No routing at all, using only premium
    penalty = clamp(30, 0, 100);
    if (!riskFlags.includes('ZERO_ROUTING')) {
      riskFlags.push('ZERO_ROUTING');
    }
  } else if (totalCost > 1.0 && modelList.length === 1) {
    // High cost on single model
    penalty = clamp(20, 0, 100);
  }

  return penalty;
}

/**
 * C4: Calculate DriftScore penalty (15% weight)
 * Penalty = (out_of_scope_tool_calls / total_tool_calls) × 100
 * Represents tool calls that deviate from original request
 */
function calculateDriftScore(
  eventsByKind: Record<string, number>,
  riskFlags: string[]
): number {
  // Use validation and hallucination events as proxy for drift
  const validationEvents = eventsByKind[EventKind.GOVERNANCE] || 0;
  const totalEvents = Object.values(eventsByKind).reduce((a, b) => a + b, 0);

  if (totalEvents === 0) return 0;

  const driftRate = validationEvents / totalEvents;
  const penalty = clamp(driftRate * 100, 0, 100);

  if (penalty > 15) {
    if (!riskFlags.includes('GOVERNANCE_DRIFT')) {
      riskFlags.push('GOVERNANCE_DRIFT');
    }
  }

  return penalty;
}

/**
 * C5: Calculate GateViolationRate penalty (10% weight)
 * Penalty = (gate_blocks / total_evaluations) × 100
 * Represents policy violations or security gate failures
 */
function calculateGateViolationRate(
  eventsByKind: Record<string, number>,
  riskFlags: string[]
): number {
  const validationFailed = eventsByKind[EventKind.VALIDATION_FAILED] || 0;
  const totalEvents = Object.values(eventsByKind).reduce((a, b) => a + b, 0);

  if (totalEvents === 0) return 0;

  const violationRate = validationFailed / totalEvents;
  const penalty = clamp(violationRate * 100, 0, 100);

  if (penalty > 10) {
    if (!riskFlags.includes('GATE_VIOLATIONS')) {
      riskFlags.push('GATE_VIOLATIONS');
    }
  }

  return penalty;
}

/**
 * Generate insights from the run data
 */
function generateInsights(
  data: RunViewModel,
  components: AEIScore['components'],
  riskFlags: string[]
): string[] {
  const insights: string[] = [];

  // Insight 1: Highest penalty
  const penalties = Object.entries(components).sort(([, a], [, b]) => b - a);
  const topPenalty = penalties[0];
  if (topPenalty[1] > 0) {
    const penaltyNames: Record<string, string> = {
      loopTax: 'retry loops',
      frameworkOverhead: 'framework overhead',
      modelMisallocation: 'model misallocation',
      driftScore: 'governance drift',
      gateViolationRate: 'gate violations',
    };
    insights.push(
      `Largest efficiency penalty from ${penaltyNames[topPenalty[0]] || topPenalty[0]} (${Math.round(topPenalty[1])}%)`
    );
  }

  // Insight 2: Cost breakdown
  if (data.costs.byModel.length > 0) {
    const topModel = data.costs.byModel[0];
    const percentage = Math.round(topModel.percentage * 100);
    insights.push(
      `Primary model '${topModel.model}' accounts for ${percentage}% of cost`
    );
  }

  // Insight 3: Model routing
  const uniqueModels = data.costs.byModel.length;
  if (uniqueModels === 1) {
    insights.push('Single model in use — no routing to optimize cost');
  } else {
    insights.push(`Model routing active across ${uniqueModels} models`);
  }

  // Insight 4: Performance
  if (data.performance.slowestStep) {
    const slowestDuration = data.performance.slowestStep.duration.ms;
    insights.push(
      `Slowest step '${data.performance.slowestStep.name}' took ${(slowestDuration / 1000).toFixed(1)}s`
    );
  }

  // Insight 5: Reliability
  if (data.steps.failed > 0) {
    const failureRate = ((data.steps.failed / data.steps.total) * 100).toFixed(1);
    insights.push(`${failureRate}% of steps failed`);
  }

  // Return at least 3 and at most 5 insights
  return insights.slice(0, 5);
}

/**
 * Calculate the AION Efficiency Index (AEI)
 * Formula: AEI = max(0, 100 − Σwᵢpᵢ)
 * Where wᵢ are weights: [0.30, 0.20, 0.25, 0.15, 0.10] and pᵢ are penalties [0-100]
 */
export function calculateAEI(data: RunViewModel): AEIScore {
  const riskFlags: string[] = [];

  // Extract data
  const totalCost = data.costs.total;
  const inputTokens = data.tokens.input;
  const outputTokens = data.tokens.output;
  const totalTokens = data.tokens.total;
  const totalSteps = data.steps.total;
  const failedSteps = data.steps.failed;
  const eventsByKind = data.events.byKind;

  // Build model map
  const modelsByCount = new Map<string, number>();
  data.costs.byModel.forEach(m => {
    modelsByCount.set(m.model, 1);
  });

  // Estimate retry count from events
  const retryCount = (eventsByKind[EventKind.RETRY] || 0) +
    (eventsByKind[EventKind.VALIDATION_FAILED] || 0);

  // Calculate component penalties (each clipped to [0, 100])
  const loopTax = calculateLoopTax(totalTokens, retryCount, riskFlags);
  const frameworkOverhead = calculateFrameworkOverhead(
    inputTokens,
    outputTokens,
    totalTokens,
    riskFlags
  );
  const modelMisallocation = calculateModelMisallocation(
    modelsByCount,
    totalCost,
    inputTokens,
    riskFlags
  );
  const driftScore = calculateDriftScore(eventsByKind, riskFlags);
  const gateViolationRate = calculateGateViolationRate(eventsByKind, riskFlags);

  // Calculate overall AEI: max(0, 100 − Σwᵢpᵢ)
  const weightedPenalties =
    loopTax * 0.30 +
    frameworkOverhead * 0.20 +
    modelMisallocation * 0.25 +
    driftScore * 0.15 +
    gateViolationRate * 0.10;

  const overall = clamp(100 - weightedPenalties, 0, 100);

  // Determine grade and label based on canonical thresholds
  let grade: 'A' | 'B' | 'C' | 'F';
  let label: string;

  if (overall >= 80) {
    grade = 'A';
    label = 'Certified Efficiency';
  } else if (overall >= 60) {
    grade = 'B';
    label = 'Warning - Optimization Needed';
  } else if (overall >= 40) {
    grade = 'C';
    label = 'Degraded Performance';
  } else {
    grade = 'F';
    label = 'Suspended - Immediate Action Required';
  }

  // Generate insights
  const components = {
    loopTax,
    frameworkOverhead,
    modelMisallocation,
    driftScore,
    gateViolationRate,
  };
  const insights = generateInsights(data, components, riskFlags);

  return {
    overall: Math.round(overall * 100) / 100,
    grade,
    label,
    components,
    insights,
    riskFlags,
  };
}

/**
 * Classify AEI score for audit intake qualification
 * Determines eligibility for $750 audit and minimum viable client status
 */
export function classifyAEI(
  aeiScore: AEIScore,
  estimatedMonthlySavings: number = 0
): AEIClassification {
  const score = aeiScore.overall;

  // Find matching threshold
  let threshold: (typeof AEI_THRESHOLDS)[keyof typeof AEI_THRESHOLDS];

  if (score >= 80) {
    threshold = AEI_THRESHOLDS.CERTIFIED;
  } else if (score >= 60) {
    threshold = AEI_THRESHOLDS.WARNING;
  } else if (score >= 40) {
    threshold = AEI_THRESHOLDS.DEGRADED;
  } else {
    threshold = AEI_THRESHOLDS.SUSPENDED;
  }

  // Get boardroom statement (map score to nearest defined level)
  const statementKeys = Object.keys(AEI_BOARDROOM_DEFINITIONS)
    .map(Number)
    .sort((a, b) => b - a);
  const nearestKey = statementKeys.find((k) => score >= k) || 0;
  const boardroomStatement =
    AEI_BOARDROOM_DEFINITIONS[nearestKey] ||
    AEI_BOARDROOM_DEFINITIONS[0];

  // Determine minimum viable client
  // Conservative threshold: if projected monthly savings > $300, audit ROI is justified
  const minimumViableClient = estimatedMonthlySavings > 300;

  return {
    threshold,
    boardroomStatement,
    urgency: threshold.urgency,
    minimumViableClient,
    projectedMonthlySavings: estimatedMonthlySavings,
  };
}

/**
 * Get Tailwind color class based on AEI score
 */
export function getAEIColor(score: number): string {
  if (score >= 80) {
    return 'text-green-400';
  } else if (score >= 60) {
    return 'text-blue-400';
  } else if (score >= 40) {
    return 'text-amber-400';
  } else {
    return 'text-red-400';
  }
}
