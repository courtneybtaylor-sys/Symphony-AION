/**
 * Payload Size Limits
 * Task 5: Enforces maximum request/response sizes to prevent DoS attacks
 * Configurable per endpoint with sensible defaults
 */

export interface PayloadLimitConfig {
  maxBodySizeBytes: number
  maxTelemetryRecords: number
  maxTelemetryFieldSizeBytes: number
}

/**
 * Default payload limits (adjustable per environment)
 */
export const DEFAULT_PAYLOAD_LIMITS: Record<string, PayloadLimitConfig> = {
  '/api/upload-telemetry': {
    maxBodySizeBytes: 10 * 1024 * 1024, // 10 MB for telemetry upload
    maxTelemetryRecords: 10000, // Max 10k run records in single upload
    maxTelemetryFieldSizeBytes: 1024 * 1024, // 1 MB per field
  },
  '/api/webhook': {
    maxBodySizeBytes: 5 * 1024 * 1024, // 5 MB for webhook
    maxTelemetryRecords: 0,
    maxTelemetryFieldSizeBytes: 0,
  },
  '/api/create-checkout': {
    maxBodySizeBytes: 100 * 1024, // 100 KB for checkout
    maxTelemetryRecords: 0,
    maxTelemetryFieldSizeBytes: 0,
  },
  '/api/validate-upload': {
    maxBodySizeBytes: 10 * 1024 * 1024, // 10 MB for validation
    maxTelemetryRecords: 10000,
    maxTelemetryFieldSizeBytes: 1024 * 1024,
  },
}

/**
 * Check request size against configured limits
 * Returns error response if limit exceeded
 */
export function checkPayloadSize(
  contentLength: string | number | null | undefined,
  pathname: string
): { allowed: boolean; error?: string } {
  if (!contentLength) {
    return { allowed: true }
  }

  const config = DEFAULT_PAYLOAD_LIMITS[pathname] || DEFAULT_PAYLOAD_LIMITS['/api/upload-telemetry']
  const contentLengthNum = typeof contentLength === 'string' ? parseInt(contentLength, 10) : contentLength

  if (isNaN(contentLengthNum)) {
    return { allowed: true }
  }

  if (contentLengthNum > config.maxBodySizeBytes) {
    const maxMB = (config.maxBodySizeBytes / (1024 * 1024)).toFixed(1)
    const actualMB = (contentLengthNum / (1024 * 1024)).toFixed(1)
    return {
      allowed: false,
      error: `Payload too large. Maximum: ${maxMB}MB, received: ${actualMB}MB`,
    }
  }

  return { allowed: true }
}

/**
 * Validate telemetry object structure for size limits
 */
export function validateTelemetrySize(telemetry: any, pathname: string): { valid: boolean; error?: string } {
  const config = DEFAULT_PAYLOAD_LIMITS[pathname]
  if (!config || config.maxTelemetryRecords === 0) {
    return { valid: true }
  }

  // Check if telemetry is an array of runs
  const runs = Array.isArray(telemetry) ? telemetry : telemetry.runs ? telemetry.runs : [telemetry]

  if (runs.length > config.maxTelemetryRecords) {
    return {
      valid: false,
      error: `Too many run records. Maximum: ${config.maxTelemetryRecords}, received: ${runs.length}`,
    }
  }

  // Check individual field sizes (spot check first few runs)
  for (let i = 0; i < Math.min(3, runs.length); i++) {
    const run = runs[i]
    if (run && typeof run === 'object') {
      for (const [key, value] of Object.entries(run)) {
        if (typeof value === 'string') {
          const fieldSize = Buffer.byteLength(value, 'utf-8')
          if (fieldSize > config.maxTelemetryFieldSizeBytes) {
            const maxMB = (config.maxTelemetryFieldSizeBytes / (1024 * 1024)).toFixed(1)
            const actualMB = (fieldSize / (1024 * 1024)).toFixed(1)
            return {
              valid: false,
              error: `Field '${key}' exceeds size limit. Maximum: ${maxMB}MB, got: ${actualMB}MB`,
            }
          }
        }
      }
    }
  }

  return { valid: true }
}
