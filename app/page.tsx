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
    <div className="w-full min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">Symphony-AION</div>
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8 mb-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Forensic Audits for AI Workflows
            </h1>
            <p className="text-xl text-slate-400">
              Upload your telemetry. We'll analyze costs, recommend optimizations, and project your ROI.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-col md:flex-row gap-3 justify-center flex-wrap">
            <div className="px-4 py-2 rounded-full border border-cyan-400/40 text-cyan-300 text-sm font-medium bg-cyan-400/5">
              ✓ AEI Scoring (0-100)
            </div>
            <div className="px-4 py-2 rounded-full border border-blue-400/40 text-blue-300 text-sm font-medium bg-blue-400/5">
              ✓ 7-Section PDF Report
            </div>
            <div className="px-4 py-2 rounded-full border border-green-400/40 text-green-300 text-sm font-medium bg-green-400/5">
              ✓ Dollar-Quantified Savings
            </div>
          </div>
        </div>

        {/* Uploader or CTA */}
        {!showUploader ? (
          <div className="space-y-6 text-center">
            <button
              onClick={() => setShowUploader(true)}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition inline-block"
            >
              Start Your Audit
            </button>
            <p className="text-slate-400 text-sm">
              or <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
                view sample audit
              </Link>
            </p>
          </div>
        ) : (
          <AuditUploader />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 bg-slate-900/50 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-400 text-sm space-y-2">
          <p>
            <strong className="text-white">Kheper LLC</strong> | Founded by Courtney B. Taylor
          </p>
          <p>
            Questions? Email{' '}
            <a href="mailto:hello@khepellc.com" className="text-blue-400 hover:text-blue-300">
              hello@khepellc.com
            </a>
            {' '}| Phone:{' '}
            <a href="tel:+18165276799" className="text-blue-400 hover:text-blue-300">
              +1(816) 527-6799
            </a>
          </p>
          <p>
            Visit us at{' '}
            <a href="https://khepellc.com" className="text-blue-400 hover:text-blue-300">
              khepellc.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
