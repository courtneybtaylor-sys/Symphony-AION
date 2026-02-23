'use client'

import { useState, Suspense, lazy } from 'react'
import { useRunData } from '@/lib/useRunData'
import { PulseTab } from '@/components/dashboard/PulseTab'

// Lazy load other tabs for performance
const TelemetryTab = lazy(() => import('@/components/dashboard/TelemetryTab').then((m) => ({ default: m.TelemetryTab })))
const CompareTab = lazy(() => import('@/components/dashboard/CompareTab').then((m) => ({ default: m.CompareTab })))
const ReplayTab = lazy(() => import('@/components/dashboard/ReplayTab').then((m) => ({ default: m.ReplayTab })))
const GovernanceTab = lazy(() => import('@/components/dashboard/GovernanceTab').then((m) => ({ default: m.GovernanceTab })))
const HistoryTab = lazy(() => import('@/components/dashboard/HistoryTab').then((m) => ({ default: m.HistoryTab })))

const tabs = [
  { id: 'pulse', label: 'Pulse', component: PulseTab },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'compare', label: 'Compare' },
  { id: 'replay', label: 'Replay' },
  { id: 'governance', label: 'Governance' },
  { id: 'history', label: 'History' },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('pulse')
  const { data, loading, error } = useRunData('aion-9f3k2')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pulse':
        return <PulseTab data={data} loading={loading} />
      case 'telemetry':
        return (
          <Suspense fallback={<div className="text-muted-foreground">Loading telemetry...</div>}>
            <TelemetryTab data={data} loading={loading} />
          </Suspense>
        )
      case 'compare':
        return (
          <Suspense fallback={<div className="text-muted-foreground">Loading comparison...</div>}>
            <CompareTab data={data} loading={loading} />
          </Suspense>
        )
      case 'replay':
        return (
          <Suspense fallback={<div className="text-muted-foreground">Loading replay...</div>}>
            <ReplayTab data={data} loading={loading} />
          </Suspense>
        )
      case 'governance':
        return (
          <Suspense fallback={<div className="text-muted-foreground">Loading governance...</div>}>
            <GovernanceTab data={data} loading={loading} />
          </Suspense>
        )
      case 'history':
        return (
          <Suspense fallback={<div className="text-muted-foreground">Loading history...</div>}>
            <HistoryTab data={data} loading={loading} />
          </Suspense>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full bg-gradient-to-br from-primary to-primary/80 p-8">
      <div className="max-w-7xl">
        <h1 className="text-4xl font-bold text-accent mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-6">
          {data?.name || 'Welcome to Symphony AION'} · v{process.env.NEXT_PUBLIC_AION_VERSION || '1.0'}
        </p>

        {/* Live Banner */}
        {data?.status === 'RUNNING' && (
          <div className="mb-6 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <span className="text-sm text-blue-300 font-mono">LIVE · Workflow in progress</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
            <p className="text-sm text-red-300">Error loading data: {error.message}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 overflow-x-auto border-b border-accent/20 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-mono text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">{renderTabContent()}</div>
      </div>
    </div>
  )
}
