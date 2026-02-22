import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'Symphony-AION',
  description: 'The first AI orchestrator where every token has a receipt and every agent has a conscience',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Symphony-AION',
    description: 'The first AI orchestrator where every token has a receipt and every agent has a conscience',
    image: '/og-banner.png',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="font-sans">
        <div className="flex h-screen bg-primary">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
