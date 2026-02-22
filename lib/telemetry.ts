/**
 * Symphony AION Telemetry Utilities
 * Core functions for transforming raw run data into UI view models
 */

import {
  Run,
  Event,
  EventKind,
  RunViewModel,
  StepViewModel,
  Status,
} from './types';

/**
 * Format milliseconds to a human-readable duration string
 * e.g., "2m 34s", "5h 12m", "342ms"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Format a timestamp relative to now
 * e.g., "2 hours ago", "30 minutes ago", "just now"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 10) {
    return 'just now';
  }
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Count events by kind
 */
function countEventsByKind(events: Event[]): Record<EventKind, number> {
  const counts: Partial<Record<EventKind, number>> = {};

  for (const event of events) {
    counts[event.kind] = (counts[event.kind] || 0) + 1;
  }

  // Ensure all EventKind values are present with at least 0 count
  const allKinds = Object.values(EventKind);
  const result: Record<EventKind, number> = {} as Record<EventKind, number>;
  for (const kind of allKinds) {
    result[kind] = counts[kind as EventKind] || 0;
  }

  return result;
}

/**
 * Extract model-specific costs from events
 */
function extractModelCosts(events: Event[]): Array<{
  model: string;
  provider: string;
  cost: number;
}> {
  const modelCosts: Map<string, { model: string; provider: string; cost: number }> = new Map();

  for (const event of events) {
    if (event.kind === EventKind.COST_RECORDED && event.data) {
      const model = event.data.model as string;
      const cost = (event.data.costUSD as number) || 0;
      const provider = event.data.provider as string;

      if (model) {
        const key = `${provider || 'unknown'}:${model}`;
        const existing = modelCosts.get(key);
        modelCosts.set(key, {
          model,
          provider: provider || 'unknown',
          cost: (existing?.cost || 0) + cost,
        });
      }
    }
  }

  return Array.from(modelCosts.values());
}

/**
 * Extract token usage from events
 */
function extractTokenUsage(events: Event[]): {
  totalInput: number;
  totalOutput: number;
  byModel: Array<{ model: string; inputTokens: number; outputTokens: number }>;
} {
  let totalInput = 0;
  let totalOutput = 0;
  const modelTokens: Map<
    string,
    { model: string; inputTokens: number; outputTokens: number }
  > = new Map();

  for (const event of events) {
    if (event.kind === EventKind.MODEL_RESPONSE && event.data) {
      const model = event.data.model as string;
      const outputTokens = (event.data.outputTokens as number) || 0;

      totalOutput += outputTokens;

      if (model) {
        const existing = modelTokens.get(model);
        modelTokens.set(model, {
          model,
          inputTokens: (existing?.inputTokens || 0),
          outputTokens: (existing?.outputTokens || 0) + outputTokens,
        });
      }
    }

    if (event.kind === EventKind.MODEL_INVOKED && event.data) {
      const model = event.data.model as string;
      const inputTokens = (event.data.inputTokens as number) || 0;

      totalInput += inputTokens;

      if (model) {
        const existing = modelTokens.get(model);
        modelTokens.set(model, {
          model,
          inputTokens: (existing?.inputTokens || 0) + inputTokens,
          outputTokens: (existing?.outputTokens || 0),
        });
      }
    }
  }

  return {
    totalInput,
    totalOutput,
    byModel: Array.from(modelTokens.values()),
  };
}

/**
 * Build a step view model from run step data
 */
function buildStepViewModel(step: Run['steps'][0]): StepViewModel {
  return {
    id: step.id,
    name: step.name,
    status: step.status,
    duration: {
      formatted: formatDuration(step.durationMs || 0),
      ms: step.durationMs || 0,
    },
    startTime: {
      iso: new Date(step.startedAt).toISOString(),
      relative: formatRelativeTime(step.startedAt),
    },
    endTime: step.completedAt
      ? {
          iso: new Date(step.completedAt).toISOString(),
          relative: formatRelativeTime(step.completedAt),
        }
      : undefined,
    input: step.input,
    output: step.output,
    error: step.error,
  };
}

/**
 * Primary function: Transform a Run into a RunViewModel
 * Handles all 13 event kinds and aggregates data for display
 */
