/**
 * POST /api/webhook
 * Stripe webhook handler for payment events
 * Phase 4f: Webhook signature verification
 * Phase 4c: Queue job instead of synchronous processing
 * Task 5: Payload size limits
 */

import { NextResponse } from 'next/server';
import { StripeEventSchema } from '@/lib/validation/schemas';
import { checkPayloadSize } from '@/lib/payload-limits';
import { enqueueAuditJob as enqueueAuditJobBull } from '@/lib/audit-queue';
import crypto from 'crypto';

/**
 * Verify Stripe webhook signature.
 * In production, use stripe.webhooks.constructEvent().
 * This is a simplified version for test mode.
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  // If no secret configured, skip verification (test mode)
  if (!secret) return true;

  if (!signature) return false;

  // Parse Stripe signature format: t=timestamp,v1=signature
  const elements = signature.split(',');
  const timestampStr = elements.find((e) => e.startsWith('t='))?.slice(2);
  const sigHash = elements.find((e) => e.startsWith('v1='))?.slice(3);

  if (!timestampStr || !sigHash) return false;

  // Verify signature using HMAC
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestampStr}.${body}`)
    .digest('hex');

  const sigBuf = Buffer.from(sigHash);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

export async function POST(request: Request) {
  try {
    // Task 5: Check payload size
    const contentLength = request.headers.get('content-length');
    const sizeCheck = checkPayloadSize(contentLength, '/api/webhook');
    if (!sizeCheck.allowed) {
      return NextResponse.json(
        { error: sizeCheck.error || 'Payload too large' },
        { status: 413 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Phase 4f: Verify webhook signature
    if (webhookSecret && !verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let event;
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Phase 4e: Validate event structure
    const parsed = StripeEventSchema.safeParse(event);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event format', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const telemetryHash = session.metadata?.telemetryHash;
      const userId = session.metadata?.userId;
      const customerEmail = session.customer_details?.email;

      console.log(
        `[Webhook] Payment complete: session ${session.id}, customer ${customerEmail}`
      );

      // Phase 4b: Create audit job in database
      let uploadId: string | undefined;
      try {
        const { default: prisma } = await import('@/lib/db');
        const upload = await prisma.upload.findUnique({
          where: { hash: telemetryHash },
        });
        uploadId = upload?.id;

        if (upload && userId) {
          await prisma.auditJob.create({
            data: {
              uploadId: upload.id,
              userId,
              stripeSessionId: session.id,
              status: 'queued',
            },
          });
        }
      } catch {
        // DB may not be available in test mode
      }

      // Phase 4c: Enqueue job for async processing via Bull queue (returns immediately)
      if (uploadId && userId) {
        try {
          const jobId = await enqueueAuditJobBull({
            uploadId,
            userId,
            telemetryHash,
            userEmail: customerEmail || 'unknown@example.com',
          });
          console.log(`[Webhook] Enqueued audit job: ${jobId}`);
        } catch (err) {
          console.error('[Webhook] Failed to enqueue job:', err);
        }
      }

      // Log analytics
      try {
        const { default: prisma } = await import('@/lib/db');
        await prisma.analyticsEvent.create({
          data: {
            userId: userId || null,
            eventType: 'payment_completed',
            metadata: { sessionId: session.id, telemetryHash } as any,
          },
        });
      } catch {
        // Ignore analytics errors
      }

      return NextResponse.json({ success: true, queued: true });
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.log(
        `[Webhook] Payment failed: ${paymentIntent.id}, reason: ${paymentIntent.last_payment_error?.message}`
      );
      return NextResponse.json({ success: true });
    }

    // All other events return 200
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Webhook] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
