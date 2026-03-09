/**
 * Framework Telemetry Adapters
 * Normalizes telemetry from different AI frameworks into canonical Run format
 * Supports: LangChain, LlamaIndex, AutoGen, Haystack, and generic JSON
 */

import { Run, Event, EventKind, Status } from './types';

export type FrameworkType = 'langchain' | 'llamaindex' | 'autogen' | 'haystack' | 'generic';

export interface FrameworkDetectionResult {
  framework: FrameworkType;
  confidence: number; // 0-1
}

/**
 * Detect which framework the telemetry came from
 */
export function detectFramework(telemetry: any): FrameworkDetectionResult {
  // LangChain detection
  if (telemetry?.metadata?.source === 'langsmith' ||
      telemetry?.session_id ||
      (Array.isArray(telemetry?.runs) && telemetry.runs[0]?.execution_order !== undefined)) {
    return { framework: 'langchain', confidence: 0.95 };
  }

  // LlamaIndex detection
  if (telemetry?.metadata?.framework === 'llamaindex' ||
      telemetry?.debug_events ||
      (Array.isArray(telemetry?.events) && telemetry.events.some((e: any) => e.event_type === 'node_start'))) {
    return { framework: 'llamaindex', confidence: 0.9 };
  }

  // AutoGen detection
  if (telemetry?.messages && Array.isArray(telemetry.messages) &&
      telemetry.messages.some((m: any) => m.role === 'assistant' || m.role === 'user')) {
    return { framework: 'autogen', confidence: 0.85 };
  }

  // Haystack detection
  if (telemetry?.meta?.source === 'haystack' ||
      telemetry?.pipeline_definition ||
      (Array.isArray(telemetry?.runs) && telemetry.runs[0]?.pipeline_name !== undefined)) {
    return { framework: 'haystack', confidence: 0.9 };
  }

  // Canonical format detection
  if (telemetry?.events && Array.isArray(telemetry.events) &&
      telemetry.events.some((e: any) => Object.values(EventKind).includes(e.kind))) {
    return { framework: 'generic', confidence: 1.0 };
  }

  return { framework: 'generic', confidence: 0.5 };
}

/**
 * Adapt LangChain telemetry to canonical format
 */
function adaptLangChain(telemetry: any): Run {
  const run = telemetry.runs?.[0] || telemetry;
  const events: Event[] = [];
  const startTime = new Date(run.start_time || Date.now()).getTime();

  // Map execution events
  if (Array.isArray(run.child_runs)) {
    run.child_runs.forEach((childRun: any, idx: number) => {
      const duration = childRun.end_time && childRun.start_time
        ? new Date(childRun.end_time).getTime() - new Date(childRun.start_time).getTime()
        : 0;

      if (childRun.run_type === 'llm') {
        events.push({
          id: `event-${idx}`,
          kind: EventKind.MODEL_INVOKED,
          timestamp: new Date(childRun.start_time || Date.now()).getTime(),
          runId: run.id || 'run-1',
          data: {
            model: childRun.serialized?.model_name || childRun.model_name || 'unknown',
            provider: extractProvider(childRun.serialized?.model_name),
            inputTokens: childRun.outputs?.llm_output?.token_usage?.prompt_tokens || 0,
            outputTokens: childRun.outputs?.llm_output?.token_usage?.completion_tokens || 0,
            cost_usd: estimateLLMCost(
              childRun.serialized?.model_name || 'gpt-3.5-turbo',
              childRun.outputs?.llm_output?.token_usage?.prompt_tokens || 0,
              childRun.outputs?.llm_output?.token_usage?.completion_tokens || 0
            ),
            latencyMs: duration,
          },
          metadata: { environment: 'langchain' },
        });
      }
    });
  }

  return {
    id: run.id || 'run-1',
    name: 'LangChain Telemetry',
    status: run.error ? Status.FAILED : Status.COMPLETED,
    startedAt: startTime,
    completedAt: startTime + 1000,
    durationMs: 1000,
    events,
    steps: [],
    metadata: { tags: ['langchain'] },
  };
}

/**
 * Adapt LlamaIndex telemetry to canonical format
 */
function adaptLlamaIndex(telemetry: any): Run {
  const run = telemetry.runs?.[0] || telemetry;
  const events: Event[] = [];
  const startTime = Date.now();

  if (Array.isArray(telemetry.debug_events)) {
    telemetry.debug_events.forEach((event: any, idx: number) => {
      if (event.event_type === 'llm_start') {
        events.push({
          id: `event-${idx}`,
          kind: EventKind.MODEL_INVOKED,
          timestamp: Date.now(),
          runId: run.id || 'run-1',
          data: {
            model: event.model || 'unknown',
            provider: extractProvider(event.model),
            inputTokens: event.prompt_tokens || 0,
            outputTokens: event.completion_tokens || 0,
            cost_usd: estimateLLMCost(event.model, event.prompt_tokens || 0, event.completion_tokens || 0),
            latencyMs: event.duration_ms || 0,
          },
          metadata: { environment: 'llamaindex' },
        });
      }
    });
  }

  return {
    id: run.id || 'run-1',
    name: 'LlamaIndex Telemetry',
    status: Status.COMPLETED,
    startedAt: startTime,
    completedAt: startTime + 1000,
    durationMs: 1000,
    events,
    steps: [],
    metadata: { tags: ['llamaindex'] },
  };
}

/**
 * Adapt AutoGen telemetry to canonical format
 */
