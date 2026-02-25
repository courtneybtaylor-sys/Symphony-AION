'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SessionStatus {
  status: 'open' | 'complete' | 'expired';
  customer_details?: {
    email?: string;
  };
  payment_intent?: string;
}

export default function CheckoutSuccessPageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = params?.get('session_id');

    if (!sessionId) {
      setLoading(false);
      return;
    }

    // In production: fetch session status from /api/checkout-status
    // For test mode: simulate success
    setTimeout(() => {
      setSession({
        status: 'complete',
        customer_details: {
          email: 'user@example.com',
        },
        payment_intent: 'pi_test_' + Math.random().toString(36).substring(2, 11),
      });
      setLoading(false);
    }, 500);
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-slate-400">Processing your payment...</p>
        </div>
      </div>
    );
  }

  const orderID = session?.payment_intent?.slice(-8) || 'N/A';
  const email = session?.customer_details?.email || 'your email';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold">Symphony-AION</div>
          <button
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            ← Home
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="space-y-8">
          {/* Success Icon */}
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-500/50 mb-6">
              <svg
                className="h-8 w-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Confirmed</h1>
            <p className="text-slate-400">Your audit is being generated.</p>
          </div>

          {/* Status Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">What Happens Next</h2>
              <div className="space-y-2 text-slate-300 text-sm">
                <p>✓ Your audit is being generated on our servers</p>
                <p>✓ You'll receive an email at <span className="font-mono text-white">{email}</span> within 10 minutes</p>
                <p>✓ The email will contain a secure download link (expires in 24 hours)</p>
              </div>
            </div>

            <div className="border-t border-slate-600 pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-slate-400">Order ID</div>
                <div className="font-mono text-white">{orderID}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-slate-400">Amount</div>
                <div className="text-white font-semibold">$750.00</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-slate-400">Status</div>
                <div className="text-green-400 font-semibold">Complete</div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold mb-3">Questions?</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <div className="font-medium text-white mb-1">Didn't receive email?</div>
                <p>Check your spam folder. If you still don't see it after 15 minutes, email us.</p>
              </div>
              <div>
                <div className="font-medium text-white mb-1">Link expired?</div>
                <p>Email hello@symphony-aion.com with your order ID and we'll send a new link.</p>
              </div>
              <div>
                <div className="font-medium text-white mb-1">Need to run another audit?</div>
                <p>
                  <button
                    onClick={() => router.push('/')}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Upload another telemetry file
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="text-center">
            <p className="text-slate-400 text-sm">
              Questions or issues? Email{' '}
              <a href="mailto:hello@symphony-aion.com" className="text-blue-400 hover:text-blue-300">
                hello@symphony-aion.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
