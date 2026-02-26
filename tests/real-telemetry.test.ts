/**
 * Real Telemetry Validation Tests
 * Tests AION scoring engine against real open-source and production-like telemetry
 * Fixtures sourced from: CrewAI, LiteLLM, LangChain open-source projects
 */

// Mock PDF generation to avoid jspdf module issues in Jest
jest.mock('@/lib/pdf-report', () => ({
  generateAuditReport: jest.fn(async () => {
    const pdfHeader = '%PDF-1.4\n';
    const mockContent = pdfHeader + 'x'.repeat(200000);
    return new Blob([mockContent], { type: 'application/pdf' });
  }),
}));

import fs from 'fs';
import path from 'path';
import { buildRunViewModel } from '@/lib/telemetry';
import { calculateAEI } from '@/lib/aei-score';
import { generateRecommendations } from '@/lib/recommendations';
import { Run, Step, Status, EventKind } from '@/lib/types';

// Load real telemetry fixtures
const fixturesDir = path.join(__dirname, 'fixtures/real-telemetry');

function loadFixture(filename: string) {
  const filepath = path.join(fixturesDir, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Convert fixture format to Run interface format
 * Preserves all action-level data (model calls, tokens, costs, retries)
 * by creating Event objects that buildRunViewModel() can extract
 */
function fixtureToRun(fixture: any): Run {
  const workflowId = fixture.workflow_id || `run-${Date.now()}`;
  const baseTime = Date.now() - 3600000; // 1 hour ago
  const summary = fixture.summary || {};
  const events: any[] = [];
  let totalCost = 0;
  let totalTokens = 0;

  // Convert tasks to steps and extract actions into events
  const steps: Step[] = (fixture.tasks || []).map((task: any, taskIdx: number) => {
    let stepStartTime = baseTime + taskIdx * 2000;
    let stepEndTime = stepStartTime;
    const actions = task.actions || [];
    const actionSummary: any = {
      modelCalls: [] as any[],
      toolCalls: [] as any[],
      retries: [] as any[],
      validations: [] as any[],
    };

    // Process each action and create events
    actions.forEach((action: any, actionIdx: number) => {
      const actionTime = stepStartTime + actionIdx * 500;
      const actionDuration = action.latency_ms || 1000;

      if (action.type === 'model_call' || action.model) {
        // Create COST_RECORDED event for model call
        const costEvent: any = {
          id: `event-${taskIdx}-${actionIdx}`,
          kind: EventKind.COST_RECORDED,
          timestamp: actionTime,
          runId: workflowId,
          stepId: task.task_id || `step-${taskIdx}`,
          data: {
            model: action.model,
            provider: action.provider || extractProvider(action.model),
            costUSD: action.cost_usd || 0,
            inputTokens: action.input_tokens || 0,
            outputTokens: action.output_tokens || 0,
            latencyMs: action.latency_ms || 0,
          },
        };
        events.push(costEvent);

        // Track tokens and costs
        totalTokens += (action.input_tokens || 0) + (action.output_tokens || 0);
        totalCost += action.cost_usd || 0;

        actionSummary.modelCalls.push({
          model: action.model,
          inputTokens: action.input_tokens || 0,
          outputTokens: action.output_tokens || 0,
          costUSD: action.cost_usd || 0,
          latencyMs: action.latency_ms || 0,
        });

        stepEndTime = Math.max(stepEndTime, actionTime + actionDuration);
      } else if (action.type === 'tool_call' || action.tool) {
        actionSummary.toolCalls.push({
          tool: action.tool,
          latencyMs: action.latency_ms || 0,
        });
        stepEndTime = Math.max(stepEndTime, actionTime + actionDuration);
      } else if (action.type === 'retry') {
        // Create RETRY event
        const retryEvent: any = {
          id: `event-retry-${taskIdx}-${actionIdx}`,
          kind: EventKind.RETRY,
          timestamp: actionTime,
          runId: workflowId,
          stepId: task.task_id || `step-${taskIdx}`,
          data: {
            reason: action.reason || 'unknown',
            attempt: action.attempt || 1,
            latencyMs: action.latency_ms || 0,
          },
        };
        events.push(retryEvent);
        actionSummary.retries.push({
          reason: action.reason || 'unknown',
          attempt: action.attempt || 1,
        });
      } else if (action.type === 'validation') {
        actionSummary.validations.push({
          check: action.check,
          result: action.result,
        });
      }
    });

    // Calculate step duration from actions
    const stepDuration = stepEndTime - stepStartTime || 1000;

    return {
      id: task.task_id || `step-${taskIdx}`,
      name: task.description || task.agent || `Task ${taskIdx}`,
      status: Status.COMPLETED,
      startedAt: stepStartTime,
      completedAt: stepEndTime,
      durationMs: stepDuration,
      input: task.input || {},
      output: {
        ...task.output,
        ...actionSummary, // Include action summary in output
      },
    };
  });

  const endTime = steps.length > 0
    ? Math.max(...steps.map(s => s.completedAt || 0))
    : baseTime + 5000;

  return {
    id: workflowId,
    name: fixture.description || fixture.workflow_id || 'Real Telemetry Workflow',
    status: Status.COMPLETED,
    startedAt: baseTime,
    completedAt: endTime,
    durationMs: endTime - baseTime,
    steps: steps,
    events: events, // Now includes COST_RECORDED and RETRY events
    framework: fixture.framework,
  };
}

/**
 * Extract provider from model name
 */
function extractProvider(model: string): string {
  if (model.includes('gpt')) return 'openai';
  if (model.includes('claude')) return 'anthropic';
  if (model.includes('gemini')) return 'google';
  if (model.includes('llama')) return 'meta';
  if (model.includes('mistral')) return 'mistral';
  if (model.includes('grok')) return 'xai';
  return 'unknown';
}

describe('Real Telemetry Validation', () => {
  describe('Real Telemetry Fixtures', () => {
    it('should load all real telemetry fixtures from disk', () => {
      const fixtures = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));
      expect(fixtures.length).toBeGreaterThanOrEqual(4);
      console.log(`  Loaded ${fixtures.length} fixtures`);
    });

    describe.each([
      ['crewai-textile-workflow.json', 'CrewAI'],
      ['litellm-multi-provider.json', 'LiteLLM'],
      ['langchain-research-chain.json', 'LangChain'],
      ['crewai-stock-analysis.json', 'CrewAI'],
    ])('%s (%s)', (fixtureFile, framework) => {
      const fixture = loadFixture(fixtureFile);
      const run = fixtureToRun(fixture);

      it('should parse fixture correctly', () => {
        expect(fixture).toBeDefined();
        expect(fixture.framework).toBe(framework);
        expect(fixture.tasks).toBeInstanceOf(Array);
        expect(fixture.tasks.length).toBeGreaterThan(0);
      });

      it('should convert fixture to Run interface', () => {
        expect(run.id).toBeDefined();
        expect(run.name).toBeDefined();
        expect(run.status).toBe(Status.COMPLETED);
        expect(run.startedAt).toBeGreaterThan(0);
        expect(run.completedAt).toBeGreaterThan(run.startedAt);
        expect(run.steps).toBeInstanceOf(Array);
      });

      it('should build RunViewModel from fixture', () => {
        const viewModel = buildRunViewModel(run);

        expect(viewModel.id).toBeDefined();
        expect(viewModel.name).toBeDefined();
        expect(viewModel.costs).toBeDefined();
        expect(viewModel.duration).toBeDefined();
        expect(viewModel.duration.ms).toBeGreaterThan(0);
      });

      it('should calculate AEI score for fixture', () => {
        const viewModel = buildRunViewModel(run);
        const aei = calculateAEI(viewModel);

        expect(aei.overall).toBeGreaterThanOrEqual(0);
        expect(aei.overall).toBeLessThanOrEqual(100);
        expect(aei.components).toBeDefined();
        console.log(
          `  ${path.basename(fixtureFile)}: AEI=${aei.overall.toFixed(1)}, grade=${aei.grade}`
        );
      });

      it('should generate recommendations for fixture', () => {
        const viewModel = buildRunViewModel(run);
        const aei = calculateAEI(viewModel);
        const recommendations = generateRecommendations(viewModel, aei);

        expect(recommendations).toBeInstanceOf(Array);
        expect(recommendations.length).toBeGreaterThan(0);
        const criticalCount = recommendations.filter((r) => r.priority === 'critical').length;
        console.log(
          `  ${path.basename(fixtureFile)}: ${recommendations.length} recommendations (${criticalCount} critical)`
        );
      });

      it('should handle AEI components correctly', () => {
        const viewModel = buildRunViewModel(run);
        const aei = calculateAEI(viewModel);

        // Components may be undefined if data is unavailable
        if (aei.components.cost !== undefined) {
          expect(aei.components.cost).toBeGreaterThanOrEqual(0);
          expect(aei.components.cost).toBeLessThanOrEqual(100);
        }
        if (aei.components.token !== undefined) {
          expect(aei.components.token).toBeGreaterThanOrEqual(0);
          expect(aei.components.token).toBeLessThanOrEqual(100);
        }
        if (aei.components.latency !== undefined) {
          expect(aei.components.latency).toBeGreaterThanOrEqual(0);
          expect(aei.components.latency).toBeLessThanOrEqual(100);
        }
        if (aei.components.reliability !== undefined) {
          expect(aei.components.reliability).toBeGreaterThanOrEqual(0);
          expect(aei.components.reliability).toBeLessThanOrEqual(100);
        }
      });
    });
  });

  describe('Real Telemetry Benchmarking', () => {
    it('should benchmark AEI scores across all fixtures with cost and token data', () => {
      const fixtures = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));
      const benchmarks: Array<{
        fixture: string;
        aei: number;
        grade: string;
        cost: number;
        costComponent?: number;
        tokenComponent?: number;
        latencyComponent?: number;
        reliabilityComponent?: number;
        recommendations: number;
        criticalRecs: number;
      }> = [];

      fixtures.forEach((fixture) => {
        const workflow = loadFixture(fixture);
        const run = fixtureToRun(workflow);
        const viewModel = buildRunViewModel(run);
        const aei = calculateAEI(viewModel);
        const recommendations = generateRecommendations(viewModel, aei);

        benchmarks.push({
          fixture: path.basename(fixture),
          aei: aei.overall,
          grade: aei.grade,
          cost: viewModel.costs.total,
          costComponent: aei.components.costEfficiency,
          tokenComponent: aei.components.tokenEfficiency,
          latencyComponent: aei.components.latencyScore,
          reliabilityComponent: aei.components.reliabilityScore,
          recommendations: recommendations.length,
          criticalRecs: recommendations.filter((r) => r.priority === 'critical').length,
        });
      });

      console.log('\n\n  ═══════════════════════════════════════════════════════════════');
      console.log('  REAL TELEMETRY BENCHMARK RESULTS (WITH COST & TOKEN DATA)');
      console.log('  ═══════════════════════════════════════════════════════════════');

      benchmarks.forEach(
        ({
          fixture,
          aei,
          grade,
          cost,
          costComponent,
          tokenComponent,
          latencyComponent,
          reliabilityComponent,
          recommendations,
          criticalRecs,
        }) => {
          console.log(`\n  ${fixture}`);
          console.log(
            `    AEI Score: ${aei.toFixed(1)}/100 (${grade}) | Total Cost: $${cost.toFixed(4)}`
          );
          console.log(
            `    Components: Cost=${costComponent?.toFixed(0) || 'N/A'}, Token=${tokenComponent?.toFixed(0) || 'N/A'}, Latency=${latencyComponent?.toFixed(0) || 'N/A'}, Reliability=${reliabilityComponent?.toFixed(0) || 'N/A'}`
          );
          console.log(
            `    Recommendations: ${recommendations} total (${criticalRecs} critical)`
          );
        }
      );

      console.log('\n  ═══════════════════════════════════════════════════════════════\n');

      // All scores should be valid
      benchmarks.forEach(({ aei }) => {
        expect(aei).toBeGreaterThanOrEqual(0);
        expect(aei).toBeLessThanOrEqual(100);
      });
    });

    it('should benchmark recommendations across all fixtures', () => {
      const fixtures = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));
      const recommendations: Array<{
        fixture: string;
        total: number;
        critical: number;
        high: number;
      }> = [];

      fixtures.forEach((fixture) => {
        const workflow = loadFixture(fixture);
        const run = fixtureToRun(workflow);
        const viewModel = buildRunViewModel(run);
        const aei = calculateAEI(viewModel);
        const recs = generateRecommendations(viewModel, aei);

        recommendations.push({
          fixture: path.basename(fixture),
          total: recs.length,
          critical: recs.filter((r) => r.priority === 'critical').length,
          high: recs.filter((r) => r.priority === 'high').length,
        });
      });

      console.log('\n  Recommendation Benchmark Results:');
      recommendations.forEach(({ fixture, total, critical, high }) => {
        console.log(`    ${fixture}: ${total} total (${critical} critical, ${high} high)`);
      });

      // All should have recommendations
      recommendations.forEach(({ total }) => {
        expect(total).toBeGreaterThan(0);
      });
    });
  });
});
