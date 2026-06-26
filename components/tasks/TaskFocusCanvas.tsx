'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AreaFilterBar from './AreaFilterBar'
import HabitsRow from './HabitsRow'
import TaskCard from './TaskCard'
import EditTaskSheet from './EditTaskSheet'
import AddSheet from '@/components/ui/AddSheet'
import EmptyState from '@/components/ui/EmptyState'
import type { Task, Project, LifeArea, LifeAreaWithData } from '@/lib/types'

type EnrichedTask = Task & { project: Project; area: LifeArea }

const PRIORITY_ORDER: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 }

function sortFocus(tasks: EnrichedTask[]): EnrichedTask[] {
  const statusOrder: Record<string, number> = { in_progress: 0, todo: 1 }
  return [...tasks].sort((a, b) => (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1))
}

function sortUpNext(tasks: EnrichedTask[]): EnrichedTask[] {
  return [...tasks].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (pd !== 0) return pd
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return a.position - b.position
  })
}

export default function TaskFocusCanvas() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const filterAreaId = searchParams.get('area')

  const [areas, setAreas] = useState<LifeArea[]>([])
  const [tasks, setTasks] = useState<EnrichedTask[]>([])
  const [areasWithData, setAreasWithData] = useState<LifeAreaWithData[]>([])
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [fabOpen, setFabOpen] = useState(false)

  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), [])

  const load = useCallback(async () => {
    const [
      { data: lifeAreas },
      { data: projects },
      { data: rawTasks },
      { data: subtasks },
    ] = await Promise.all([
      supabase.from('life_areas').select('*').order('position'),
      supabase.from('projects').select('*').order('position'),
      supabase.from('tasks').select('*').order('position'),
      supabase.from('subtasks').select('*').order('position'),
    ])

    if (!lifeAreas || !projects || !rawTasks) return

    setAreas(lifeAreas)

    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))
    const areaMap = Object.fromEntries(lifeAreas.map(a => [a.id, a]))

    const enriched: EnrichedTask[] = (rawTasks as Task[])
      .filter(t => t.status !== 'done')
      .map(t => {
        const project = projectMap[t.project_id] as Project
        const area = project ? (areaMap[project.life_area_id] as LifeArea) : undefined
        return { ...t, project, area: area! }
      })
      .filter(t => t.project && t.area)

    setTasks(enriched)
    setAreasWithData(lifeAreas.map(area => ({
      ...area,
      habits: [],
      projects: projects.filter(p => p.life_area_id === area.id).map(project => ({
        ...project,
        tasks: (rawTasks as Task[]).filter(t => t.project_id === project.id).map(task => ({
          ...task,
          subtasks: (subtasks ?? []).filter(s => s.task_id === task.id),
        })),
      })),
    })))
  }, [supabase])

  useEffect(() => { load() }, [load])

  function removeTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const visible = filterAreaId ? tasks.filter(t => t.area?.id === filterAreaId) : tasks

  function isFocus(t: EnrichedTask) {
    return t.status === 'in_progress' || t.priority === 'high' || t.due_date === today
  }

  const focusTasks = sortFocus(visible.filter(isFocus))
  const upNextTasks = sortUpNext(visible.filter(t => !isFocus(t)))

  if (areas.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        <EmptyState message="No life areas yet — start from the Home page." />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 pb-28">
      {/* Filter bar */}
      <div className="mb-4">
        <AreaFilterBar areas={areas} />
      </div>

      {/* Habits */}
      <div className="mb-5">
        <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.2em] mb-2.5">Today&apos;s Habits</p>
        <HabitsRow areas={areas} filterAreaId={filterAreaId} />
      </div>

      {/* Today's Focus */}
      {focusTasks.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.2em]">Today&apos;s Focus</p>
            <span className="text-[10px] font-mono text-m-violet-bright bg-m-violet/10 rounded px-1.5 py-0.5">{focusTasks.length}</span>
          </div>
          <div className="rounded-xl overflow-hidden border border-m-line bg-m-surface">
            {focusTasks.map(t => (
              <TaskCard key={t.id} task={t} project={t.project} area={t.area}
                onCompleted={removeTask} onEdit={setEditingTask} />
            ))}
          </div>
        </section>
      )}

      {/* Up Next */}
      {upNextTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.2em]">Up Next</p>
            <span className="text-[10px] font-mono text-m-dim bg-m-raised rounded px-1.5 py-0.5">{upNextTasks.length}</span>
          </div>
          <div className="rounded-xl overflow-hidden border border-m-line bg-m-surface">
            {upNextTasks.map(t => (
              <TaskCard key={t.id} task={t} project={t.project} area={t.area}
                onCompleted={removeTask} onEdit={setEditingTask} />
            ))}
          </div>
        </section>
      )}

      {visible.length === 0 && tasks.length > 0 && (
        <EmptyState message="No tasks in this area." />
      )}
      {tasks.length === 0 && (
        <EmptyState message="Nothing here — you're all caught up." />
      )}

      <EditTaskSheet
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSuccess={() => { setEditingTask(null); load() }}
      />

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        aria-label="Add task or project"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-12 h-12 rounded-full bg-m-violet text-m-bg flex items-center justify-center text-2xl font-light shadow-lg shadow-black/40 hover:bg-m-violet-bright hover:scale-105 active:scale-95 transition-all z-30 select-none"
      >
        +
      </button>

      <AddSheet
        areas={areasWithData}
        open={fabOpen}
        defaultAreaId={filterAreaId}
        onClose={() => setFabOpen(false)}
        onSuccess={() => { setFabOpen(false); load() }}
      />
    </div>
  )
}
