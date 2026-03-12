/**
 * /admin — Scout Workstation
 * Server component with role guard.
 * Accessible only to users with role = 'admin' | 'super_admin'.
 * Scope: audit job list, Testament ledger viewer, user management,
 *        manual scoring trigger.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminWorkstation from './AdminWorkstation'

export default async function AdminPage() {
  // Gate 1: must have a Supabase session
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.email) {
    redirect('/auth?returnTo=/admin')
  }

  // Gate 2: must have admin role in Prisma
  let dbUser: { id: string; email: string; name: string | null; role: string } | null = null
  try {
    const { default: getPrisma } = await import('@/lib/db')
    const prisma = await getPrisma()
    dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, email: true, name: true, role: true },
    })
  } catch {
    redirect('/')
  }

  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'super_admin')) {
    redirect('/')
  }

  return <AdminWorkstation currentUser={dbUser} />
}
