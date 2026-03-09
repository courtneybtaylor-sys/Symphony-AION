/**
 * POST /api/free-preview
 * Generates free preview with AEI, GEI, SHI scores.
 * Enforces one free preview per email address.
 * Rate-limited to 5 requests per IP per day.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildRunViewModel } from '@/lib/telemetry';
import { calculateAEI, classifyAEI } from '@/lib/aei-score';
import { calculateGEI } from '@/lib/gei-score';
import { calculateSHI } from '@/lib/shi-score';
import { withRateLimit } from '@/lib/middleware';
import { checkPayloadSize } from '@/lib/payload-limits';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cookie set after successful preview – 1 year
const CLAIMED_COOKIE = 'free_preview_claimed';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function handler(request: NextRequest): Promise<NextResponse> {
  // Payload size guard
  const sizeCheck = checkPayloadSize(
    request.headers.get('content-length'),
    '/api/free-preview'
  );
  if (!sizeCheck.allowed) {
    return NextResponse.json({ error: sizeCheck.error }, { status: 413 });
  }

  let body: { telemetryHash?: string; email?: string; consentMarketing?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { telemetryHash, consentMarketing = false } = body;
  const email = (body.email ?? '').trim().toLowerCase();

  if (!telemetryHash || !email) {
    return NextResponse.json(
      { error: 'telemetryHash and email are required' },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // ── Email uniqueness check ────────────────────────────────────────────────
  let prisma: Awaited<ReturnType<(typeof import('@/lib/db'))['default']>> | null = null;
  try {
    const { default: getPrisma } = await import('@/lib/db');
    prisma = await getPrisma();

    const existing = await (prisma as any).freePreviewRequest.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This email has already claimed a free preview. Upgrade to a full audit for more insights.',
          alreadyClaimed: true,
        },
        { status: 409 }
      );
    }
  } catch (dbErr) {
    // DB unavailable – fall through in dev/test mode
    console.warn('[Free Preview] DB check skipped:', dbErr);
  }

  // ── Retrieve telemetry ────────────────────────────────────────────────────
  let telemetry: any;
  try {
    if (prisma) {
      const upload = await (prisma as any).upload.findUnique({
        where: { hash: telemetryHash },
      });
      if (upload?.telemetry) telemetry = upload.telemetry;
    }
  } catch (dbErr) {
    console.warn('[Free Preview] Could not retrieve upload:', dbErr);
  }

  // Fallback mock for dev/demo
  if (!telemetry) {
    telemetry = {
      runs: [
        {
          id: 'run-demo',
          framework: 'LangChain',
          events: [
            {
              kind: 'MODEL_INVOCATION',
              timestamp: Date.now() - 60_000,
              data: {
                model: 'gpt-4',
                provider: 'openai',
                inputTokens: 150,
                outputTokens: 200,
                cost: 0.015,
              },
            },
          ],
        },
      ],
    };
  }

  // ── Score calculation ─────────────────────────────────────────────────────
  let aeiScore: ReturnType<typeof calculateAEI>;
  let geiScore: ReturnType<typeof calculateGEI>;
  let shiScore: ReturnType<typeof calculateSHI>;

  try {
    const runs = Array.isArray(telemetry.runs) ? telemetry.runs : [telemetry];
    if (runs.length === 0) throw new Error('No runs in telemetry');
    const vm = buildRunViewModel(runs[0]);
    aeiScore = calculateAEI(vm);
    geiScore = calculateGEI(vm);
    shiScore = calculateSHI(aeiScore, geiScore);
  } catch (err) {
    console.error('[Free Preview] Scoring failed:', err);
    return NextResponse.json(
      { error: 'Failed to calculate scores', details: String(err) },
      { status: 500 }
    );
  }

  const { grade } = classifyAEI(aeiScore);

  // ── Persist record ────────────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (prisma) {
    try {
      await (prisma as any).freePreviewRequest.create({
        data: {
          email,
          telemetryHash,
          aei: aeiScore.overall,
          gei: geiScore.overall,
          shi: shiScore.overall,
          grade,
          consentMarketing,
          ipAddress: ip,
          userAgent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
        },
      });
    } catch (dbErr) {
      // Unique violation means race condition – reject
      if (String(dbErr).includes('Unique') || String(dbErr).includes('unique')) {
        return NextResponse.json(
          { success: false, error: 'Email already used.', alreadyClaimed: true },
          { status: 409 }
        );
      }
      console.warn('[Free Preview] Could not persist record:', dbErr);
    }
  }

  console.log(`[Free Preview] Generated preview for ${email}`);

  // ── Build response with claimed cookie ────────────────────────────────────
  const payload = {
    success: true,
    aei: Math.round(aeiScore.overall),
    gei: Math.round(geiScore.overall),
    shi: Math.round(shiScore.overall),
    grade,
    estimatedMonthlySavings: (() => {
      const m = aeiScore.insights?.[0]?.match(/\$(\d+)/);
      return m ? Math.round(Number(m[1])) : 0;
    })(),
    recommendationCount: 4,
  };

  const response = NextResponse.json(payload);
  response.cookies.set(CLAIMED_COOKIE, 'true', {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    httpOnly: false, // readable by JS for UX checks
    sameSite: 'lax',
  });

  return response;
}

export function POST(request: NextRequest) {
  return withRateLimit(request, handler);
}
