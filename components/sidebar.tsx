'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Zap, CreditCard } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/models', label: 'Models', icon: Zap },
  { href: '/billing', label: 'Billing', icon: CreditCard },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-nile border-r border-clay flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-6 border-b border-clay">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center">
            <span className="text-nun font-mono font-bold text-lg">A</span>
          </div>
          <div>
            <h1 className="text-gold font-mono font-bold">AION</h1>
            <p className="text-xs text-ghost">v{process.env.NEXT_PUBLIC_AION_VERSION}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''} ${
                isActive ? 'bg-stone text-gold border-b border-gold' : 'text-ghost hover:text-papyrus'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-mono font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-clay">
        <p className="text-xs text-ghost text-center">
          Symphony AION {process.env.NEXT_PUBLIC_AION_VERSION}
        </p>
      </div>
    </aside>
  )
}
