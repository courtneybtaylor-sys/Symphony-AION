/**
 * Audit Intake Gate
 * Qualification checks before payment processing
 * Prevents audits too small to justify $750 spend
 */

import { buildRunViewModel } from './telemetry';
import { calculateAEI } from './aei-score';
import { generateRecommendations, getTotalProjectedSavings } from './recommendations';
import { EventKind } from './types';
import { normalizeFrameworkTelemetry, detectFramework } from './framework-adapters';

/**
 * Qualification thresholds — intentionally LOW for launch
 * Raise after first 10 audits based on actual savings data
 */
export const INTAKE_THRESHOLDS = {
  MIN_RUNS: 1, // minimum run events in telemetry
  MIN_MODEL_CALLS: 3, // minimum model_call events
  MIN_TOTAL_COST_USD: 0.05, // minimum declared spend in telemetry
  MIN_TOKEN_VOLUME: 5000, // minimum total tokens across all model calls
  // A workflow meeting ANY ONE of these qualifies:
  ENTERPRISE_QUALIFIERS: {
    MIN_RUNS_HIGH: 50,
    MIN_SPEND_HIGH: 500,
    MIN_TOKENS_HIGH: 500000,
  },
} as const;

/**
 * Summary of parsed telemetry
 */
export interface IntakeSummary {
  runCount: number;
  modelCallCount: number;
  totalCostUSD: number;
  totalTokens: number;
  frameworkDetected: string;
  modelsDetected: string[];
  estimatedSavingsRangeLow: number; // conservative projection
  estimatedSavingsRangeHigh: number; // optimistic projection
  estimatedNewAEI?: number;
}

/**
 * Result of intake gate validation
 */
export interface IntakeGateResult {
  qualified: boolean;
  reason?: string; // shown to user if not qualified
  warningOnly?: boolean; // true = qualified but show advisory
  summary: IntakeSummary;
  projectedROI: number; // (estimatedSavingsRangeLow * 12) / 750
}

/**
 * Validate telemetry upload against intake thresholds
 * Returns qualification status, estimated savings, and ROI projection
 */
