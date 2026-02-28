/**
 * Phase 5a/5b: Individual Recommendation Rule Tests
 */

import { checkModelSubstitution } from '@/lib/recommendations/rules/model-substitution';
import { checkPromptCaching } from '@/lib/recommendations/rules/prompt-caching';
import { checkRetryElimination } from '@/lib/recommendations/rules/retry-elimination';
import { checkRoutingFix } from '@/lib/recommendations/rules/routing-fix';
import { checkParallelExecution } from '@/lib/recommendations/rules/parallel-execution';
import { checkFrameworkOverhead } from '@/lib/recommendations/rules/framework-overhead';
import { RECOMMENDATION_RULES } from '@/lib/recommendations/rules';
import { RunViewModel, EventKind, Status } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';

// Mock RunViewModel for testing
function createMockRunViewModel(overrides: Partial<RunViewModel> = {}): RunViewModel {
  return {
    id: 'test-run',
    name: 'Test Run',
    status: Status.COMPLETED,
    duration: { formatted: '30s', ms: 30000 },
    startTime: { iso: new Date().toISOString(), relative: 'just now' },
    steps: {
      total: 3,
      completed: 3,
      failed: 0,
      pending: 0,
      list: [
        {
          id: 'step-1',
          name: 'classification-task',
          status: Status.COMPLETED,
          duration: { formatted: '10s', ms: 10000 },
          startTime: { iso: new Date().toISOString(), relative: 'just now' },
          costUSD: 0.05,
          inputTokens: 5000,
          outputTokens: 1200,
        },
        {
          id: 'step-2',
          name: 'summary-generation',
          status: Status.COMPLETED,
          duration: { formatted: '10s', ms: 10000 },
          startTime: { iso: new Date().toISOString(), relative: 'just now' },
          costUSD: 0.03,
          inputTokens: 3000,
          outputTokens: 800,
        },
        {
          id: 'step-3',
          name: 'result-merge',
          status: Status.COMPLETED,
          duration: { formatted: '10s', ms: 10000 },
          startTime: { iso: new Date().toISOString(), relative: 'just now' },
          costUSD: 0.02,
          inputTokens: 2000,
          outputTokens: 500,
        },
      ],
    },
    costs: {
      total: 0.10,
      byModel: [
        { model: 'gpt-4o', provider: 'openai', cost: 0.08, percentage: 80 },
        { model: 'gpt-4o-mini', provider: 'openai', cost: 0.02, percentage: 20 },
      ],
    },
    tokens: {
      input: 10000,
      output: 2500,
      total: 12500,
      byModel: [
        { model: 'gpt-4o', inputTokens: 8000, outputTokens: 2000 },
        { model: 'gpt-4o-mini', inputTokens: 2000, outputTokens: 500 },
      ],
    },
    events: {
      total: 15,
      byKind: {
        [EventKind.RUN_STARTED]: 1,
        [EventKind.RUN_COMPLETED]: 1,
        [EventKind.PHASE_ENTER]: 3,
        [EventKind.PHASE_EXIT]: 3,
        [EventKind.TOKEN_COUNT]: 5,
        [EventKind.RETRY]: 2,
      } as Record<EventKind, number>,
    },
    performance: {
      averageStepDurationMs: 10000,
    },
    raw: {
      run: {} as any,
      events: [],
    },
    ...overrides,
  };
}

function createMockAEIScore(overrides: Partial<AEIScore> = {}): AEIScore {
  return {
    overall: 65,
    components: {
      costEfficiency: 70,
      tokenEfficiency: 60,
      latencyScore: 75,
      reliabilityScore: 80,
      retryPenalty: 50,
    },
    riskFlags: [],
    ...overrides,
  } as AEIScore;
}

