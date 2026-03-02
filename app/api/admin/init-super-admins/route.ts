/**
 * POST /api/admin/init-super-admins
 * Initialize super-admin accounts (public endpoint for first-time setup)
 * After setup, should be protected or removed
 */

import { NextResponse } from 'next/server'
import { initializeSuperAdmins } from '@/lib/rbac'

export async function POST() {
  try {
    console.log('[Admin] Initializing super-admin accounts...')

    // In production, add authentication check here
    // const auth = await requireAuth()
    // if (!auth.user || !userHasRole(auth.user.id, 'super_admin')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    // }

    await initializeSuperAdmins()

    return NextResponse.json({
      success: true,
      message: 'Super-admin accounts initialized',
    })
  } catch (error) {
    console.error('[Admin] Initialization failed:', error)
    return NextResponse.json(
      { error: 'Failed to initialize super-admins' },
      { status: 500 }
    )
  }
}
