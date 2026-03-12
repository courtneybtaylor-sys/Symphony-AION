/**
 * Run Graph Tests
 * Tests for lib/ingestion/run-graph.ts
 */

import { buildRunGraph, type CanonicalEvent } from '../../../lib/ingestion/run-graph';

describe('Run Graph', () => {
  const createEvent = (overrides: Partial<CanonicalEvent> = {}): CanonicalEvent => ({
    run_id: 'run-1',
    step_id: 'step-1',
    event_kind: 'llm_call',
    provider: 'openai',
    model: 'gpt-4',
    tokens_input: 100,
    tokens_output: 50,
    cost_usd: 0.005,
    status: 'success',
    duration_ms: 1000,
    error_type: undefined,
    metadata: {},
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  describe('buildRunGraph', () => {
    it('should group events by run_id', () => {
      const events: CanonicalEvent[] = [
        createEvent({ run_id: 'run-1', step_id: 'step-1' }),
        createEvent({ run_id: 'run-1', step_id: 'step-2' }),
        createEvent({ run_id: 'run-2', step_id: 'step-1' }),
      ];

      const result = buildRunGraph(events);
      expect(result.runs.size).toBe(2);
      expect(result.runs.has('run-1')).toBe(true);
      expect(result.runs.has('run-2')).toBe(true);
    });

    it('should aggregate tokens and costs by run', () => {
      const events: CanonicalEvent[] = [
        createEvent({ run_id: 'run-1', tokens_input: 100, tokens_output: 50, cost_usd: 0.005 }),
        createEvent({ run_id: 'run-1', tokens_input: 200, tokens_output: 100, cost_usd: 0.01 }),
      ];

      const result = buildRunGraph(events);
      const run = result.runs.get('run-1');
      expect(run?.totalTokens).toBe(450);
      expect(run?.totalCost).toBe(0.015);
    });

    it('should count model calls', () => {
      const events: CanonicalEvent[] = [
        createEvent({ run_id: 'run-1', event_kind: 'llm_call' }),
        createEvent({ run_id: 'run-1', event_kind: 'llm_call' }),
        createEvent({ run_id: 'run-1', event_kind: 'tool_call' }),
      ];

      const result = buildRunGraph(events);
      const run = result.runs.get('run-1');
      expect(run?.modelCallCount).toBe(2);
    });

    it('should detect loop patterns (3+ occurrences of same step prefix)', () => {
      const events: CanonicalEvent[] = [
        createEvent({ run_id: 'run-1', step_id: 'retry_0' }),
        createEvent({ run_id: 'run-1', step_id: 'retry_1' }),
        createEvent({ run_id: 'run-1', step_id: 'retry_2' }),
      ];

      const result = buildRunGraph(events);
      expect(result.detectedLoops.length).toBeGreaterThan(0);
      expect(result.detectedLoops.some((l) => l.pattern === 'retry')).toBe(true);
    });

    it('should not flag loop for 2 occurrences (threshold is 3+)', () => {
      const events: CanonicalEvent[] = [
        createEvent({ run_id: 'run-1', step_id: 'validate_0' }),
        createEvent({ run_id: 'run-1', step_id: 'validate_1' }),
      ];

      const result = buildRunGraph(events);
      const hasValidateLoop = result.detectedLoops.some((l) => l.pattern === 'validate');
      expect(hasValidateLoop).toBe(false);
    });

    it('should track provider distribution', () => {
      const events: CanonicalEvent[] = [
        createEvent({ run_id: 'run-1', provider: 'openai' }),
        createEvent({ run_id: 'run-1', provider: 'openai' }),
        createEvent({ run_id: 'run-1', provider: 'anthropic' }),
      ];

      const result = buildRunGraph(events);
      const run = result.runs.get('run-1');
      expect(run?.providers.has('openai')).toBe(true);
      expect(run?.providers.has('anthropic')).toBe(true);
    });

    it('should calculate retry count', () => {
      const events: CanonicalEvent[] = [
        createEvent({ run_id: 'run-1', step_id: 'retry_0' }),
        createEvent({ run_id: 'run-1', step_id: 'retry_1' }),
        createEvent({ run_id: 'run-1', step_id: 'retry_2' }),
      ];

      const result = buildRunGraph(events);
      expect(result.retryCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty events array', () => {
      const result = buildRunGraph([]);
      expect(result.runs.size).toBe(0);
      expect(result.detectedLoops.length).toBe(0);
      expect(result.retryCount).toBe(0);
    });
  });
});
