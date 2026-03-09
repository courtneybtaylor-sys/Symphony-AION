'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

interface RunSummary {
  runCount: number;
  modelCallCount: number;
  totalCostUSD: number;
  totalTokens: number;
  frameworkDetected: string;
  estimatedSavingsRangeLow: number;
  estimatedSavingsRangeHigh: number;
  projectedROI: number;
}

const REPORT_SECTIONS = [
  'Executive Summary with AEI score breakdown',
  'Cost Forensics — by model, by step, avoidable costs',
  'Performance Diagnostics — latency analysis',
  'Failure & Risk Analysis — validation and retry logs',
  'Optimization Recommendations — dollar-quantified',
  'Financial Exposure — 12-month cost projections',
];

export default function CheckoutPageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  // Parse summary from query params
  let summary: RunSummary | null = null;
  try {
    const summaryStr = params?.get('summary');
    if (summaryStr) {
      summary = JSON.parse(decodeURIComponent(summaryStr));
    }
  } catch {
    // Fallback if summary missing or invalid
  }

  const handleCheckout = async () => {
    setLoading(true);

    try {
      // In production: send telemetryHash to create-checkout endpoint
      // For now, just simulate redirect to Stripe
      const telemetryHash = params?.get('hash') || 'demo_hash';

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetryHash,
          customerEmail: email || undefined,
          runSummary: summary,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const session = await response.json();

      // In production: redirect to session.url
      // For test mode: show confirmation message
      alert(`Checkout session created: ${session.id}\n\nIn production, you would be redirected to Stripe.`);
      setLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error: ${message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold">Symphony-AION</div>
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            ← Back
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Forensic Audit Checkout</h1>
            <p className="text-slate-400">
              7-section PDF report with AEI score & recommendations
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Left: What's Included */}
            <div className="col-span-2 space-y-6">
              {/* Summary Card */}
              {summary && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Your Workflow Summary</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Framework</div>
                      <div className="text-white font-mono">{summary.frameworkDetected}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Runs</div>
                      <div className="text-white">{summary.runCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Model Calls</div>
                      <div className="text-white">{summary.modelCallCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Total Cost</div>
                      <div className="text-white">${summary.totalCostUSD.toFixed(4)}</div>
                    </div>
                  </div>

                  {/* Estimated Savings */}
                  <div className="bg-green-900/20 border border-green-700/40 rounded p-4">
                    <div className="text-sm text-green-300 mb-1">Estimated Monthly Savings</div>
                    <div className="text-2xl font-bold text-green-400">
                      ${Math.round(summary.estimatedSavingsRangeLow)}–$
                      {Math.round(summary.estimatedSavingsRangeHigh)}
                    </div>
                    <div className="text-xs text-green-300 mt-2">
                      At 100 runs/month. ROI: {summary.projectedROI.toFixed(1)}×
                    </div>
                  </div>
                </div>
              )}

              {/* What's Included */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">What's Included</h2>
                <ul className="space-y-2">
                  {REPORT_SECTIONS.map((section, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-slate-300">{section}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data Privacy */}
              <div className="text-xs text-slate-400 bg-slate-800/30 border border-slate-700 rounded p-4">
                🔒 Your telemetry is processed once and deleted after 48 hours. No storage, no tracking.
              </div>
            </div>

            {/* Right: Checkout Card */}
            <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600 rounded-lg p-6 h-fit sticky top-6 space-y-6">
              {/* Price */}
              <div>
                <div className="text-5xl font-bold text-white">$750</div>
                <div className="text-sm text-slate-400 mt-1">One-time payment</div>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Email (for report delivery)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                />
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition text-sm"
              >
                {loading ? 'Processing...' : 'Proceed to Secure Checkout'}
              </button>

              {/* Trust Signals */}
              <div className="text-xs text-slate-400 text-center space-y-1">
                <div>🔒 Secure Stripe checkout</div>
                <div>📧 Instant report delivery</div>
                <div>❌ No subscription</div>
              </div>

              {/* Support */}
              <div className="text-xs text-slate-400 text-center border-t border-slate-600 pt-4">
                Questions? Email{' '}
                <a href="mailto:hello@khepellc.com" className="text-blue-400 hover:text-blue-300">
                  hello@khepellc.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
