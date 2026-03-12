/**
 * Main Ingestion Processor
 * Orchestrates format detection, normalization, and run graph building
 */

import { detectFormat, type IngestionFormat } from './format-detector'
import { normalizeToCanonical, type CanonicalEvent } from './normalizer'
import { buildRunGraph, type RunGraph } from './run-graph'

export interface IngestionResult {
  ingestionId: string
  format: IngestionFormat
  events: CanonicalEvent[]
  runGraph: RunGraph
  normalizedCount: number
  runCount: number
  error?: string
}

/**
 * Main ingestion processor
 * Detects format → Normalizes → Builds run graph
 */
export async function processIngestion(rawData: unknown, ingestionId: string): Promise<IngestionResult> {
  try {
    // Step 1: Detect format
    const format = detectFormat(rawData)

    // Step 2: Normalize to canonical events
    const events = normalizeToCanonical(rawData, format)

    if (events.length === 0) {
      return {
        ingestionId,
        format,
        events: [],
        runGraph: { runs: new Map(), totalEvents: 0, detectedLoops: [], retryCount: 0 },
        normalizedCount: 0,
        runCount: 0,
        error: 'No events extracted from input data',
      }
    }

    // Step 3: Build run graph
    const runGraph = buildRunGraph(events)

    return {
      ingestionId,
      format,
      events,
      runGraph,
      normalizedCount: events.length,
      runCount: runGraph.runs.size,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      ingestionId,
      format: 'generic',
      events: [],
      runGraph: { runs: new Map(), totalEvents: 0, detectedLoops: [], retryCount: 0 },
      normalizedCount: 0,
      runCount: 0,
      error: `Ingestion processing failed: ${errorMsg}`,
    }
  }
}

/**
 * Validate ingestion result
 */
export function validateIngestionResult(result: IngestionResult): { valid: boolean; error?: string } {
  if (result.error) {
    return { valid: false, error: result.error }
  }

  if (result.normalizedCount === 0) {
    return { valid: false, error: 'No events were processed' }
  }

  if (result.runCount === 0) {
    return { valid: false, error: 'No runs were created' }
  }

  return { valid: true }
}