export function validateUpload(telemetry: unknown): IntakeGateResult {
  // Validate JSON structure
  if (!telemetry || typeof telemetry !== 'object') {
    return {
      qualified: false,
      reason: 'Invalid telemetry format. Please upload valid JSON.',
      summary: {
        runCount: 0,
        modelCallCount: 0,
        totalCostUSD: 0,
        totalTokens: 0,
        frameworkDetected: 'unknown',
        modelsDetected: [],
        estimatedSavingsRangeLow: 0,
        estimatedSavingsRangeHigh: 0,
      },
      projectedROI: 0,
    };
  }

  try {
    // Normalize telemetry from any framework to canonical format
    const detection = detectFramework(telemetry);
    const normalizedRun = normalizeFrameworkTelemetry(telemetry);

    // Build RunViewModel
    const viewModel = buildRunViewModel(normalizedRun);

    // Extract data for summary
    const runCount = 1; // Single upload = 1 run
    const modelCallCount = (viewModel.events.byKind[EventKind.MODEL_INVOKED] || 0) +
      (viewModel.events.byKind[EventKind.TOKEN_COUNT] || 0);
    const totalCostUSD = viewModel.costs.total;
    const totalTokens = viewModel.tokens.total;
    // Framework detection: use normalized result or check raw metadata
    const frameworkDetected = normalizedRun.framework || detection.framework || 'generic';
    const modelsDetected = viewModel.costs.byModel.map((m) => m.model);

    // Check thresholds
    const meetsMinRuns = runCount >= INTAKE_THRESHOLDS.MIN_RUNS;
    const meetsMinModelCalls = modelCallCount >= INTAKE_THRESHOLDS.MIN_MODEL_CALLS;
    const meetsMinCost = totalCostUSD >= INTAKE_THRESHOLDS.MIN_TOTAL_COST_USD;
    const meetsMinTokens = totalTokens >= INTAKE_THRESHOLDS.MIN_TOKEN_VOLUME;
    const meetsEnterpriseCost = totalCostUSD >= INTAKE_THRESHOLDS.ENTERPRISE_QUALIFIERS.MIN_SPEND_HIGH;
    const meetsEnterpriseTokens =
      totalTokens >= INTAKE_THRESHOLDS.ENTERPRISE_QUALIFIERS.MIN_TOKENS_HIGH;

    // Qualification logic: meet ANY ONE basic threshold OR enterprise threshold
    let qualified = false;
    let warningOnly = false;

    if (meetsMinRuns && (meetsMinModelCalls || meetsMinCost || meetsMinTokens)) {
      qualified = true;
    } else if (meetsEnterpriseCost || meetsEnterpriseTokens) {
      qualified = true;
    }

    // Warning: only one run uploaded
    if (runCount < 10) {
      warningOnly = true;
    }

    // Not qualified messages
    let reason: string | undefined;
    if (!qualified) {
      if (modelCallCount === 0) {
        reason =
          'No model call events detected. Ensure your telemetry includes model_call events with token counts and cost data.';
      } else if (totalCostUSD === 0) {
        reason =
          'No cost data found in model call events. Audit requires cost_usd field on model_call events to compute AEI and savings.';
      } else {
        reason = 'Upload contains insufficient data for meaningful audit. Please ensure telemetry includes at least 3 model calls and $0.05 in costs.';
      }
    }

    // Calculate estimated savings
    // Low estimate: 25% savings at 100 runs/month
    // High estimate: 55% savings at 100 runs/month
    const estimatedSavingsRangeLow = totalCostUSD * 0.25 * 100;
    const estimatedSavingsRangeHigh = totalCostUSD * 0.55 * 100;

    // Compute AEI and recommendations for impact projection
    const aeiScore = calculateAEI(viewModel);
    const recommendations = generateRecommendations(viewModel, aeiScore);
    const savings = getTotalProjectedSavings(recommendations);
    const estimatedNewAEI = savings.estimatedNewAEI;

    // Calculate projected ROI
    const projectedROI = (estimatedSavingsRangeLow * 12) / 750; // ROI: (annual savings) / (audit cost)

    const summary: IntakeSummary = {
      runCount,
      modelCallCount,
      totalCostUSD,
      totalTokens,
      frameworkDetected,
      modelsDetected,
      estimatedSavingsRangeLow,
      estimatedSavingsRangeHigh,
      estimatedNewAEI,
    };

    return {
      qualified,
      reason,
      warningOnly: warningOnly && qualified ? true : undefined,
      summary,
      projectedROI: Math.round(projectedROI * 100) / 100, // Round to 2 decimals
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      qualified: false,
      reason: `Error parsing telemetry: ${message}`,
      summary: {
        runCount: 0,
        modelCallCount: 0,
        totalCostUSD: 0,
        totalTokens: 0,
        frameworkDetected: 'unknown',
        modelsDetected: [],
        estimatedSavingsRangeLow: 0,
        estimatedSavingsRangeHigh: 0,
      },
      projectedROI: 0,
    };
  }
}

/**
 * Get user-friendly qualification message
 */
export function getQualificationMessage(result: IntakeGateResult): string {
  if (result.qualified && !result.warningOnly) {
    return `Your workflow qualifies for audit! Estimated monthly savings: $${Math.round(result.summary.estimatedSavingsRangeLow)}–$${Math.round(result.summary.estimatedSavingsRangeHigh)}.`;
  }

  if (result.qualified && result.warningOnly) {
    return `Upload contains ${result.summary.runCount} run(s). For a meaningful forensic audit, we recommend uploading telemetry from at least 10 runs to identify patterns. Single-run analysis is available — results will be limited to that run only.`;
  }

  return result.reason || 'Upload does not meet qualification thresholds.';
}
