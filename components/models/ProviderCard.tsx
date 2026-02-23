'use client'

import { Model } from '@/lib/types'
import { metricCard } from '@/lib/design-tokens'

interface ProviderCardProps {
  model: Model
  onToggle?: (modelId: string, enabled: boolean) => void
}

export function ProviderCard({ model, onToggle }: ProviderCardProps) {
  const providerColors: Record<string, string> = {
    openai: 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400',
    anthropic: 'bg-orange-900/30 border-orange-700/50 text-orange-400',
    groq: 'bg-purple-900/30 border-purple-700/50 text-purple-400',
    cohere: 'bg-blue-900/30 border-blue-700/50 text-blue-400',
  }

  const colors = providerColors[model.provider.toLowerCase()] || providerColors.openai

  return (
    <div className={`${metricCard.base} ${colors} border-2 transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={metricCard.title}>{model.name}</div>
          <div className="text-xs text-muted-foreground font-mono">{model.provider}</div>
        </div>
        <button
          onClick={() => onToggle?.(model.id, !model.enabled)}
          className={`w-10 h-6 rounded-full flex items-center transition-all ${
            model.enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              model.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          ></div>
        </button>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Version</span>
          <span className="font-mono text-foreground">{model.version}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Input Cost</span>
          <span className="font-mono text-foreground">${model.costPer1kInputTokens}/1k tokens</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Output Cost</span>
          <span className="font-mono text-foreground">${model.costPer1kOutputTokens}/1k tokens</span>
        </div>
      </div>

      {/* Parameters */}
      <div className="p-3 bg-primary/30 rounded mb-4">
        <div className="text-xs font-mono font-bold text-accent mb-2">Parameters</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {model.parameters.temperature !== undefined && (
            <div>
              <span className="text-muted-foreground">Temp:</span>
              <span className="font-mono text-foreground ml-1">{model.parameters.temperature}</span>
            </div>
          )}
          {model.parameters.maxTokens !== undefined && (
            <div>
              <span className="text-muted-foreground">Max Tokens:</span>
              <span className="font-mono text-foreground ml-1">{model.parameters.maxTokens}</span>
            </div>
          )}
          {model.parameters.topP !== undefined && (
            <div>
              <span className="text-muted-foreground">Top P:</span>
              <span className="font-mono text-foreground ml-1">{model.parameters.topP}</span>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {model.enabled ? '✓ Enabled and active' : '○ Disabled'}
      </div>
    </div>
  )
}
