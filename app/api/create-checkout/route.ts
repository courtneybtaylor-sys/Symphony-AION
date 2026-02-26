/**
 * POST /api/create-checkout
 * Creates a Stripe Checkout session for audit purchase
 * Called after intake gate validation passes
 */

import { PRICING } from '@/lib/stripe';

interface CreateCheckoutRequest {
  telemetryHash: string;
  customerEmail?: string;
  runSummary?: {
    runCount: number;
    modelCallCount: number;
    totalCostUSD: number;
    totalTokens: number;
    frameworkDetected: string;
    estimatedSavingsRangeLow: number;
    estimatedSavingsRangeHigh: number;
  };
}

export async function POST(request: Request) {
  try {
    const body: CreateCheckoutRequest = await request.json();
    const { telemetryHash, customerEmail, runSummary } = body;

    if (!telemetryHash) {
      return new Response(
        JSON.stringify({ error: 'Missing telemetryHash' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // In production, validate telemetryHash exists in uploads table
    // For now, we'll just simulate success

    // Build metadata for Stripe session
    const metadata = {
      telemetryHash,
      runCount: runSummary?.runCount?.toString() || '1',
      estimatedSavings: `${runSummary?.estimatedSavingsRangeLow}-${runSummary?.estimatedSavingsRangeHigh}`,
    };

    // In test mode, return a mock checkout session
    // In production, call: const session = await stripe.checkout.sessions.create({...})
    const mockSession = {
      id: `cs_test_${Math.random().toString(36).substring(2, 11)}`,
      client_secret: `cs_test_secret_${Math.random().toString(36).substring(2, 20)}`,
      payment_intent: `pi_test_${Math.random().toString(36).substring(2, 11)}`,
      url: `https://checkout.stripe.com/pay/${Math.random().toString(36).substring(2, 11)}`,
      status: 'open',
      metadata,
    };

    return new Response(JSON.stringify(mockSession), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Failed to create checkout session: ${message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
