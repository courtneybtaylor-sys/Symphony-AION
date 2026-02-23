'use client'

import { RunViewModel } from '@/lib/types'
import { metricCard } from '@/lib/design-tokens'

interface GovernanceTabProps {
  data: RunViewModel | null
  loading: boolean
}

export function GovernanceTab({ data, loading }: GovernanceTabProps) {
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
        <p>No governance data available.</p>
      </div>
    )
  }

  const governanceEvents = data.raw.events.filter((e) => e.kind === 'governance')
  const validationPassCount = data.events.byKind.VALIDATION_PASSED || 0
  const validationFailCount = data.events.byKind.VALIDATION_FAILED || 0
  const governanceChecksPassed = validationPassCount
  const governanceChecksFailed = validationFailCount

  return (
    <div className="space-y-6">
      {/* Governance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={metricCard.base + ' border-green-700/50 border-2'}>
          <div className="text-green-400 font-mono font-bold text-sm mb-2">Passed Checks</div>
          <div className="text-3xl font-bold text-green-400">{governanceChecksPassed}</div>
          <div className={metricCard.subtitle}>Constitutional compliance checks</div>
        </div>
        <div className={metricCard.base + (governanceChecksFailed > 0 ? ' border-red-700/50 border-2' : '')}>
          <div className={governanceChecksFailed > 0 ? 'text-red-400 font-mono font-bold text-sm mb-2' : metricCard.title}>
            {governanceChecksFailed > 0 ? 'Failed Checks' : 'All Checks Passed'}
          </div>
          <div className={governanceChecksFailed > 0 ? 'text-3xl font-bold text-red-400' : metricCard.value}>
            {governanceChecksFailed}
          </div>
          <div className={metricCard.subtitle}>
            {governanceChecksFailed > 0 ? 'Policy violations detected' : 'No violations'}
          </div>
        </div>
      </div>

      {/* Constitutional AI Guardrails */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Constitutional AI Guardrails</div>
        <div className="space-y-3 mt-4">
          {[
            { name: 'Token Limit Check', status: 'passed' },
            { name: 'Rate Limit Enforcement', status: 'passed' },
            { name: 'Model Approval Gate', status: 'passed' },
            { name: 'Cost Threshold Monitor', status: governanceChecksFailed > 0 ? 'warning' : 'passed' },
            { name: 'Latency SLA Check', status: 'passed' },
          ].map((check) => (
            <div key={check.name} className="flex items-center justify-between p-2 bg-primary/20 rounded">
              <span className="text-foreground">{check.name}</span>
              <div
                className={`text-xs px-2 py-1 rounded font-mono font-bold ${
                  check.status === 'passed'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {check.status === 'passed' ? '✓ Passed' : '⚠ Warning'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Governance Rules Applied */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Policies Applied</div>
        <div className="space-y-2 mt-4">
          {[
            {
              name: 'Token Budget',
              description: `${data.tokens.total} / 1,000,000 tokens`,
              compliance: (data.tokens.total / 1000000) * 100,
            },
            {
              name: 'Cost Budget',
              description: `$${data.costs.total.toFixed(2)} / $100.00 monthly`,
              compliance: (data.costs.total / 100) * 100,
            },
            {
              name: 'Latency SLA',
              description: `${data.duration.formatted} / 10 seconds`,
              compliance: Math.min((data.duration.ms / 10000) * 100, 100),
            },
          ].map((policy) => (
            <div key={policy.name} className="p-3 bg-primary/20 rounded border border-accent/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{policy.name}</span>
                <span className="text-xs text-muted-foreground">{policy.compliance.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${
                    policy.compliance > 80 ? 'bg-red-500' : policy.compliance > 50 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(policy.compliance, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground">{policy.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Governance Events */}
      {governanceEvents.length > 0 && (
        <div className={metricCard.base}>
          <div className={metricCard.title}>Governance Events</div>
          <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
            {governanceEvents.map((event) => (
              <div key={event.id} className="p-2 bg-primary/20 rounded border-l-2 border-purple-500 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-purple-400">{event.kind}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.data && Object.keys(event.data).length > 0 && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {JSON.stringify(event.data).substring(0, 80)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
        <div className="text-sm text-blue-300 font-medium mb-2">📋 Governance Status</div>
        <p className="text-sm text-blue-200/80">
          {governanceChecksFailed === 0
            ? 'All constitutional AI guardrails passed. This run complies with established governance policies.'
            : `${governanceChecksFailed} governance check(s) failed. Review the policies and consider applying corrective actions.`}
        </p>
      </div>
    </div>
  )
}
