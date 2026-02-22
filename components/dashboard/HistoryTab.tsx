'use client'

import { RunViewModel } from '@/lib/types'
import { metricCard } from '@/lib/design-tokens'

interface HistoryTabProps {
  data: RunViewModel | null
  loading: boolean
}

export function HistoryTab({ data, loading }: HistoryTabProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-secondary/10 border border-accent/20 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No history data available.</p>
      </div>
    )
  }

  // Generate mock historical runs for demo
  const historicalRuns = [
    { date: new Date(Date.now() - 86400000), tokens: 42300, cost: 1.25, status: 'completed', duration: 145 },
    {
      date: new Date(Date.now() - 172800000),
      tokens: 38500,
      cost: 1.08,
      status: 'completed',
      duration: 132,
    },
    {
      date: new Date(Date.now() - 259200000),
      tokens: 51200,
      cost: 1.54,
      status: 'completed',
      duration: 178,
    },
    {
      date: new Date(Date.now() - 345600000),
      tokens: 44800,
      cost: 1.32,
      status: 'completed',
      duration: 150,
    },
    { date: new Date(Date.now() - 432000000), tokens: 39200, cost: 1.15, status: 'completed', duration: 128 },
  ]

  const avgTokens = Math.round(historicalRuns.reduce((sum, run) => sum + run.tokens, 0) / historicalRuns.length)
  const avgCost = (historicalRuns.reduce((sum, run) => sum + run.cost, 0) / historicalRuns.length).toFixed(2)
  const avgDuration = Math.round(historicalRuns.reduce((sum, run) => sum + run.duration, 0) / historicalRuns.length)

  return (
    <div className="space-y-6">
      {/* History Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={metricCard.base}>
          <div className={metricCard.title}>Avg Tokens</div>
          <div className={metricCard.value}>{avgTokens.toLocaleString()}</div>
          <div className={metricCard.subtitle}>Last 5 runs</div>
        </div>
        <div className={metricCard.base}>
          <div className={metricCard.title}>Avg Cost</div>
          <div className={metricCard.value}>${avgCost}</div>
          <div className={metricCard.subtitle}>Per run average</div>
        </div>
        <div className={metricCard.base}>
          <div className={metricCard.title}>Avg Duration</div>
          <div className={metricCard.value}>{avgDuration}ms</div>
          <div className={metricCard.subtitle}>Execution time</div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Recent Runs</div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-accent/20">
                <th className="text-left py-3 px-3 text-muted-foreground font-mono text-xs">Date</th>
                <th className="text-right py-3 px-3 text-muted-foreground font-mono text-xs">Tokens</th>
                <th className="text-right py-3 px-3 text-muted-foreground font-mono text-xs">Cost</th>
                <th className="text-right py-3 px-3 text-muted-foreground font-mono text-xs">Duration</th>
                <th className="text-center py-3 px-3 text-muted-foreground font-mono text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {historicalRuns.map((run, idx) => (
                <tr key={idx} className="border-b border-accent/10 hover:bg-accent/5 transition-colors">
                  <td className="py-3 px-3 text-foreground">{run.date.toLocaleDateString()}</td>
                  <td className="text-right py-3 px-3 font-mono text-foreground">{run.tokens.toLocaleString()}</td>
                  <td className="text-right py-3 px-3 font-mono text-accent">${run.cost.toFixed(2)}</td>
                  <td className="text-right py-3 px-3 font-mono text-foreground">{run.duration}ms</td>
                  <td className="text-center py-3 px-3">
                    <span className="inline-block px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 font-mono">
                      {run.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trends */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Trends</div>
        <div className="space-y-4 mt-4">
          {/* Token Trend */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">Token Usage Trend</div>
            <div className="h-20 flex items-end gap-1 bg-primary/20 rounded p-3">
              {historicalRuns.map((run, idx) => {
                const maxTokens = Math.max(...historicalRuns.map((r) => r.tokens))
                const height = (run.tokens / maxTokens) * 100
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t hover:from-cyan-400 hover:to-cyan-300 transition-colors"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                    title={`${run.tokens} tokens`}
                  ></div>
                )
              })}
            </div>
          </div>

          {/* Cost Trend */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">Cost Trend</div>
            <div className="h-20 flex items-end gap-1 bg-primary/20 rounded p-3">
              {historicalRuns.map((run, idx) => {
                const maxCost = Math.max(...historicalRuns.map((r) => r.cost))
                const height = (run.cost / maxCost) * 100
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t hover:from-amber-400 hover:to-amber-300 transition-colors"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                    title={`$${run.cost.toFixed(2)}`}
                  ></div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-primary/20 rounded border border-accent/20">
          <div className="text-xs text-muted-foreground mb-1">Total Runs</div>
          <div className="text-lg font-bold text-foreground">5</div>
        </div>
        <div className="p-3 bg-primary/20 rounded border border-accent/20">
          <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
          <div className="text-lg font-bold text-green-400">100%</div>
        </div>
        <div className="p-3 bg-primary/20 rounded border border-accent/20">
          <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
          <div className="text-lg font-bold text-accent">
            ${(historicalRuns.reduce((sum, run) => sum + run.cost, 0) + data.costs.total).toFixed(2)}
          </div>
        </div>
        <div className="p-3 bg-primary/20 rounded border border-accent/20">
          <div className="text-xs text-muted-foreground mb-1">Total Tokens</div>
          <div className="text-lg font-bold text-foreground">
            {(historicalRuns.reduce((sum, run) => sum + run.tokens, 0) + data.tokens.total).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
