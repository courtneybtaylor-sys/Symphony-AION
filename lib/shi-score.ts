/**
 * System Health Index (SHI) Scoring Engine
 * Combines AEI (efficiency) and GEI (governance) into a holistic health metric
 *
 * Formula: SHI = AEI × (1 − GEI/100)
 * Represents: Efficiency adjusted for governance compliance
 */

import { AEIScore } from './aei-score';
import { GEIScore } from './gei-score';

/**
 * SHI Health status classification
 */
export type SHIHealthStatus = 'healthy' | 'caution' | 'critical';

/**
 * SHI Score result combining AEI and GEI
 */
export interface SHIScore {
  overall: number; // 0–100 composite health score
  aei: number; // Efficiency Index component
  gei: number; // Governance Index component
  status: SHIHealthStatus; // Health classification
  insights: string[]; // Clinical health findings
  recommendations: string[]; // Actionable remediation steps
  riskFactors: {
    efficiency: boolean; // AEI < 60
    governance: boolean; // GEI < 60
    both: boolean; // Both AEI and GEI < 60
  };
}

/**
 * Clamp a number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Determine health status based on SHI score
 */
function determineHealthStatus(score: number): SHIHealthStatus {
  if (score >= 70) {
    return 'healthy';
  } else if (score >= 50) {
    return 'caution';
  } else {
    return 'critical';
  }
}

/**
 * Generate health insights
 */
function generateInsights(
  aei: AEIScore,
  gei: GEIScore,
  shiScore: number,
  riskFactors: SHIScore['riskFactors']
): string[] {
  const insights: string[] = [];

  // Insight 1: Overall health status
  if (shiScore >= 70) {
    insights.push('System is operating with good health and efficiency');
  } else if (shiScore >= 50) {
    insights.push('System health is at acceptable levels but needs monitoring');
  } else {
    insights.push('System health is critically degraded and requires intervention');
  }

  // Insight 2: AEI-specific finding
  if (aei.overall >= 80) {
    insights.push(`Efficiency is strong (AEI ${aei.overall})`);
  } else if (aei.overall >= 60) {
    insights.push(`Efficiency has room for optimization (AEI ${aei.overall})`);
  } else {
    insights.push(`Efficiency is critically low (AEI ${aei.overall}) — major penalties apply`);
  }

  // Insight 3: GEI-specific finding
  if (gei.overall >= 80) {
    insights.push(`Governance is well-enforced (GEI ${gei.overall})`);
  } else if (gei.overall >= 60) {
    insights.push(`Governance compliance needs strengthening (GEI ${gei.overall})`);
  } else {
    insights.push(`Governance controls are weak (GEI ${gei.overall}) — compliance risk`);
  }

  // Insight 4: Combined risk
  if (riskFactors.both) {
    insights.push('Both efficiency and governance are problematic — comprehensive remediation needed');
  } else if (riskFactors.efficiency) {
    insights.push('Focus on operational efficiency improvements');
  } else if (riskFactors.governance) {
    insights.push('Focus on strengthening governance and policy controls');
  }

  // Insight 5: Biggest contributor to low SHI
  if (shiScore < 50) {
    const efficiencyImpact = (1 - (aei.overall / 100)) * 100;
    const governanceImpact = (gei.overall / 100) * 100;

    if (efficiencyImpact > governanceImpact) {
      insights.push(`Low efficiency (AEI ${aei.overall}) is the primary SHI limiter`);
    } else {
      insights.push(`Governance gaps (GEI ${gei.overall}) are constraining SHI potential`);
    }
  }

  return insights.slice(0, 5);
}

/**
 * Generate remediation recommendations
 */
function generateRecommendations(
  aei: AEIScore,
  gei: GEIScore,
  riskFactors: SHIScore['riskFactors']
): string[] {
  const recommendations: string[] = [];

  // Efficiency recommendations
  if (aei.overall < 80) {
    if (aei.components.loopTax > 20) {
      recommendations.push('Implement retry optimization and fallback strategies to reduce loop penalties');
    }
    if (aei.components.modelMisallocation > 20) {
      recommendations.push('Review model routing and migrate simple tasks to cost-effective models');
    }
    if (aei.components.frameworkOverhead > 20) {
      recommendations.push('Streamline prompts and reduce unnecessary context overhead');
    }
  }

  // Governance recommendations
  if (gei.overall < 80) {
    if (gei.subScores.cost < 60) {
      recommendations.push('Strengthen cost governance policies and rate limit enforcement');
    }
    if (gei.subScores.authority < 60) {
      recommendations.push('Audit RBAC configuration and tighten authorization checks');
    }
    if (gei.subScores.privacy < 60) {
      recommendations.push('Enhance data privacy controls and validation checkpoints');
    }
  }

  // High-priority combined recommendations
  if (riskFactors.both) {
    recommendations.push('Engage both operations and compliance teams for parallel remediation');
  }

  return recommendations.slice(0, 5);
}

