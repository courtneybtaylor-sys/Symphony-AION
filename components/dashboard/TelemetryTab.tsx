'use client'

import { RunViewModel, EventKind } from '@/lib/types'
import { metricCard } from '@/lib/design-tokens'

interface TelemetryTabProps {
  data: RunViewModel | null
  loading: boolean
}

export function TelemetryTab({ data, loading }: TelemetryTabProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-secondary/10 border border-accent/20 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No telemetry data available.</p>
      </div>
    )
  }

  const events = data.raw.events

  return (
    <div className="space-y-6">
      {/* Event Summary */}
      <div className={metricCard.base}>
        <div className="font-mono font-bold text-accent mb-4">Event Summary</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(data.events.byKind)
            .filter(([_, count]) => count > 0)
            .map(([kind, count]) => (
              <div key={kind}>
                <div className="text-xs text-muted-foreground font-mono mb-1">{kind}</div>
                <div className="text-lg font-bold text-foreground">{count}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Token Usage Breakdown */}
      {data.tokens.byModel.length > 0 && (
        <div className={metricCard.base}>
          <div className="font-mono font-bold text-accent mb-4">Token Usage by Model</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/20">
                  <th className="text-left py-2 text-muted-foreground font-mono">Model</th>
                  <th className="text-right py-2 text-muted-foreground font-mono">Input</th>
                  <th className="text-right py-2 text-muted-foreground font-mono">Output</th>
                </tr>
              </thead>
              <tbody>
                {data.tokens.byModel.map((model, idx) => (
                  <tr key={idx} className="border-b border-accent/10 hover:bg-accent/5 transition-colors">
                    <td className="py-2 text-foreground font-mono">{model.model}</td>
                    <td className="text-right py-2 text-foreground">{model.inputTokens.toLocaleString()}</td>
                    <td className="text-right py-2 text-foreground">{model.outputTokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Event Timeline */}
      {events.length > 0 && (
        <div className={metricCard.base}>
          <div className="font-mono font-bold text-accent mb-4">Event Timeline</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, idx) => (
              <div key={event.id} className="flex items-start gap-3 py-2 border-b border-accent/10 last:border-b-0">
                <div className="font-mono text-xs text-muted-foreground flex-shrink-0 pt-1">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-block px-2 py-1 bg-accent/20 text-accent font-mono text-xs rounded">
                      {event.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {Object.keys(event.data).length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground font-mono bg-primary/20 p-2 rounded">
                      {JSON.stringify(event.data).substring(0, 120)}
                      {JSON.stringify(event.data).length > 120 ? '...' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step Details */}
      {data.steps.list.length > 0 && (
        <div className={metricCard.base}>
          <div className="font-mono font-bold text-accent mb-4">Step Execution Details</div>
          <div className="space-y-3">
            {data.steps.list.map((step) => (
              <div key={step.id} className="p-3 bg-primary/20 rounded border border-accent/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-foreground">{step.name}</div>
                  <div className="text-xs px-2 py-1 rounded font-mono bg-accent/20 text-accent">
                    {step.status}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Duration: {step.duration.formatted}</div>
                  <div>Started: {step.startTime.relative}</div>
                  {step.costUSD !== undefined && <div>Cost: ${step.costUSD.toFixed(4)}</div>}
                  {step.inputTokens !== undefined && (
                    <div>
                      Tokens: {step.inputTokens} in, {step.outputTokens} out
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
