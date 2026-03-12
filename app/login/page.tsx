'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function LoginForm() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  const supabase = createClient()

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
      },
    })
    if (error) { setError(error.message); setLoading(null) }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('email')
    setError(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}` }
      })
      if (error) { setError(error.message) } else { setEmailSent(true) }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message) } else { router.push(returnTo); router.refresh() }
    }
    setLoading(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg, #0d0a07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f5edd0', letterSpacing: '-0.02em' }}>
            Symphony<span style={{ color: '#c8973a' }}>-AION</span>
          </div>
          <p style={{ color: '#8a8a96', fontSize: 13, marginTop: 8 }}>
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {emailSent ? (
          <div style={{ background: '#1a1208', border: '1px solid #2e1f0a', borderRadius: 8, padding: 24, textAlign: 'center', color: '#f5edd0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉</div>
            <p style={{ fontSize: 14, color: '#b8b5ae' }}>Check your email to confirm your account, then sign in.</p>
          </div>
        ) : (
          <div style={{ background: '#1a1208', border: '1px solid #2e1f0a', borderRadius: 12, padding: 32 }}>
            {error && (
              <div style={{ background: 'rgba(107,45,45,0.3)', border: '1px solid #6b2d2d', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#c44444' }}>
                {error}
              </div>
            )}

            {/* OAuth buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              <button
                onClick={() => handleOAuth('google')}
                disabled={!!loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', background: '#f5edd0', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#0d0a07', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {loading === 'google' ? 'Connecting…' : 'Continue with Google'}
              </button>

              <button
                onClick={() => handleOAuth('apple')}
                disabled={!!loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', background: '#2e1f0a', border: '1px solid #7a5a20', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#f5edd0', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#f5edd0">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                {loading === 'apple' ? 'Connecting…' : 'Continue with Apple'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: '#2e1f0a' }} />
              <span style={{ fontSize: 11, color: '#56565e', letterSpacing: '0.08em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#2e1f0a' }} />
            </div>

            {/* Email / password */}
            <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="Email address"
                style={{ padding: '10px 14px', background: '#0d0a07', border: '1px solid #2e1f0a', borderRadius: 8, color: '#f5edd0', fontSize: 14, outline: 'none' }}
              />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Password"
                style={{ padding: '10px 14px', background: '#0d0a07', border: '1px solid #2e1f0a', borderRadius: 8, color: '#f5edd0', fontSize: 14, outline: 'none' }}
              />
              <button
                type="submit" disabled={!!loading}
                style={{ padding: '11px 16px', background: '#c8973a', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#0d0a07', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading === 'email' ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#56565e' }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
                style={{ background: 'none', border: 'none', color: '#c8973a', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#56565e' }}>
          By continuing you agree to our{' '}
          <Link href="/terms" style={{ color: '#8a8a96' }}>Terms</Link> &{' '}
          <Link href="/privacy" style={{ color: '#8a8a96' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
