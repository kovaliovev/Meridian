import { Suspense } from 'react'
import TimelineView from '@/components/visualizations/TimelineView'

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
      <TimelineView />
    </Suspense>
  )
}
