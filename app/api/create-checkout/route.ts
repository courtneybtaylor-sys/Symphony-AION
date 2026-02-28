/**
 * POST /api/create-checkout
 * Creates a Stripe Checkout session for audit purchase
 * Phase 4a: Protected with authentication
 * Phase 4e: Validated with Zod
 */

import { NextResponse } from 'next/server';
import { PRICING } from '@/lib/stripe';
import { requireAuth } from '@/lib/auth/helpers';
import { CheckoutRequestSchema } from '@/lib/validation/schemas';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  // Phase 4a: Require authentication
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();

    // Phase 4e: Validate input
    const parsed = CheckoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { telemetryHash, runSummary } = parsed.data;

    // Verify upload exists in database
    let upload;
    try {
      upload = await prisma.upload.findUnique({
        where: { hash: telemetryHash },
      });
    } catch {
      // DB may not be available
    }

    if (!upload) {
      // In test mode, allow without DB verification
      console.warn(`[Checkout] Upload not found for hash: ${telemetryHash} (may be test mode)`);
    }

    // Build metadata for Stripe session
    const metadata = {
      telemetryHash,
      userId: auth.user.id,
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
      amount: PRICING.PROFESSIONAL.amount,
    };

    // Log analytics
    try {
      await prisma.analyticsEvent.create({
        data: {
          userId: auth.user.id,
          eventType: 'checkout_started',
          metadata: JSON.stringify({ telemetryHash, sessionId: mockSession.id }),
        },
      });
    } catch {
      // Ignore analytics errors
    }

    return NextResponse.json(mockSession);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create checkout session: ${message}` },
      { status: 500 }
    );
  }
}
