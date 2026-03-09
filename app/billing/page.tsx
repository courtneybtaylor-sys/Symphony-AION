'use client'

import { ArchitectureDiagram } from '@/components/billing/ArchitectureDiagram'
import { metricCard } from '@/lib/design-tokens'

export default function Billing() {
  return (
    <div className="h-full bg-gradient-to-br from-primary to-primary/80 p-8">
      <div className="max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-accent mb-2">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription, usage, and billing architecture</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={metricCard.base}>
            <div className={metricCard.title}>Current Plan</div>
            <div className={metricCard.value}>Founding Partner</div>
            <div className={metricCard.subtitle}>Premium features included</div>
          </div>

          <div className={metricCard.base}>
            <div className={metricCard.title}>This Month</div>
            <div className={metricCard.value}>Contact for pricing</div>
            <div className={metricCard.subtitle}>Custom plan available</div>
          </div>

          <div className={metricCard.base}>
            <div className={metricCard.title}>Billing Cycle</div>
            <div className={metricCard.value}>Active</div>
            <div className={metricCard.subtitle}>Monthly recurring</div>
          </div>
        </div>

        {/* Architecture Diagram and Details */}
        <ArchitectureDiagram demoMode={true} />

        {/* Invoices Section */}
        <div className={metricCard.base}>
          <div className={metricCard.title}>Recent Invoices</div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/20">
                  <th className="text-left py-3 px-3 text-muted-foreground font-mono text-xs">Date</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-mono text-xs">Period</th>
                  <th className="text-right py-3 px-3 text-muted-foreground font-mono text-xs">Amount</th>
                  <th className="text-center py-3 px-3 text-muted-foreground font-mono text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-accent/10 hover:bg-accent/5 transition-colors">
                  <td className="py-3 px-3 text-foreground">Jan 1, 2025</td>
                  <td className="py-3 px-3 text-foreground">Jan 1-31</td>
                  <td className="text-right py-3 px-3 font-mono text-foreground">$0.00</td>
                  <td className="text-center py-3 px-3">
                    <span className="inline-block px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 font-mono">
                      Paid
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            No previous invoices. Demo mode usage is complimentary.
          </p>
        </div>

        {/* Billing Information */}
        <div className={metricCard.base}>
          <div className={metricCard.title}>Billing Information</div>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Account Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-3 py-2 bg-primary/20 border border-accent/20 rounded text-foreground font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Billing Address</label>
              <input
                type="text"
                placeholder="Enter billing address"
                className="w-full px-3 py-2 bg-primary/20 border border-accent/20 rounded text-foreground font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
