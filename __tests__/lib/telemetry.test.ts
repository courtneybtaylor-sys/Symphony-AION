/**
 * Tests for Symphony AION Telemetry Utilities
 * Focus on buildRunViewModel() and supporting functions
 * Tests all 13 event kinds: RUN_STARTED, RUN_COMPLETED, RUN_FAILED, STEP_STARTED, STEP_COMPLETED,
 * STEP_FAILED, MODEL_INVOKED, MODEL_RESPONSE, TOOL_CALLED, TOOL_RESULT, COST_RECORDED,
 * VALIDATION_PASSED, VALIDATION_FAILED
 */

import {
  buildRunViewModel,
  formatDuration,
  formatRelativeTime,
  validateRun,
  validateEvent,
  estimateRunCompletion,
  getEventLatency,
} from '@/lib/telemetry';
import { generateMockRun, generateFailedMockRun } from '@/lib/mock-data';
import {
  Run,
  Event,
  EventKind,
  Status,
  RunViewModel,
} from '@/lib/types';

describe('formatDuration', () => {
  it('should format milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('should format seconds', () => {
    expect(formatDuration(5000)).toBe('5s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(154000)).toBe('2m 34s');
  });

  it('should format hours minutes and seconds', () => {
    expect(formatDuration(3661000)).toBe('1h 1m 1s');
  });

  it('should handle zero duration', () => {
    expect(formatDuration(0)).toBe('0s');
  });
});

describe('formatRelativeTime', () => {
  it('should format "just now" for recent timestamps', () => {
    const now = Date.now();
    const result = formatRelativeTime(now - 5000);
    expect(result).toBe('just now');
  });

  it('should format seconds ago', () => {
    const result = formatRelativeTime(Date.now() - 30000);
    expect(result).toMatch(/\d+s ago/);
  });

  it('should format minutes ago', () => {
    const result = formatRelativeTime(Date.now() - 5 * 60000);
    expect(result).toMatch(/\d+m ago/);
  });

  it('should format hours ago', () => {
    const result = formatRelativeTime(Date.now() - 2 * 60 * 60 * 1000);
    expect(result).toMatch(/\d+h ago/);
  });

  it('should format days ago', () => {
    const result = formatRelativeTime(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(result).toMatch(/\d+d ago/);
  });
});

describe('validateRun', () => {
  it('should validate a correct run', () => {
    const run = generateMockRun();
    expect(validateRun(run)).toBe(true);
  });

  it('should reject null', () => {
    expect(validateRun(null)).toBe(false);
  });

  it('should reject run without id', () => {
    const run = generateMockRun();
    const { id, ...rest } = run;
    expect(validateRun(rest)).toBe(false);
  });

  it('should reject run without name', () => {
    const run = generateMockRun();
    const { name, ...rest } = run;
    expect(validateRun({ ...rest, name: 123 })).toBe(false);
  });

  it('should reject run without startedAt', () => {
    const run = generateMockRun();
    const { startedAt, ...rest } = run;
    expect(validateRun(rest)).toBe(false);
  });
});

describe('validateEvent', () => {
  it('should validate a correct event', () => {
    const run = generateMockRun();
    const event = run.events[0];
    expect(validateEvent(event)).toBe(true);
  });

  it('should reject event without id', () => {
    const event: Partial<Event> = {
      kind: EventKind.RUN_STARTED,
      timestamp: Date.now(),
      runId: 'run-1',
      data: {},
    };
    expect(validateEvent(event)).toBe(false);
  });

  it('should reject event with invalid kind', () => {
    const event = {
      id: 'event-1',
      kind: 'INVALID_KIND',
      timestamp: Date.now(),
      runId: 'run-1',
      data: {},
    };
    expect(validateEvent(event)).toBe(false);
  });
});

describe('buildRunViewModel - Basic Structure', () => {
  it('should build a view model from a completed run', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm).toBeDefined();
    expect(vm.id).toBe(run.id);
    expect(vm.name).toBe(run.name);
    expect(vm.status).toBe(Status.COMPLETED);
  });

  it('should include formatted duration', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.duration).toBeDefined();
    expect(vm.duration.formatted).toBeTruthy();
    expect(vm.duration.ms).toBeGreaterThan(0);
  });

  it('should include start and end times', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.startTime).toBeDefined();
    expect(vm.startTime.iso).toBeTruthy();
    expect(vm.startTime.relative).toBeTruthy();
    expect(vm.endTime).toBeDefined();
    expect(vm.endTime?.iso).toBeTruthy();
  });

  it('should preserve raw data', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.raw.run).toEqual(run);
    expect(vm.raw.events).toEqual(run.events);
  });
});

