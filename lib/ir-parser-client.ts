/**
 * IR-Parser Microservice Client
 * Task 7: Integration with IR-Parser for deeper code analysis
 * Provides intermediate representation analysis for optimization recommendations
 */

export interface IRParserRequest {
  workflowId: string
  code?: string
  telemetry: Record<string, any>
  modelProviders: string[]
}

export interface IRAnalysis {
  workflowComplexity: 'low' | 'medium' | 'high' | 'very_high'
  criticalPaths: string[]
  parallelizationOpportunities: string[]
  redundantOperations: Array<{
    operation: string
    occurrences: number
    estimatedSavings: string // e.g., "5-15%"
  }>
  memoryHotspots: Array<{
    location: string
    estimatedUsage: string
    recommendation: string
  }>
}

export interface IRParserResponse {
  success: boolean
  workflowId: string
  analysis?: IRAnalysis
  error?: string
  latencyMs?: number
}

/**
 * Get IR-Parser microservice URL from environment
 */
function getIRParserUrl(): string | null {
  return process.env.IR_PARSER_URL || null
}

/**
 * Send telemetry to IR-Parser for analysis
 * Returns IR analysis or null if service unavailable
 */
export async function analyzeWithIRParser(request: IRParserRequest): Promise<IRAnalysis | null> {
  const irParserUrl = getIRParserUrl()

  if (!irParserUrl) {
    console.log('[IR-Parser] Service not configured (IR_PARSER_URL not set)')
    return null
  }

  try {
    const startTime = Date.now()

    const response = await fetch(`${irParserUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Symphony-AION/1.0',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      console.warn(
        `[IR-Parser] Service returned ${response.status}: ${response.statusText} (latency: ${latencyMs}ms)`
      )
      return null
    }

    const data = (await response.json()) as IRParserResponse

    if (data.success && data.analysis) {
      console.log(`[IR-Parser] ✓ Analysis complete for ${request.workflowId} (${latencyMs}ms)`)
      return data.analysis
    } else {
      console.warn(`[IR-Parser] Analysis failed: ${data.error}`)
      return null
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[IR-Parser] Request failed: ${message}`)
    return null
  }
}

/**
 * Health check for IR-Parser service
 * Returns true if service is available
 */
export async function checkIRParserHealth(): Promise<boolean> {
  const irParserUrl = getIRParserUrl()

  if (!irParserUrl) {
    return false
  }

  try {
    const response = await fetch(`${irParserUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Extract IR insights from analysis and generate additional recommendations
 */
export function generateIRRecommendations(analysis: IRAnalysis): Array<{
  title: string
  finding: string
  category: string
  priority: 'high' | 'medium' | 'low'
  projectedSavings: {
    costUSDMonthly100Runs: number
  }
}> {
  const recommendations: Array<{
    title: string
    finding: string
    category: string
    priority: 'high' | 'medium' | 'low'
    projectedSavings: {
      costUSDMonthly100Runs: number
    }
  }> = []

  // Workflow complexity recommendations
  if (analysis.workflowComplexity === 'very_high') {
    recommendations.push({
      title: 'Reduce Workflow Complexity',
      finding: `Workflow has very high complexity. Consider breaking into smaller, simpler workflows to improve maintainability and performance.`,
      category: 'architecture',
      priority: 'high',
      projectedSavings: {
        costUSDMonthly100Runs: 50,
      },
    })
  }

  // Parallelization opportunities
  if (analysis.parallelizationOpportunities.length > 0) {
    recommendations.push({
      title: `Parallelize ${analysis.parallelizationOpportunities.length} Operations`,
      finding: `Found ${analysis.parallelizationOpportunities.length} steps that can be parallelized: ${analysis.parallelizationOpportunities.slice(0, 3).join(', ')}${analysis.parallelizationOpportunities.length > 3 ? ` and ${analysis.parallelizationOpportunities.length - 3} more` : ''}. Parallel execution reduces latency and cost.`,
      category: 'optimization',
      priority: 'high',
      projectedSavings: {
        costUSDMonthly100Runs: 150,
      },
    })
  }

  // Redundant operations
  if (analysis.redundantOperations.length > 0) {
    const totalRedundant = analysis.redundantOperations.reduce((sum, op) => sum + op.occurrences, 0)
    const avgSavings =
      analysis.redundantOperations.reduce((sum, op) => {
        const parsed = parseInt(op.estimatedSavings, 10) || 5
        return sum + parsed
      }, 0) / analysis.redundantOperations.length

    recommendations.push({
      title: `Eliminate ${totalRedundant} Redundant Operations`,
      finding: `Detected ${totalRedundant} redundant operations across workflow. Eliminating duplicates can reduce costs by ~${Math.round(avgSavings)}% and improve performance.`,
      category: 'code-optimization',
      priority: 'high',
      projectedSavings: {
        costUSDMonthly100Runs: Math.round((avgSavings / 100) * 250),
      },
    })
  }

  // Memory hotspots
  if (analysis.memoryHotspots.length > 0) {
    recommendations.push({
      title: `Optimize Memory Usage in ${analysis.memoryHotspots.length} Areas`,
      finding: `Found memory hotspots in: ${analysis.memoryHotspots.map((h) => h.location).join(', ')}. Optimizing memory can reduce processing time and costs.`,
      category: 'performance',
      priority: 'medium',
      projectedSavings: {
        costUSDMonthly100Runs: Math.round(50 + analysis.memoryHotspots.length * 10),
      },
    })
  }

  // Critical path optimization
  if (analysis.criticalPaths.length > 0) {
    recommendations.push({
      title: `Optimize ${analysis.criticalPaths.length} Critical Path(s)`,
      finding: `Identified ${analysis.criticalPaths.length} critical execution path(s). Optimizing these areas has the highest impact on cost and latency.`,
      category: 'critical-path',
      priority: 'high',
      projectedSavings: {
        costUSDMonthly100Runs: 200,
      },
    })
  }

  return recommendations
}
