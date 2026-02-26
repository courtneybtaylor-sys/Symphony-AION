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
import { Run, Step, Status } from '@/lib/types';

// Load real telemetry fixtures
const fixturesDir = path.join(__dirname, 'fixtures/real-telemetry');

function loadFixture(filename: string) {
  const filepath = path.join(fixturesDir, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Convert fixture format to Run interface format
 * Fixtures have tasks with actions, but Run expects steps
 */
function fixtureToRun(fixture: any): Run {
  const workflowId = fixture.workflow_id || `run-${Date.now()}`;
  const baseTime = Date.now() - 3600000; // 1 hour ago
  const summary = fixture.summary || {};

  // Convert tasks to steps
  const steps: Step[] = (fixture.tasks || []).map((task: any, idx: number) => {
    const stepDuration = (task.actions || []).reduce((sum: number, action: any) => {
      return sum + (action.latency_ms || 0);
    }, 0) || 1000;

    const taskStart = baseTime + idx * 2000;
    const taskEnd = taskStart + stepDuration;

    return {
      id: task.task_id || `step-${idx}`,
      name: task.description || task.agent || `Task ${idx}`,
      status: Status.COMPLETED,
      startedAt: taskStart,
      completedAt: taskEnd,
      durationMs: stepDuration,
      input: {},
      output: {},
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
    events: [],
    framework: fixture.framework,
  };
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
    it('should benchmark AEI scores across all fixtures', () => {
      const fixtures = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));
      const benchmarks: Array<{ fixture: string; aei: number; grade: string }> = [];

      fixtures.forEach((fixture) => {
        const workflow = loadFixture(fixture);
        const run = fixtureToRun(workflow);
        const viewModel = buildRunViewModel(run);
        const aei = calculateAEI(viewModel);

        benchmarks.push({
          fixture: path.basename(fixture),
          aei: aei.overall,
          grade: aei.grade,
        });
      });

      console.log('\n  AEI Benchmark Results:');
      benchmarks.forEach(({ fixture, aei, grade }) => {
        console.log(`    ${fixture}: ${aei.toFixed(1)}/100 (${grade})`);
      });

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
