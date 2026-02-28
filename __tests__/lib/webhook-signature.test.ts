/**
 * Phase 4f/5b: Webhook Signature Verification Tests
 */

import crypto from 'crypto';

// Replicate the verification logic for testing
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret) return true;
  if (!signature) return false;

  const elements = signature.split(',');
  const timestampStr = elements.find((e) => e.startsWith('t='))?.slice(2);
  const sigHash = elements.find((e) => e.startsWith('v1='))?.slice(3);

  if (!timestampStr || !sigHash) return false;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestampStr}.${body}`)
    .digest('hex');

  const sigBuf = Buffer.from(sigHash);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

describe('Webhook Signature Verification', () => {
  const secret = 'whsec_test_secret_key_123';
  const body = JSON.stringify({
    id: 'evt_123',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_123' } },
  });

  function createValidSignature(body: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    return `t=${timestamp},v1=${sig}`;
  }

  it('accepts valid signature', () => {
    const signature = createValidSignature(body, secret);
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    const result = verifyWebhookSignature(body, 't=123,v1=invalidsig', secret);
    expect(result).toBe(false);
  });

  it('rejects null signature when secret is set', () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
  });

  it('accepts any request when no secret is configured', () => {
    expect(verifyWebhookSignature(body, null, undefined)).toBe(true);
  });

  it('rejects malformed signature format', () => {
    expect(verifyWebhookSignature(body, 'invalid-format', secret)).toBe(false);
  });

  it('rejects signature with wrong body', () => {
    const signature = createValidSignature('different body', secret);
    expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
  });

  it('rejects signature with wrong secret', () => {
    const signature = createValidSignature(body, 'wrong_secret');
    expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
  });
});
