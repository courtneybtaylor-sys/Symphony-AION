'use client'

import { RunViewModel } from '@/lib/types'
import { metricCard, components } from '@/lib/design-tokens'
import { calculateAEI } from '@/lib/aei-score'
import { generateRecommendations } from '@/lib/recommendations'
import { DownloadReportButton } from '@/components/DownloadReportButton'

interface PulseTabProps {
  data: RunViewModel | null
  loading: boolean
}

export function PulseTab({ data, loading }: PulseTabProps) {

  if (loading) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-lg border animate-pulse p-6"
          style={{
            borderColor: '#1A3A5C',
            backgroundColor: '#F5F7FA',
          }}
        >
          <div className="h-16 bg-muted/30 rounded w-32 mb-4"></div>
          <div className="h-24 bg-muted/30 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={metricCard.base + ' animate-pulse'}>
              <div className="h-4 bg-muted/30 rounded w-20 mb-3"></div>
              <div className="h-8 bg-muted/30 rounded w-32 mb-2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Select a run to view audit.</p>
      </div>
    )
  }

  // Compute AEI score and recommendations
  const aeiScore = calculateAEI(data)
  const recommendations = generateRecommendations(data, aeiScore)

  // Grade letter based on score
  const getGrade = (score: number) => {
    if (score >= 85) return 'A'
    if (score >= 70) return 'B'
    if (score >= 55) return 'C'
    if (score >= 40) return 'D'
    return 'F'
  }

  // Grade color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return '#10b981' // green
      case 'B':
        return '#3b82f6' // blue
      case 'C':
        return '#f59e0b' // amber
      case 'D':
        return '#ef4444' // red
      case 'F':
        return '#7c2d12' // dark red
      default:
        return '#506070'
    }
  }

  // Priority color for badges
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { bg: '#FFF0F0', text: '#8B1A1A' }
      case 'high':
        return { bg: '#FFF8E0', text: '#B87A10' }
      case 'medium':
        return { bg: '#EEF4FF', text: '#1A4A7A' }
      case 'low':
        return { bg: '#F5F5F5', text: '#506070' }
      default:
        return { bg: '#F5F5F5', text: '#506070' }
    }
  }

  // Risk flag severity color
  const getFlagColor = (flag: string) => {
    if (flag.includes('FAILURE') || flag.includes('DETECTED')) {
      return { text: '#8B1A1A', bg: '#FFF0F0' }
    }
    if (flag.includes('LOOP') || flag.includes('OVERUSE')) {
      return { text: '#B87A10', bg: '#FFF8E0' }
    }
    return { text: '#506070', bg: '#F5F5F5' }
  }

  const grade = getGrade(aeiScore.overall)
  const topRecommendations = recommendations.slice(0, 2)

  return (
    <div className="space-y-6">
      {/* AEI Score Card */}
      <div
        className="relative rounded-lg border p-6"
        style={{
          borderColor: '#1A3A5C',
          backgroundColor: '#F5F7FA',
          borderWidth: '1px',
        }}
      >
        {/* Download button - top right */}
        <div className="absolute top-6 right-6">
          <DownloadReportButton runData={data} aeiScore={aeiScore} recommendations={recommendations} />
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Left 40% - Main Score */}
          <div className="col-span-2 flex flex-col items-center justify-center">
            <div
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: '#B87A10',
                lineHeight: 1,
              }}
            >
              {aeiScore.overall.toFixed(0)}
            </div>
            <div
              style={{
                fontSize: '20px',
                color: '#506070',
                marginTop: '8px',
              }}
            >
              /100
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#1A3A5C',
                marginTop: '12px',
                fontWeight: '500',
              }}
            >
              Grade
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: getGradeColor(grade),
                marginTop: '4px',
              }}
            >
              {grade}
            </div>
            {/* Grade Bar */}
            <div
              style={{
                width: '100%',
                height: '6mm',
                backgroundColor: '#EEEEEE',
                borderRadius: '3px',
                marginTop: '16px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (aeiScore.overall / 100) * 100)}%`,
                  height: '100%',
                  backgroundColor: getGradeColor(grade),
                  transition: 'width 0.3s ease',
                }}
              ></div>
            </div>
          </div>

          {/* Right 60% - Component Scores */}
          <div className="col-span-3 space-y-3">
            {[
              {
                label: 'Loop Tax',
                value: aeiScore.components.loopTax,
              },
              {
                label: 'Framework Overhead',
                value: aeiScore.components.frameworkOverhead,
              },
              {
                label: 'Model Misallocation',
                value: aeiScore.components.modelMisallocation,
              },
              {
                label: 'Drift Score',
                value: aeiScore.components.driftScore,
              },
              {
                label: 'Gate Violation Rate',
                value: aeiScore.components.gateViolationRate,
              },
            ].map((component) => (
              <div key={component.label} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#1A3A5C',
                      marginBottom: '4px',
                    }}
                  >
                    {component.label}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6mm',
                      backgroundColor: '#EEEEEE',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, component.value)}%`,
                        height: '100%',
                        backgroundColor: '#1A3A5C',
                      }}
                    ></div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#1A3A5C',
                    minWidth: '30px',
                    textAlign: 'right',
                  }}
                >
                  {component.value.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Flags */}
        {aeiScore.riskFlags.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #EEEEEE' }}>
            <div
              style={{
                fontSize: '12px',
                color: '#1A3A5C',
                fontWeight: '500',
                marginBottom: '8px',
              }}
            >
              Risk Flags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {aeiScore.riskFlags.map((flag) => {
                const colors = getFlagColor(flag)
                return (
                  <div
                    key={flag}
                    style={{
                      border: `1px solid ${colors.text}`,
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '8pt',
                      fontFamily: 'Courier, monospace',
                      color: colors.text,
                      backgroundColor: colors.bg,
                    }}
                  >
                    {flag}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top 2 Recommendations Preview */}
      {topRecommendations.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#1A3A5C',
              marginBottom: '12px',
              fontFamily: 'Courier, monospace',
            }}
          >
            TOP RECOMMENDATIONS
          </div>
          <div className="space-y-3">
            {topRecommendations.map((rec) => {
              const colors = getPriorityColor(rec.priority)
              return (
                <div
                  key={rec.id}
                  style={{
                    border: '1px solid #EEEEEE',
                    borderRadius: '6px',
                    padding: '12px',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            padding: '2px 6px',
                            borderRadius: '3px',
                          }}
                        >
                          {rec.priority}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#506070',
                            padding: '2px 6px',
                          }}
                        >
                          {rec.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                        {rec.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#506070',
                        }}
                      >
                        {rec.finding.substring(0, 100)}...
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#10b981',
                        marginLeft: '12px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ${rec.projectedSavings.costUSDPerRun.toFixed(2)}/run
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: '12px' }}>
            <a
              href="#compare"
              style={{
                fontSize: '12px',
                color: '#1A4A7A',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              View all →
            </a>
          </div>
        </div>
      )}

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