describe('Recommendation Rules', () => {
  describe('rules registry', () => {
    it('contains exactly 8 rules', () => {
      expect(RECOMMENDATION_RULES).toHaveLength(8);
    });

    it('all rules are functions', () => {
      RECOMMENDATION_RULES.forEach((rule) => {
        expect(typeof rule.check).toBe('function');
      });
    });
  });

  describe('Rule 1: Model Substitution', () => {
    it('triggers when premium models are used on classification tasks', () => {
      const data = createMockRunViewModel();
      const aeiScore = createMockAEIScore();
      const result = checkModelSubstitution(data, aeiScore);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('rule-1-model-substitution');
      expect(result!.priority).toBe('high');
      expect(result!.projectedSavings.costUSDPerRun).toBeGreaterThan(0);
    });

    it('returns null when no premium models are used', () => {
      const data = createMockRunViewModel({
        costs: {
          total: 0.02,
          byModel: [
            { model: 'gpt-3.5-turbo', provider: 'openai', cost: 0.02, percentage: 100 },
          ],
        },
      });
      const result = checkModelSubstitution(data, createMockAEIScore());
      expect(result).toBeNull();
    });
  });

  describe('Rule 2: Prompt Caching', () => {
    it('triggers when input tokens > 4000', () => {
      const data = createMockRunViewModel();
      const result = checkPromptCaching(data, createMockAEIScore());

      expect(result).not.toBeNull();
      expect(result!.id).toBe('rule-2-prompt-caching');
      expect(result!.category).toBe('prompt_caching');
    });

    it('returns null when all inputs are small', () => {
      const data = createMockRunViewModel({
        steps: {
          total: 1,
          completed: 1,
          failed: 0,
          pending: 0,
          list: [
            {
              id: 'step-1',
              name: 'small-step',
              status: Status.COMPLETED,
              duration: { formatted: '1s', ms: 1000 },
              startTime: { iso: new Date().toISOString(), relative: 'just now' },
              inputTokens: 500,
              outputTokens: 100,
            },
          ],
        },
      });
      const result = checkPromptCaching(data, createMockAEIScore());
      expect(result).toBeNull();
    });
  });

  describe('Rule 3: Retry Elimination', () => {
    it('triggers when retries are present', () => {
      const data = createMockRunViewModel();
      const result = checkRetryElimination(data, createMockAEIScore());

      expect(result).not.toBeNull();
      expect(result!.id).toBe('rule-3-retry-elimination');
      expect(result!.priority).toBe('high');
    });

    it('returns null when no retries', () => {
      const data = createMockRunViewModel({
        events: {
          total: 10,
          byKind: {
            [EventKind.RUN_STARTED]: 1,
            [EventKind.RUN_COMPLETED]: 1,
            [EventKind.RETRY]: 0,
          } as Record<EventKind, number>,
        },
      });
      const result = checkRetryElimination(data, createMockAEIScore());
      expect(result).toBeNull();
    });
  });

  describe('Rule 4: Routing Fix', () => {
    it('triggers when MODEL_ROUTING_FAILURE flag is present', () => {
      const data = createMockRunViewModel();
      const aeiScore = createMockAEIScore({
        riskFlags: ['MODEL_ROUTING_FAILURE'],
      });
      const result = checkRoutingFix(data, aeiScore);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('rule-4-routing-fix');
      expect(result!.priority).toBe('critical');
    });

    it('returns null when no routing failure', () => {
      const result = checkRoutingFix(
        createMockRunViewModel(),
        createMockAEIScore()
      );
      expect(result).toBeNull();
    });
  });

  describe('Rule 7: Parallel Execution', () => {
    it('triggers when multiple independent steps exist', () => {
      const data = createMockRunViewModel();
      const result = checkParallelExecution(data, createMockAEIScore());

      expect(result).not.toBeNull();
      expect(result!.id).toBe('rule-7-parallel-execution');
      expect(result!.projectedSavings.latencyReductionMs).toBeGreaterThan(0);
    });

    it('returns null with single step', () => {
      const data = createMockRunViewModel({
        steps: {
          total: 1,
          completed: 1,
          failed: 0,
          pending: 0,
          list: [
            {
              id: 'step-1',
              name: 'only-step',
              status: Status.COMPLETED,
              duration: { formatted: '1s', ms: 1000 },
              startTime: { iso: new Date().toISOString(), relative: 'just now' },
            },
          ],
        },
      });
      const result = checkParallelExecution(data, createMockAEIScore());
      expect(result).toBeNull();
    });
  });

  describe('Rule 8: Framework Overhead', () => {
    it('triggers when overhead ratio > 40%', () => {
      const data = createMockRunViewModel({
        events: { total: 50, byKind: {} as Record<EventKind, number> },
        steps: {
          total: 3,
          completed: 3,
          failed: 0,
          pending: 0,
          list: [],
        },
      });
      const result = checkFrameworkOverhead(data, createMockAEIScore());

      expect(result).not.toBeNull();
      expect(result!.id).toBe('rule-8-framework-overhead');
    });

    it('returns null when overhead is low', () => {
      const data = createMockRunViewModel({
        events: { total: 3, byKind: {} as Record<EventKind, number> },
        steps: {
          total: 3,
          completed: 3,
          failed: 0,
          pending: 0,
          list: [],
        },
      });
      const result = checkFrameworkOverhead(data, createMockAEIScore());
      expect(result).toBeNull();
    });
  });
});
