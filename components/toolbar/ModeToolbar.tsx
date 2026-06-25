'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const MODES = [
  { label: 'Edit', href: '/dashboard/edit' },
  { label: 'Rings', href: '/dashboard/rings' },
  { label: 'Timeline', href: '/dashboard/timeline' },
  { label: 'Heatmap', href: '/dashboard/heatmap' },
  { label: 'Graph', href: '/dashboard/graph' },
]

export default function ModeToolbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const areaParam = searchParams.get('area')

  return (
    <nav className="flex items-center gap-1">
      {MODES.map(mode => {
        const active = pathname === mode.href
        const href = areaParam ? `${mode.href}?area=${areaParam}` : mode.href
        return (
          <Link
            key={mode.href}
            href={href}
            className={`relative px-2.5 py-1 text-xs font-medium tracking-wide transition-colors
              ${active ? 'text-m-violet-bright' : 'text-m-dim hover:text-m-ink'}`}
          >
            {mode.label}
            {active && (
              <span className="absolute bottom-0 left-2.5 right-2.5 h-px bg-m-violet" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
