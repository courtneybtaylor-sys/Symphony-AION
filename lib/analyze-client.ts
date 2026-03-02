/**
 * Client utility for calling the /api/analyze endpoint
 * Provides type-safe interface to IR-Parser analysis
 */

import { IRAnalysis, IRParserResponse } from '@/lib/ir-parser-client';

export interface AnalyzeRequest {
  telemetry: Record<string, any>;
  workflowId: string;
  modelProviders?: string[];
  code?: string;
}

export interface AnalyzeResponse extends IRParserResponse {
  latencyMs?: number;
}

/**
 * Analyze telemetry data via backend IR-Parser
 */
export async function analyzeWorkflow(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Analysis failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AnalyzeClient] Request failed:', message);
    throw error;
  }
}

/**
 * Check IR-Parser backend health
 */
export async function checkAnalyzeHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'GET',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Extract actionable recommendations from IR analysis
 */
export function extractRecommendations(analysis: IRAnalysis): Array<{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings: string;
}> {
  const recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedSavings: string;
  }> = [];

  // Parallelization opportunities
  if (analysis.parallelizationOpportunities && analysis.parallelizationOpportunities.length > 0) {
    recommendations.push({
      title: 'Parallelize Workflow Steps',
      description: `${analysis.parallelizationOpportunities.length} steps can be executed in parallel: ${analysis.parallelizationOpportunities.slice(0, 3).join(', ')}${analysis.parallelizationOpportunities.length > 3 ? ` and ${analysis.parallelizationOpportunities.length - 3} more` : ''}`,
      priority: 'high',
      estimatedSavings: '20-40%',
    });
  }

  // Redundant operations
  if (analysis.redundantOperations && analysis.redundantOperations.length > 0) {
    const totalRedundant = analysis.redundantOperations.reduce((sum, op) => sum + op.occurrences, 0);
    recommendations.push({
      title: 'Eliminate Redundant Operations',
      description: `Found ${totalRedundant} redundant operations that can be consolidated for efficiency gains`,
      priority: 'high',
      estimatedSavings: '15-30%',
    });
  }

  // Memory hotspots
  if (analysis.memoryHotspots && analysis.memoryHotspots.length > 0) {
    recommendations.push({
      title: 'Optimize Memory Usage',
      description: `${analysis.memoryHotspots.length} memory hotspots identified. ${analysis.memoryHotspots[0].recommendation}`,
      priority: 'medium',
      estimatedSavings: '10-20%',
    });
  }

  // Complexity reduction
  if (analysis.workflowComplexity === 'very_high') {
    recommendations.push({
      title: 'Reduce Workflow Complexity',
      description: 'Break down this workflow into smaller, more focused components for better performance and maintainability',
      priority: 'medium',
      estimatedSavings: '10-25%',
    });
  }

  // Critical path optimization
  if (analysis.criticalPaths && analysis.criticalPaths.length > 0) {
    recommendations.push({
      title: 'Optimize Critical Execution Paths',
      description: `Focus optimization efforts on ${analysis.criticalPaths.length} critical path(s) for maximum impact: ${analysis.criticalPaths.join(', ')}`,
      priority: 'high',
      estimatedSavings: '25-50%',
    });
  }

  return recommendations;
}
