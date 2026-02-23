'use client'

import { metricCard } from '@/lib/design-tokens'

interface Route {
  name: string
  models: string[]
  percentage: number
  criteria: string
}

interface RoutingMatrixProps {
  routes?: Route[]
}

const DEFAULT_ROUTES: Route[] = [
  {
    name: 'Fast Track',
    models: ['gpt-4-turbo', 'claude-3-opus'],
    percentage: 35,
    criteria: 'Priority queries with high complexity',
  },
  {
    name: 'Standard Route',
    models: ['gpt-3.5-turbo', 'claude-3-sonnet'],
    percentage: 45,
    criteria: 'General purpose requests',
  },
  {
    name: 'Economy',
    models: ['gpt-3.5', 'claude-3-haiku'],
    percentage: 20,
    criteria: 'Simple, low-latency queries',
  },
]

export function RoutingMatrix({ routes = DEFAULT_ROUTES }: RoutingMatrixProps) {
  const colors = ['from-cyan-500 to-cyan-400', 'from-purple-500 to-purple-400', 'from-amber-500 to-amber-400']

  return (
    <div className={metricCard.base}>
      <div className={metricCard.title}>Routing Matrix</div>

      <div className="space-y-4 mt-6">
        {routes.map((route, idx) => (
          <div key={route.name} className="p-4 bg-primary/20 rounded-lg border border-accent/20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">{route.name}</h4>
              <div
                className={`bg-gradient-to-r ${colors[idx]} text-white px-3 py-1 rounded-full text-sm font-bold`}
              >
                {route.percentage}%
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-muted/30 rounded-full h-3 mb-3">
              <div
                className={`bg-gradient-to-r ${colors[idx]} h-3 rounded-full`}
                style={{ width: `${route.percentage}%` }}
              ></div>
            </div>

            {/* Models */}
            <div className="flex gap-2 flex-wrap mb-2">
              {route.models.map((model) => (
                <span
                  key={model}
                  className="text-xs font-mono px-2 py-1 rounded bg-accent/20 text-accent border border-accent/40"
                >
                  {model}
                </span>
              ))}
            </div>

            {/* Criteria */}
            <p className="text-xs text-muted-foreground italic">{route.criteria}</p>
          </div>
        ))}
      </div>

      {/* Total Coverage */}
      <div className="mt-6 p-3 bg-green-900/20 border border-green-700/50 rounded">
        <div className="text-xs text-green-300 font-mono">
          Total coverage: {routes.reduce((sum, r) => sum + r.percentage, 0)}% - All routes active
        </div>
      </div>
    </div>
  )
}
