// components/toolbar/NavTabs.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Tasks', href: '/dashboard/tasks' },
  { label: 'Visualize', href: '/dashboard/visualize' },
]

export default function NavTabs() {
  const pathname = usePathname()
  return (
    <nav className="hidden sm:flex items-center gap-0.5">
      {TABS.map(tab => {
        const active = tab.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-4 py-1.5 text-sm font-medium transition-colors
              ${active ? 'text-m-violet-bright' : 'text-m-dim hover:text-m-ink'}`}
          >
            {tab.label}
            {active && <span className="absolute bottom-0 left-3 right-3 h-px bg-m-violet" />}
          </Link>
        )
      })}
    </nav>
  )
}
