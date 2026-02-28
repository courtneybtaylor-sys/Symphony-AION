/**
 * Audit Logger
 * Task 8: Security hardening with comprehensive audit logging
 * Logs all security-relevant events for compliance and monitoring
 */

import prisma from './db'

export type AuditAction =
  | 'login_success'
  | 'login_failure'
  | 'login_mfa_required'
  | 'logout'
  | 'password_changed'
  | 'password_reset'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'oauth_signin'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'upload_telemetry'
  | 'checkout_started'
  | 'payment_completed'
  | 'payment_failed'
  | 'audit_generated'
  | 'unauthorized_access'
  | 'suspicious_activity'
  | 'account_locked'
  | 'account_unlocked'

export interface AuditLogEntry {
  userId?: string
  action: AuditAction
  resource?: string
  ip: string
  userAgent?: string
  result: 'success' | 'failure' | 'warning'
  metadata?: Record<string, any>
}

/**
 * Log an audit event to the database
 * Non-blocking: doesn't fail the request if DB is unavailable
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Only log if userId is available or for critical security events
    if (!entry.userId && !['unauthorized_access', 'suspicious_activity'].includes(entry.action)) {
      return
    }

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        ipAddress: entry.ip,
        userAgent: entry.userAgent,
        result: entry.result,
        metadata: entry.metadata as any,
      },
    })

    console.log(`[Audit] ${entry.action} by ${entry.userId || 'anonymous'} (${entry.result})`)
  } catch (error) {
    // Don't fail requests due to logging errors
    console.warn(`[Audit] Failed to log event: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Log failed login attempt
 */
export async function logFailedLogin(email: string, ip: string, userAgent?: string): Promise<void> {
  await logAuditEvent({
    action: 'login_failure',
    resource: email,
    ip,
    userAgent,
    result: 'failure',
    metadata: { email },
  })
}

/**
 * Log successful login
 */
export async function logSuccessfulLogin(userId: string, ip: string, userAgent?: string, method?: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'login_success',
    ip,
    userAgent,
    result: 'success',
    metadata: { method: method || 'credentials' },
  })
}

/**
 * Log logout
 */
export async function logLogout(userId: string, ip: string): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'logout',
    ip,
    result: 'success',
  })
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(resource: string, ip: string, userAgent?: string): Promise<void> {
  await logAuditEvent({
    action: 'unauthorized_access',
    resource,
    ip,
    userAgent,
    result: 'failure',
    metadata: { timestamp: new Date().toISOString() },
  })
}

/**
 * Log suspicious activity (rate limiting, unusual patterns, etc.)
 */
export async function logSuspiciousActivity(
  type: string,
  description: string,
  ip: string,
  userId?: string
): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'suspicious_activity',
    resource: type,
    ip,
    result: 'warning',
    metadata: { type, description },
  })
}

/**
 * Log payment-related events
 */
export async function logPaymentEvent(
  userId: string,
  event: 'payment_completed' | 'payment_failed',
  ip: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: event,
    ip,
    result: event === 'payment_completed' ? 'success' : 'failure',
    metadata,
  })
}

/**
 * Log audit report generation
 */
export async function logAuditGenerated(
  userId: string,
  uploadId: string,
  ip: string,
  aeiScore?: number
): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'audit_generated',
    resource: uploadId,
    ip,
    result: 'success',
    metadata: { aeiScore },
  })
}

/**
 * Log MFA-related events
 */
export async function logMFAEvent(
  userId: string,
  action: 'mfa_enabled' | 'mfa_disabled' | 'login_mfa_required',
  ip: string,
  result: 'success' | 'failure'
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    ip,
    result,
  })
}

/**
 * Get audit log entries for a user (for user dashboard)
 */
export async function getUserAuditLog(userId: string, limit: number = 50) {
  try {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  } catch {
    return []
  }
}
