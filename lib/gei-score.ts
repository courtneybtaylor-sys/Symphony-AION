/**
 * Governance Enforcement Index (GEI) Scoring Engine
 * Measures the effectiveness of governance controls and policy enforcement
 *
 * Formula: GEI = (enforceable_flagged_events / total_flagged_events) × 100
 */

import { RunViewModel, EventKind } from './types';

/**
 * GEI Sub-score types
 */
export type GEISubScore = 'cost' | 'authority' | 'privacy';

/**
 * GEI Score result with sub-scores and insights
 */
export interface GEIScore {
  overall: number; // 0–100 composite score
  subScores: {
    cost: number; // GEI-Cost: cost control enforcement
    authority: number; // GEI-Authority: RBAC/authorization enforcement
    privacy: number; // GEI-Privacy: data privacy policy enforcement
  };
  insights: string[]; // Plain-English findings
  riskFlags: string[]; // Flags like "UNENFORCEABLE_COST_POLICY"
  status: 'compliant' | 'warning' | 'violation'; // Compliance status
}

/**
 * Cost-related governance events
 */
const COST_GOVERNANCE_EVENTS = [
  EventKind.GOVERNANCE,
  EventKind.RATE_LIMIT,
];

/**
 * Authority-related governance events
 */
const AUTHORITY_GOVERNANCE_EVENTS = [
  EventKind.AUTH_FAILURE,
];

/**
 * Privacy-related governance events
 */
const PRIVACY_GOVERNANCE_EVENTS = [
  EventKind.VALIDATION_FAILED,
];

/**
 * Calculate GEI-Cost subscore (30% of overall GEI)
 * Measures cost control policy enforcement
 */
function calculateCostSubScore(
  eventsByKind: Record<string, number>,
  riskFlags: string[]
): number {
  const costGovernanceEvents = COST_GOVERNANCE_EVENTS.reduce((sum, event) => {
    return sum + (eventsByKind[event] || 0);
  }, 0);

  const rateLimitViolations = eventsByKind[EventKind.RATE_LIMIT] || 0;
  const governanceEvents = eventsByKind[EventKind.GOVERNANCE] || 0;

  // If no governance events detected, cost controls may be missing
  if (governanceEvents === 0 && rateLimitViolations === 0) {
    if (!riskFlags.includes('NO_COST_GOVERNANCE')) {
      riskFlags.push('NO_COST_GOVERNANCE');
    }
    return 50; // Neutral score - no evidence of enforcement or violation
  }

  // Calculate enforcement rate: successful enforcement / total events
  const enforcementRate = governanceEvents > 0
    ? (governanceEvents / (governanceEvents + rateLimitViolations)) * 100
    : 100;

  return Math.round(enforcementRate);
}

/**
 * Calculate GEI-Authority subscore (35% of overall GEI)
 * Measures RBAC and authorization policy enforcement
 */
function calculateAuthoritySubScore(
  eventsByKind: Record<string, number>,
  riskFlags: string[]
): number {
  const authFailures = eventsByKind[EventKind.AUTH_FAILURE] || 0;
  const totalGovernanceEvents = Object.values(eventsByKind).reduce((a, b) => a + b, 0);

  // If no auth failures and governance events, good compliance
  if (authFailures === 0) {
    if (totalGovernanceEvents > 0) {
      return 95; // Strong enforcement
    }
    return 75; // Neutral - no clear evidence
  }

  // Calculate enforcement effectiveness
  const authEnforcements = authFailures; // Each block is an enforcement action
  const enforcementRate = (authEnforcements / (authEnforcements + 1)) * 100;

  if (authFailures > 2) {
    if (!riskFlags.includes('REPEATED_AUTH_FAILURES')) {
      riskFlags.push('REPEATED_AUTH_FAILURES');
    }
    return Math.max(40, enforcementRate);
  }

  return Math.round(enforcementRate);
}

/**
 * Calculate GEI-Privacy subscore (35% of overall GEI)
 * Measures data privacy policy enforcement
 */
function calculatePrivacySubScore(
  eventsByKind: Record<string, number>,
  riskFlags: string[]
): number {
  const validationFailures = eventsByKind[EventKind.VALIDATION_FAILED] || 0;
  const totalEvents = Object.values(eventsByKind).reduce((a, b) => a + b, 0);

  // If no validation failures and events present, good compliance
  if (validationFailures === 0 && totalEvents > 0) {
    return 95; // Strong privacy enforcement
  }

  if (totalEvents === 0) {
    return 70; // Neutral - insufficient data
  }

  // Calculate privacy enforcement rate
  const privacyEnforcements = validationFailures;
  const enforcementRate = (privacyEnforcements / (privacyEnforcements + 1)) * 100;

  if (validationFailures > 3) {
    if (!riskFlags.includes('REPEATED_VALIDATION_FAILURES')) {
      riskFlags.push('REPEATED_VALIDATION_FAILURES');
    }
    return Math.max(35, enforcementRate);
  }

  return Math.round(enforcementRate);
}

