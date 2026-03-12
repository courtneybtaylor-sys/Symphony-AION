/**
 * Run Graph Builder
 * Aggregates events into runs, detects patterns (loops, retries)
 */

import { CanonicalEvent } from './normalizer'

export interface RunNode {
  run_id: string
  steps: CanonicalEvent[]
  totalTokens: number
  totalCost: number
  stepCount: number
  modelCalls: number
  toolCalls: number
  failedSteps: number
  startTime?: string
  endTime?: string
  parentChildMap: Map<string, string[]>
}

export interface LoopPattern {
  run_id: string
  repeated_step: string
  count: number
  tokens_wasted: number
}

export interface RunGraph {
  runs: Map<string, RunNode>
  totalEvents: number
  detectedLoops: LoopPattern[]
  retryCount: number
}

/**
 * Build run graph from canonical events
 * Detects loops (step prefix appearing 3+ times) and retries
 */
export function buildRunGraph(events: CanonicalEvent[]): RunGraph {
  const runs = new Map<string, RunNode>()
  const detectedLoops: LoopPattern[] = []
  let retryCount = 0

  // Group events by run_id
  for (const event of events) {
    if (!runs.has(event.run_id)) {
      runs.set(event.run_id, {
        run_id: event.run_id,
        steps: [],
        totalTokens: 0,
        totalCost: 0,
        stepCount: 0,
        modelCalls: 0,
        toolCalls: 0,
        failedSteps: 0,
        parentChildMap: new Map(),
      })
    }

    const run = runs.get(event.run_id)!
    run.steps.push(event)
    run.stepCount += 1
    run.totalTokens += (event.tokens_input || 0) + (event.tokens_output || 0)
    run.totalCost += event.cost_usd || 0

    if (event.event_kind === 'llm_call') run.modelCalls += 1
    if (event.event_kind === 'tool_call') run.toolCalls += 1
    if (event.status === 'failed') run.failedSteps += 1
    if (event.error_type) retryCount += 1

    // Set start/end times
    if (!run.startTime || event.timestamp < run.startTime) {
      run.startTime = event.timestamp
    }
    if (!run.endTime || event.timestamp > run.endTime) {
      run.endTime = event.timestamp
    }
  }

  // Detect loop patterns (step_id prefix appearing 3+ times)
  for (const [runId, run] of runs) {
    const stepPrefixCount = new Map<string, number>()

    for (const step of run.steps) {
      // Extract prefix (everything before last dash and number)
      const match = step.step_id.match(/^(.+?)(?:-\d+)?$/)
      const prefix = match ? match[1] : step.step_id

      stepPrefixCount.set(prefix, (stepPrefixCount.get(prefix) || 0) + 1)
    }

    // Report loops (3+ repetitions)
    for (const [prefix, count] of stepPrefixCount) {
      if (count >= 3) {
        // Calculate tokens wasted in loop
        const loopSteps = run.steps.filter((s) => s.step_id.startsWith(prefix))
        const tokensWasted = loopSteps.reduce((sum: number, s: CanonicalEvent) => sum + (s.tokens_input || 0) + (s.tokens_output || 0), 0)

        detectedLoops.push({
          run_id: runId,
          repeated_step: prefix,
          count,
          tokens_wasted: tokensWasted,
        })
      }
    }
  }

  return {
    runs,
    totalEvents: events.length,
    detectedLoops,
    retryCount,
  }
}
