/**
 * GET /api/admin/users
 * Returns all users. Admin-only.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) return null

  const { default: getPrisma } = await import('@/lib/db')
  const prisma = await getPrisma()
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true },
  })
  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'super_admin')) return null
  return dbUser
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { default: getPrisma } = await import('@/lib/db')
    const prisma = await getPrisma()

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ users })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
