/**
 * Role-Based Access Control (RBAC)
 * Admin and super-admin management
 */

export type UserRole = 'user' | 'admin' | 'super_admin'

export const SUPER_ADMINS = [
  'courtneybtaylor@kheperllc.com',
  'samiamombo8@gmail.com',
]

/**
 * Check if user has a specific role
 */
export async function userHasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user) return false

    if (role === 'super_admin') {
      return user.role === 'super_admin'
    } else if (role === 'admin') {
      return user.role === 'admin' || user.role === 'super_admin'
    }

    return user.role === role
  } catch {
    return false
  }
}

/**
 * Check if email is a super-admin
 */
export function isEmailSuperAdmin(email: string): boolean {
  return SUPER_ADMINS.includes(email.toLowerCase())
}

/**
 * Promote user to super-admin
 */
export async function promoteToSuperAdmin(email: string): Promise<boolean> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    const result = await prisma.user.updateMany({
      where: { email: { mode: 'insensitive', equals: email } },
      data: { role: 'super_admin' },
    })

    if (result.count > 0) {
      console.log(`[RBAC] ✓ Promoted ${email} to super_admin`)
      return true
    }

    console.warn(`[RBAC] User not found: ${email}`)
    return false
  } catch (error) {
    console.warn(`[RBAC] Failed to promote user: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Promote user to admin
 */
export async function promoteToAdmin(email: string): Promise<boolean> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    const result = await prisma.user.updateMany({
      where: { email: { mode: 'insensitive', equals: email } },
      data: { role: 'admin' },
    })

    if (result.count > 0) {
      console.log(`[RBAC] ✓ Promoted ${email} to admin`)
      return true
    }

    return false
  } catch (error) {
    console.warn(`[RBAC] Failed to promote user: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Demote user to regular user
 */
export async function demoteToUser(email: string): Promise<boolean> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    const result = await prisma.user.updateMany({
      where: { email: { mode: 'insensitive', equals: email } },
      data: { role: 'user' },
    })

    if (result.count > 0) {
      console.log(`[RBAC] ✓ Demoted ${email} to user`)
      return true
    }

    return false
  } catch (error) {
    console.warn(`[RBAC] Failed to demote user: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Initialize super-admins on startup
 * Creates accounts if they don't exist and ensures they have super_admin role
 */
export async function initializeSuperAdmins(): Promise<void> {
  console.log('[RBAC] Initializing super-admins...')

  const { default: getPrisma } = await import('./db');
  const prisma = await getPrisma();

  for (const email of SUPER_ADMINS) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (user) {
        // Update role if not already super_admin
        if (user.role !== 'super_admin') {
          await prisma.user.update({
            where: { email },
            data: { role: 'super_admin' },
          })
          console.log(`[RBAC] ✓ Set ${email} as super_admin`)
        }
      } else {
        // Create user if doesn't exist
        await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0], // Use email prefix as name
            role: 'super_admin',
            subscriptionTier: 'enterprise',
          },
        })
        console.log(`[RBAC] ✓ Created super_admin account: ${email}`)
      }
    } catch (error) {
      console.warn(`[RBAC] Error initializing ${email}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

/**
 * Get all admin users
 */
export async function getAdminUsers(): Promise<
  Array<{
    id: string
    email: string
    role: string
    name: string | null
  }>
> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    return await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'super_admin'],
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}
