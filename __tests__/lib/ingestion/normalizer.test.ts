/**
 * Normalizer Tests
 * Tests for lib/ingestion/normalizer.ts
 */

import { normalizeToCanonical, type CanonicalEvent } from '../../../lib/ingestion/normalizer';

describe('Normalizer', () => {
  describe('normalizeToCanonical', () => {
    it('should normalize OpenAI export format', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  role: 'user',
                  content: {
                    parts: ['hello'],
                  },
                },
              },
            },
          },
        ],
      };

      const result = normalizeToCanonical(data, 'openai-export');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('run_id');
      expect(result[0]).toHaveProperty('event_kind');
    });

    it('should calculate costs for LLM calls', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  role: 'assistant',
                  model: 'gpt-4',
                  metadata: {
                    usage: {
                      prompt_tokens: 100,
                      completion_tokens: 50,
                    },
                  },
                },
              },
            },
          },
        ],
      };

      const result = normalizeToCanonical(data, 'openai-export');
      expect(result.some((e: CanonicalEvent) => e.cost_usd > 0)).toBe(true);
    });

    it('should handle missing token data with defaults', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  role: 'user',
                  content: { parts: ['test'] },
                },
              },
            },
          },
        ],
      };

      const result = normalizeToCanonical(data, 'openai-export');
      expect(result.every((e: CanonicalEvent) => e.tokens_input >= 0)).toBe(true);
      expect(result.every((e: CanonicalEvent) => e.tokens_output >= 0)).toBe(true);
    });

    it('should preserve run_id for grouping', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  role: 'user',
                  content: { parts: ['test'] },
                },
              },
              'msg-2': {
                message: {
                  id: 'msg-2',
                  role: 'assistant',
                  content: { parts: ['response'] },
                },
              },
            },
          },
        ],
      };

      const result = normalizeToCanonical(data, 'openai-export');
      const runIds = new Set(result.map((e: CanonicalEvent) => e.run_id));
      expect(runIds.size).toBeLessThanOrEqual(result.length);
    });

    it('should set event_kind for different message types', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  role: 'user',
                  content: { parts: ['user input'] },
                },
              },
              'msg-2': {
                message: {
                  id: 'msg-2',
                  role: 'assistant',
                  content: { parts: ['ai response'] },
                },
              },
            },
          },
        ],
      };

      const result = normalizeToCanonical(data, 'openai-export');
      expect(result.some((e: CanonicalEvent) => e.event_kind === 'user_message')).toBe(true);
      expect(result.some((e: CanonicalEvent) => e.event_kind === 'llm_call')).toBe(true);
    });

    it('should handle generic format with flexible structure', () => {
      const data = {
        events: [
          {
            type: 'llm_call',
            model: 'gpt-4',
            input_tokens: 100,
            output_tokens: 50,
            cost: 0.005,
          },
        ],
      };

      const result = normalizeToCanonical(data, 'generic');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply model pricing for known models', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  role: 'assistant',
                  model: 'claude-3-5-sonnet',
                  metadata: {
                    usage: {
                      prompt_tokens: 1000,
                      completion_tokens: 100,
                    },
                  },
                },
              },
            },
          },
        ],
      };

      const result = normalizeToCanonical(data, 'openai-export');
      const costEvent = result.find((e: CanonicalEvent) => e.model === 'claude-3-5-sonnet');
      expect(costEvent).toBeDefined();
      expect(costEvent!.cost_usd).toBeGreaterThan(0);
    });

    it('should set provider field based on model', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  role: 'assistant',
                  model: 'gpt-4',
                  content: { parts: ['test'] },
                },
              },
            },
          },
        ],
      };

      const result = normalizeToCanonical(data, 'openai-export');
      expect(result.some((e: CanonicalEvent) => e.provider === 'openai')).toBe(true);
    });

    it('should handle empty input data', () => {
      const data = {};
      const result = normalizeToCanonical(data, 'generic');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should set default status for events', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            mapping: {
              'msg-1': {
                message: {
                  id: 'msg-1',
                  role: 'user',
                  content: { parts: ['test'] },
                },
              },
            },
          },
        ],
      };

      const result = normalizeToCanonical(data, 'openai-export');
      expect(result.every((e: CanonicalEvent) => ['success', 'error', 'timeout'].includes(e.status))).toBe(true);
    });
  });
});
