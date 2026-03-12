/**
 * ORDA Registry Client — Phase 2 Stub
 * Full ORDA anchoring goes live post-April 2026.
 * This stub generates a deterministic local anchor hash
 * and logs to the local ledger for NIST Appendix B.
 *
 * ORDA = Open Registry for Distributed Audits
 * Kheper PBC Missouri (ORDA-CERT-AION-001)
 */

import crypto from 'crypto';
import { Testament } from './testament';

/**
 * Result of ORDA anchoring operation
 */
export interface OrdaAnchorResult {
  anchored: boolean;
  anchor_hash: string;
  sc_timestamp: string;
  ledger_entry_id: string;
  orda_cert_ref: string;
  phase: 'stub' | 'live';
}

/**
 * In-memory ledger for Phase 2
 * Replace with database write in Phase 3
 */
const LOCAL_LEDGER: Array<{
  testament_id: string;
  anchor_hash: string;
  sc_timestamp: string;
  anchored_at: string;
}> = [];

/**
 * Get the local ledger (for auditing and NIST compliance)
 */
export function getLocalLedger() {
  return [...LOCAL_LEDGER];
}

/**
 * Anchor a testament to the ORDA registry
 * Phase 2: Creates deterministic hash and logs to local ledger
 * Phase 3+: Will submit to distributed ORDA registry
 */
export async function anchorTestament(testament: Testament): Promise<OrdaAnchorResult> {
  // Compute anchor hash as SHA256 of testament JSON
  const anchor_hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(testament))
    .digest('hex');

  // Create ledger entry
  const entry = {
    testament_id: testament.testament_id,
    anchor_hash,
    sc_timestamp: testament.sc_timestamp,
    anchored_at: new Date().toISOString(),
  };

  // Append to local ledger
  LOCAL_LEDGER.push(entry);

  console.log(
    `[ORDA] Anchored: ${testament.testament_id} → ${anchor_hash.slice(0, 16)}...`
  );

  return {
    anchored: true,
    anchor_hash,
    sc_timestamp: testament.sc_timestamp,
    ledger_entry_id: `ORDA-LOCAL-${LOCAL_LEDGER.length}`,
    orda_cert_ref: 'ORDA-CERT-AION-001',
    phase: 'stub',
  };
}
