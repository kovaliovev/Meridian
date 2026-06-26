'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { LifeArea } from '@/lib/types'

export default function AreaFilterBar({ areas }: { areas: LifeArea[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('area')

  function select(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === null) params.delete('area')
    else params.set('area', id)
    const q = params.toString()
    router.push(q ? `${pathname}?${q}` : pathname)
  }

  return (
    <div className="flex gap-2 overflow-x-auto py-1">
      <button
        onClick={() => select(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all
          ${!selectedId
            ? 'bg-m-violet text-m-bg border-m-violet'
            : 'border-m-line text-m-dim hover:text-m-ink hover:border-m-spoke'}`}
      >
        All
      </button>
      {areas.map(area => {
        const active = selectedId === area.id
        return (
          <button
            key={area.id}
            onClick={() => select(area.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all
              ${active ? 'text-m-ink' : 'border-m-line text-m-dim hover:text-m-ink hover:border-m-spoke'}`}
            style={active ? { borderColor: area.color, backgroundColor: `${area.color}22` } : {}}
          >
            <span>{area.icon}</span>
            {area.name}
          </button>
        )
      })}
    </div>
  )
}
