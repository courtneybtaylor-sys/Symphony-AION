'use client';

import { useState } from 'react';
import { RunViewModel } from '@/lib/types';
import { AEIScore } from '@/lib/aei-score';
import { generateAuditReport, AuditRecommendation } from '@/lib/pdf-report';

interface DownloadReportButtonProps {
  runData: RunViewModel;
  aeiScore: AEIScore;
  recommendations: AuditRecommendation[];
  className?: string;
  label?: string;
}

export function DownloadReportButton({
  runData,
  aeiScore,
  recommendations,
  className = 'px-4 py-2 bg-amber-600 text-black rounded hover:bg-amber-700 text-sm font-medium',
  label = '↓ Download Audit Report — PDF',
}: DownloadReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const blob = await generateAuditReport(runData, aeiScore, recommendations, {
        reportDate: new Date().toISOString().split('T')[0],
        reportId: `AION-${runData.id}`,
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aion-audit-${runData.id}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Report generation failed';
      setError(message);
      console.error('PDF generation error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`${className} ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {loading ? '⟳ Generating Report...' : label}
      </button>
      {error && (
        <p className="text-xs text-red-600">
          Error: {error}
        </p>
      )}
    </div>
  );
}
