/**
 * Multi-Factor Authentication (MFA)
 * Task 8: 2FA support using TOTP (Time-based One-Time Password)
 * Compatible with Google Authenticator, Microsoft Authenticator, etc.
 */

import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

/**
 * Generate a new TOTP secret and QR code
 */
export async function generateTOTPSecret(userEmail: string): Promise<{
  secret: string
  qrCode: string
  backupCodes: string[]
}> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `Symphony-AION (${userEmail})`,
    issuer: 'Symphony-AION',
    length: 32,
  })

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!)

  // Generate 10 backup codes (8 digits each) for account recovery
  const backupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  )

  return {
    secret: secret.base32,
    qrCode,
    backupCodes,
  }
}

/**
 * Verify a TOTP code against a secret
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (±30 seconds) for clock drift
    })

    return verified
  } catch {
    return false
  }
}

/**
 * Enable MFA for a user
 */
export async function enableMFA(userId: string, secret: string, backupCodes: string[]): Promise<boolean> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
        mfaBackupCodes: backupCodes,
      },
    })

    console.log(`[MFA] ✓ MFA enabled for user ${userId}`)
    return true
  } catch (error) {
    console.warn(`[MFA] Failed to enable MFA: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Disable MFA for a user
 */
export async function disableMFA(userId: string): Promise<boolean> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    })

    console.log(`[MFA] ✓ MFA disabled for user ${userId}`)
    return true
  } catch (error) {
    console.warn(`[MFA] Failed to disable MFA: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Check if MFA is enabled for a user
 */
export async function isMFAEnabled(userId: string): Promise<boolean> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    })

    return user?.mfaEnabled || false
  } catch {
    return false
  }
}

/**
 * Verify MFA with TOTP or backup code
 */
export async function verifyMFA(userId: string, token: string): Promise<boolean> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaBackupCodes: true, mfaEnabled: true },
    })

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return false
    }

    // Try TOTP first
    if (verifyTOTP(token, user.mfaSecret)) {
      return true
    }

    // Try backup codes
    if (user.mfaBackupCodes && user.mfaBackupCodes.includes(token)) {
      // Remove used backup code
      const updatedCodes = user.mfaBackupCodes.filter((code: any) => code !== token)

      await prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: updatedCodes },
      })

      console.log(`[MFA] ✓ Backup code used for user ${userId}`)
      return true
    }

    return false
  } catch (error) {
    console.warn(`[MFA] Verification failed: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Get remaining backup codes count
 */
export async function getBackupCodesCount(userId: string): Promise<number> {
  try {
    const { default: getPrisma } = await import('./db');
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaBackupCodes: true },
    })

    return user?.mfaBackupCodes?.length || 0
  } catch {
    return 0
  }
}