describe('buildRunViewModel - Event Aggregation (All 13 Event Kinds)', () => {
  it('should count all event kinds', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.events.total).toBeGreaterThan(0);
    expect(vm.events.byKind).toBeDefined();
    // Check that RUN_STARTED and RUN_COMPLETED are present
    expect(vm.events.byKind[EventKind.RUN_STARTED]).toBeGreaterThan(0);
    expect(vm.events.byKind[EventKind.RUN_COMPLETED]).toBeGreaterThan(0);
  });

  it('should count RUN_STARTED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const runStartedCount = run.events.filter((e) => e.kind === EventKind.RUN_STARTED).length;
    expect(vm.events.byKind[EventKind.RUN_STARTED]).toBe(runStartedCount);
  });

  it('should count RUN_COMPLETED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const runCompletedCount = run.events.filter((e) => e.kind === EventKind.RUN_COMPLETED).length;
    expect(vm.events.byKind[EventKind.RUN_COMPLETED]).toBe(runCompletedCount);
  });

  it('should count STEP_STARTED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const stepStartedCount = run.events.filter((e) => e.kind === EventKind.STEP_STARTED).length;
    expect(vm.events.byKind[EventKind.STEP_STARTED]).toBe(stepStartedCount);
  });

  it('should count STEP_COMPLETED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const stepCompletedCount = run.events.filter((e) => e.kind === EventKind.STEP_COMPLETED).length;
    expect(vm.events.byKind[EventKind.STEP_COMPLETED]).toBe(stepCompletedCount);
  });

  it('should count MODEL_INVOKED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const modelInvokedCount = run.events.filter((e) => e.kind === EventKind.MODEL_INVOKED).length;
    expect(vm.events.byKind[EventKind.MODEL_INVOKED]).toBe(modelInvokedCount);
  });

  it('should count MODEL_RESPONSE events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const modelResponseCount = run.events.filter((e) => e.kind === EventKind.MODEL_RESPONSE).length;
    expect(vm.events.byKind[EventKind.MODEL_RESPONSE]).toBe(modelResponseCount);
  });

  it('should count TOOL_CALLED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const toolCalledCount = run.events.filter((e) => e.kind === EventKind.TOOL_CALLED).length;
    expect(vm.events.byKind[EventKind.TOOL_CALLED]).toBe(toolCalledCount);
  });

  it('should count TOOL_RESULT events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const toolResultCount = run.events.filter((e) => e.kind === EventKind.TOOL_RESULT).length;
    expect(vm.events.byKind[EventKind.TOOL_RESULT]).toBe(toolResultCount);
  });

  it('should count COST_RECORDED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const costRecordedCount = run.events.filter((e) => e.kind === EventKind.COST_RECORDED).length;
    expect(vm.events.byKind[EventKind.COST_RECORDED]).toBe(costRecordedCount);
  });

  it('should count VALIDATION_PASSED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);
    const validationPassedCount = run.events.filter((e) => e.kind === EventKind.VALIDATION_PASSED).length;
    expect(vm.events.byKind[EventKind.VALIDATION_PASSED]).toBe(validationPassedCount);
  });

  it('should count VALIDATION_FAILED events in failed runs', () => {
    const run = generateFailedMockRun();
    const vm = buildRunViewModel(run);
    const validationFailedCount = run.events.filter((e) => e.kind === EventKind.VALIDATION_FAILED).length;
    expect(vm.events.byKind[EventKind.VALIDATION_FAILED]).toBe(validationFailedCount);
  });

  it('should count STEP_FAILED events in failed runs', () => {
    const run = generateFailedMockRun();
    const vm = buildRunViewModel(run);
    const stepFailedCount = run.events.filter((e) => e.kind === EventKind.STEP_FAILED).length;
    expect(vm.events.byKind[EventKind.STEP_FAILED]).toBe(stepFailedCount);
  });

  it('should count RUN_FAILED events in failed runs', () => {
    const run = generateFailedMockRun();
    const vm = buildRunViewModel(run);
    const runFailedCount = run.events.filter((e) => e.kind === EventKind.RUN_FAILED).length;
    expect(vm.events.byKind[EventKind.RUN_FAILED]).toBe(runFailedCount);
  });
});

describe('buildRunViewModel - Cost Aggregation', () => {
  it('should aggregate costs from COST_RECORDED events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.costs.total).toBeGreaterThanOrEqual(0);
  });

  it('should break down costs by model', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    if (vm.costs.byModel.length > 0) {
      expect(vm.costs.byModel[0]).toHaveProperty('model');
      expect(vm.costs.byModel[0]).toHaveProperty('provider');
      expect(vm.costs.byModel[0]).toHaveProperty('cost');
      expect(vm.costs.byModel[0]).toHaveProperty('percentage');
    }
  });

  it('should calculate cost percentages correctly', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    if (vm.costs.byModel.length > 0) {
      const totalPercentage = vm.costs.byModel.reduce((sum, m) => sum + m.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    }
  });
});

describe('buildRunViewModel - Token Aggregation', () => {
  it('should aggregate tokens from MODEL events', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.tokens.input).toBeGreaterThanOrEqual(0);
    expect(vm.tokens.output).toBeGreaterThanOrEqual(0);
    expect(vm.tokens.total).toBe(vm.tokens.input + vm.tokens.output);
  });

  it('should break down tokens by model', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    if (vm.tokens.byModel.length > 0) {
      expect(vm.tokens.byModel[0]).toHaveProperty('model');
      expect(vm.tokens.byModel[0]).toHaveProperty('inputTokens');
      expect(vm.tokens.byModel[0]).toHaveProperty('outputTokens');
    }
  });
});

