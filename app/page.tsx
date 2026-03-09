'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AuditUploader from '@/components/AuditUploader'

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [showUploader, setShowUploader] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="w-full min-h-screen flex flex-col bg-nun text-papyrus">
      {/* Navigation */}
      <nav className="border-b border-clay bg-stone/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-gold">Symphony-AION</div>
          <Link
            href="/dashboard"
            className="text-ghost hover:text-papyrus text-sm transition"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8 mb-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-papyrus">
              Forensic Audits for AI Workflows
            </h1>
            <p className="text-xl text-ghost">
              Upload your telemetry. We'll analyze costs, recommend optimizations, and project your ROI.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-col md:flex-row gap-3 justify-center flex-wrap">
            <div className="px-4 py-2 rounded-full border border-clay text-teal-light text-sm font-medium bg-stone">
              ✓ AEI Scoring (0-100)
            </div>
            <div className="px-4 py-2 rounded-full border border-clay text-teal-light text-sm font-medium bg-stone">
              ✓ 7-Section PDF Report
            </div>
            <div className="px-4 py-2 rounded-full border border-clay text-teal-light text-sm font-medium bg-stone">
              ✓ Dollar-Quantified Savings
            </div>
          </div>
        </div>

        {/* Uploader or CTA */}
        {!showUploader ? (
          <div className="space-y-6 text-center">
            <button
              onClick={() => setShowUploader(true)}
              className="px-8 py-4 bg-gold hover:bg-gold-bright text-nun font-semibold rounded-lg transition inline-block"
            >
              Start Your Audit
            </button>
            <p className="text-ghost text-sm">
              or <Link href="/dashboard" className="text-sand hover:text-papyrus underline transition">
                view sample audit
              </Link>
            </p>
          </div>
        ) : (
          <AuditUploader />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-clay bg-stone/50 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-ghost text-sm space-y-2">
          <p>
            <strong className="text-papyrus">Kheper LLC</strong> | Founded by Courtney B. Taylor
          </p>
          <p>
            Questions? Email{' '}
            <a href="mailto:hello@khepellc.com" className="text-gold hover:text-gold-bright transition">
              hello@khepellc.com
            </a>
            {' '}| Phone:{' '}
            <a href="tel:+18165276799" className="text-gold hover:text-gold-bright transition">
              +1(816) 527-6799
            </a>
          </p>
          <p>
            Visit us at{' '}
            <a href="https://khepellc.com" className="text-gold hover:text-gold-bright transition">
              khepellc.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
