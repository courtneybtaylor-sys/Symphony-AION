/**
 * Format Detector Tests
 * Tests for lib/ingestion/format-detector.ts
 */

import { detectFormat } from '../../../lib/ingestion/format-detector';

describe('Format Detector', () => {
  describe('detectFormat', () => {
    it('should detect OpenAI export format by conversations array', () => {
      const data = {
        conversations: [
          {
            id: 'conv-1',
            title: 'Test',
            mapping: {},
          },
        ],
      };
      expect(detectFormat(data)).toBe('openai-export');
    });

    it('should detect OpenAI assistants format by threads array', () => {
      const data = {
        threads: [
          {
            id: 'thread-1',
            messages: [],
          },
        ],
      };
      expect(detectFormat(data)).toBe('openai-assistants');
    });

    it('should detect Anthropic export format by conversations array with metadata', () => {
      const data = {
        conversations: [
          {
            uuid: '123',
            name: 'test',
            chat_history: [],
          },
        ],
      };
      expect(detectFormat(data)).toBe('anthropic-export');
    });

    it('should detect LangChain format by runs array', () => {
      const data = {
        runs: [
          {
            id: 'run-1',
            events: [],
          },
        ],
      };
      expect(detectFormat(data)).toBe('langchain');
    });

    it('should detect CrewAI format by crew_name and tasks', () => {
      const data = {
        crew_name: 'test-crew',
        tasks: [],
      };
      expect(detectFormat(data)).toBe('crewai');
    });

    it('should detect AutoGen format by messages with role', () => {
      const data = {
        messages: [
          {
            role: 'user',
            content: 'test',
          },
        ],
      };
      expect(detectFormat(data)).toBe('autogen');
    });

    it('should detect n8n format by executionId and nodes', () => {
      const data = {
        executionId: 'exec-1',
        nodes: [
          {
            id: 'node-1',
            name: 'test',
          },
        ],
      };
      expect(detectFormat(data)).toBe('n8n');
    });

    it('should default to generic format for unknown structures', () => {
      const data = {
        someKey: 'someValue',
        anotherKey: [{ item: 1 }],
      };
      expect(detectFormat(data)).toBe('generic');
    });
  });
});
