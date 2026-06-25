import { Suspense } from 'react'
import GraphView from '@/components/visualizations/GraphView'

export default function GraphPage() {
  return (
    <Suspense>
      <GraphView />
    </Suspense>
  )
}
