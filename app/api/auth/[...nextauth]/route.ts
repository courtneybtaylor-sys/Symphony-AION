/**
 * NextAuth route — replaced by Supabase auth.
 * Redirects legacy /api/auth/* requests to the Supabase auth page.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/auth', request.url))
}

export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/auth', request.url))
}
