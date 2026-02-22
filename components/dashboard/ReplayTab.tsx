'use client'

import { useState, useEffect } from 'react'
import { RunViewModel } from '@/lib/types'
import { metricCard } from '@/lib/design-tokens'

interface ReplayTabProps {
  data: RunViewModel | null
  loading: boolean
}

export function ReplayTab({ data, loading }: ReplayTabProps) {
  const [replayProgress, setReplayProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Proper useEffect with cleanup for replay interval
  useEffect(() => {
    if (!isPlaying || !data) {
      return
    }

    const id = setInterval(() => {
      setReplayProgress((prev) => {
        const next = prev + 1
        if (next > 100) {
          setIsPlaying(false)
          return 100
        }
        return next
      })
    }, 50)

    return () => clearInterval(id)
  }, [isPlaying, data])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-secondary/10 border border-accent/20 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No replay data available.</p>
      </div>
    )
  }

  const totalSteps = data.steps.total
  const currentStep = Math.floor((replayProgress / 100) * totalSteps)

  return (
    <div className="space-y-6">
      {/* Replay Controls */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Replay Controls</div>
        <div className="space-y-4 mt-4">
          <div className="flex gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors font-mono text-sm font-bold"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => {
                setReplayProgress(0)
                setIsPlaying(false)
              }}
              className="px-4 py-2 border border-accent/40 text-accent rounded-md hover:border-accent/60 transition-colors font-mono text-sm"
            >
              ↻ Reset
            </button>
            <button
              onClick={() => setReplayProgress(100)}
              className="px-4 py-2 border border-accent/40 text-accent rounded-md hover:border-accent/60 transition-colors font-mono text-sm"
            >
              ↻↻ Skip to End
            </button>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="w-full bg-muted/30 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-cyan-500 to-amber-400 h-3 rounded-full transition-all"
                style={{ width: `${replayProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
              <span>{replayProgress.toFixed(0)}% complete</span>
              <span className="font-mono">{currentStep}/{totalSteps} steps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Visualization */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Step Execution Timeline</div>
        <div className="space-y-2 mt-4">
          {data.steps.list.map((step, idx) => {
            const isActive = idx < currentStep
            const isCurrent = idx === currentStep
            return (
              <div
                key={step.id}
                className={`p-3 rounded border transition-all ${
                  isCurrent
                    ? 'bg-cyan-900/40 border-cyan-500 border-2'
                    : isActive
                      ? 'bg-green-900/20 border-green-700/50'
                      : 'bg-primary/20 border-accent/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isCurrent ? 'bg-cyan-400 animate-pulse' : isActive ? 'bg-green-400' : 'bg-muted/50'
                      }`}
                    ></div>
                    <span className="font-medium text-foreground">{step.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{step.duration.formatted}</span>
                </div>
                <div className="text-xs text-muted-foreground">{step.status}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Step Details */}
      {currentStep < data.steps.list.length && (
        <div className={metricCard.base}>
          <div className={metricCard.title}>Current Step Details</div>
          <div className="space-y-3 mt-4">
            {(() => {
              const step = data.steps.list[currentStep]
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-mono font-bold text-foreground">{step.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span
                      className="font-mono font-bold text-sm px-2 py-1 rounded bg-accent/20 text-accent"
                    >
                      {step.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-mono font-bold text-foreground">{step.duration.formatted}</span>
                  </div>
                  {step.costUSD !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="font-mono font-bold text-foreground">${step.costUSD.toFixed(4)}</span>
                    </div>
                  )}
                  {step.inputTokens !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tokens</span>
                      <span className="font-mono font-bold text-foreground">
                        {step.inputTokens} in, {step.outputTokens} out
                      </span>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Event Stream */}
      {data.raw.events.length > 0 && (
        <div className={metricCard.base}>
          <div className={metricCard.title}>Event Stream (First 10)</div>
          <div className="space-y-1 mt-4 max-h-48 overflow-y-auto">
            {data.raw.events.slice(0, 10).map((event, idx) => (
              <div key={event.id} className="text-xs py-1 text-muted-foreground font-mono border-b border-accent/10 last:border-b-0">
                <span className="text-accent">[{idx + 1}]</span> {event.kind} @{' '}
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