/**
 * Calculate the System Health Index (SHI)
 * Formula: SHI = AEI × (1 − GEI/100)
 *
 * Interpretation:
 * - AEI provides the base efficiency score
 * - GEI governance compliance reduces the final SHI
 * - A system with high efficiency but poor governance has reduced SHI
 * - A system with perfect governance but poor efficiency has low SHI
 */
export function calculateSHI(aei: AEIScore, gei: GEIScore): SHIScore {
  // Calculate SHI using canonical formula
  // SHI = AEI × (1 − GEI/100)
  // This penalizes poor governance by reducing the SHI below AEI
  const governanceFactor = 1 - (gei.overall / 100);
  const shiScore = clamp(aei.overall * governanceFactor, 0, 100);

  // Determine health status
  const status = determineHealthStatus(Math.round(shiScore * 100) / 100);

  // Identify risk factors
  const riskFactors = {
    efficiency: aei.overall < 60,
    governance: gei.overall < 60,
    both: aei.overall < 60 && gei.overall < 60,
  };

  // Generate insights and recommendations
  const insights = generateInsights(aei, gei, shiScore, riskFactors);
  const recommendations = generateRecommendations(aei, gei, riskFactors);

  return {
    overall: Math.round(shiScore * 100) / 100,
    aei: aei.overall,
    gei: gei.overall,
    status,
    insights,
    recommendations,
    riskFactors,
  };
}

/**
 * Calculate SHI trend over time
 * Useful for monitoring system health trajectory
 */
export function calculateSHITrend(
  previousSHI: SHIScore,
  currentSHI: SHIScore
): {
  shiDelta: number;
  aeiDelta: number;
  geiDelta: number;
  trend: 'improving' | 'stable' | 'degrading';
  severity: 'low' | 'medium' | 'high';
} {
  const shiDelta = currentSHI.overall - previousSHI.overall;
  const aeiDelta = currentSHI.aei - previousSHI.aei;
  const geiDelta = currentSHI.gei - previousSHI.gei;

  let trend: 'improving' | 'stable' | 'degrading';
  if (shiDelta > 5) {
    trend = 'improving';
  } else if (shiDelta < -5) {
    trend = 'degrading';
  } else {
    trend = 'stable';
  }

  let severity: 'low' | 'medium' | 'high';
  if (Math.abs(shiDelta) > 20) {
    severity = 'high';
  } else if (Math.abs(shiDelta) > 10) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  return {
    shiDelta: Math.round(shiDelta * 100) / 100,
    aeiDelta: Math.round(aeiDelta * 100) / 100,
    geiDelta: Math.round(geiDelta * 100) / 100,
    trend,
    severity,
  };
}

/**
 * Get clinical health summary for reporting
 */
export function getSHIHealthSummary(shi: SHIScore): string {
  const { overall, status, riskFactors, aei, gei } = shi;

  if (status === 'healthy') {
    return `System is healthy (SHI ${overall}) with strong efficiency (AEI ${aei}) and good governance (GEI ${gei})`;
  } else if (status === 'caution') {
    if (riskFactors.efficiency) {
      return `System at caution level (SHI ${overall}) due to efficiency concerns (AEI ${aei}). Governance adequate (GEI ${gei}).`;
    } else if (riskFactors.governance) {
      return `System at caution level (SHI ${overall}) due to governance gaps (GEI ${gei}). Efficiency acceptable (AEI ${aei}).`;
    } else {
      return `System at caution level (SHI ${overall}). Monitor both efficiency and governance trends.`;
    }
  } else {
    // critical
    if (riskFactors.both) {
      return `System is CRITICAL (SHI ${overall}). Both efficiency (AEI ${aei}) and governance (GEI ${gei}) are compromised. Immediate action required.`;
    } else if (riskFactors.efficiency) {
      return `System is CRITICAL (SHI ${overall}) due to severe efficiency degradation (AEI ${aei}). Address operational inefficiencies urgently.`;
    } else {
      return `System is CRITICAL (SHI ${overall}) due to governance compliance failures (GEI ${gei}). Enforce controls immediately.`;
    }
  }
}
