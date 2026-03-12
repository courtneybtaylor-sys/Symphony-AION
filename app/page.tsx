'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import AuditUploader from '@/components/AuditUploader'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [heroEmail, setHeroEmail] = useState('')
  const uploadRef = useRef<HTMLDivElement>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setMounted(true)

    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user)
      if (user?.email) {
        fetch('/api/auth/profile')
          .then((r) => r.json())
          .then((d) => { if (d.isAdmin) setIsAdmin(true) })
          .catch(() => {})
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
      if (!session?.user) setIsAdmin(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setAuthUser(null)
    setIsAdmin(false)
  }

  const handleEmailSubmit = async (e: React.FormEvent, source: string) => {
    e.preventDefault()
    const emailValue = source === 'hero' ? heroEmail : email
    if (!emailValue) return

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailValue,
          source: source === 'hero' ? 'landing_hero' : 'landing_footer',
          plan: 'free_audit',
          timestamp: new Date().toISOString(),
        }),
      })
      alert('Thank you! Check your email for next steps.')
      if (source === 'hero') setHeroEmail('')
      else setEmail('')
    } catch (err) {
      console.error('Failed to submit email:', err)
    }
  }

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!mounted) return null

  return (
    <div className="w-full min-h-screen flex flex-col bg-nun text-papyrus">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-clay bg-nun/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-gold">SYMPHONY-AION</div>
          <div className="flex items-center gap-6">
            <a href="#scoring" className="text-ghost hover:text-papyrus text-sm transition">
              Scoring
            </a>
            <a href="#ingestion" className="text-ghost hover:text-papyrus text-sm transition">
              Ingestion
            </a>
            <a href="#pricing" className="text-ghost hover:text-papyrus text-sm transition">
              Pricing
            </a>

            {/* Auth nav — 3 states */}
            {!authUser ? (
              /* Logged-out */
              <Link
                href="/auth"
                className="text-ghost hover:text-papyrus text-sm transition"
              >
                Sign In
              </Link>
            ) : isAdmin ? (
              /* Logged-in admin */
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="text-gold hover:text-gold-bright text-sm font-medium transition"
                >
                  Admin
                </Link>
                <span className="text-ghost/40 text-sm">|</span>
                <span className="text-ghost text-xs truncate max-w-[120px]">
                  {authUser.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-ghost hover:text-papyrus text-sm transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              /* Logged-in regular user */
              <div className="flex items-center gap-3">
                <span className="text-ghost text-xs truncate max-w-[140px]">
                  {authUser.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-ghost hover:text-papyrus text-sm transition"
                >
                  Sign Out
                </button>
              </div>
            )}

            <button
              onClick={scrollToUpload}
              className="px-4 py-2 bg-gold hover:bg-gold-bright text-nun rounded-lg font-medium transition text-sm"
            >
              Upload
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-stone to-nun">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-papyrus leading-tight">
              Forensic Audits for AI Workflows
            </h1>
            <p className="text-xl text-ghost mb-8 leading-relaxed">
              Upload your telemetry. We'll analyze costs, governance, and system health. Get actionable recommendations with dollar-quantified savings projections.
            </p>

            {/* Hero Email Capture */}
            <div className="mb-12 bg-stone/50 border border-clay rounded-lg p-8 backdrop-blur">
              <form onSubmit={(e) => handleEmailSubmit(e, 'hero')} className="flex gap-3 flex-col sm:flex-row">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={heroEmail}
                  onChange={(e) => setHeroEmail(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 bg-nun border border-clay rounded-lg text-papyrus placeholder-ghost focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gold hover:bg-gold-bright text-nun font-semibold rounded-lg transition whitespace-nowrap"
                >
                  Get Started Free
                </button>
              </form>
              <p className="text-xs text-ghost mt-3">Free audit upload. Full PDF report requires $750 payment.</p>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              <div className="bg-clay/50 rounded-lg p-4 border border-clay">
                <div className="text-gold font-bold text-lg">78</div>
                <div className="text-xs text-ghost">AEI Score</div>
              </div>
              <div className="bg-clay/50 rounded-lg p-4 border border-clay">
                <div className="text-teal-light font-bold text-lg">$2.4K</div>
                <div className="text-xs text-ghost">Monthly Savings</div>
              </div>
              <div className="bg-clay/50 rounded-lg p-4 border border-clay">
                <div className="text-sand font-bold text-lg">Grade A</div>
                <div className="text-xs text-ghost">Efficiency</div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 rounded-full border border-clay bg-stone text-teal-light text-sm font-medium">
                ✓ Multi-Format Ingestion
              </div>
              <div className="px-4 py-2 rounded-full border border-clay bg-stone text-teal-light text-sm font-medium">
                ✓ Real-Time Scoring
              </div>
              <div className="px-4 py-2 rounded-full border border-clay bg-stone text-teal-light text-sm font-medium">
                ✓ PDF + JSON Export
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof Strip */}
      <section className="border-y border-clay bg-stone/50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-gold">8+</div>
              <div className="text-xs text-ghost">Input Formats</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-light">19</div>
              <div className="text-xs text-ghost">LLM Models</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sand">3</div>
              <div className="text-xs text-ghost">Scoring Metrics</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gold">100k+</div>
              <div className="text-xs text-ghost">Events/Upload</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-light">24h</div>
              <div className="text-xs text-ghost">Report Expiry</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-light">$750</div>
              <div className="text-xs text-ghost">Per Audit</div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section ref={uploadRef} id="upload" className="py-20 px-6 bg-nun border-b border-clay scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-papyrus">Upload & Analyze</h2>
          <p className="text-ghost mb-12 max-w-2xl">
            Drop your telemetry file and we'll detect the format, normalize the data, and run the full scoring pipeline.
          </p>
          <AuditUploader />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-stone/30 border-b border-clay">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-papyrus">How It Works</h2>

          {/* Pipeline Bar */}
          <div className="mb-16 bg-clay/30 border border-clay rounded-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <div className="text-sm font-mono text-ghost">1. Upload</div>
                <div className="text-papyrus font-semibold">Multipart Form</div>
              </div>
              <div className="text-gold">→</div>
              <div className="flex-1">
                <div className="text-sm font-mono text-ghost">2. Normalize</div>
                <div className="text-papyrus font-semibold">Format Detection</div>
              </div>
              <div className="text-gold">→</div>
              <div className="flex-1">
                <div className="text-sm font-mono text-ghost">3. Score</div>
                <div className="text-papyrus font-semibold">AEI · GEI · SHI</div>
              </div>
              <div className="text-gold">→</div>
              <div className="flex-1">
                <div className="text-sm font-mono text-ghost">4. Report</div>
                <div className="text-papyrus font-semibold">PDF + JSON</div>
              </div>
            </div>
          </div>

          {/* Step Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-clay/50 border border-clay rounded-lg p-6">
              <div className="text-3xl font-bold text-gold mb-3">1</div>
              <div className="font-semibold text-papyrus mb-2">Format Detection</div>
              <p className="text-sm text-ghost">
                Automatically detect OpenAI, Anthropic, CrewAI, LangChain, n8n, and generic JSON formats.
              </p>
            </div>
            <div className="bg-clay/50 border border-clay rounded-lg p-6">
              <div className="text-3xl font-bold text-gold mb-3">2</div>
              <div className="font-semibold text-papyrus mb-2">Event Normalization</div>
              <p className="text-sm text-ghost">
                Convert all telemetry to canonical event schema with tokens, costs, and timing data.
              </p>
            </div>
            <div className="bg-clay/50 border border-clay rounded-lg p-6">
              <div className="text-3xl font-bold text-gold mb-3">3</div>
              <div className="font-semibold text-papyrus mb-2">Run Graph Build</div>
              <p className="text-sm text-ghost">
                Aggregate events by run ID, detect loop patterns and retry cascades automatically.
              </p>
            </div>
            <div className="bg-clay/50 border border-clay rounded-lg p-6">
              <div className="text-3xl font-bold text-gold mb-3">4</div>
              <div className="font-semibold text-papyrus mb-2">Score & Export</div>
              <p className="text-sm text-ghost">
                Calculate scores and generate comprehensive 9-page PDF report with JSON payload.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring Engine */}
      <section id="scoring" className="py-20 px-6 bg-nun border-b border-clay scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-papyrus">Scoring Engine</h2>
          <p className="text-ghost mb-12 max-w-2xl">
            Three complementary metrics measure efficiency, governance, and system health across your AI workflows.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* AEI Card */}
            <div className="bg-stone/50 border border-clay rounded-lg p-8">
              <div className="text-5xl font-bold text-gold mb-4">AEI</div>
              <div className="text-sm text-ghost font-mono mb-4">AI Efficiency Index</div>
              <p className="text-papyrus mb-6 leading-relaxed">
                Measures token efficiency, cost optimization, and model allocation across your workflow.
              </p>
              <div className="bg-clay/30 rounded p-4 text-xs font-mono text-sand mb-4">
                <div>0–100 scale</div>
                <div>A–F letter grade</div>
                <div>Loop tax detection</div>
                <div>Model misallocation</div>
              </div>
              <div className="text-xs text-ghost">
                <strong>Formula:</strong> AEI = (100 − loop_tax) × governance_factor
              </div>
            </div>

            {/* GEI Card */}
            <div className="bg-stone/50 border border-clay rounded-lg p-8">
              <div className="text-5xl font-bold text-teal-light mb-4">GEI</div>
              <div className="text-sm text-ghost font-mono mb-4">Governance Enforcement Index</div>
              <p className="text-papyrus mb-6 leading-relaxed">
                Measures policy enforcement rate, auth gate effectiveness, and cost control rigor.
              </p>
              <div className="bg-clay/30 rounded p-4 text-xs font-mono text-sand mb-4">
                <div>Cost (30%)</div>
                <div>Authority (35%)</div>
                <div>Privacy (35%)</div>
              </div>
              <div className="text-xs text-ghost">
                <strong>Range:</strong> 0–100, with 3 sub-dimensions
              </div>
            </div>

            {/* SHI Card */}
            <div className="bg-stone/50 border border-clay rounded-lg p-8">
              <div className="text-5xl font-bold text-sand mb-4">SHI</div>
              <div className="text-sm text-ghost font-mono mb-4">System Health Index</div>
              <p className="text-papyrus mb-6 leading-relaxed">
                Combined metric that factors governance enforcement into efficiency baseline.
              </p>
              <div className="bg-clay/30 rounded p-4 text-xs font-mono text-sand mb-4">
                <div>Healthy: ≥ 70</div>
                <div>Caution: 50–69</div>
                <div>Critical: &lt; 50</div>
              </div>
              <div className="text-xs text-ghost">
                <strong>Formula:</strong> SHI = AEI × (1 − GEI/100)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Universal Ingestion */}
      <section id="ingestion" className="py-20 px-6 bg-stone/30 border-b border-clay scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-papyrus">Universal Ingestion</h2>
          <p className="text-ghost mb-12 max-w-2xl">
            Support for all major AI frameworks and custom JSON formats. Automatic model pricing and cost calculation.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-clay bg-clay/30">
                  <th className="text-left p-4 text-papyrus font-semibold">Format</th>
                  <th className="text-left p-4 text-papyrus font-semibold">Provider</th>
                  <th className="text-left p-4 text-papyrus font-semibold">Detection</th>
                  <th className="text-left p-4 text-papyrus font-semibold">Models</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-clay hover:bg-clay/20">
                  <td className="p-4 text-gold font-mono">openai-export</td>
                  <td className="p-4 text-papyrus">OpenAI</td>
                  <td className="p-4 text-ghost">conversations[] field</td>
                  <td className="p-4 text-ghost">gpt-4, gpt-4o, gpt-3.5-turbo, gpt-4-turbo</td>
                </tr>
                <tr className="border-b border-clay hover:bg-clay/20">
                  <td className="p-4 text-gold font-mono">anthropic-export</td>
                  <td className="p-4 text-papyrus">Anthropic</td>
                  <td className="p-4 text-ghost">uuid + messages</td>
                  <td className="p-4 text-ghost">claude-3-opus, claude-3.5-sonnet, claude-3.5-haiku</td>
                </tr>
                <tr className="border-b border-clay hover:bg-clay/20">
                  <td className="p-4 text-gold font-mono">openai-assistants</td>
                  <td className="p-4 text-papyrus">OpenAI</td>
                  <td className="p-4 text-ghost">run + thread fields</td>
                  <td className="p-4 text-ghost">All OpenAI models</td>
                </tr>
                <tr className="border-b border-clay hover:bg-clay/20">
                  <td className="p-4 text-gold font-mono">langchain</td>
                  <td className="p-4 text-papyrus">LangChain</td>
                  <td className="p-4 text-ghost">runs[] + run_type</td>
                  <td className="p-4 text-ghost">Any LLM via LangChain</td>
                </tr>
                <tr className="border-b border-clay hover:bg-clay/20">
                  <td className="p-4 text-gold font-mono">crewai</td>
                  <td className="p-4 text-papyrus">CrewAI</td>
                  <td className="p-4 text-ghost">crew_name + agents</td>
                  <td className="p-4 text-ghost">Any LLM via CrewAI</td>
                </tr>
                <tr className="border-b border-clay hover:bg-clay/20">
                  <td className="p-4 text-gold font-mono">autogen</td>
                  <td className="p-4 text-papyrus">AutoGen</td>
                  <td className="p-4 text-ghost">messages[] + role</td>
                  <td className="p-4 text-ghost">Any LLM via AutoGen</td>
                </tr>
                <tr className="border-b border-clay hover:bg-clay/20">
                  <td className="p-4 text-gold font-mono">n8n</td>
                  <td className="p-4 text-papyrus">n8n</td>
                  <td className="p-4 text-ghost">executionId + nodes</td>
                  <td className="p-4 text-ghost">Any model via n8n nodes</td>
                </tr>
                <tr className="hover:bg-clay/20">
                  <td className="p-4 text-gold font-mono">generic</td>
                  <td className="p-4 text-papyrus">Custom</td>
                  <td className="p-4 text-ghost">Fallback parser</td>
                  <td className="p-4 text-ghost">Custom formats</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Model Coverage Grid */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-papyrus mb-8">Model Coverage</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-clay/50 border border-clay rounded-lg p-6">
                <div className="font-semibold text-papyrus mb-3">OpenAI (6)</div>
                <ul className="text-xs text-ghost space-y-2 font-mono">
                  <li>• gpt-4 Turbo</li>
                  <li>• gpt-4o / gpt-4o-mini</li>
                  <li>• gpt-3.5-turbo</li>
                </ul>
              </div>
              <div className="bg-clay/50 border border-clay rounded-lg p-6">
                <div className="font-semibold text-papyrus mb-3">Anthropic (4)</div>
                <ul className="text-xs text-ghost space-y-2 font-mono">
                  <li>• Claude 3 Opus</li>
                  <li>• Claude 3.5 Sonnet</li>
                  <li>• Claude 3.5 Haiku</li>
                </ul>
              </div>
              <div className="bg-clay/50 border border-clay rounded-lg p-6">
                <div className="font-semibold text-papyrus mb-3">Google (3)</div>
                <ul className="text-xs text-ghost space-y-2 font-mono">
                  <li>• Gemini 1.5 Pro</li>
                  <li>• Gemini 1.5 Flash</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-nun border-b border-clay scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-papyrus">Pricing</h2>
          <p className="text-ghost mb-12 max-w-2xl">
            Simple, transparent pricing. Free uploads. Pay for reports that deliver value.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Tier 1: Free */}
            <div className="bg-stone/50 border border-clay rounded-lg p-8">
              <div className="font-semibold text-papyrus text-lg mb-2">Free Upload</div>
              <div className="text-3xl font-bold text-gold mb-6">$0</div>
              <p className="text-ghost text-sm mb-8">Perfect for testing and evaluation.</p>
              <ul className="text-sm text-ghost space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>Upload any format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>Format auto-detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>Preview scores (AEI · GEI · SHI)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ghost/50">✗</span>
                  <span className="text-ghost/50">PDF report</span>
                </li>
              </ul>
              <button className="w-full px-4 py-2 border border-clay rounded-lg text-papyrus hover:bg-clay/30 transition">
                Try Now
              </button>
            </div>

            {/* Tier 2: Full Audit */}
            <div className="bg-gold/20 border-2 border-gold rounded-lg p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gold text-nun px-3 py-1 rounded-full text-xs font-semibold">
                Most Popular
              </div>
              <div className="font-semibold text-papyrus text-lg mb-2">Full Audit Report</div>
              <div className="text-4xl font-bold text-gold mb-6">$750</div>
              <p className="text-ghost text-sm mb-8">Get everything you need for one audit.</p>
              <ul className="text-sm text-ghost space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>All preview features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>9-page PDF report</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>JSON export</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>24-hour download link</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>Email delivery</span>
                </li>
              </ul>
              <button onClick={scrollToUpload} className="w-full px-4 py-2 bg-gold hover:bg-gold-bright text-nun rounded-lg font-semibold transition">
                Start Audit
              </button>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="bg-stone/50 border border-clay rounded-lg p-8">
              <div className="font-semibold text-papyrus text-lg mb-2">Enterprise</div>
              <div className="text-3xl font-bold text-sand mb-6">Custom</div>
              <p className="text-ghost text-sm mb-8">Unlimited audits, integration, and support.</p>
              <ul className="text-sm text-ghost space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>Unlimited monthly audits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>API access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>White-label reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-light">✓</span>
                  <span>Custom integrations</span>
                </li>
              </ul>
              <a
                href="mailto:courtneybtaylor@kheperllc.com"
                className="w-full px-4 py-2 border border-clay rounded-lg text-papyrus hover:bg-clay/30 transition block text-center"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Email Capture */}
      <section className="py-16 px-6 bg-stone/30 border-b border-clay">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-papyrus mb-4">Stay Updated</h3>
          <p className="text-ghost mb-6">Get product updates, feature releases, and insights delivered to your inbox.</p>
          <form onSubmit={(e) => handleEmailSubmit(e, 'footer')} className="flex gap-3 flex-col sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 bg-nun border border-clay rounded-lg text-papyrus placeholder-ghost focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gold hover:bg-gold-bright text-nun font-semibold rounded-lg transition whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-nun border-t border-clay">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-gold font-bold mb-4">SYMPHONY-AION</div>
              <p className="text-ghost text-sm">Forensic audits for AI workflows.</p>
            </div>
            <div>
              <div className="font-semibold text-papyrus mb-4">Product</div>
              <ul className="text-sm text-ghost space-y-2">
                <li>
                  <a href="#scoring" className="hover:text-papyrus transition">
                    Scoring Engine
                  </a>
                </li>
                <li>
                  <a href="#ingestion" className="hover:text-papyrus transition">
                    Ingestion
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-papyrus transition">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-papyrus mb-4">Company</div>
              <ul className="text-sm text-ghost space-y-2">
                <li>
                  <a href="https://github.com/courtneybtaylor-sys/Symphony-AION" className="hover:text-papyrus transition">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="mailto:courtneybtaylor@kheperllc.com" className="hover:text-papyrus transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-papyrus mb-4">Legal</div>
              <ul className="text-sm text-ghost space-y-2">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-clay pt-8 text-center text-ghost text-sm">
            <p className="mb-2">
              <strong className="text-papyrus">Kheper PBC</strong> | Built by Courtney B. Taylor
            </p>
            <p className="mb-2">
              Email:{' '}
              <a href="mailto:courtneybtaylor@kheperllc.com" className="text-gold hover:text-gold-bright transition">
                courtneybtaylor@kheperllc.com
              </a>
            </p>
            <p>© 2026 Kheper PBC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