describe('buildRunViewModel - Step Metrics', () => {
  it('should count step statistics', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.steps.total).toBeGreaterThan(0);
    expect(vm.steps.completed).toBeGreaterThanOrEqual(0);
    expect(vm.steps.failed).toBeGreaterThanOrEqual(0);
    expect(vm.steps.pending).toBeGreaterThanOrEqual(0);
  });

  it('should provide step list', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.steps.list).toBeDefined();
    expect(vm.steps.list.length).toBeGreaterThan(0);
  });

  it('should include step details in view model', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    const firstStep = vm.steps.list[0];
    expect(firstStep).toHaveProperty('id');
    expect(firstStep).toHaveProperty('name');
    expect(firstStep).toHaveProperty('status');
    expect(firstStep).toHaveProperty('duration');
    expect(firstStep).toHaveProperty('startTime');
  });
});

describe('buildRunViewModel - Performance Metrics', () => {
  it('should calculate average step duration', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.performance.averageStepDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should identify slowest step', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    if (vm.performance.slowestStep) {
      expect(vm.performance.slowestStep).toHaveProperty('name');
      expect(vm.performance.slowestStep.duration.ms).toBeGreaterThan(0);
    }
  });

  it('should identify fastest step', () => {
    const run = generateMockRun();
    const vm = buildRunViewModel(run);

    if (vm.performance.fastestStep) {
      expect(vm.performance.fastestStep).toHaveProperty('name');
      expect(vm.performance.fastestStep.duration.ms).toBeGreaterThan(0);
    }
  });
});

describe('buildRunViewModel - Error Handling', () => {
  it('should handle failed runs', () => {
    const run = generateFailedMockRun();
    const vm = buildRunViewModel(run);

    expect(vm.error).toBeDefined();
    expect(vm.error?.code).toBeTruthy();
    expect(vm.error?.message).toBeTruthy();
  });

  it('should not include error for successful runs', () => {
    const run = generateMockRun({ status: Status.COMPLETED });
    const vm = buildRunViewModel(run);

    expect(vm.error).toBeUndefined();
  });
});

describe('buildRunViewModel - Edge Cases', () => {
  it('should handle run with no events', () => {
    const run = generateMockRun({ events: [] });
    const vm = buildRunViewModel(run);

    expect(vm.events.total).toBe(0);
    expect(vm.costs.total).toBe(0);
    expect(vm.tokens.total).toBe(0);
  });

  it('should handle run with no steps', () => {
    const run = generateMockRun({ steps: [] });
    const vm = buildRunViewModel(run);

    expect(vm.steps.total).toBe(0);
    expect(vm.steps.list.length).toBe(0);
  });

  it('should handle run with no completion time', () => {
    const run = generateMockRun({ completedAt: undefined });
    const vm = buildRunViewModel(run);

    expect(vm.endTime).toBeUndefined();
  });

  it('should handle run with no duration', () => {
    const run = generateMockRun({ durationMs: 0 });
    const vm = buildRunViewModel(run);

    expect(vm.duration.formatted).toBeTruthy();
    expect(vm.duration.ms).toBe(0);
  });
});

describe('estimateRunCompletion', () => {
  it('should return null for completed runs', () => {
    const run = generateMockRun({ status: Status.COMPLETED });
    expect(estimateRunCompletion(run)).toBeNull();
  });

  it('should estimate completion for running runs', () => {
    const run = generateMockRun({
      status: Status.RUNNING,
      steps: [
        {
          id: 'step-1',
          name: 'Step 1',
          status: Status.COMPLETED,
          startedAt: Date.now() - 5000,
          completedAt: Date.now() - 1000,
          durationMs: 4000,
        },
      ],
    });
    const estimate = estimateRunCompletion(run);
    expect(estimate).toBeGreaterThan(Date.now());
  });
});

describe('getEventLatency', () => {
  it('should calculate latency between two events', () => {
    const now = Date.now();
    const events: Event[] = [
      {
        id: 'e1',
        kind: EventKind.STEP_STARTED,
        timestamp: now,
        runId: 'run-1',
        stepId: 'step-1',
        data: {},
      },
      {
        id: 'e2',
        kind: EventKind.STEP_COMPLETED,
        timestamp: now + 5000,
        runId: 'run-1',
        stepId: 'step-1',
        data: {},
      },
    ];

    const latency = getEventLatency(events, EventKind.STEP_STARTED, EventKind.STEP_COMPLETED, 'step-1');
    expect(latency).toBe(5000);
  });

  it('should return null if events not found', () => {
    const events: Event[] = [];
    const latency = getEventLatency(events, EventKind.STEP_STARTED, EventKind.STEP_COMPLETED);
    expect(latency).toBeNull();
  });
});
