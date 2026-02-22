'use client'

import { ModelUsageSummary } from '@/lib/types'
import { metricCard } from '@/lib/design-tokens'

interface LeaderboardProps {
  models?: ModelUsageSummary[]
  sortBy?: 'usage' | 'cost' | 'latency'
}

const DEFAULT_MODELS: ModelUsageSummary[] = [
  {
    provider: 'openai',
    model: 'gpt-4-turbo',
    invocationCount: 342,
    totalInputTokens: 125400,
    totalOutputTokens: 89300,
    totalCostUSD: 4.32,
    averageLatencyMs: 1240,
  },
  {
    provider: 'anthropic',
    model: 'claude-3-opus',
    invocationCount: 298,
    totalInputTokens: 98700,
    totalOutputTokens: 74200,
    totalCostUSD: 3.85,
    averageLatencyMs: 980,
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    invocationCount: 512,
    totalInputTokens: 156300,
    totalOutputTokens: 112400,
    totalCostUSD: 2.15,
    averageLatencyMs: 450,
  },
  {
    provider: 'groq',
    model: 'groq-l1',
    invocationCount: 187,
    totalInputTokens: 45200,
    totalOutputTokens: 34100,
    totalCostUSD: 0.82,
    averageLatencyMs: 120,
  },
  {
    provider: 'anthropic',
    model: 'claude-3-sonnet',
    invocationCount: 201,
    totalInputTokens: 67800,
    totalOutputTokens: 51200,
    totalCostUSD: 1.54,
    averageLatencyMs: 650,
  },
]

export function Leaderboard({ models = DEFAULT_MODELS, sortBy = 'usage' }: LeaderboardProps) {
  const sortedModels = [...models].sort((a, b) => {
    switch (sortBy) {
      case 'cost':
        return b.totalCostUSD - a.totalCostUSD
      case 'latency':
        return a.averageLatencyMs - b.averageLatencyMs
      case 'usage':
      default:
        return b.invocationCount - a.invocationCount
    }
  })

  const totalInvocations = models.reduce((sum, m) => sum + m.invocationCount, 0)
  const totalCost = models.reduce((sum, m) => sum + m.totalCostUSD, 0)

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={metricCard.base}>
          <div className={metricCard.title}>Total Invocations</div>
          <div className={metricCard.value}>{totalInvocations.toLocaleString()}</div>
          <div className={metricCard.subtitle}>Across all models</div>
        </div>
        <div className={metricCard.base}>
          <div className={metricCard.title}>Total Cost</div>
          <div className={metricCard.value}>${totalCost.toFixed(2)}</div>
          <div className={metricCard.subtitle}>This billing period</div>
        </div>
        <div className={metricCard.base}>
          <div className={metricCard.title}>Models Active</div>
          <div className={metricCard.value}>{models.length}</div>
          <div className={metricCard.subtitle}>In rotation</div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Model Performance Leaderboard</div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-accent/20">
                <th className="text-left py-3 px-3 text-muted-foreground font-mono text-xs">Rank</th>
                <th className="text-left py-3 px-3 text-muted-foreground font-mono text-xs">Model</th>
                <th className="text-right py-3 px-3 text-muted-foreground font-mono text-xs">Calls</th>
                <th className="text-right py-3 px-3 text-muted-foreground font-mono text-xs">Tokens (In/Out)</th>
                <th className="text-right py-3 px-3 text-muted-foreground font-mono text-xs">Cost</th>
                <th className="text-right py-3 px-3 text-muted-foreground font-mono text-xs">Avg Latency</th>
                <th className="text-center py-3 px-3 text-muted-foreground font-mono text-xs">Usage %</th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((model, idx) => {
                const usagePercent = (model.invocationCount / totalInvocations) * 100
                return (
                  <tr key={`${model.provider}-${model.model}`} className="border-b border-accent/10 hover:bg-accent/5 transition-colors">
                    <td className="py-3 px-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs
                        ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}
                      `}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-foreground">{model.model}</div>
                      <div className="text-xs text-muted-foreground">{model.provider}</div>
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-foreground">{model.invocationCount}</td>
                    <td className="text-right py-3 px-3 font-mono text-foreground text-xs">
                      {model.totalInputTokens.toLocaleString()} / {model.totalOutputTokens.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-accent font-bold">${model.totalCostUSD.toFixed(2)}</td>
                    <td className="text-right py-3 px-3 font-mono text-foreground">{model.averageLatencyMs}ms</td>
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-muted/30 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-amber-400 h-2 rounded-full"
                            style={{ width: `${usagePercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{usagePercent.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Efficiency Ranking */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Cost Efficiency ($/1k tokens)</div>
        <div className="space-y-2 mt-4">
          {[...models]
            .sort(
              (a, b) =>
                (a.totalCostUSD / ((a.totalInputTokens + a.totalOutputTokens) / 1000)) -
                (b.totalCostUSD / ((b.totalInputTokens + b.totalOutputTokens) / 1000)),
            )
            .map((model, idx) => {
              const costPerK = model.totalCostUSD / ((model.totalInputTokens + model.totalOutputTokens) / 1000)
              return (
                <div
                  key={`${model.provider}-${model.model}`}
                  className="flex items-center justify-between p-2 bg-primary/20 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{model.model}</span>
                    <span className="text-xs text-muted-foreground">({model.provider})</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400">${costPerK.toFixed(3)}/1k</span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
