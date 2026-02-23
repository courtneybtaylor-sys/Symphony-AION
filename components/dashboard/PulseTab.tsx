'use client'

import { RunViewModel } from '@/lib/types'
import { metricCard, components } from '@/lib/design-tokens'

interface PulseTabProps {
  data: RunViewModel | null
  loading: boolean
}

export function PulseTab({ data, loading }: PulseTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={metricCard.base + ' animate-pulse'}>
            <div className="h-4 bg-muted/30 rounded w-20 mb-3"></div>
            <div className="h-8 bg-muted/30 rounded w-32 mb-2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No data available. Run a workflow to see metrics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Live Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status */}
        <div className={metricCard.base}>
          <div className={metricCard.title}>Status</div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full bg-green-500"
              style={{
                backgroundColor:
                  data.status === 'COMPLETED'
                    ? '#10b981'
                    : data.status === 'RUNNING'
                      ? '#3b82f6'
                      : data.status === 'FAILED'
                        ? '#ef4444'
                        : '#f59e0b',
              }}
            ></div>
            <div className={metricCard.value}>{data.status}</div>
          </div>
        </div>

        {/* Duration */}
        <div className={metricCard.base}>
          <div className={metricCard.title}>Duration</div>
          <div className={metricCard.value}>{data.duration.formatted}</div>
          <div className={metricCard.subtitle}>{data.startTime.relative}</div>
        </div>

        {/* Total Tokens */}
        <div className={metricCard.base}>
          <div className={metricCard.title}>Total Tokens</div>
          <div className={metricCard.value}>{data.tokens.total.toLocaleString()}</div>
          <div className={metricCard.subtitle}>
            {data.tokens.input.toLocaleString()} in, {data.tokens.output.toLocaleString()} out
          </div>
        </div>

        {/* Total Cost */}
        <div className={metricCard.base}>
          <div className={metricCard.title}>Cost</div>
          <div className={metricCard.value}>${data.costs.total.toFixed(4)}</div>
          <div className={metricCard.subtitle}>{data.costs.byModel.length} model(s)</div>
        </div>

        {/* Steps Summary */}
        <div className={metricCard.base}>
          <div className={metricCard.title}>Steps</div>
          <div className={metricCard.value}>{data.steps.completed}/{data.steps.total}</div>
          <div className={metricCard.subtitle}>
            {data.steps.failed > 0 && <span className="text-red-400">{data.steps.failed} failed</span>}
          </div>
        </div>

        {/* Events */}
        <div className={metricCard.base}>
          <div className={metricCard.title}>Events</div>
          <div className={metricCard.value}>{data.events.total}</div>
          <div className={metricCard.subtitle}>Telemetry events recorded</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      {data.costs.byModel.length > 0 && (
        <div className={metricCard.base}>
          <div className={metricCard.title}>Cost by Model</div>
          <div className="space-y-3 mt-4">
            {data.costs.byModel.map((model) => (
              <div key={`${model.provider}-${model.model}`} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {model.model} ({model.provider})
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2 mt-1">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${model.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-mono font-bold text-accent ml-4">${model.cost.toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {data.performance.averageStepDurationMs > 0 && (
        <div className={metricCard.base}>
          <div className={metricCard.title}>Performance</div>
          <div className="space-y-2 mt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Step Duration</span>
              <span className="text-foreground">{data.performance.averageStepDurationMs.toFixed(0)}ms</span>
            </div>
            {data.performance.slowestStep && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slowest Step</span>
                <span className="text-foreground">
                  {data.performance.slowestStep.name} ({data.performance.slowestStep.duration.ms}ms)
                </span>
              </div>
            )}
            {data.performance.fastestStep && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fastest Step</span>
                <span className="text-foreground">
                  {data.performance.fastestStep.name} ({data.performance.fastestStep.duration.ms}ms)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