/**
 * Generate insights from governance data
 */
function generateInsights(
  data: RunViewModel,
  subScores: GEIScore['subScores'],
  riskFlags: string[]
): string[] {
  const insights: string[] = [];

  // Insight 1: Highest sub-score finding
  const scores = Object.entries(subScores).sort(([, a], [, b]) => b - a);
  const strongest = scores[0];
  const weakest = scores[scores.length - 1];

  insights.push(
    `${strongest[0].toUpperCase()}-governance strongest (${Math.round(strongest[1])}%), ${weakest[0].toUpperCase()} needs attention (${Math.round(weakest[1])}%)`
  );

  // Insight 2: Event-based finding
  const governanceCount = data.events.byKind[EventKind.GOVERNANCE] || 0;
  const authCount = data.events.byKind[EventKind.AUTH_FAILURE] || 0;
  const validationCount = data.events.byKind[EventKind.VALIDATION_FAILED] || 0;

  if (governanceCount + authCount + validationCount === 0) {
    insights.push('No governance enforcement events detected');
  } else {
    insights.push(
      `Governance events: ${governanceCount} policies, ${authCount} auth checks, ${validationCount} validations`
    );
  }

  // Insight 3: Compliance status
  const overallScore = subScores.cost * 0.3 + subScores.authority * 0.35 + subScores.privacy * 0.35;
  if (overallScore >= 80) {
    insights.push('Governance controls are well-enforced');
  } else if (overallScore >= 60) {
    insights.push('Governance enforcement needs strengthening');
  } else {
    insights.push('Critical governance gaps detected');
  }

  return insights.slice(0, 5);
}

/**
 * Calculate the Governance Enforcement Index (GEI)
 * Formula: GEI = (enforceable_flagged_events / total_flagged_events) × 100
 * With three sub-scores: Cost, Authority, Privacy
 */
export function calculateGEI(data: RunViewModel): GEIScore {
  const riskFlags: string[] = [];

  // Calculate sub-scores
  const costScore = calculateCostSubScore(data.events.byKind, riskFlags);
  const authorityScore = calculateAuthoritySubScore(data.events.byKind, riskFlags);
  const privacyScore = calculatePrivacySubScore(data.events.byKind, riskFlags);

  // Calculate overall GEI as weighted average of sub-scores
  const overall = Math.round(
    costScore * 0.30 +
    authorityScore * 0.35 +
    privacyScore * 0.35
  );

  // Determine compliance status
  let status: 'compliant' | 'warning' | 'violation';
  if (overall >= 80) {
    status = 'compliant';
  } else if (overall >= 60) {
    status = 'warning';
  } else {
    status = 'violation';
  }

  // Generate insights
  const subScores = {
    cost: costScore,
    authority: authorityScore,
    privacy: privacyScore,
  };
  const insights = generateInsights(data, subScores, riskFlags);

  return {
    overall,
    subScores,
    insights,
    riskFlags,
    status,
  };
}

/**
 * Calculate delta between two GEI scores
 * Used for trend analysis
 */
export function calculateGEIDelta(previous: GEIScore, current: GEIScore): {
  overall: number;
  cost: number;
  authority: number;
  privacy: number;
  trend: 'improving' | 'stable' | 'degrading';
} {
  const overallDelta = current.overall - previous.overall;
  const costDelta = current.subScores.cost - previous.subScores.cost;
  const authorityDelta = current.subScores.authority - previous.subScores.authority;
  const privacyDelta = current.subScores.privacy - previous.subScores.privacy;

  let trend: 'improving' | 'stable' | 'degrading';
  if (overallDelta > 5) {
    trend = 'improving';
  } else if (overallDelta < -5) {
    trend = 'degrading';
  } else {
    trend = 'stable';
  }

  return {
    overall: Math.round(overallDelta * 100) / 100,
    cost: Math.round(costDelta * 100) / 100,
    authority: Math.round(authorityDelta * 100) / 100,
    privacy: Math.round(privacyDelta * 100) / 100,
    trend,
  };
}
