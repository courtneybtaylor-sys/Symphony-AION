/**
 * Supabase Auth Configuration
 * Replaces NextAuth configuration.
 * Auth is now handled via Supabase OAuth — Google + Apple.
 *
 * Admin email list is the source of truth for super-admin promotion
 * on first sign-in.  Role checks for other users read from Prisma User.role.
 */

export const SUPER_ADMIN_EMAILS = [
  'courtneybtaylor@kheperllc.com',
  'samiamombo8@gmail.com',
]

export function isAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}
