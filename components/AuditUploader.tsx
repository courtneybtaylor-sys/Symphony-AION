'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UploadState {
  stage: 'idle' | 'uploading' | 'validating' | 'qualified' | 'not-qualified' | 'error';
  file: File | null;
  error?: string;
  result?: {
    qualified: boolean;
    warningOnly?: boolean;
    summary: {
      runCount: number;
      modelCallCount: number;
      totalCostUSD: number;
      totalTokens: number;
      frameworkDetected: string;
      modelsDetected: string[];
      estimatedSavingsRangeLow: number;
      estimatedSavingsRangeHigh: number;
      estimatedNewAEI?: number;
    };
    projectedROI: number;
    telemetryHash: string;
    message: string;
  };
}

export default function AuditUploader() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ stage: 'idle', file: null });
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.json')) {
        setState({
          stage: 'error',
          file: null,
          error: 'Please upload a valid JSON file',
        });
        return;
      }

      setState({ stage: 'uploading', file });

      try {
        const text = await file.text();
        const telemetry = JSON.parse(text);

        setState({ stage: 'validating', file });

        const response = await fetch('/api/upload-telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telemetry }),
        });

        if (!response.ok) {
          const error = await response.json();
          setState({
            stage: 'error',
            file: null,
            error: error.error || 'Upload failed',
          });
          return;
        }

        const result = await response.json();

        if (result.qualified) {
          setState({
            stage: 'qualified',
            file,
            result,
          });
        } else {
          setState({
            stage: 'not-qualified',
            file,
            result,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setState({
          stage: 'error',
          file: null,
          error: `Parse error: ${message}`,
        });
      }
    },
    [router]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files?.[0]) {
        handleUpload(e.dataTransfer.files[0]);
      }
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        handleUpload(e.target.files[0]);
      }
    },
    [handleUpload]
  );

  const handleFullAudit = useCallback(() => {
    if (!state.result) return;
    const summary = state.result.summary;
    const summaryStr = encodeURIComponent(
      JSON.stringify({
        runCount: summary.runCount,
        modelCallCount: summary.modelCallCount,
        totalCostUSD: summary.totalCostUSD,
        totalTokens: summary.totalTokens,
        frameworkDetected: summary.frameworkDetected,
        estimatedSavingsRangeLow: summary.estimatedSavingsRangeLow,
        estimatedSavingsRangeHigh: summary.estimatedSavingsRangeHigh,
        projectedROI: state.result.projectedROI,
      })
    );
    router.push(
      `/checkout?hash=${state.result.telemetryHash}&summary=${summaryStr}`
    );
  }, [state.result, router]);

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8">
      {/* Idle: Drag-and-drop zone */}
      {state.stage === 'idle' && (
        <div className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-12 text-center transition ${
              dragActive
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-slate-400 hover:border-slate-300'
            }`}
          >
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-3">
              <div className="text-4xl">📤</div>
              <h3 className="text-lg font-semibold text-white">Upload Telemetry</h3>
              <p className="text-slate-400">
                Drag and drop your <code className="bg-slate-900/50 px-2 py-1 rounded">run.json</code> file here
              </p>
              <p className="text-sm text-slate-500">or click to select file</p>
            </div>
          </div>

          <div className="text-sm text-slate-400 space-y-2 bg-slate-900/50 rounded p-4">
            <p className="font-semibold text-white">What we analyze:</p>
            <ul className="space-y-1">
              <li>✓ Model call frequency and cost patterns</li>
              <li>✓ Token efficiency (prompt size vs output)</li>
              <li>✓ Retry and validation loops</li>
              <li>✓ Latency per step</li>
              <li>✓ Failure rates and recovery</li>
            </ul>
          </div>
        </div>
      )}

      {/* Uploading */}
      {state.stage === 'uploading' && (
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-slate-400">Uploading {state.file?.name}...</p>
        </div>
      )}

      {/* Validating */}
      {state.stage === 'validating' && (
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-slate-400">Validating against intake gate...</p>
        </div>
      )}

      {/* Qualified - Choose Option */}
      {state.stage === 'qualified' && state.result && (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-500/50">
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
            <h3 className="text-xl font-bold text-green-400">Qualified for Audit!</h3>
            <p className="text-slate-400 text-sm">Choose how to proceed</p>
          </div>

          {state.result.warningOnly && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4 text-sm">
              <p className="text-amber-300 font-medium mb-2">⚠️ Note:</p>
              <p className="text-amber-200">
                {state.result.summary.runCount} run(s) uploaded. For more accurate analysis,
                consider uploading telemetry from at least 10 runs to identify patterns.
              </p>
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Framework</div>
                <div className="text-white font-mono">{state.result.summary.frameworkDetected}</div>
              </div>
              <div>
                <div className="text-slate-400">Model Calls</div>
                <div className="text-white">{state.result.summary.modelCallCount}</div>
              </div>
              <div>
                <div className="text-slate-400">Total Cost</div>
                <div className="text-white">${state.result.summary.totalCostUSD.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-slate-400">Total Tokens</div>
                <div className="text-white">{state.result.summary.totalTokens.toLocaleString()}</div>
              </div>
            </div>

            <div className="border-t border-slate-600 pt-4">
              <div className="text-slate-400 text-sm mb-1">Estimated Monthly Savings</div>
              <div className="text-2xl font-bold text-green-400">
                ${Math.round(state.result.summary.estimatedSavingsRangeLow)}–$
                {Math.round(state.result.summary.estimatedSavingsRangeHigh)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                At 100 runs/month. ROI: {state.result.projectedROI.toFixed(1)}×
              </div>
            </div>
          </div>

          <button
            onClick={handleFullAudit}
            className="w-full px-6 py-3 bg-gold hover:bg-gold-bright text-nun rounded-lg font-medium transition"
          >
            Purchase Full Audit ($750)
          </button>
        </div>
      )}

      {/* Not Qualified */}
      {state.stage === 'not-qualified' && state.result && (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-xl font-bold text-amber-400">Does Not Qualify</h3>
            <p className="text-slate-400">{state.result.message}</p>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 space-y-4">
            <h4 className="font-semibold text-white">Current Metrics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Model Calls</div>
                <div className="text-white">{state.result.summary.modelCallCount}</div>
              </div>
              <div>
                <div className="text-slate-400">Total Cost</div>
                <div className="text-white">${state.result.summary.totalCostUSD.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-slate-400">Total Tokens</div>
                <div className="text-white">{state.result.summary.totalTokens.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-400">Framework</div>
                <div className="text-white font-mono text-xs">{state.result.summary.frameworkDetected}</div>
              </div>
            </div>

            <div className="border-t border-slate-600 pt-4">
              <p className="text-sm text-slate-400">
                To qualify, ensure your telemetry includes:
              </p>
              <ul className="text-sm text-slate-300 mt-2 space-y-1">
                <li>✓ At least 3 model calls</li>
                <li>✓ Minimum $0.05 in costs</li>
                <li>✓ At least 5,000 total tokens</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setState({ stage: 'idle', file: null })}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm"
          >
            Try Another File
          </button>
        </div>
      )}

      {/* Error */}
      {state.stage === 'error' && (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">❌</div>
            <h3 className="text-xl font-bold text-red-400">Upload Failed</h3>
            <p className="text-slate-400">{state.error}</p>
          </div>

          <button
            onClick={() => setState({ stage: 'idle', file: null })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
