/**
 * AION Efficiency Index (AEI) Scoring Engine
 * Produces a 0–100 composite score used in forensic audit reports
 */

import { RunViewModel, EventKind } from './types';

/**
 * AEI Threshold definitions — bands for audit qualification and pricing
 */
export const AEI_THRESHOLDS = {
  EXCELLENT: {
    min: 90,
    max: 100,
    grade: 'A' as const,
    label: 'Excellent',
    color: '#1A6B45',
    urgency: 'none' as const,
  },
  GOOD: {
    min: 80,
    max: 89,
    grade: 'B' as const,
    label: 'Good Efficiency',
    color: '#1A4A7A',
    urgency: 'monitor' as const,
  },
  ACCEPTABLE: {
    min: 70,
    max: 79,
    grade: 'C' as const,
    label: 'Acceptable',
    color: '#B87A10',
    urgency: 'address' as const,
  },
  INEFFICIENT: {
    min: 55,
    max: 69,
    grade: 'D' as const,
    label: 'Structural Inefficiency',
    color: '#C05A00',
    urgency: 'urgent' as const,
  },
  CRITICAL: {
    min: 0,
    max: 54,
    grade: 'F' as const,
    label: 'Financial Leakage Risk',
    color: '#8B1A1A',
    urgency: 'critical' as const,
  },
} as const;

/**
 * Boardroom statements — C-level language for AEI scores
 */
export const AEI_BOARDROOM_DEFINITIONS: Record<number, string> = {
  90: 'Workflow is operating near optimal efficiency. Minor improvements available.',
  80: 'Good efficiency. Targeted optimizations will yield meaningful savings.',
  70: 'Acceptable. Identifiable inefficiencies are costing 20–35% more than necessary.',
  55: 'Structural inefficiency detected. Workflow is consuming 40–60% more resources than an optimized equivalent.',
  0: 'Financial leakage risk. Uncontrolled costs, retry loops, or model misrouting are actively wasting budget. Immediate intervention required.',
};

export type AEIUrgency = 'none' | 'monitor' | 'address' | 'urgent' | 'critical';

/**
 * AEI Score result with component breakdown, grade, and insights
 */
