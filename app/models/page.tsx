'use client'

import { useState } from 'react'
import { Model } from '@/lib/types'
import { ProviderCard } from '@/components/models/ProviderCard'
import { RoutingMatrix } from '@/components/models/RoutingMatrix'
import { Leaderboard } from '@/components/models/Leaderboard'
import { metricCard } from '@/lib/design-tokens'

const AVAILABLE_MODELS: Model[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    version: '20250514',
    enabled: true,
    parameters: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.9,
    },
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    version: '20251001',
    enabled: true,
    parameters: {
      temperature: 0.7,
      maxTokens: 4096,
    },
    costPer1kInputTokens: 0.0008,
    costPer1kOutputTokens: 0.004,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    version: '2024-11-20',
    enabled: true,
    parameters: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.95,
    },
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    version: '2024-07-18',
    enabled: true,
    parameters: {
      temperature: 0.7,
      maxTokens: 4096,
    },
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
  },
]

export default function Models() {
  const [models, setModels] = useState(AVAILABLE_MODELS)

  const handleToggleModel = (modelId: string, enabled: boolean) => {
    setModels((prev) =>
      prev.map((m) => (m.id === modelId ? { ...m, enabled } : m)),
    )
  }

  const enabledCount = models.filter((m) => m.enabled).length

  return (
    <div className="h-full bg-gradient-to-br from-primary to-primary/80 p-8">
      <div className="max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-accent mb-2">Models</h1>
          <p className="text-muted-foreground">
            Manage and monitor {enabledCount}/{models.length} AI models in your control plane
          </p>
        </div>

        {/* Provider Cards Grid */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 font-mono">Available Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <ProviderCard
                key={model.id}
                model={model}
                onToggle={handleToggleModel}
              />
            ))}
          </div>
        </div>

        {/* Routing Matrix */}
        <RoutingMatrix />

        {/* Leaderboard */}
        <Leaderboard />

        {/* Model Configuration Section */}
        <div className={metricCard.base}>
          <div className="font-mono font-bold text-accent mb-4">Configuration</div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/20 rounded">
              <span className="text-foreground">Auto-failover</span>
              <button className="w-10 h-6 rounded-full bg-green-500 flex items-center">
                <div className="w-5 h-5 rounded-full bg-white translate-x-5"></div>
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary/20 rounded">
              <span className="text-foreground">Cost-aware routing</span>
              <button className="w-10 h-6 rounded-full bg-green-500 flex items-center">
                <div className="w-5 h-5 rounded-full bg-white translate-x-5"></div>
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary/20 rounded">
              <span className="text-foreground">Load balancing</span>
              <button className="w-10 h-6 rounded-full bg-green-500 flex items-center">
                <div className="w-5 h-5 rounded-full bg-white translate-x-5"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
