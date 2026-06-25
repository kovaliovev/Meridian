import { Suspense } from 'react'
import EditCanvas from '@/components/edit/EditCanvas'

export default function EditPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
      <EditCanvas />
    </Suspense>
  )
}
