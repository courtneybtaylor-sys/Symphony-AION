'use client'

import { metricCard } from '@/lib/design-tokens'

interface ArchitectureDiagramProps {
  demoMode?: boolean
}

export function ArchitectureDiagram({ demoMode = true }: ArchitectureDiagramProps) {
  return (
    <div className="space-y-6">
      {/* Architecture Diagram */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Billing Architecture</div>

        {/* SVG Diagram */}
        <div className="mt-6 overflow-x-auto">
          <svg viewBox="0 0 800 400" className="w-full min-w-max h-auto">
            {/* Horizontal lines */}
            <line x1="50" y1="100" x2="750" y2="100" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />
            <line x1="50" y1="200" x2="750" y2="200" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />
            <line x1="50" y1="300" x2="750" y2="300" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />

            {/* User Input Layer */}
            <g>
              <rect x="30" y="30" width="140" height="60" fill="#1a3a3a" stroke="#06b6d4" strokeWidth="2" rx="8" />
              <text x="100" y="65" textAnchor="middle" fill="#06b6d4" className="text-sm font-mono font-bold">
                User Requests
              </text>
            </g>

            {/* API Gateway */}
            <g>
              <rect x="230" y="30" width="140" height="60" fill="#1a2a3a" stroke="#3b82f6" strokeWidth="2" rx="8" />
              <text x="300" y="65" textAnchor="middle" fill="#3b82f6" className="text-sm font-mono font-bold">
                API Gateway
              </text>
            </g>

            {/* Auth & Validation */}
            <g>
              <rect x="430" y="30" width="140" height="60" fill="#2a1a3a" stroke="#a855f7" strokeWidth="2" rx="8" />
              <text x="500" y="65" textAnchor="middle" fill="#a855f7" className="text-sm font-mono font-bold">
                Auth & Validation
              </text>
            </g>

            {/* Billing Gateway */}
            <g>
              <rect x="630" y="30" width="140" height="60" fill="#1a2a1a" stroke="#10b981" strokeWidth="2" rx="8" />
              <text x="700" y="65" textAnchor="middle" fill="#10b981" className="text-sm font-mono font-bold">
                Billing Gateway
              </text>
            </g>

            {/* Arrows from Layer 1 */}
            <path d="M 170 60 L 230 60" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 370 60 L 430 60" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 570 60 L 630 60" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />

            {/* Model Router Layer */}
            <g>
              <rect x="50" y="130" width="120" height="60" fill="#1a1a2a" stroke="#ef4444" strokeWidth="2" rx="8" />
              <text x="110" y="160" textAnchor="middle" fill="#ef4444" className="text-sm font-mono font-bold">
                Router
              </text>
            </g>

            {/* Model Providers */}
            <g>
              {/* OpenAI */}
              <rect x="220" y="130" width="110" height="60" fill="#1a2a1a" stroke="#10b981" strokeWidth="2" rx="8" />
              <text x="275" y="155" textAnchor="middle" fill="#10b981" className="text-xs font-mono font-bold">
                OpenAI
              </text>
              <text x="275" y="175" textAnchor="middle" fill="#10b981" className="text-xs opacity-70">
                GPT-4, 3.5
              </text>
            </g>

            {/* Anthropic */}
            <g>
              <rect x="380" y="130" width="110" height="60" fill="#2a1a1a" stroke="#f59e0b" strokeWidth="2" rx="8" />
              <text x="435" y="155" textAnchor="middle" fill="#f59e0b" className="text-xs font-mono font-bold">
                Anthropic
              </text>
              <text x="435" y="175" textAnchor="middle" fill="#f59e0b" className="text-xs opacity-70">
                Claude 3
              </text>
            </g>

            {/* Groq */}
            <g>
              <rect x="540" y="130" width="110" height="60" fill="#1a1a2a" stroke="#a855f7" strokeWidth="2" rx="8" />
              <text x="595" y="155" textAnchor="middle" fill="#a855f7" className="text-xs font-mono font-bold">
                Groq
              </text>
              <text x="595" y="175" textAnchor="middle" fill="#a855f7" className="text-xs opacity-70">
                L1 Inference
              </text>
            </g>

            {/* Arrows from Router */}
            <path d="M 170 160 L 220 160" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 170 160 L 380 160" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 170 160 L 540 160" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />

            {/* Metering & Usage Tracking */}
            <g>
              <rect x="50" y="250" width="150" height="60" fill="#1a1a2a" stroke="#06b6d4" strokeWidth="2" rx="8" />
              <text x="125" y="275" textAnchor="middle" fill="#06b6d4" className="text-xs font-mono font-bold">
                Usage Meter
              </text>
              <text x="125" y="295" textAnchor="middle" fill="#06b6d4" className="text-xs opacity-70">
                Token Counter
              </text>
            </g>

            {/* Cost Calculation */}
            <g>
              <rect x="270" y="250" width="150" height="60" fill="#1a2a1a" stroke="#10b981" strokeWidth="2" rx="8" />
              <text x="345" y="275" textAnchor="middle" fill="#10b981" className="text-xs font-mono font-bold">
                Cost Engine
              </text>
              <text x="345" y="295" textAnchor="middle" fill="#10b981" className="text-xs opacity-70">
                Calculate USD
              </text>
            </g>

            {/* Billing Record */}
            <g>
              <rect x="490" y="250" width="150" height="60" fill="#2a1a1a" stroke="#f59e0b" strokeWidth="2" rx="8" />
              <text x="565" y="275" textAnchor="middle" fill="#f59e0b" className="text-xs font-mono font-bold">
                Billing Record
              </text>
              <text x="565" y="295" textAnchor="middle" fill="#f59e0b" className="text-xs opacity-70">
                Store & Archive
              </text>
            </g>

            {/* Invoicing */}
            <g>
              <rect x="710" y="250" width="80" height="60" fill="#1a2a2a" stroke="#3b82f6" strokeWidth="2" rx="8" />
              <text x="750" y="283" textAnchor="middle" fill="#3b82f6" className="text-xs font-mono font-bold">
                Invoice
              </text>
            </g>

            {/* Arrows from Model Providers */}
            <path d="M 275 190 L 125 250" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 435 190 L 300 250" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 595 190 L 400 250" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />

            {/* Processing Flow */}
            <path d="M 200 280 L 270 280" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 420 280 L 490 280" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d="M 640 280 L 710 280" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#fbbf24" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>

      {/* Billing Model Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={metricCard.base}>
          <div className={metricCard.title}>Token-Based Pricing</div>
          <div className="space-y-3 mt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Input Token Rate</span>
              <span className="font-mono text-foreground">$0.0001 - $0.02 / 1k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Output Token Rate</span>
              <span className="font-mono text-foreground">$0.0003 - $0.06 / 1k</span>
            </div>
            <div className="flex justify-between border-t border-accent/20 pt-3">
              <span className="text-muted-foreground font-medium">Calculated Per</span>
              <span className="font-mono font-bold text-accent">Request</span>
            </div>
          </div>
        </div>

        <div className={metricCard.base}>
          <div className={metricCard.title}>Billing Cycle</div>
          <div className="space-y-3 mt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cycle Period</span>
              <span className="font-mono text-foreground">Monthly</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Date</span>
              <span className="font-mono text-foreground">1st of month</span>
            </div>
            <div className="flex justify-between border-t border-accent/20 pt-3">
              <span className="text-muted-foreground font-medium">Current Period</span>
              <span className="font-mono font-bold text-accent">Feb 1 - Feb 28</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Tracking */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Real-Time Tracking</div>
        <div className="space-y-3 mt-4">
          <div className="p-3 bg-primary/20 rounded">
            <div className="flex justify-between mb-2">
              <span className="text-foreground font-mono">Tokens This Period</span>
              <span className="text-foreground font-mono font-bold">1,234,567</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div className="bg-gradient-to-r from-cyan-500 to-amber-400 h-2 rounded-full" style={{ width: '42%' }}></div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">42% of monthly budget</div>
          </div>

          <div className="p-3 bg-primary/20 rounded">
            <div className="flex justify-between mb-2">
              <span className="text-foreground font-mono">Cost This Period</span>
              <span className="text-amber-400 font-mono font-bold">$1,234.56</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div className="bg-gradient-to-r from-amber-500 to-orange-400 h-2 rounded-full" style={{ width: '35%' }}></div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">35% of monthly budget ($3,500)</div>
          </div>
        </div>
      </div>

      {/* Cost Optimization Strategies */}
      <div className={metricCard.base}>
        <div className={metricCard.title}>Cost Optimization</div>
        <div className="space-y-2 mt-4">
          {[
            {
              name: 'Use cheaper models for simple tasks',
              savings: '~15-20% savings potential',
            },
            {
              name: 'Batch requests during off-peak hours',
              savings: '~10% savings potential',
            },
            {
              name: 'Cache repetitive prompts',
              savings: '~25-30% savings potential',
            },
            {
              name: 'Monitor and alert on budget overflow',
              savings: 'Prevent overspend',
            },
          ].map((strategy, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2 bg-primary/20 rounded hover:bg-primary/30 transition-colors">
              <div className="w-4 h-4 rounded-full border border-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-foreground">{strategy.name}</div>
                <div className="text-xs text-muted-foreground">{strategy.savings}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
