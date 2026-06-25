'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LifeAreaWithData } from '@/lib/types'
import LifeAreaSection from './LifeAreaSection'
import EmptyState from '@/components/ui/EmptyState'
import AddSheet from '@/components/ui/AddSheet'

export default function EditCanvas() {
  const supabase = createClient()
  const [areas, setAreas] = useState<LifeAreaWithData[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const searchParams = useSearchParams()
  const selectedAreaId = searchParams.get('area')

  const loadAll = useCallback(async () => {
    const { data: lifeAreas } = await supabase.from('life_areas').select('*').order('position')
    if (!lifeAreas) return

    const { data: projects } = await supabase.from('projects').select('*').order('position')
    const { data: tasks } = await supabase.from('tasks').select('*').order('position')
    const { data: subtasks } = await supabase.from('subtasks').select('*').order('position')
    const { data: habits } = await supabase.from('habits').select('*')
    const today = new Date().toLocaleDateString('en-CA')
    const { data: completions } = await supabase.from('habit_completions').select('habit_id').eq('completed_date', today)
    const completedIds = new Set((completions ?? []).map(c => c.habit_id))

    setAreas(lifeAreas.map(area => ({
      ...area,
      habits: (habits ?? []).filter(h => h.life_area_id === area.id).map(h => ({ ...h, completedToday: completedIds.has(h.id) })),
      projects: (projects ?? []).filter(p => p.life_area_id === area.id).map(project => ({
        ...project,
        tasks: (tasks ?? []).filter(t => t.project_id === project.id).map(task => ({
          ...task,
          subtasks: (subtasks ?? []).filter(s => s.task_id === task.id),
        })),
      })),
    })))
  }, [supabase])

  useEffect(() => { loadAll() }, [loadAll])

  const visibleAreas = selectedAreaId ? areas.filter(a => a.id === selectedAreaId) : areas

  return (
    <>
      {areas.length === 0 ? (
        <EmptyState message="Add a life area in the sidebar to get started." />
      ) : (
        <div className="pb-24">
          {visibleAreas.map(area => (
            <LifeAreaSection key={area.id} area={area} onChanged={loadAll} />
          ))}
        </div>
      )}

      {/* FAB */}
      {areas.length > 0 && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Add task or project"
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-m-violet text-m-bg flex items-center justify-center text-2xl font-light shadow-lg shadow-black/40 hover:bg-m-violet-bright hover:scale-105 active:scale-95 transition-all z-30 select-none"
        >
          +
        </button>
      )}

      <AddSheet
        areas={areas}
        open={sheetOpen}
        defaultAreaId={selectedAreaId}
        onClose={() => setSheetOpen(false)}
        onSuccess={loadAll}
      />
    </>
  )
}
