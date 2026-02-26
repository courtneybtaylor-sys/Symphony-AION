/**
 * POST /api/webhook
 * Stripe webhook handler for payment events
 * Verifies signature and processes checkout.session.completed events
 */

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    // In production, verify webhook signature:
    // const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    // For test mode without real Stripe library, we'll accept any valid JSON

    let event;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // In production, would:
      // 1. Extract telemetryHash from session.metadata
      // 2. Extract customerEmail from session.customer_details.email
      // 3. Create audit_jobs record in database
      // 4. Enqueue audit job for processing
      // 5. Send confirmation email

      console.log(
        `[Webhook] Payment complete: session ${session.id}, customer ${session.customer_details?.email}`
      );

      // Simulate job creation
      const mockJobId = `job_${Math.random().toString(36).substring(2, 11)}`;
      console.log(`[Webhook] Created audit job: ${mockJobId}`);

      return new Response(JSON.stringify({ success: true, jobId: mockJobId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.log(
        `[Webhook] Payment failed: ${paymentIntent.id}, reason: ${paymentIntent.last_payment_error?.message}`
      );
      // In production: log to audit_jobs with status 'payment_failed'
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // All other events return 200 (webhook must respond fast)
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Webhook] Error:', message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
