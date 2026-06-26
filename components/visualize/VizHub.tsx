'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import HeatmapView from '@/components/visualizations/HeatmapView'
import RingsView from '@/components/visualizations/RingsView'
import TimelineView from '@/components/visualizations/TimelineView'
import GraphView from '@/components/visualizations/GraphView'

const TABS = [
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'rings', label: 'Rings' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'graph', label: 'Graph' },
] as const

type ViewId = typeof TABS[number]['id']

export default function VizHub() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const raw = searchParams.get('view')
  const view: ViewId = TABS.some(t => t.id === raw) ? (raw as ViewId) : 'heatmap'

  function selectView(id: ViewId) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="px-4 sm:px-6 py-5">
      <div className="flex mb-6 border-b border-m-line">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => selectView(tab.id)}
            className={`relative pb-2.5 px-4 text-sm font-medium transition-colors
              ${view === tab.id ? 'text-m-violet-bright' : 'text-m-dim hover:text-m-ink'}`}
          >
            {tab.label}
            {view === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-px bg-m-violet" />
            )}
          </button>
        ))}
      </div>

      {view === 'heatmap' && <HeatmapView />}
      {view === 'rings' && <RingsView />}
      {view === 'timeline' && <TimelineView />}
      {view === 'graph' && <GraphView />}
    </div>
  )
}
