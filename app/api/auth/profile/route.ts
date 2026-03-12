/**
 * GET /api/auth/profile
 * Returns the current user's role info for client-side nav rendering.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return NextResponse.json({ isAdmin: false, role: null })
  }

  try {
    const { default: getPrisma } = await import('@/lib/db')
    const prisma = await getPrisma()
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true },
    })

    const role = dbUser?.role || 'user'
    return NextResponse.json({
      isAdmin: role === 'admin' || role === 'super_admin',
      role,
    })
  } catch {
    return NextResponse.json({ isAdmin: false, role: 'user' })
  }
}