function adaptAutoGen(telemetry: any): Run {
  const events: Event[] = [];
  const startTime = Date.now();
  let modelCount = 0;

  if (Array.isArray(telemetry.messages)) {
    const groupedByModel = new Map<string, any>();

    telemetry.messages.forEach((msg: any) => {
      if (msg.role === 'assistant' && msg.function_call) {
        const model = msg.model || 'gpt-4';
        groupedByModel.set(model, (groupedByModel.get(model) || 0) + 1);
      }
    });

    groupedByModel.forEach((count, model) => {
      events.push({
        id: `event-${modelCount++}`,
        kind: EventKind.MODEL_INVOKED,
        timestamp: startTime,
        runId: telemetry.run_id || 'run-1',
        data: {
          model,
          provider: extractProvider(model),
          inputTokens: Math.ceil(telemetry.total_tokens?.input || 0 / groupedByModel.size),
          outputTokens: Math.ceil(telemetry.total_tokens?.output || 0 / groupedByModel.size),
          cost_usd: estimateLLMCost(model, telemetry.total_tokens?.input || 0, telemetry.total_tokens?.output || 0),
          latencyMs: telemetry.elapsed_time_ms || 0,
        },
        metadata: { environment: 'autogen' },
      });
    });
  }

  return {
    id: telemetry.run_id || 'run-1',
    name: 'AutoGen Telemetry',
    status: Status.COMPLETED,
    startedAt: startTime,
    completedAt: startTime + (telemetry.elapsed_time_ms || 1000),
    durationMs: telemetry.elapsed_time_ms || 1000,
    events,
    steps: [],
    metadata: { tags: ['autogen'] },
  };
}

/**
 * Adapt Haystack telemetry to canonical format
 */
function adaptHaystack(telemetry: any): Run {
  const run = telemetry.runs?.[0] || telemetry;
  const events: Event[] = [];
  const startTime = new Date(run.start_time || Date.now()).getTime();

  if (run.trace && Array.isArray(run.trace)) {
    run.trace.forEach((step: any, idx: number) => {
      if (step.type === 'llm' && step.input?.prompt) {
        const modelName = step.model || 'unknown';
        events.push({
          id: `event-${idx}`,
          kind: EventKind.MODEL_INVOKED,
          timestamp: new Date(step.start_time || Date.now()).getTime(),
          runId: run.id || 'run-1',
          data: {
            model: modelName,
            provider: extractProvider(modelName),
            inputTokens: step.metrics?.input_tokens || 0,
            outputTokens: step.metrics?.output_tokens || 0,
            cost_usd: estimateLLMCost(modelName, step.metrics?.input_tokens || 0, step.metrics?.output_tokens || 0),
            latencyMs: step.metrics?.latency_ms || 0,
          },
          metadata: { environment: 'haystack' },
        });
      }
    });
  }

  return {
    id: run.id || 'run-1',
    name: 'Haystack Telemetry',
    status: run.error ? Status.FAILED : Status.COMPLETED,
    startedAt: startTime,
    completedAt: startTime + 1000,
    durationMs: 1000,
    events,
    steps: [],
    metadata: { tags: ['haystack'] },
  };
}

/**
 * Extract provider from model name
 */
function extractProvider(modelName: string | undefined): string {
  if (!modelName) return 'unknown';
  const lower = modelName.toLowerCase();
  if (lower.includes('gpt') || lower.includes('openai')) return 'openai';
  if (lower.includes('claude')) return 'anthropic';
  if (lower.includes('palm') || lower.includes('gemini')) return 'google';
  if (lower.includes('llama')) return 'meta';
  if (lower.includes('mistral')) return 'mistral';
  if (lower.includes('cohere')) return 'cohere';
  return 'unknown';
}

/**
 * Estimate LLM cost based on model and token counts
 * Uses approximate pricing as of 2024
 */
function estimateLLMCost(model: string | undefined, inputTokens: number, outputTokens: number): number {
  if (!model) return 0;
  const lower = (model || '').toLowerCase();

  // OpenAI pricing
  if (lower.includes('gpt-4-turbo')) return (inputTokens * 0.00001 + outputTokens * 0.00003);
  if (lower.includes('gpt-4')) return (inputTokens * 0.00003 + outputTokens * 0.00006);
  if (lower.includes('gpt-3.5')) return (inputTokens * 0.0000005 + outputTokens * 0.0000015);

  // Anthropic Claude pricing
  if (lower.includes('claude-3-opus')) return (inputTokens * 0.000015 + outputTokens * 0.000075);
  if (lower.includes('claude-3-sonnet')) return (inputTokens * 0.000003 + outputTokens * 0.000015);
  if (lower.includes('claude-3-haiku')) return (inputTokens * 0.00000025 + outputTokens * 0.00000125);

  // Google Gemini pricing
  if (lower.includes('gemini-pro')) return (inputTokens * 0.0000005 + outputTokens * 0.0000015);

  // Fallback: estimate at ~$0.001 per 1K tokens
  return ((inputTokens + outputTokens) * 0.000001);
}

/**
 * Normalize any telemetry format to canonical Run
 */
export function normalizeFrameworkTelemetry(telemetry: any): Run {
  const detection = detectFramework(telemetry);

  switch (detection.framework) {
    case 'langchain':
      return adaptLangChain(telemetry);
    case 'llamaindex':
      return adaptLlamaIndex(telemetry);
    case 'autogen':
      return adaptAutoGen(telemetry);
    case 'haystack':
      return adaptHaystack(telemetry);
    case 'generic':
    default:
      // Already in canonical format or unknown
      return telemetry as Run;
  }
}
