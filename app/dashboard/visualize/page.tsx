import { Suspense } from 'react'
import VizHub from '@/components/visualize/VizHub'

export default function VisualizePage() {
  return (
    <Suspense fallback={<div className="p-8 text-m-ghost font-mono text-sm">Loading…</div>}>
      <VizHub />
    </Suspense>
  )
}
