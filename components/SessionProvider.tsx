'use client'

/**
 * Auth is handled via Supabase client-side helpers (lib/supabase/client.ts).
 * This component is kept as a passthrough wrapper for layout compatibility.
 */
export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
