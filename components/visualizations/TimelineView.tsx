'use client'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Task, Project, LifeArea } from '@/lib/types'

type TaskRow = Task & { projectName: string; areaName: string; areaColor: string; areaId: string }
type Zoom = 'week' | 'month' | 'quarter'

function getDaysInRange(zoom: Zoom): { start: Date; days: Date[] } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  let count: number
  if (zoom === 'week') {
    start.setDate(today.getDate() - today.getDay())
    count = 7
  } else if (zoom === 'month') {
    start.setDate(1)
    count = 35
  } else {
    start.setDate(1)
    start.setMonth(Math.floor(today.getMonth() / 3) * 3)
    count = 91
  }
  return {
    start,
    days: Array.from({ length: count }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    }),
  }
}

export default function TimelineView() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const areaFilter = searchParams.get('area')

  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [unscheduled, setUnscheduled] = useState<TaskRow[]>([])
  const [zoom, setZoom] = useState<Zoom>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: areas, error: areasError } = await supabase.from('life_areas').select('*')
      if (areasError) { console.error('Failed to load life areas:', areasError); setLoading(false); return }

      const { data: projects, error: projectsError } = await supabase.from('projects').select('*')
      if (projectsError) { console.error('Failed to load projects:', projectsError); setLoading(false); return }

      const { data: rawTasks, error: tasksError } = await supabase.from('tasks').select('*')
      if (tasksError) { console.error('Failed to load tasks:', tasksError); setLoading(false); return }

      if (!rawTasks) { setLoading(false); return }

      const areaMap = Object.fromEntries((areas ?? []).map((a: LifeArea) => [a.id, a]))
      const projectMap = Object.fromEntries((projects ?? []).map((p: Project) => [p.id, p]))

      const mapped: TaskRow[] = (rawTasks as Task[]).map(t => {
        const proj = projectMap[t.project_id] as Project | undefined
        const area = proj ? (areaMap[proj.life_area_id] as LifeArea | undefined) : undefined
        return {
          ...t,
          projectName: proj?.name ?? '',
          areaName: area?.name ?? '',
          areaColor: area?.color ?? '#6366f1',
          areaId: area?.id ?? '',
        }
      })

      const filtered = areaFilter ? mapped.filter(t => t.areaId === areaFilter) : mapped

      setTasks(filtered.filter(t => t.due_date))
      setUnscheduled(filtered.filter(t => !t.due_date))
      setLoading(false)
    }
    load()
  }, [supabase, areaFilter])

  const { start, days } = getDaysInRange(zoom)
  const DAY_PX = zoom === 'week' ? 80 : zoom === 'month' ? 28 : 12
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayOffset = Math.floor((today.getTime() - start.getTime()) / 86400000)

  function taskLeft(task: TaskRow): number {
    const d = new Date(task.due_date!); d.setHours(0, 0, 0, 0)
    return Math.floor((d.getTime() - start.getTime()) / 86400000)
  }

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading timeline…</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">
          Timeline{areaFilter ? ' · Filtered' : ''}
        </h1>
        <div className="flex gap-1">
          {(['week', 'month', 'quarter'] as Zoom[]).map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-3 py-1 rounded text-sm capitalize transition-colors
                ${zoom === z ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {tasks.length === 0 && unscheduled.length === 0 ? (
        <div className="text-gray-500 text-sm">No tasks found.</div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: days.length * DAY_PX + 160 }}>
            {/* Header */}
            <div className="flex mb-1" style={{ marginLeft: 160 }}>
              {days.map((d, i) => (
                <div
                  key={i}
                  style={{ width: DAY_PX, flexShrink: 0 }}
                  className={`text-center text-xs ${d.getTime() === today.getTime() ? 'text-indigo-400 font-bold' : 'text-gray-600'}`}
                >
                  {zoom === 'week'
                    ? d.toLocaleDateString('en', { weekday: 'short', month: 'numeric', day: 'numeric' })
                    : zoom === 'month'
                    ? (d.getDate() === 1 || i === 0
                        ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
                        : d.getDate() % 7 === 0 ? String(d.getDate()) : '')
                    : (d.getDate() === 1 ? d.toLocaleDateString('en', { month: 'short' }) : '')}
                </div>
              ))}
            </div>

            {/* Today line */}
            {todayOffset >= 0 && todayOffset < days.length && (
              <div className="relative" style={{ marginLeft: 160, height: 0 }}>
                <div
                  className="absolute top-0 bottom-0 border-l border-indigo-500/50 z-10 pointer-events-none"
                  style={{ left: todayOffset * DAY_PX + DAY_PX / 2 }}
                />
              </div>
            )}

            {/* Task rows */}
            {tasks.map(task => {
              const left = taskLeft(task)
              if (left < 0 || left >= days.length) return null
              return (
                <div key={task.id} className="flex items-center mb-1" style={{ height: 28 }}>
                  <div className="w-40 shrink-0 text-xs text-gray-400 truncate pr-2 text-right">
                    {task.name}
                  </div>
                  <div className="relative flex-1" style={{ height: 28 }}>
                    <div
                      className="absolute top-3 h-4 rounded text-xs flex items-center px-2 text-white font-medium truncate"
                      style={{
                        left: left * DAY_PX,
                        width: DAY_PX * 1.5,
                        backgroundColor: task.areaColor,
                        opacity: task.status === 'done' ? 0.4 : 1,
                      }}
                      title={`${task.name} · ${task.areaName} · ${task.due_date}`}
                    >
                      {zoom !== 'quarter' && task.name}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Unscheduled lane */}
            {unscheduled.length > 0 && (
              <div className="mt-4 border-t border-gray-800 pt-3">
                <div className="text-xs text-gray-600 mb-2" style={{ marginLeft: 160 }}>
                  Unscheduled
                </div>
                {unscheduled.map(task => (
                  <div key={task.id} className="flex items-center mb-1" style={{ height: 24 }}>
                    <div className="w-40 shrink-0 text-xs text-gray-500 truncate pr-2 text-right">
                      {task.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.areaColor }} />
                      <span className="text-xs text-gray-600">{task.areaName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
