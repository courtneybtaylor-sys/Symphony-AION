'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="w-full h-screen flex flex-col bg-[#070709]" style={{ backgroundColor: '#070709' }}>
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* AION Logo Mark */}
        <div className="mb-8 relative w-24 h-24 md:w-28 md:h-28">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-lg transform rotate-12" />
          <div className="absolute inset-1 bg-[#070709] rounded-lg flex items-center justify-center">
            <span className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-cyan-400 to-purple-600 bg-clip-text text-transparent">
              A
            </span>
          </div>
        </div>

        {/* Wordmark */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Symphony<span className="text-amber-400">·</span>AION
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-center text-base md:text-lg mb-12" style={{ color: '#9898a6' }}>
          Every token has a receipt. Every agent has a conscience.
        </p>

        {/* Efficiency Score Ring */}
        <div className="mb-12 flex flex-col items-center">
          <div className="relative w-32 h-32 md:w-40 md:h-40">
            <svg className="w-full h-full" viewBox="0 0 180 180">
              {/* Background circle */}
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="#1a1a1e"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="8"
                strokeDasharray={`${(87 / 100) * 502.65} 502.65`}
                strokeLinecap="round"
                transform="rotate(-90 90 90)"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl md:text-4xl font-bold text-amber-400">87</span>
              <span className="text-xs md:text-sm text-gray-400">/100</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">AION Efficiency Score</p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 justify-center flex-wrap">
          <div className="px-4 py-2 rounded-full border border-cyan-400 text-cyan-400 text-sm md:text-base font-medium bg-cyan-400/5">
            Token Lifecycle Intelligence
          </div>
          <div className="px-4 py-2 rounded-full border border-purple-400 text-purple-400 text-sm md:text-base font-medium bg-purple-400/5">
            Constitutional Governance
          </div>
          <div className="px-4 py-2 rounded-full border border-amber-400 text-amber-400 text-sm md:text-base font-medium bg-amber-400/5">
            Multi-Model Routing
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/dashboard"
          className="px-8 py-3 rounded-lg border-2 border-amber-400 text-amber-400 font-medium hover:bg-amber-400/10 transition-colors flex items-center gap-2"
        >
          Open Dashboard
          <span>→</span>
        </Link>
      </div>

      {/* Bottom Status Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 py-3 px-4 text-center text-sm font-mono text-black/80"
        style={{ backgroundColor: '#fbbf24' }}
      >
        SYMPHONY-AION v1.0 · DEMO MODE · GROQ CONNECTED
      </div>
    </div>
  )
}
