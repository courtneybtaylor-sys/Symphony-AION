/**
 * POST /api/validate-upload
 * Validates telemetry JSON and runs intake gate
 * Called BEFORE Stripe checkout to preview savings and check qualification
 * Task 5: Payload size limits
 */

import { validateUpload } from '@/lib/intake-gate';
import { checkPayloadSize } from '@/lib/payload-limits';

export async function POST(request: Request) {
  try {
    // Task 5: Check payload size
    const contentLength = request.headers.get('content-length');
    const sizeCheck = checkPayloadSize(contentLength, '/api/validate-upload');
    if (!sizeCheck.allowed) {
      return new Response(
        JSON.stringify({ error: sizeCheck.error || 'Payload too large' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { telemetry } = body;

    if (!telemetry) {
      return new Response(
        JSON.stringify({
          error: 'Missing telemetry field in request body',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Run intake gate validation
    const result = validateUpload(telemetry);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: `Failed to validate telemetry: ${message}`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
