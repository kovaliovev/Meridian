'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LifeAreaWithData } from '@/lib/types'
import LifeAreaSection from './LifeAreaSection'
import EmptyState from '@/components/ui/EmptyState'

export default function EditCanvas() {
  const supabase = createClient()
  const [areas, setAreas] = useState<LifeAreaWithData[]>([])
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

  if (areas.length === 0) {
    return <EmptyState message="Add a life area in the sidebar to get started." />
  }

  return (
    <div>
      {visibleAreas.map(area => (
        <LifeAreaSection key={area.id} area={area} onChanged={loadAll} />
      ))}
    </div>
  )
}
