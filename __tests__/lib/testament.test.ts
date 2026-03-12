/**
 * Testament Generation Tests
 * Tests for lib/testament.ts
 */

import { generateTestament, generateSovereignCalendarTimestamp, MaatResult } from '../../lib/testament';

describe('Testament Generation', () => {
  const mockPdfBuffer = Buffer.from('mock pdf data');

  describe('generateSovereignCalendarTimestamp', () => {
    it('should return a timestamp with SC-2026- prefix', () => {
      const timestamp = generateSovereignCalendarTimestamp();
      expect(timestamp).toMatch(/^SC-2026-/);
    });

    it('should format timestamp as SC-2026-MM-DD-D#-E#-UTC#', () => {
      const timestamp = generateSovereignCalendarTimestamp();
      // Format: SC-2026-03-12-D1-E1-UTC-6
      expect(timestamp).toMatch(/^SC-2026-\d{2}-\d{2}-D[1-3]-E1-UTC-6$/);
    });

    it('should produce consistent timestamps for the same moment', () => {
      const ts1 = generateSovereignCalendarTimestamp();
      const ts2 = generateSovereignCalendarTimestamp();
      // Within a second, timestamps should match
      expect(ts1.substring(0, 17)).toBe(ts2.substring(0, 17));
    });
  });

  describe('generateTestament', () => {
    it('should generate testament with correct testament_id format', () => {
      const testament = generateTestament({
        auditId: 'test-123',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.testament_id).toBe('SAR-AION-test-123');
    });

    it('should set G7=FAIL when aeiScore is 0', () => {
      const testament = generateTestament({
        auditId: 'test-zero',
        aeiScore: 0,
        geiScore: 75,
        shiScore: 0,
        shiStatus: 'critical',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.maat_result.G7).toBe('FAIL');
    });

    it('should set G2=FAIL when geiScore < 20', () => {
      const testament = generateTestament({
        auditId: 'test-low-gei',
        aeiScore: 85,
        geiScore: 15,
        shiScore: 60,
        shiStatus: 'caution',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.maat_result.G2).toBe('FAIL');
    });

    it('should set all gates to PASS when scores are good', () => {
      const testament = generateTestament({
        auditId: 'test-good',
        aeiScore: 85,
        geiScore: 80,
        shiScore: 70,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const allPass = Object.values(testament.maat_result).every(v => v === 'PASS');
      expect(allPass).toBe(true);
    });

    it('should set correct score values in testament', () => {
      const testament = generateTestament({
        auditId: 'test-scores',
        aeiScore: 85.5,
        geiScore: 75.3,
        shiScore: 65.2,
        shiStatus: 'caution',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.aei_score).toBe(85.5);
      expect(testament.gei_score).toBe(75.3);
      expect(testament.shi_score).toBe(65.2);
      expect(testament.shi_status).toBe('caution');
    });

    it('should generate valid payload_hash from PDF buffer', () => {
      const testament = generateTestament({
        auditId: 'test-hash',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      // SHA256 hash should be 64 hex characters
      expect(testament.payload_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should set agent_id to SYMPHONY-AION-v1.0', () => {
      const testament = generateTestament({
        auditId: 'test-agent',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.agent_id).toBe('SYMPHONY-AION-v1.0');
    });

    it('should set action to FORENSIC_AUDIT_COMPLETED', () => {
      const testament = generateTestament({
        auditId: 'test-action',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.action).toBe('FORENSIC_AUDIT_COMPLETED');
    });

    it('should set authority_ref to Kheper PBC / ORDA-CERT-AION-001', () => {
      const testament = generateTestament({
        auditId: 'test-auth',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.authority_ref).toBe('Kheper PBC / ORDA-CERT-AION-001');
    });

    it('should set orda_anchor to null initially', () => {
      const testament = generateTestament({
        auditId: 'test-orda',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.orda_anchor).toBeNull();
    });

    it('should set created_at to a valid ISO string', () => {
      const testament = generateTestament({
        auditId: 'test-created',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      expect(testament.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should allow partial maat_result override', () => {
      const testament = generateTestament({
        auditId: 'test-override',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
        maatResult: { G3: 'FAIL' },
      });

      expect(testament.maat_result.G3).toBe('FAIL');
      expect(testament.maat_result.G1).toBe('PASS');
    });
  });
});
