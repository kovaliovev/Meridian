import { Suspense } from 'react'
import TaskFocusCanvas from '@/components/tasks/TaskFocusCanvas'

export default function TasksPage() {
  return (
    <Suspense>
      <TaskFocusCanvas />
    </Suspense>
  )
}
