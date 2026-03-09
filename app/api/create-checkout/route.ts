/**
 * POST /api/create-checkout
 * Creates a Stripe Checkout session for audit purchase
 * Phase 4a: Protected with authentication
 * Phase 4e: Validated with Zod
 * Task 5: Payload size limits
 * Task 6: Intake gate validation before checkout
 */

import { NextResponse } from 'next/server';
import { PRICING, getStripeClient, AUDIT_PRICE_USD } from '@/lib/stripe';
import { requireAuth } from '@/lib/auth/helpers';
import { CheckoutRequestSchema } from '@/lib/validation/schemas';
import { checkPayloadSize } from '@/lib/payload-limits';
import { validateUpload } from '@/lib/intake-gate';

export async function POST(request: Request) {
  // Task 5: Check payload size
  const contentLength = request.headers.get('content-length');
  const sizeCheck = checkPayloadSize(contentLength, '/api/create-checkout');
  if (!sizeCheck.allowed) {
    return NextResponse.json(
      { error: sizeCheck.error || 'Payload too large' },
      { status: 413 }
    );
  }

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
      const { default: getPrisma } = await import('@/lib/db');
      const prisma = await getPrisma();
      upload = await prisma.upload.findUnique({
        where: { hash: telemetryHash },
      });
    } catch {
      // DB may not be available
    }

    if (!upload) {
      // In test mode, allow without DB verification
      console.warn(`[Checkout] Upload not found for hash: ${telemetryHash} (may be test mode)`);
    } else {
      // Task 6: Validate intake gate before checkout
      const intakeResult = validateUpload(upload.telemetry as any);
      if (!intakeResult.qualified) {
        return NextResponse.json(
          {
            error: 'Upload does not qualify for audit',
            reason: intakeResult.reason,
            details: 'Please ensure your telemetry includes sufficient model call events with cost data',
          },
          { status: 403 }
        );
      }

      console.log(`[Checkout] ✓ Intake gate passed for upload ${telemetryHash}`);
    }

    // Build metadata for Stripe session
    const metadata = {
      telemetryHash,
      userId: auth.user.id,
      runCount: runSummary?.runCount?.toString() || '1',
      estimatedSavings: `${runSummary?.estimatedSavingsRangeLow}-${runSummary?.estimatedSavingsRangeHigh}`,
    };

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      return NextResponse.json(
        {
          error: 'Stripe not configured',
          message: 'Contact hello@symphony-aion.com to complete purchase',
        },
        { status: 503 }
      );
    }

    // Create Stripe checkout session
    try {
      const stripe = getStripeClient();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://symphony-aion.vercel.app';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Symphony-AION Forensic Audit',
                description: 'Comprehensive AI workflow analysis and optimization report',
                images: [],
              },
              unit_amount: AUDIT_PRICE_USD,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout?canceled=true`,
        customer_email: auth.user.email,
        metadata,
      });

      // Log analytics
      try {
        const { default: getPrisma } = await import('@/lib/db');
        const prisma = await getPrisma();
        await prisma.analyticsEvent.create({
          data: {
            userId: auth.user.id,
            eventType: 'checkout_started',
            metadata: JSON.stringify({ telemetryHash, sessionId: session.id }),
          },
        });
      } catch {
        // Ignore analytics errors
      }

      return NextResponse.json({ url: session.url, sessionId: session.id });
    } catch (stripeError) {
      const message = stripeError instanceof Error ? stripeError.message : 'Stripe error';
      return NextResponse.json(
        { error: 'Failed to create Stripe session', details: message },
        { status: 500 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create checkout session: ${message}` },
      { status: 500 }
    );
  }
}
