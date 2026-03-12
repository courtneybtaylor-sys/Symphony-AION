'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * /signup redirects to /login — Supabase sign-up is handled there via the
 * "Don't have an account? Sign up" toggle.
 */
export default function SignupPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return null
}
