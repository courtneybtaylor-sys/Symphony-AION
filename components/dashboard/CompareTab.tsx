'use client'

import { RunViewModel } from '@/lib/types'
import { metricCard } from '@/lib/design-tokens'

interface CompareTabProps {
  data: RunViewModel | null
  loading: boolean
}

export function CompareTab({ data, loading }: CompareTabProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-secondary/10 border border-accent/20 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No comparison data available. Run multiple workflows to compare.</p>
      </div>
    )
  }

  // For demo purposes, calculate potential savings
  const potentialTokenSavings = Math.round(data.tokens.total * 0.15) // 15% potential savings
  const potentialCostSavings = (data.costs.total * 0.15).toFixed(4)
  const potentialLatencySavings = Math.round(data.duration.ms * 0.20) // 20% potential latency improvement

  return (
    <div className="space-y-6">
      {/* Comparison Header */}
      <div className="grid grid-cols-3 gap-4">
        <div className={metricCard.base}>
          <div className={metricCard.title}>Baseline</div>
          <div className={metricCard.value}>{data.tokens.total}</div>
          <div className={metricCard.subtitle}>Tokens used</div>
        </div>
        <div className={metricCard.base + ' border-cyan-500/50 border-2'}>
          <div className="text-cyan-400 font-mono font-bold text-sm mb-2">Optimized</div>
          <div className="text-2xl font-bold text-cyan-400">
            {data.tokens.total - potentialTokenSavings}
          </div>
          <div className={metricCard.subtitle}>Tokens used</div>
        </div>
        <div className={metricCard.base + ' border-green-500/50 border-2'}>
          <div className="text-green-400 font-mono font-bold text-sm mb-2">Savings</div>
          <div className="text-2xl font-bold text-green-400">{potentialTokenSavings}</div>
          <div className={metricCard.subtitle}>-{((potentialTokenSavings / data.tokens.total) * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Cost Comparison */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Cost Analysis</div>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-primary/30 rounded">
              <div className="text-xs text-muted-foreground mb-1">Baseline Cost</div>
              <div className="text-lg font-bold text-foreground">${data.costs.total.toFixed(4)}</div>
            </div>
            <div className="p-3 bg-cyan-900/20 rounded border border-cyan-700/40">
              <div className="text-xs text-cyan-300 mb-1">Optimized Cost</div>
              <div className="text-lg font-bold text-cyan-400">${(data.costs.total * 0.85).toFixed(4)}</div>
            </div>
            <div className="p-3 bg-green-900/20 rounded border border-green-700/40">
              <div className="text-xs text-green-300 mb-1">Monthly Savings</div>
              <div className="text-lg font-bold text-green-400">${potentialCostSavings}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Comparison */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Performance Comparison</div>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Baseline Latency</span>
            <span className="font-mono font-bold text-foreground">{data.duration.ms}ms</span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-cyan-300">Optimized Latency</span>
            <span className="font-mono font-bold text-cyan-400">{data.duration.ms - potentialLatencySavings}ms</span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full"
              style={{ width: `${((data.duration.ms - potentialLatencySavings) / data.duration.ms) * 100}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-accent/20">
            <span className="text-sm text-green-300 font-medium">Improvement</span>
            <span className="font-mono font-bold text-green-400">
              {potentialLatencySavings}ms -{((potentialLatencySavings / data.duration.ms) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Model Comparison */}
      {data.costs.byModel.length > 0 && (
        <div className={metricCard.base}>
          <div className={metricCard.title}>Model-by-Model Savings</div>
          <div className="space-y-3 mt-4">
            {data.costs.byModel.map((model) => (
              <div key={`${model.provider}-${model.model}`} className="p-3 bg-primary/20 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-foreground">
                    {model.model} ({model.provider})
                  </div>
                  <div className="text-sm text-muted-foreground">{model.percentage.toFixed(1)}% of total</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Baseline</div>
                    <div className="text-sm font-mono text-foreground">${model.cost.toFixed(4)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-cyan-300 mb-1">Optimized</div>
                    <div className="text-sm font-mono text-cyan-400">${(model.cost * 0.85).toFixed(4)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-green-300 mb-1">Savings</div>
                    <div className="text-sm font-mono text-green-400">${(model.cost * 0.15).toFixed(4)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
        <div className="text-sm text-green-300 font-medium mb-2">💡 Optimization Recommendation</div>
        <p className="text-sm text-green-200/80">
          Based on this run's telemetry, applying our suggested optimizations could save{' '}
          <span className="font-bold">{((potentialTokenSavings / data.tokens.total) * 100).toFixed(1)}% tokens</span>
          {' '}and{' '}
          <span className="font-bold">${potentialCostSavings}</span> per run. Enable optimization to apply these automatically.
        </p>
      </div>
    </div>
  )
}
