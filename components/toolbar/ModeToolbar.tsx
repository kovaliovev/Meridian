'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MODES = [
  { label: 'Edit', href: '/dashboard/edit' },
  { label: 'Rings', href: '/dashboard/rings' },
  { label: 'Timeline', href: '/dashboard/timeline' },
  { label: 'Heatmap', href: '/dashboard/heatmap' },
  { label: 'Graph', href: '/dashboard/graph' },
]

export default function ModeToolbar() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {MODES.map(mode => {
        const active = pathname === mode.href
        return (
          <Link
            key={mode.href}
            href={mode.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${active
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            {mode.label}
          </Link>
        )
      })}
    </nav>
  )
}
