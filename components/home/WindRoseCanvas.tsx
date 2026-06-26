'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import WindRose, { type AreaScore } from './WindRose'
import AddSheet from '@/components/ui/AddSheet'
import EmptyState from '@/components/ui/EmptyState'
import type { LifeAreaWithData, Task } from '@/lib/types'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function WindRoseCanvas() {
  const supabase = useMemo(() => createClient(), [])
  const [scores, setScores] = useState<AreaScore[]>([])
  const [weekCount, setWeekCount] = useState(0)
  const [areasWithData, setAreasWithData] = useState<LifeAreaWithData[]>([])
  const [fabOpen, setFabOpen] = useState(false)

  const load = useCallback(async () => {
    const { data: lifeAreas } = await supabase.from('life_areas').select('*').order('position')
    if (!lifeAreas || lifeAreas.length === 0) { setScores([]); return }

    const [
      { data: projects },
      { data: allTasks },
      { data: subtasks },
      { data: habits },
      { data: allCompletions },
      { data: recentCompletions },
    ] = await Promise.all([
      supabase.from('projects').select('*').order('position'),
      supabase.from('tasks').select('*').order('position'),
      supabase.from('subtasks').select('*').order('position'),
      supabase.from('habits').select('id, life_area_id'),
      supabase.from('habit_completions').select('habit_id'),
      supabase.from('habit_completions').select('habit_id, completed_date')
        .gte('completed_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
    ])

    const projectAreaMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.life_area_id]))
    const habitAreaMap = Object.fromEntries((habits ?? []).map(h => [h.id, h.life_area_id]))

    const lifetimeTasks: Record<string, number> = {}
    for (const t of (allTasks ?? []) as Task[]) {
      if (t.status !== 'done') continue
      const areaId = projectAreaMap[t.project_id]
      if (areaId) lifetimeTasks[areaId] = (lifetimeTasks[areaId] ?? 0) + 1
    }

    const lifetimeHabits: Record<string, number> = {}
    for (const c of allCompletions ?? []) {
      const areaId = habitAreaMap[c.habit_id]
      if (areaId) lifetimeHabits[areaId] = (lifetimeHabits[areaId] ?? 0) + 1
    }

    const recentByArea: Record<string, number> = {}
    for (const c of recentCompletions ?? []) {
      const areaId = habitAreaMap[c.habit_id]
      if (areaId) recentByArea[areaId] = (recentByArea[areaId] ?? 0) + 1
    }

    let totalWeek = 0
    const scored: AreaScore[] = lifeAreas.map(area => {
      const lifetime = (lifetimeTasks[area.id] ?? 0) + (lifetimeHabits[area.id] ?? 0)
      const recent = recentByArea[area.id] ?? 0
      totalWeek += recent
      return { area, lifetimeScore: lifetime, recentScore: recent }
    })

    setScores(scored)
    setWeekCount(totalWeek)
    setAreasWithData(lifeAreas.map(area => ({
      ...area,
      habits: [],
      projects: (projects ?? []).filter(p => p.life_area_id === area.id).map(project => ({
        ...project,
        tasks: (allTasks ?? [] as Task[]).filter(t => t.project_id === project.id).map(task => ({
          ...task,
          subtasks: (subtasks ?? []).filter(s => s.task_id === task.id),
        })),
      })),
    })))
  }, [])

  useEffect(() => { load() }, [load])

  const dateStr = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
  const hasAreas = scores.length > 0

  return (
    <div className="flex flex-col pb-16 sm:pb-0" style={{ height: 'calc(100vh - 44px)' }}>
      {/* Stats header */}
      <div className="px-4 sm:px-6 pt-5 pb-3 shrink-0">
        <p className="font-mono text-[10px] text-m-ghost uppercase tracking-[0.2em] mb-1">{dateStr}</p>
        <p className="text-sm text-m-dim">
          {getGreeting()} —&nbsp;
          {weekCount > 0
            ? `${weekCount} completion${weekCount === 1 ? '' : 's'} this week`
            : 'Complete tasks and habits to grow your rose'}
        </p>
      </div>

      {/* Rose or empty state */}
      <div className="flex-1 min-h-0">
        {hasAreas ? (
          <WindRose scores={scores} />
        ) : (
          <EmptyState message="Add a life area to start growing your rose." />
        )}
      </div>

      {/* FAB */}
      {hasAreas && (
        <button
          onClick={() => setFabOpen(true)}
          aria-label="Add task or project"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-12 h-12 rounded-full bg-m-violet text-m-bg flex items-center justify-center text-2xl font-light shadow-lg shadow-black/40 hover:bg-m-violet-bright hover:scale-105 active:scale-95 transition-all z-30 select-none"
        >
          +
        </button>
      )}

      <AddSheet
        areas={areasWithData}
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        onSuccess={() => { setFabOpen(false); load() }}
      />
    </div>
  )
}
