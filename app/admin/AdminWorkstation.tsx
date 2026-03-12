'use client'

/**
 * AdminWorkstation — client component
 * Rendered inside the server-side role-guarded /admin page.
 * Tabs: Audit Jobs | Testament Ledger | Users | Scoring
 */

import { useEffect, useState } from 'react'

interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: string
}

interface AuditJob {
  id: string
  status: string
  createdAt: string
  completedAt: string | null
  aeiScore: unknown
  shiScore: number | null
  error: string | null
  userId: string
}

interface IngestionJob {
  id: string
  status: string
  sourceFormat: string
  normalizedCount: number
  runCount: number
  progress: number
  createdAt: string
  error: string | null
}

interface DbUser {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
}

type Tab = 'audit-jobs' | 'ingestion-jobs' | 'users' | 'scoring'

export default function AdminWorkstation({ currentUser }: { currentUser: CurrentUser }) {
  const [tab, setTab] = useState<Tab>('audit-jobs')
  const [auditJobs, setAuditJobs] = useState<AuditJob[]>([])
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJob[]>([])
  const [users, setUsers] = useState<DbUser[]>([])
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [scoringJobId, setScoringJobId] = useState('')
  const [scoringResult, setScoringResult] = useState<string | null>(null)

  useEffect(() => {
    loadTab(tab)
  }, [tab])

  async function loadTab(t: Tab) {
    setLoading(true)
    try {
      if (t === 'audit-jobs') await loadAuditJobs()
      if (t === 'ingestion-jobs') await loadIngestionJobs()
      if (t === 'users') await loadUsers()
      if (t === 'scoring') await loadStats()
    } finally {
      setLoading(false)
    }
  }

  async function loadAuditJobs() {
    const r = await fetch('/api/admin/audit-jobs')
    if (r.ok) {
      const d = await r.json()
      setAuditJobs(d.jobs || [])
    }
  }

  async function loadIngestionJobs() {
    const r = await fetch('/api/admin/ingestion-jobs')
    if (r.ok) {
      const d = await r.json()
      setIngestionJobs(d.jobs || [])
    }
  }

  async function loadUsers() {
    const r = await fetch('/api/admin/users')
    if (r.ok) {
      const d = await r.json()
      setUsers(d.users || [])
    }
  }

  async function loadStats() {
    const r = await fetch('/api/admin/stats')
    if (r.ok) {
      const d = await r.json()
      setStats(d)
    }
  }

  async function triggerScoring() {
    if (!scoringJobId.trim()) return
    setScoringResult(null)
    const r = await fetch(`/api/ingest/${scoringJobId.trim()}/score`)
    const d = await r.json()
    setScoringResult(JSON.stringify(d, null, 2))
  }

  const tabClasses = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition ${
      tab === t
        ? 'bg-gold text-nun'
        : 'text-ghost hover:text-papyrus hover:bg-clay/30'
    }`

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-teal-light/20 text-teal-light',
      processing: 'bg-gold/20 text-gold',
      failed: 'bg-red-500/20 text-red-400',
      queued: 'bg-clay/50 text-ghost',
      pending_payment: 'bg-sand/20 text-sand',
    }
    return `px-2 py-0.5 rounded text-xs font-mono ${colors[s] || 'bg-clay/30 text-ghost'}`
  }

  return (
    <div className="min-h-screen bg-nun text-papyrus">
      {/* Header */}
      <header className="border-b border-clay bg-stone/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-gold font-bold text-lg">SYMPHONY-AION</div>
            <div className="text-ghost text-xs">Scout Workstation</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-ghost">{currentUser.email}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono ${
              currentUser.role === 'super_admin' ? 'bg-gold/20 text-gold' : 'bg-teal-light/20 text-teal-light'
            }`}>
              {currentUser.role}
            </span>
            <a href="/" className="text-ghost hover:text-papyrus text-sm transition">← Home</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button className={tabClasses('audit-jobs')} onClick={() => setTab('audit-jobs')}>
            Audit Jobs
          </button>
          <button className={tabClasses('ingestion-jobs')} onClick={() => setTab('ingestion-jobs')}>
            Testament Ledger
          </button>
          <button className={tabClasses('users')} onClick={() => setTab('users')}>
            Users
          </button>
          <button className={tabClasses('scoring')} onClick={() => setTab('scoring')}>
            Scoring
          </button>
        </div>

        {loading && (
          <div className="text-ghost text-sm animate-pulse mb-4">Loading…</div>
        )}

        {/* Audit Jobs */}
        {tab === 'audit-jobs' && (
          <section>
            <h2 className="text-xl font-bold mb-4">Audit Jobs</h2>
            {auditJobs.length === 0 && !loading && (
              <p className="text-ghost text-sm">No audit jobs found.</p>
            )}
            <div className="space-y-2">
              {auditJobs.map((job) => (
                <div key={job.id} className="bg-stone/50 border border-clay rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-ghost truncate">{job.id}</div>
                    <div className="text-xs text-ghost mt-1">{new Date(job.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {job.shiScore != null && (
                      <span className="text-sm font-bold text-sand">SHI {job.shiScore.toFixed(1)}</span>
                    )}
                    <span className={statusBadge(job.status)}>{job.status}</span>
                  </div>
                  {job.error && (
                    <div className="text-xs text-red-400 font-mono truncate w-full sm:w-auto">{job.error}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Testament Ledger (Ingestion Jobs) */}
        {tab === 'ingestion-jobs' && (
          <section>
            <h2 className="text-xl font-bold mb-1">Testament Ledger</h2>
            <p className="text-ghost text-sm mb-4">Ingestion job chain — raw telemetry → normalised events.</p>
            {ingestionJobs.length === 0 && !loading && (
              <p className="text-ghost text-sm">No ingestion jobs found.</p>
            )}
            <div className="space-y-2">
              {ingestionJobs.map((job) => (
                <div key={job.id} className="bg-stone/50 border border-clay rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-ghost truncate">{job.id}</div>
                    <div className="flex gap-4 mt-1 text-xs text-ghost">
                      <span className="font-mono">{job.sourceFormat}</span>
                      <span>{job.normalizedCount} events</span>
                      <span>{job.runCount} runs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-16 bg-clay/30 rounded-full h-1.5">
                      <div
                        className="bg-gold h-1.5 rounded-full"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className={statusBadge(job.status)}>{job.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Users */}
        {tab === 'users' && (
          <section>
            <h2 className="text-xl font-bold mb-4">User Management</h2>
            {users.length === 0 && !loading && (
              <p className="text-ghost text-sm">No users found.</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-clay">
                    <th className="text-left py-2 px-3 text-ghost font-medium">Email</th>
                    <th className="text-left py-2 px-3 text-ghost font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-ghost font-medium">Role</th>
                    <th className="text-left py-2 px-3 text-ghost font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-clay/50 hover:bg-clay/10">
                      <td className="py-2 px-3 font-mono text-xs">{u.email}</td>
                      <td className="py-2 px-3">{u.name || '—'}</td>
                      <td className="py-2 px-3">
                        <span className={statusBadge(u.role)}>{u.role}</span>
                      </td>
                      <td className="py-2 px-3 text-ghost text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Manual Scoring Trigger */}
        {tab === 'scoring' && (
          <section>
            <h2 className="text-xl font-bold mb-4">Manual Scoring Trigger</h2>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {stats.database && typeof stats.database === 'object' && (
                  <>
                    <Stat label="Total Users" value={String((stats.database as Record<string, unknown>).totalUsers ?? '—')} />
                    <Stat label="Total Uploads" value={String((stats.database as Record<string, unknown>).totalUploads ?? '—')} />
                    <Stat label="Total Jobs" value={String((stats.database as Record<string, unknown>).totalJobs ?? '—')} />
                    <Stat label="Completion Rate" value={`${((stats.database as Record<string, unknown>).completionRate as number ?? 0).toFixed(1)}%`} />
                  </>
                )}
              </div>
            )}

            {/* Trigger form */}
            <div className="bg-stone/50 border border-clay rounded-lg p-6 max-w-lg">
              <p className="text-ghost text-sm mb-4">
                Manually re-score a completed ingestion job. Enter the ingestion ID and fetch live AEI / GEI / SHI scores.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="ingestion job ID"
                  value={scoringJobId}
                  onChange={(e) => setScoringJobId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-nun border border-clay rounded-lg text-papyrus placeholder-ghost text-sm focus:outline-none focus:ring-1 focus:ring-gold font-mono"
                />
                <button
                  onClick={triggerScoring}
                  disabled={!scoringJobId.trim()}
                  className="px-4 py-2 bg-gold hover:bg-gold-bright text-nun rounded-lg text-sm font-medium transition disabled:opacity-40"
                >
                  Score
                </button>
              </div>
              {scoringResult && (
                <pre className="mt-4 bg-nun border border-clay rounded p-4 text-xs font-mono text-teal-light overflow-auto max-h-64 whitespace-pre-wrap">
                  {scoringResult}
                </pre>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone/50 border border-clay rounded-lg p-4">
      <div className="text-2xl font-bold text-gold">{value}</div>
      <div className="text-xs text-ghost mt-1">{label}</div>
    </div>
  )
}
