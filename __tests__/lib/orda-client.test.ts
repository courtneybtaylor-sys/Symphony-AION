/**
 * ORDA Client Stub Tests
 * Tests for lib/orda-client.ts
 */

import { anchorTestament, getLocalLedger } from '../../lib/orda-client';
import { generateTestament } from '../../lib/testament';

describe('ORDA Client', () => {
  const mockPdfBuffer = Buffer.from('mock pdf audit data');

  // Clear ledger before each test
  beforeEach(() => {
    // Reset the ledger by getting current length and emptying it
    const ledger = getLocalLedger();
    // We can't directly clear the ledger, so we'll work with what we have
  });

  describe('anchorTestament', () => {
    it('should return anchored=true on successful anchor', async () => {
      const testament = generateTestament({
        auditId: 'test-anchor-1',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const result = await anchorTestament(testament);
      expect(result.anchored).toBe(true);
    });

    it('should return a valid anchor_hash', async () => {
      const testament = generateTestament({
        auditId: 'test-anchor-2',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const result = await anchorTestament(testament);
      // SHA256 hash should be 64 hex characters
      expect(result.anchor_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should set phase to stub', async () => {
      const testament = generateTestament({
        auditId: 'test-anchor-3',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const result = await anchorTestament(testament);
      expect(result.phase).toBe('stub');
    });

    it('should set orda_cert_ref to ORDA-CERT-AION-001', async () => {
      const testament = generateTestament({
        auditId: 'test-anchor-4',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const result = await anchorTestament(testament);
      expect(result.orda_cert_ref).toBe('ORDA-CERT-AION-001');
    });

    it('should include sc_timestamp from testament', async () => {
      const testament = generateTestament({
        auditId: 'test-anchor-5',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const result = await anchorTestament(testament);
      expect(result.sc_timestamp).toBe(testament.sc_timestamp);
    });

    it('should generate deterministic hash for same testament', async () => {
      const testament = generateTestament({
        auditId: 'test-anchor-6',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const result1 = await anchorTestament(testament);
      const result2 = await anchorTestament(testament);
      expect(result1.anchor_hash).toBe(result2.anchor_hash);
    });

    it('should return unique hash for different testaments', async () => {
      const testament1 = generateTestament({
        auditId: 'test-anchor-7a',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const testament2 = generateTestament({
        auditId: 'test-anchor-7b',
        aeiScore: 80,
        geiScore: 70,
        shiScore: 55,
        shiStatus: 'caution',
        pdfBuffer: mockPdfBuffer,
      });

      const result1 = await anchorTestament(testament1);
      const result2 = await anchorTestament(testament2);
      expect(result1.anchor_hash).not.toBe(result2.anchor_hash);
    });

    it('should provide a ledger_entry_id', async () => {
      const testament = generateTestament({
        auditId: 'test-anchor-8',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const result = await anchorTestament(testament);
      expect(result.ledger_entry_id).toMatch(/^ORDA-LOCAL-\d+$/);
    });
  });

  describe('getLocalLedger', () => {
    it('should return an array of ledger entries', () => {
      const ledger = getLocalLedger();
      expect(Array.isArray(ledger)).toBe(true);
    });

    it('should include testament_id in ledger entries', async () => {
      const testament = generateTestament({
        auditId: 'test-ledger-1',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      await anchorTestament(testament);
      const ledger = getLocalLedger();

      // Check if our testament is in the ledger
      const entry = ledger.find(e => e.testament_id === testament.testament_id);
      expect(entry).toBeDefined();
      expect(entry?.testament_id).toBe(testament.testament_id);
    });

    it('should include anchor_hash in ledger entries', async () => {
      const testament = generateTestament({
        auditId: 'test-ledger-2',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      const result = await anchorTestament(testament);
      const ledger = getLocalLedger();

      const entry = ledger.find(e => e.testament_id === testament.testament_id);
      expect(entry?.anchor_hash).toBe(result.anchor_hash);
    });

    it('should include sc_timestamp in ledger entries', async () => {
      const testament = generateTestament({
        auditId: 'test-ledger-3',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      await anchorTestament(testament);
      const ledger = getLocalLedger();

      const entry = ledger.find(e => e.testament_id === testament.testament_id);
      expect(entry?.sc_timestamp).toMatch(/^SC-2026-/);
    });

    it('should include anchored_at timestamp in ledger entries', async () => {
      const testament = generateTestament({
        auditId: 'test-ledger-4',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      await anchorTestament(testament);
      const ledger = getLocalLedger();

      const entry = ledger.find(e => e.testament_id === testament.testament_id);
      expect(entry?.anchored_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return a copy of the ledger (not reference)', async () => {
      const testament = generateTestament({
        auditId: 'test-ledger-5',
        aeiScore: 85,
        geiScore: 75,
        shiScore: 60,
        shiStatus: 'healthy',
        pdfBuffer: mockPdfBuffer,
      });

      await anchorTestament(testament);
      const ledger1 = getLocalLedger();
      const ledger2 = getLocalLedger();

      expect(ledger1).not.toBe(ledger2);
      expect(ledger1).toEqual(ledger2);
    });
  });
});
