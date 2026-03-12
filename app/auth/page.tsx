'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthForm() {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(provider)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(null)
    }
    // On success, browser follows the OAuth redirect — no state update needed
  }

  return (
    <div className="min-h-screen bg-nun flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-bold text-gold">SYMPHONY-AION</a>
          <p className="text-ghost text-sm mt-2">Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-stone border border-clay rounded-xl p-8 shadow-xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={() => handleOAuth('google')}
              disabled={!!loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-papyrus text-nun rounded-lg font-medium text-sm hover:bg-papyrus/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'google' ? (
                <span>Connecting…</span>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Apple */}
            <button
              onClick={() => handleOAuth('apple')}
              disabled={!!loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-nun border border-clay text-papyrus rounded-lg font-medium text-sm hover:bg-clay/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'apple' ? (
                <span>Connecting…</span>
              ) : (
                <>
                  <AppleIcon />
                  <span>Continue with Apple</span>
                </>
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-ghost">
            By signing in you agree to our{' '}
            <span className="text-papyrus/70">terms</span> and{' '}
            <span className="text-papyrus/70">privacy policy</span>.
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-ghost">
          <a href="/" className="hover:text-papyrus transition">← Back to home</a>
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}
