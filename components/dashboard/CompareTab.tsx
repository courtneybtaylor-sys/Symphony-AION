'use client'

import { useState } from 'react'
import { RunViewModel } from '@/lib/types'
import { calculateAEI } from '@/lib/aei-score'
import { generateRecommendations, getTotalProjectedSavings } from '@/lib/recommendations'

interface CompareTabProps {
  data: RunViewModel | null
  loading: boolean
}

export function CompareTab({ data, loading }: CompareTabProps) {
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-secondary/10 border border-accent/20 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Select a run to view recommendations.</p>
      </div>
    )
  }

  // Compute recommendations
  const aeiScore = calculateAEI(data)
  const recommendations = generateRecommendations(data, aeiScore)
  const savings = getTotalProjectedSavings(recommendations)

  // Priority color helpers
  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#8B1A1A'
      case 'high':
        return '#B87A10'
      case 'medium':
        return '#1A4A7A'
      case 'low':
        return '#506070'
      default:
        return '#506070'
    }
  }

  const getPriorityBg = (priority: string) => {
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

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'trivial':
        return { bg: '#F0FFF8', text: '#10b981' }
      case 'low':
        return { bg: '#EEF4FF', text: '#1A4A7A' }
      case 'medium':
        return { bg: '#FFF8E0', text: '#B87A10' }
      case 'high':
        return { bg: '#FFF0F0', text: '#8B1A1A' }
      default:
        return { bg: '#F5F5F5', text: '#506070' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        style={{
          fontSize: '10px',
          fontFamily: 'Courier, monospace',
          color: '#1A4A7A',
          fontWeight: '500',
          letterSpacing: '0.05em',
          paddingBottom: '8px',
          borderBottom: '1px solid #40D5E3',
        }}
      >
        OPTIMIZATION RECOMMENDATIONS
      </div>

      {/* Recommendations List */}
      {recommendations.length > 0 ? (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const colors = getPriorityBg(rec.priority)
            const borderColor = getPriorityBorderColor(rec.priority)
            const effortColors = getEffortColor(rec.effort)
            const isExpanded = expandedRecId === rec.id

            return (
              <div
                key={rec.id}
                style={{
                  border: '1px solid #EEEEEE',
                  borderLeft: `3pt solid ${borderColor}`,
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                {/* Header - Always Visible */}
                <div
                  onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    backgroundColor: '#FAFAFA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
                          backgroundColor: '#F5F5F5',
                          borderRadius: '3px',
                        }}
                      >
                        {rec.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {rec.title}
                    </div>

                    {/* Finding */}
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#506070',
                        fontStyle: 'italic',
                      }}
                    >
                      {rec.finding}
                    </div>
                  </div>

                  {/* Right Side - Savings & Effort */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#10b981',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ${rec.projectedSavings.costUSDPerRun.toFixed(2)}/run
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        backgroundColor: effortColors.bg,
                        color: effortColors.text,
                        padding: '2px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      {rec.effort}
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#FFFFFF',
                      borderTop: '1px solid #EEEEEE',
                    }}
                  >
                    <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#1A3A5C' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#506070', marginBottom: '4px' }}>
                          ACTION
                        </div>
                        <div>→ {rec.action}</div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#506070', marginBottom: '4px' }}>
                          PROJECTED SAVINGS
                        </div>
                        <div>
                          ${rec.projectedSavings.costUSDPerRun.toFixed(2)}/run (${rec.projectedSavings.costUSDMonthly100Runs.toFixed(2)}/month
                          at 100 runs)
                        </div>
                        {rec.projectedSavings.tokenReductionPct && (
                          <div>Token reduction: {rec.projectedSavings.tokenReductionPct}%</div>
                        )}
                        {rec.projectedSavings.latencyReductionMs && (
                          <div>Latency reduction: {rec.projectedSavings.latencyReductionMs}ms</div>
                        )}
                      </div>

                      {rec.affectedSteps.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#506070', marginBottom: '4px' }}>
                            AFFECTED STEPS
                          </div>
                          <div>{rec.affectedSteps.join(', ')}</div>
                        </div>
                      )}

                      {rec.affectedModels.length > 0 && (
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#506070', marginBottom: '4px' }}>
                            AFFECTED MODELS
                          </div>
                          <div>{rec.affectedModels.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: '#506070' }}>
          No recommendations available for this run.
        </div>
      )}

      {/* Total Savings Box */}
      {recommendations.length > 0 && (
        <div
          style={{
            border: '1px solid #1A6B45',
            borderRadius: '6px',
            padding: '16px',
            backgroundColor: '#F0FFF8',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
              ${savings.totalCostUSDPerRun.toFixed(2)} / run
            </div>
            <div style={{ fontSize: '10px', color: '#506070', marginTop: '2px' }}>
              ${(savings.totalCostUSDMonthly).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month at 100
              runs
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#1A3A5C' }}>
            Estimated AEI after implementation: {savings.estimatedNewAEI.toFixed(0)}{' '}
            {savings.estimatedNewAEI > aeiScore.overall && (
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                (↑ +{(savings.estimatedNewAEI - aeiScore.overall).toFixed(0)} points)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
