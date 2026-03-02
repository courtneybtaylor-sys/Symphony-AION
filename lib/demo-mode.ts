/**
 * Demo Mode Configuration
 * Phase 4: Development mode that bypasses authentication for testing
 * 
 * When NEXT_PUBLIC_DEMO_MODE=true, the app allows:
 * - Access to protected routes without authentication
 * - Demo user session with admin privileges
 * - Full IR-Parser testing without credentials
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Demo user returned when authentication is bypassed
 */
export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@symphony-aion.local',
  name: 'Demo User',
  role: 'super_admin',
  createdAt: new Date('2026-03-01'),
};

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  }
  // Client-side
  return typeof window !== 'undefined' && 
         (window as any).__DEMO_MODE === true;
}

/**
 * Get demo session token for API calls
 */
export function getDemoSessionToken(): string {
  return `demo-token-${Date.now()}`;
}

/**
 * Check if a request is in demo mode
 */
export function isRequestDemoMode(
  request?: { headers?: { get?: (name: string) => string | null } }
): boolean {
  if (!DEMO_MODE) return false;
  
  if (request?.headers?.get) {
    const demoHeader = request.headers.get('x-demo-mode');
    return demoHeader === 'true';
  }
  
  return DEMO_MODE;
}
