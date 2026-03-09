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

  describe('Model Misallocation flag', () => {
    it('should NOT trigger on clean runs with single model', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(score.riskFlags).not.toContain('PREMIUM_ON_SIMPLE_TASK');
    });

    it('should trigger when using expensive models on simple tasks', () => {
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
        tokens: {
          input: 500, // Low token count = simple task
          output: 100,
          total: 600,
          byModel: [
            {
              model: 'gpt-4',
              inputTokens: 500,
              outputTokens: 100,
            },
          ],
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

      expect(score.riskFlags).toContain('PREMIUM_ON_SIMPLE_TASK');
    });

    it('should NOT trigger if using cheap model with multiple calls', () => {
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

      expect(score.riskFlags).not.toContain('PREMIUM_ON_SIMPLE_TASK');
    });
  });

  describe('Governance Drift flag', () => {
    it('should NOT trigger on clean runs without governance events', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(score.riskFlags).not.toContain('GOVERNANCE_DRIFT');
    });

    it('should trigger when high governance event rate indicates drift', () => {
      const run = createRunViewModel({
        events: {
          total: 10,
          byKind: {
            [EventKind.RUN_STARTED]: 1,
            [EventKind.RUN_COMPLETED]: 1,
            [EventKind.PHASE_ENTER]: 1,
            [EventKind.PHASE_EXIT]: 1,
            [EventKind.TOKEN_COUNT]: 1,
            [EventKind.GOVERNANCE]: 3, // 3 governance events = 30% rate
            [EventKind.RETRY]: 1,
            [EventKind.LOSS_CLASSIFY]: 0,
            [EventKind.COMPARE_BASE]: 0,
            [EventKind.COMPARE_OPT]: 0,
          } as Record<EventKind, number>,
        },
      });

      const score = calculateAEI(run);

      expect(score.riskFlags).toContain('GOVERNANCE_DRIFT');
    });

    it('should trigger on multiple governance events indicating scope drift', () => {
      const run = createRunViewModel({
        events: {
          total: 12,
          byKind: {
            [EventKind.RUN_STARTED]: 1,
            [EventKind.RUN_COMPLETED]: 1,
            [EventKind.PHASE_ENTER]: 2,
            [EventKind.PHASE_EXIT]: 2,
            [EventKind.TOKEN_COUNT]: 1,
            [EventKind.GOVERNANCE]: 3, // 3 governance events
            [EventKind.RETRY]: 2,
            [EventKind.LOSS_CLASSIFY]: 0,
            [EventKind.COMPARE_BASE]: 0,
            [EventKind.COMPARE_OPT]: 0,
          } as Record<EventKind, number>,
        },
      });

      const score = calculateAEI(run);

      expect(score.riskFlags).toContain('GOVERNANCE_DRIFT');
    });

    it('should NOT trigger with single governance event', () => {
      const run = createRunViewModel({
        events: {
          total: 10,
          byKind: {
            [EventKind.RUN_STARTED]: 1,
            [EventKind.RUN_COMPLETED]: 1,
            [EventKind.PHASE_ENTER]: 2,
            [EventKind.PHASE_EXIT]: 2,
            [EventKind.TOKEN_COUNT]: 2,
            [EventKind.GOVERNANCE]: 1, // Only 1 governance event = low rate
            [EventKind.RETRY]: 0,
            [EventKind.LOSS_CLASSIFY]: 0,
            [EventKind.COMPARE_BASE]: 0,
            [EventKind.COMPARE_OPT]: 0,
          } as Record<EventKind, number>,
        },
      });

      const score = calculateAEI(run);

      expect(score.riskFlags).not.toContain('GOVERNANCE_DRIFT');
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

    it('should include 5 component penalty scores', () => {
      const run = createRunViewModel();
      const score = calculateAEI(run);

      expect(score.components.loopTax).toBeDefined();
      expect(score.components.loopTax).toBeGreaterThanOrEqual(0);
      expect(score.components.loopTax).toBeLessThanOrEqual(100);

      expect(score.components.frameworkOverhead).toBeDefined();
      expect(score.components.frameworkOverhead).toBeGreaterThanOrEqual(0);
      expect(score.components.frameworkOverhead).toBeLessThanOrEqual(100);

      expect(score.components.modelMisallocation).toBeDefined();
      expect(score.components.modelMisallocation).toBeGreaterThanOrEqual(0);
      expect(score.components.modelMisallocation).toBeLessThanOrEqual(100);

      expect(score.components.driftScore).toBeDefined();
      expect(score.components.driftScore).toBeGreaterThanOrEqual(0);
      expect(score.components.driftScore).toBeLessThanOrEqual(100);

      expect(score.components.gateViolationRate).toBeDefined();
      expect(score.components.gateViolationRate).toBeGreaterThanOrEqual(0);
      expect(score.components.gateViolationRate).toBeLessThanOrEqual(100);
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
          failed: 3, // 60% failure rate
          pending: 0,
          list: [],
        },
        tokens: {
          input: 500, // Low tokens with premium model
          output: 100,
          total: 600,
          byModel: [
            {
              model: 'gpt-4',
              inputTokens: 500,
              outputTokens: 100,
            },
          ],
        },
        events: {
          total: 12,
          byKind: {
            [EventKind.RUN_STARTED]: 1,
            [EventKind.RUN_COMPLETED]: 1,
            [EventKind.PHASE_ENTER]: 2,
            [EventKind.PHASE_EXIT]: 2,
            [EventKind.TOKEN_COUNT]: 1,
            [EventKind.GOVERNANCE]: 2, // Governance events trigger drift
            [EventKind.RETRY]: 3, // Retries trigger loop tax
            [EventKind.VALIDATION_FAILED]: 1, // Gate violations
            [EventKind.LOSS_CLASSIFY]: 0,
            [EventKind.COMPARE_BASE]: 0,
            [EventKind.COMPARE_OPT]: 0,
          } as Record<EventKind, number>,
        },
      });

      const score = calculateAEI(run);

      // With canonical formula and multiple penalties, expect lower grades
      expect(['B', 'C', 'F']).toContain(score.grade);
    });
  });
});
