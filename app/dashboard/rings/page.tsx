import { Suspense } from 'react'
import RingsView from '@/components/visualizations/RingsView'

export default function RingsPage() {
  return (
    <Suspense>
      <RingsView />
    </Suspense>
  )
}
