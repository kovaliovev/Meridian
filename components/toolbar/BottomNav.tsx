// components/toolbar/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Home', href: '/dashboard', icon: '◉' },
  { label: 'Tasks', href: '/dashboard/tasks', icon: '☑' },
  { label: 'Visualize', href: '/dashboard/visualize', icon: '◈' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-m-surface border-t border-m-line flex z-20">
      {TABS.map(tab => {
        const active = tab.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors
              ${active ? 'text-m-violet-bright' : 'text-m-dim hover:text-m-ink'}`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
