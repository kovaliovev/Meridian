'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Project, LifeArea } from '@/lib/types'

type Props = {
  task: Task
  project: Project
  area: LifeArea
  onCompleted: (id: string) => void
  onEdit: (task: Task) => void
}

export default function TaskCard({ task, project, area, onCompleted, onEdit }: Props) {
  const supabase = createClient()
  const [leaving, setLeaving] = useState(false)
  const today = new Date().toLocaleDateString('en-CA')
  const isOverdue = !!task.due_date && task.due_date < today

  async function handleComplete() {
    if (leaving) return
    setLeaving(true)
    await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id)
    setTimeout(() => onCompleted(task.id), 280)
  }

  return (
    <div
      className={`transition-all duration-[280ms] ease-out overflow-hidden
        ${leaving ? 'opacity-0 -translate-y-1 max-h-0' : 'opacity-100 translate-y-0 max-h-32'}`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-m-line last:border-b-0 group">
        {/* Area color bar */}
        <div className="w-0.5 h-9 rounded-full shrink-0" style={{ backgroundColor: area.color }} />

        {/* Checkbox */}
        <button
          onClick={handleComplete}
          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all
            ${leaving ? 'border-m-violet bg-m-violet/20' : 'border-m-spoke hover:border-m-violet hover:bg-m-violet/10'}`}
          aria-label="Complete task"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
          <p className={`text-sm text-m-ink leading-snug truncate hover:text-m-violet-bright transition-colors
            ${task.status === 'in_progress' ? 'font-semibold' : ''}`}>
            {task.name}
          </p>
          <p className="text-[11px] text-m-ghost mt-0.5 truncate">{project.name}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {task.priority === 'high' && (
            <span className="text-[9px] font-mono font-bold text-m-red border border-m-red/40 rounded px-1.5 py-0.5 tracking-wider">HIGH</span>
          )}
          {task.due_date && (
            <span className={`text-[10px] font-mono ${isOverdue ? 'text-m-red' : 'text-m-ghost'}`}>
              {task.due_date}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
