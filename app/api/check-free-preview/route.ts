/**
 * GET /api/check-free-preview
 * Returns whether this browser/email has already claimed a free preview.
 * Checks the HttpOnly cookie set by /api/free-preview.
 * Also accepts ?email= for an explicit email lookup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middleware';

async function handler(request: NextRequest): Promise<NextResponse> {
  // 1. Cookie-based check (fast, no DB needed)
  const cookieClaimed = request.cookies.get('free_preview_claimed')?.value === 'true';

  if (cookieClaimed) {
    return NextResponse.json({ claimed: true, source: 'cookie' });
  }

  // 2. Optional: email-based lookup via query param
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (email) {
    try {
      const { default: getPrisma } = await import('@/lib/db');
      const prisma = await getPrisma();
      const existing = await (prisma as any).freePreviewRequest.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ claimed: true, source: 'email' });
      }
    } catch {
      // DB unavailable – fall through
    }
  }

  return NextResponse.json({ claimed: false });
}

export function GET(request: NextRequest) {
  return withRateLimit(request, handler);
}
