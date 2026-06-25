import { Suspense } from 'react'
import HeatmapView from '@/components/visualizations/HeatmapView'

export default function HeatmapPage() {
  return (
    <Suspense>
      <HeatmapView />
    </Suspense>
  )
}
