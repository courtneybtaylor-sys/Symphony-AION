'use client';

import { useState, useCallback } from 'react';

interface EmailCaptureModalProps {
  onSubmit: (email: string) => void;
  onCancel: () => void;
}

export default function EmailCaptureModal({ onSubmit, onCancel }: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }

      onSubmit(email);
    },
    [email, onSubmit]
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white">Get Your Free Preview</h3>
        <p className="text-slate-400">Enter your email to receive AEI, GEI, and SHI scores</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="you@example.com"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
          {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
        </div>

        <div className="flex items-start gap-3">
          <input
            id="consent"
            type="checkbox"
            checked={consentMarketing}
            onChange={(e) => setConsentMarketing(e.target.checked)}
            className="mt-1 w-4 h-4 accent-blue-600"
          />
          <label htmlFor="consent" className="text-sm text-slate-400">
            Keep me updated about new features and special offers
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Get Preview
          </button>
        </div>
      </form>
    </div>
  );
}