export function buildRunViewModel(run: Run): RunViewModel {
  const events = run.events || [];
  const steps = run.steps || [];

  // Count event kinds
  const eventCounts = countEventsByKind(events);

  // Extract costs
  const modelCosts = extractModelCosts(events);
  const totalCost = modelCosts.reduce((sum, m) => sum + m.cost, 0);
  const costByModel = modelCosts
    .map((m) => ({
      model: m.model,
      provider: m.provider,
      cost: m.cost,
      percentage: totalCost > 0 ? (m.cost / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Extract token usage
  const tokenUsage = extractTokenUsage(events);

  // Build step view models
  const stepViewModels = steps.map(buildStepViewModel);

  // Calculate step statistics
  const completedSteps = steps.filter((s) => s.status === Status.COMPLETED).length;
  const failedSteps = steps.filter((s) => s.status === Status.FAILED).length;
  const pendingSteps = steps.filter(
    (s) => s.status === Status.PENDING || s.status === Status.RUNNING,
  ).length;

  // Calculate performance metrics
  const completedStepDurations = stepViewModels
    .filter((s) => s.status === Status.COMPLETED)
    .map((s) => s.duration.ms);
  const averageStepDurationMs =
    completedStepDurations.length > 0
      ? completedStepDurations.reduce((a, b) => a + b, 0) / completedStepDurations.length
      : 0;

  const slowestStep = stepViewModels.reduce((prev, current) =>
    (current.duration.ms || 0) > (prev.duration.ms || 0) ? current : prev,
  );

  const fastestStep = stepViewModels.reduce((prev, current) =>
    (current.duration.ms || 0) < (prev.duration.ms || 0) ? current : prev,
  );

  // Extract error if run failed
  const error = run.error
    ? {
        code: run.error.code,
        message: run.error.message,
        failedStepId: steps.find((s) => s.status === Status.FAILED)?.id,
      }
    : undefined;

  return {
    id: run.id,
    name: run.name,
    status: run.status,

    duration: {
      formatted: formatDuration(run.durationMs || 0),
      ms: run.durationMs || 0,
    },

    startTime: {
      iso: new Date(run.startedAt).toISOString(),
      relative: formatRelativeTime(run.startedAt),
    },

    endTime: run.completedAt
      ? {
          iso: new Date(run.completedAt).toISOString(),
          relative: formatRelativeTime(run.completedAt),
        }
      : undefined,

    steps: {
      total: steps.length,
      completed: completedSteps,
      failed: failedSteps,
      pending: pendingSteps,
      list: stepViewModels,
    },

    costs: {
      total: totalCost,
      byModel: costByModel,
    },

    tokens: {
      input: tokenUsage.totalInput,
      output: tokenUsage.totalOutput,
      total: tokenUsage.totalInput + tokenUsage.totalOutput,
      byModel: tokenUsage.byModel,
    },

    events: {
      total: events.length,
      byKind: eventCounts,
    },

    performance: {
      averageStepDurationMs,
      slowestStep: slowestStep.duration.ms > 0 ? slowestStep : undefined,
      fastestStep: fastestStep.duration.ms > 0 ? fastestStep : undefined,
    },

    error,

    raw: {
      run,
      events,
    },
  };
}

/**
 * Build view models for multiple runs
 */
export function buildRunViewModels(runs: Run[]): RunViewModel[] {
  return runs.map(buildRunViewModel);
}

/**
 * Validate that a Run has all required fields
 */
export function validateRun(run: unknown): run is Run {
  if (!run || typeof run !== 'object') return false;

  const r = run as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.startedAt === 'number' &&
    (typeof r.status === 'string' ||
      Object.values(Status).includes(r.status as Status))
  );
}

/**
 * Validate that an Event has all required fields
 */
export function validateEvent(event: unknown): event is Event {
  if (!event || typeof event !== 'object') return false;

  const e = event as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.kind === 'string' &&
    typeof e.timestamp === 'number' &&
    typeof e.runId === 'string' &&
    Object.values(EventKind).includes(e.kind as EventKind)
  );
}

/**
 * Calculate estimated run completion time given partial run
 */
export function estimateRunCompletion(run: Run): number | null {
  if (run.status !== Status.RUNNING) {
    return null;
  }

  if (!run.steps || run.steps.length === 0) {
    return null;
  }

  const completedSteps = run.steps.filter((s) => s.status === Status.COMPLETED);
  if (completedSteps.length === 0) {
    return null;
  }

  const avgDuration =
    completedSteps.reduce((sum, s) => sum + (s.durationMs || 0), 0) / completedSteps.length;
  const remainingSteps = run.steps.length - completedSteps.length;
  const estimatedMs = avgDuration * remainingSteps;

  return Date.now() + estimatedMs;
}

/**
 * Get the duration of a specific event
 */
export function getEventLatency(
  events: Event[],
  startKind: EventKind,
  endKind: EventKind,
  stepId?: string,
): number | null {
  const startEvent = events.find(
    (e) => e.kind === startKind && (!stepId || e.stepId === stepId),
  );
  const endEvent = events.find(
    (e) => e.kind === endKind && (!stepId || e.stepId === stepId),
  );

  if (startEvent && endEvent && startEvent.timestamp < endEvent.timestamp) {
    return endEvent.timestamp - startEvent.timestamp;
  }

  return null;
}
