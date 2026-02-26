/**
 * Integration Tests for Phase 3 Pipeline
 * Tests: Upload → Intake Gate → Stripe Checkout → Async Processing → Download
 */

// Mock PDF generation to avoid jspdf module issues in Jest
jest.mock('@/lib/pdf-report', () => ({
  generateAuditReport: jest.fn(async () => {
    const pdfHeader = '%PDF-1.4\n';
    const mockContent = pdfHeader + 'x'.repeat(200000);
    return new Blob([mockContent], { type: 'application/pdf' });
  }),
}));

import { validateUpload } from '@/lib/intake-gate';
import { processAuditJob } from '@/lib/audit-processor';
import { logUsageEvent, getDailyStats, getSummaryStats, resetEvents } from '@/lib/usage-logger';
import { MOCK_RUNS } from '@/lib/mock-data';

describe('Phase 3: Complete Audit Pipeline', () => {
  const mockTelemetry = MOCK_RUNS[0];

  beforeEach(() => {
    resetEvents();
  });

  describe('Stage 1: Intake Gate Validation', () => {
    it('should validate qualified telemetry', () => {
      const result = validateUpload(mockTelemetry);

      expect(result.qualified).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.modelCallCount).toBeGreaterThan(0);
      expect(result.summary.totalCostUSD).toBeGreaterThan(0);
      expect(result.projectedROI).toBeGreaterThanOrEqual(0);
    });

    it('should compute savings projections', () => {
      const result = validateUpload(mockTelemetry);

      expect(result.summary.estimatedSavingsRangeLow).toBeGreaterThan(0);
      expect(result.summary.estimatedSavingsRangeHigh).toBeGreaterThan(
        result.summary.estimatedSavingsRangeLow
      );
      expect(result.summary.estimatedSavingsRangeHigh).toBeLessThan(
        result.summary.estimatedSavingsRangeLow * 3
      ); // sanity check
    });

    it('should detect framework from telemetry', () => {
      const result = validateUpload(mockTelemetry);

      expect(result.summary.frameworkDetected).toBeDefined();
      expect(typeof result.summary.frameworkDetected).toBe('string');
    });

    it('should calculate ROI correctly', () => {
      const result = validateUpload(mockTelemetry);
      const expectedROI = (result.summary.estimatedSavingsRangeLow * 12) / 750;

      expect(result.projectedROI).toBeCloseTo(expectedROI, 1);
    });

    it('should reject telemetry with no model calls', () => {
      const emptyTelemetry = { ...mockTelemetry, events: [] };
      const result = validateUpload(emptyTelemetry);

      expect(result.qualified).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('Stage 2: Async Audit Processing', () => {
    it('should process audit job successfully', async () => {
      const job = {
        id: 'job_test_001',
        telemetryHash: 'hash_' + Math.random().toString(36).substring(7),
        customerEmail: 'test@example.com',
        status: 'queued' as const,
        createdAt: new Date().toISOString(),
      };

      const getTelemetryData = () => mockTelemetry;

      const result = await processAuditJob(job, getTelemetryData);

      expect(result.status).toBe('complete');
      expect(result.aeiScore).toBeGreaterThanOrEqual(0);
      expect(result.aeiScore).toBeLessThanOrEqual(100);
      expect(result.reportToken).toBeDefined();
      expect(result.reportTokenExpiresAt).toBeDefined();
      expect(result.frameworkDetected).toBeDefined();
    });

    it('should generate secure token with 24-hour expiry', async () => {
      const job = {
        id: 'job_test_002',
        telemetryHash: 'hash_' + Math.random().toString(36).substring(7),
        customerEmail: 'test@example.com',
        status: 'queued' as const,
        createdAt: new Date().toISOString(),
      };

      const getTelemetryData = () => mockTelemetry;
      const result = await processAuditJob(job, getTelemetryData);

      expect(result.reportToken).toMatch(/^[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
      expect(result.reportTokenExpiresAt).toBeDefined();

      const expiresAt = new Date(result.reportTokenExpiresAt!);
      const now = new Date();
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(diffHours).toBeGreaterThan(23);
      expect(diffHours).toBeLessThanOrEqual(24);
    });

    it('should capture AEI score in job result', async () => {
      const job = {
        id: 'job_test_003',
        telemetryHash: 'hash_' + Math.random().toString(36).substring(7),
        customerEmail: 'test@example.com',
        status: 'queued' as const,
        createdAt: new Date().toISOString(),
      };

      const getTelemetryData = () => mockTelemetry;
      const result = await processAuditJob(job, getTelemetryData);

      expect(result.aeiScore).toBeGreaterThanOrEqual(0);
      expect(result.aeiScore).toBeLessThanOrEqual(100);
      expect(typeof result.aeiScore).toBe('number');
    });
  });

  describe('Stage 3: Usage Tracking', () => {
    it('should log usage events', () => {
      logUsageEvent({
        type: 'upload',
        metadata: {
          framework: 'CrewAI',
          modelCount: 2,
          totalCostUSD: 0.15,
        },
      });

      logUsageEvent({
        type: 'qualified',
        metadata: {
          aeiScore: 75,
          projectedROI: 12.5,
        },
      });

      const stats = getSummaryStats();
      expect(stats.totalUploads).toBe(1);
      expect(stats.totalQualified).toBe(1);
    });

    it('should calculate qualification rate correctly', () => {
      for (let i = 0; i < 10; i++) {
        logUsageEvent({ type: 'upload' });
      }
      for (let i = 0; i < 7; i++) {
        logUsageEvent({ type: 'qualified' });
      }

      const stats = getSummaryStats();
      expect(stats.qualificationRate).toBe(70);
    });

    it('should calculate daily statistics', () => {
      logUsageEvent({ type: 'upload' });
      logUsageEvent({ type: 'qualified', metadata: { aeiScore: 85 } });
      logUsageEvent({ type: 'payment_completed' });

      const dailyStats = getDailyStats(1);
      expect(dailyStats.length).toBeGreaterThan(0);

      const today = dailyStats[0];
      expect(today.uploads).toBeGreaterThan(0);
      expect(today.totalRevenueUSD).toBe(750); // 1 payment × $750
    });

    it('should track payment revenue', () => {
      for (let i = 0; i < 5; i++) {
        logUsageEvent({ type: 'payment_completed' });
      }

      const stats = getSummaryStats();
      expect(stats.totalPayments).toBe(5);
      expect(stats.totalRevenueUSD).toBe(5 * 750);
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should handle complete workflow: upload → validate → process → track', async () => {
      // Step 1: Upload and validate
      const validation = validateUpload(mockTelemetry);
      expect(validation.qualified).toBe(true);

      logUsageEvent({
        type: 'upload',
        metadata: {
          framework: validation.summary.frameworkDetected,
          modelCount: validation.summary.modelsDetected.length,
          totalCostUSD: validation.summary.totalCostUSD,
        },
      });

      logUsageEvent({
        type: 'qualified',
        metadata: {
          aeiScore: validation.summary.estimatedNewAEI,
          projectedROI: validation.projectedROI,
        },
      });

      // Step 2: Simulate checkout and payment
      logUsageEvent({
        type: 'checkout_started',
        metadata: {
          projectedROI: validation.projectedROI,
        },
      });

      logUsageEvent({
        type: 'payment_completed',
      });

      // Step 3: Process audit
      const job = {
        id: 'job_full_001',
        telemetryHash: 'hash_' + Math.random().toString(36).substring(7),
        customerEmail: 'customer@example.com',
        status: 'queued' as const,
        createdAt: new Date().toISOString(),
      };

      const getTelemetryData = () => mockTelemetry;
      const result = await processAuditJob(job, getTelemetryData);

      expect(result.status).toBe('complete');

      logUsageEvent({
        type: 'report_generated',
        metadata: {
          aeiScore: result.aeiScore,
        },
      });

      // Step 4: Verify analytics
      const stats = getSummaryStats();
      expect(stats.totalUploads).toBe(1);
      expect(stats.totalQualified).toBe(1);
      expect(stats.totalPayments).toBe(1);
      expect(stats.totalCompleted).toBe(1);
      expect(stats.totalRevenueUSD).toBe(750);
      expect(stats.qualificationRate).toBe(100);
      expect(stats.completionRate).toBe(100);
    });

    it('should handle non-qualified workflow', () => {
      const emptyTelemetry = { events: [] };
      const validation = validateUpload(emptyTelemetry);

      expect(validation.qualified).toBe(false);

      logUsageEvent({ type: 'upload' });
      logUsageEvent({ type: 'not_qualified' });

      const stats = getSummaryStats();
      expect(stats.totalUploads).toBe(1);
      expect(stats.qualificationRate).toBe(0);
    });

    it('should project revenue accurately', () => {
      // Simulate 30 days of operations
      for (let i = 0; i < 100; i++) {
        logUsageEvent({ type: 'upload' });
      }
      for (let i = 0; i < 70; i++) {
        logUsageEvent({ type: 'qualified' });
      }
      for (let i = 0; i < 70; i++) {
        logUsageEvent({ type: 'payment_completed' });
      }

      const stats = getSummaryStats();
      const projectedMonthlyRevenue = stats.totalPayments * 750;

      expect(stats.totalUploads).toBe(100);
      expect(stats.totalPayments).toBe(70);
      expect(projectedMonthlyRevenue).toBe(52500); // 70 × $750
      expect(stats.qualificationRate).toBe(70);
    });
  });
});