export interface AEIScore {
  overall: number; // 0–100 composite score
  grade: 'A' | 'B' | 'C' | 'D' | 'F'; // Letter grade
  label: string; // e.g., "Efficient", "Moderate Waste"
  components: {
    costEfficiency: number; // 0–100
    tokenEfficiency: number; // 0–100
    latencyScore: number; // 0–100
    reliabilityScore: number; // 0–100
    retryPenalty: number; // 0–100 (inverse of retry rate)
  };
  insights: string[]; // 3–5 plain-English findings
  riskFlags: string[]; // Flags like "HIGH_RETRY_RATE"
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
 * Calculate cost efficiency score (25% weight)
 * Benchmark: $0.002 per 1000 tokens is efficient
 */
function calculateCostEfficiency(
  totalCost: number,
  totalTokens: number,
  modelsByCount: Map<string, number>,
  riskFlags: string[]
): number {
  if (totalTokens === 0) return 100;

  const costPer1kTokens = (totalCost / (totalTokens / 1000)) || 0;
  let score = clamp(100 - (costPer1kTokens / 0.002) * 50, 0, 100);

  // Check for premium model overuse (GPT-4, Claude Opus with no routing)
  const premiumModels = ['gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-opus'];
  const modelList = Array.from(modelsByCount.keys());
  const hasPremiumOnly = modelList.length > 0 &&
    modelList.every(model =>
      premiumModels.some(pm => model.toLowerCase().includes(pm.toLowerCase()))
    );

  if (hasPremiumOnly && modelList.length === 1) {
    score = clamp(score - 15, 0, 100);
    if (!riskFlags.includes('PREMIUM_MODEL_OVERUSE')) {
      riskFlags.push('PREMIUM_MODEL_OVERUSE');
    }
  }

  // Check for cost spike
  if (totalCost > 1.0) {
    if (!riskFlags.includes('COST_SPIKE')) {
      riskFlags.push('COST_SPIKE');
    }
  }

  return score;
}

/**
 * Calculate token efficiency score (25% weight)
 * Ideal output/total ratio is 0.25–0.40
 */
function calculateTokenEfficiency(
  inputTokens: number,
  outputTokens: number,
  riskFlags: string[]
): number {
  const totalTokens = inputTokens + outputTokens;
  if (totalTokens === 0) return 100;

  const outputRatio = outputTokens / totalTokens;

  let score = 0;

  // Over-prompting: ratio < 0.10
  if (outputRatio < 0.1) {
    score = 30;
    if (inputTokens > outputTokens * 5) {
      if (!riskFlags.includes('TOKEN_BLOAT')) {
        riskFlags.push('TOKEN_BLOAT');
      }
    }
  }
  // Runaway generation: ratio > 0.60
  else if (outputRatio > 0.6) {
    score = 40;
  }
  // Ideal range: 0.25–0.40
  else if (outputRatio >= 0.25 && outputRatio <= 0.4) {
    score = 95;
  }
  // Good range but not ideal
  else {
    // Score decreases as we move away from the ideal range
    const distanceFromIdeal = Math.min(
      Math.abs(outputRatio - 0.25),
      Math.abs(outputRatio - 0.4)
    );
    score = clamp(85 - distanceFromIdeal * 200, 50, 85);
  }

  return score;
}

/**
 * Calculate latency score (20% weight)
 * Based on maximum step duration
 */
function calculateLatencyScore(
  maxStepDurationMs: number,
  riskFlags: string[]
): number {
  if (maxStepDurationMs < 2000) {
    return 100;
  } else if (maxStepDurationMs < 5000) {
    return 80;
  } else if (maxStepDurationMs < 10000) {
    return 60;
  } else if (maxStepDurationMs < 30000) {
    return 40;
  } else {
    // Check for latency regression
    if (maxStepDurationMs > 15000) {
      if (!riskFlags.includes('LATENCY_REGRESSION')) {
        riskFlags.push('LATENCY_REGRESSION');
      }
    }
    return 20;
  }
}

/**
 * Calculate reliability score (20% weight)
 */
function calculateReliabilityScore(
  totalSteps: number,
  failedSteps: number
): number {
  if (totalSteps === 0) return 100;
  const failRate = failedSteps / totalSteps;
  return (1 - failRate) * 100;
}

/**
 * Calculate retry penalty (10% weight)
 * Count RETRY and VALIDATION_FAILED events
 */
function calculateRetryPenalty(
  eventsByKind: Record<string, number>,
  totalEvents: number,
  riskFlags: string[]
): number {
  const retryCount = (eventsByKind[EventKind.RETRY] || 0) +
    (eventsByKind[EventKind.VALIDATION_FAILED] || 0);

  if (totalEvents === 0) return 100;

  const retryRate = retryCount / totalEvents;
  const score = clamp(100 - retryRate * 300, 0, 100);

  if (retryRate > 0.1) {
    if (!riskFlags.includes('HIGH_RETRY_RATE')) {
      riskFlags.push('HIGH_RETRY_RATE');
    }
  }

  if ((eventsByKind[EventKind.VALIDATION_FAILED] || 0) > 3) {
    if (!riskFlags.includes('VALIDATION_LOOP')) {
      riskFlags.push('VALIDATION_LOOP');
    }
  }

  return score;
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

  // Insight 1: Cost breakdown
  if (data.costs.byModel.length > 0) {
    const topModel = data.costs.byModel[0];
    const percentage = Math.round(topModel.percentage * 100);
    insights.push(
      `Step '${topModel.model}' accounts for ${percentage}% of total cost`
    );
  }

  // Insight 2: Token efficiency
  const outputRatio = data.tokens.total > 0
    ? (data.tokens.output / data.tokens.total).toFixed(2)
    : '0';
  if (components.tokenEfficiency < 50) {
    insights.push(
      `Token output ratio of ${outputRatio} indicates over-prompting on input construction`
    );
  }

  // Insight 3: Model routing
  const uniqueModels = data.costs.byModel.length;
  if (uniqueModels === 1) {
    insights.push('No model routing detected — all calls routed to premium tier');
    if (!riskFlags.includes('ZERO_ROUTING')) {
      riskFlags.push('ZERO_ROUTING');
    }
  } else {
    insights.push(`Model routing active across ${uniqueModels} unique models`);
  }

  // Insight 4: Performance if notable
  if (data.performance.slowestStep) {
    const slowestDuration = data.performance.slowestStep.duration.ms;
    insights.push(
      `Slowest step '${data.performance.slowestStep.name}' took ${(slowestDuration / 1000).toFixed(1)}s`
    );
  }

  // Insight 5: Reliability
  if (data.steps.failed > 0) {
    const failureRate = ((data.steps.failed / data.steps.total) * 100).toFixed(1);
    insights.push(`${failureRate}% of steps failed, indicating reliability issues`);
  }

  // Return at least 3 and at most 5 insights
  return insights.slice(0, 5);
}

/**
 * Calculate the AION Efficiency Index (AEI)
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
  const totalEvents = data.events.total;
  const eventsByKind = data.events.byKind;

  // Build model map
  const modelsByCount = new Map<string, number>();
  data.costs.byModel.forEach(m => {
    modelsByCount.set(m.model, 1);
  });

  // Calculate component scores
  const costEfficiency = calculateCostEfficiency(
    totalCost,
    totalTokens,
    modelsByCount,
    riskFlags
  );

  const tokenEfficiency = calculateTokenEfficiency(
    inputTokens,
    outputTokens,
    riskFlags
  );

  const maxStepDuration = data.performance.slowestStep?.duration.ms || 0;
  const latencyScore = calculateLatencyScore(maxStepDuration, riskFlags);

  const reliabilityScore = calculateReliabilityScore(totalSteps, failedSteps);

  const retryPenalty = calculateRetryPenalty(
    eventsByKind,
    totalEvents,
    riskFlags
  );

  // Detect MODEL_ROUTING_FAILURE
  // Check if any step has multiple model calls due to escalation (more expensive model after cheaper one)
  if (data.costs.byModel.length >= 2) {
    const sortedByName = [...data.costs.byModel].sort((a, b) => a.cost - b.cost);
    const cheapestModel = sortedByName[0];
    const mostExpensiveModel = sortedByName[sortedByName.length - 1];

    // If we're using both cheap and expensive models, likely a routing escalation happened
    if (
      cheapestModel.cost > 0 &&
      mostExpensiveModel.cost > cheapestModel.cost * 2 &&
      data.steps.failed > 0
    ) {
      if (!riskFlags.includes('MODEL_ROUTING_FAILURE')) {
        riskFlags.push('MODEL_ROUTING_FAILURE');
      }
    }
  }

  // Detect HALLUCINATION_DETECTED
  // Check if there are validation failures with high retry rate indicating output quality issues
  const validationEvents = eventsByKind[EventKind.GOVERNANCE] || 0;
  const retries = eventsByKind[EventKind.RETRY] || 0;

  if (validationEvents > 0 && retries > 0) {
    const validationEventRate = validationEvents / totalEvents;
    // If >=20% of events are validation events with concurrent retries, or multiple validations with retries
    if (validationEventRate >= 0.2 || (validationEvents >= 2 && retries >= 2)) {
      if (!riskFlags.includes('HALLUCINATION_DETECTED')) {
        riskFlags.push('HALLUCINATION_DETECTED');
      }
    }
  }

  // Calculate overall score with weights
  const overall = clamp(
    costEfficiency * 0.25 +
    tokenEfficiency * 0.25 +
    latencyScore * 0.2 +
    reliabilityScore * 0.2 +
    retryPenalty * 0.1,
    0,
    100
  );

  // Determine grade and label
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let label: string;

  if (overall >= 85) {
    grade = 'A';
    label = 'Highly Efficient';
  } else if (overall >= 70) {
    grade = 'B';
    label = 'Good Efficiency';
  } else if (overall >= 55) {
    grade = 'C';
    label = 'Moderate Waste';
  } else if (overall >= 40) {
    grade = 'D';
    label = 'Significant Issues';
  } else {
    grade = 'F';
    label = 'Critical Remediation Required';
  }

  // Generate insights
  const components = {
    costEfficiency,
    tokenEfficiency,
    latencyScore,
    reliabilityScore,
    retryPenalty,
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

  if (score >= 90) {
    threshold = AEI_THRESHOLDS.EXCELLENT;
  } else if (score >= 80) {
    threshold = AEI_THRESHOLDS.GOOD;
  } else if (score >= 70) {
    threshold = AEI_THRESHOLDS.ACCEPTABLE;
  } else if (score >= 55) {
    threshold = AEI_THRESHOLDS.INEFFICIENT;
  } else {
    threshold = AEI_THRESHOLDS.CRITICAL;
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
  // At $750 per audit, need to save > $37.50/month to break even (assuming 20:1 ratio)
  // But we use $300 as the bar for a "good" customer
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
  if (score >= 70) {
    return 'text-green-400';
  } else if (score >= 50) {
    return 'text-amber-400';
  } else {
    return 'text-red-400';
  }
}
