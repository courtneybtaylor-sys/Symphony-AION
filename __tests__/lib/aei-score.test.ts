/**
 * AEI Scoring Engine Tests
 * Tests for the AION Efficiency Index calculation and risk flag detection
 */

import { calculateAEI } from '@/lib/aei-score';
import { RunViewModel, Status, EventKind } from '@/lib/types';

describe('AEI Scoring Engine', () => {
  // Helper to create a minimal RunViewModel
  function createRunViewModel(overrides: Partial<RunViewModel> = {}): RunViewModel {
    return {
      id: 'test-run-001',
      name: 'Test Run',
      status: Status.COMPLETED,
      duration: {
        formatted: '10s',
        ms: 10000,
      },
      startTime: {
        iso: '2026-02-25T10:00:00Z',
        relative: '1 hour ago',
      },
      endTime: {
        iso: '2026-02-25T10:00:10Z',
        relative: '1 hour ago',
      },
      steps: {
        total: 2,
        completed: 2,
        failed: 0,
        pending: 0,
        list: [],
      },
      costs: {
        total: 0.01,
        byModel: [
          {
            model: 'gpt-4o-mini',
            provider: 'openai',
            cost: 0.01,
            percentage: 1.0,
          },
        ],
      },
      tokens: {
        input: 1000,
        output: 500,
        total: 1500,
        byModel: [
          {
            model: 'gpt-4o-mini',
            inputTokens: 1000,
            outputTokens: 500,
          },
        ],
      },
      events: {
        total: 10,
        byKind: {
          [EventKind.RUN_STARTED]: 1,
          [EventKind.RUN_COMPLETED]: 1,
          [EventKind.PHASE_ENTER]: 2,
          [EventKind.PHASE_EXIT]: 2,
          [EventKind.TOKEN_COUNT]: 2,
          [EventKind.GOVERNANCE]: 1,
          [EventKind.RETRY]: 0,
          [EventKind.LOSS_CLASSIFY]: 0,
          [EventKind.COMPARE_BASE]: 0,
          [EventKind.COMPARE_OPT]: 0,
        } as Record<EventKind, number>,
      },
      performance: {
        averageStepDurationMs: 5000,
      },
      raw: {
        run: {
          id: 'test-run-001',
          name: 'Test Run',
          status: Status.COMPLETED,
          startedAt: 1698000000000,
          completedAt: 1698000010000,
          steps: [],
          events: [],
        },
        events: [],
      },
      ...overrides,
    };
  }

  describe('MODEL_ROUTING_FAILURE flag', () => {
    it('should NOT trigger on clean runs with single model', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(score.riskFlags).not.toContain('MODEL_ROUTING_FAILURE');
    });

    it('should trigger when multiple models used with cost gap and failures', () => {
      const run = createRunViewModel({
        costs: {
          total: 0.05,
          byModel: [
            {
              model: 'gpt-4o-mini',
              provider: 'openai',
              cost: 0.01,
              percentage: 0.2,
            },
            {
              model: 'gpt-4o',
              provider: 'openai',
              cost: 0.04,
              percentage: 0.8,
            },
          ],
        },
        steps: {
          total: 2,
          completed: 1,
          failed: 1,
          pending: 0,
          list: [],
        },
      });

      const score = calculateAEI(run);

      expect(score.riskFlags).toContain('MODEL_ROUTING_FAILURE');
    });

    it('should NOT trigger if cheap model succeeds (no escalation)', () => {
      const run = createRunViewModel({
        costs: {
          total: 0.02,
          byModel: [
            {
              model: 'gpt-4o-mini',
              provider: 'openai',
              cost: 0.02,
              percentage: 1.0,
            },
          ],
        },
        steps: {
          total: 2,
          completed: 2,
          failed: 0,
          pending: 0,
          list: [],
        },
      });

      const score = calculateAEI(run);

      expect(score.riskFlags).not.toContain('MODEL_ROUTING_FAILURE');
    });
  });

  describe('HALLUCINATION_DETECTED flag', () => {
    it('should NOT trigger on clean runs without validation failures', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(score.riskFlags).not.toContain('HALLUCINATION_DETECTED');
    });

    it('should trigger when high validation failure rate with retries', () => {
      const run = createRunViewModel({
        events: {
          total: 10,
          byKind: {
            [EventKind.RUN_STARTED]: 1,
            [EventKind.RUN_COMPLETED]: 1,
            [EventKind.PHASE_ENTER]: 2,
            [EventKind.PHASE_EXIT]: 2,
            [EventKind.TOKEN_COUNT]: 1,
            [EventKind.GOVERNANCE]: 3, // 3 validations (high)
            [EventKind.RETRY]: 2, // 2 retries
            [EventKind.LOSS_CLASSIFY]: 0,
            [EventKind.COMPARE_BASE]: 0,
            [EventKind.COMPARE_OPT]: 0,
          } as Record<EventKind, number>,
        },
      });

      const score = calculateAEI(run);

      expect(score.riskFlags).toContain('HALLUCINATION_DETECTED');
    });

    it('should trigger on multiple validation failures with concurrent retries', () => {
      const run = createRunViewModel({
        events: {
          total: 12,
          byKind: {
            [EventKind.RUN_STARTED]: 1,
            [EventKind.RUN_COMPLETED]: 1,
            [EventKind.PHASE_ENTER]: 2,
            [EventKind.PHASE_EXIT]: 2,
            [EventKind.TOKEN_COUNT]: 2,
            [EventKind.GOVERNANCE]: 2, // 2 validations
            [EventKind.RETRY]: 2, // 2 retries
            [EventKind.LOSS_CLASSIFY]: 0,
            [EventKind.COMPARE_BASE]: 0,
            [EventKind.COMPARE_OPT]: 0,
          } as Record<EventKind, number>,
        },
      });

      const score = calculateAEI(run);

      expect(score.riskFlags).toContain('HALLUCINATION_DETECTED');
    });

    it('should NOT trigger with few validations even if some fail', () => {
      const run = createRunViewModel({
        events: {
          total: 10,
          byKind: {
            [EventKind.RUN_STARTED]: 1,
            [EventKind.RUN_COMPLETED]: 1,
            [EventKind.PHASE_ENTER]: 2,
            [EventKind.PHASE_EXIT]: 2,
            [EventKind.TOKEN_COUNT]: 2,
            [EventKind.GOVERNANCE]: 1, // Only 1 validation
            [EventKind.RETRY]: 0,
            [EventKind.LOSS_CLASSIFY]: 0,
            [EventKind.COMPARE_BASE]: 0,
            [EventKind.COMPARE_OPT]: 0,
          } as Record<EventKind, number>,
        },
      });

      const score = calculateAEI(run);

      expect(score.riskFlags).not.toContain('HALLUCINATION_DETECTED');
    });
  });

  describe('AEI Score Calculation', () => {
    it('should return a valid score between 0-100', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });

    it('should return a valid grade', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(['A', 'B', 'C', 'D', 'F']).toContain(score.grade);
    });

    it('should generate insights', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(score.insights.length).toBeGreaterThan(0);
      expect(score.insights.length).toBeLessThanOrEqual(5);
    });

    it('should generate 3-5 insights on complex runs', () => {
      const run = createRunViewModel({
        costs: {
          total: 0.05,
          byModel: [
            {
              model: 'gpt-4',
              provider: 'openai',
              cost: 0.05,
              percentage: 1.0,
            },
          ],
        },
        steps: {
          total: 3,
          completed: 2,
          failed: 1,
          pending: 0,
          list: [],
        },
        performance: {
          averageStepDurationMs: 5000,
          slowestStep: {
            id: 'step-1',
            name: 'slow-step',
            status: Status.COMPLETED,
            duration: {
              formatted: '10s',
              ms: 10000,
            },
            startTime: {
              iso: '2026-02-25T10:00:00Z',
              relative: '1 hour ago',
            },
          },
        },
      });

      const score = calculateAEI(run);

      expect(score.insights.length).toBeGreaterThanOrEqual(3);
      expect(score.insights.length).toBeLessThanOrEqual(5);
    });

    it('should include component scores', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(score.components.costEfficiency).toBeDefined();
      expect(score.components.tokenEfficiency).toBeDefined();
      expect(score.components.latencyScore).toBeDefined();
      expect(score.components.reliabilityScore).toBeDefined();
      expect(score.components.retryPenalty).toBeDefined();
    });

    it('should assign A grade for efficient runs', () => {
      const run = createRunViewModel({
        costs: {
          total: 0.001,
          byModel: [
            {
              model: 'gpt-4o-mini',
              provider: 'openai',
              cost: 0.001,
              percentage: 1.0,
            },
          ],
        },
        duration: {
          formatted: '1s',
          ms: 1000,
        },
        steps: {
          total: 1,
          completed: 1,
          failed: 0,
          pending: 0,
          list: [],
        },
      });

      const score = calculateAEI(run);

      expect(['A', 'B']).toContain(score.grade);
    });

    it('should assign lower grades for inefficient runs', () => {
      const run = createRunViewModel({
        costs: {
          total: 2.0,
          byModel: [
            {
              model: 'gpt-4',
              provider: 'openai',
              cost: 2.0,
              percentage: 1.0,
            },
          ],
        },
        steps: {
          total: 5,
          completed: 2,
          failed: 3,
          pending: 0,
          list: [],
        },
      });

      const score = calculateAEI(run);

      expect(['C', 'D', 'F']).toContain(score.grade);
    });
  });
});
