'use client'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LifeArea, Project, Task } from '@/lib/types'

type ProjectStat = { name: string; total: number; done: number }
type AreaStats = LifeArea & { total: number; done: number; projects: ProjectStat[] }

function Ring({ stats, size = 120 }: { stats: AreaStats; size?: number }) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const pct = stats.total === 0 ? 0 : stats.done / stats.total
  const dashOffset = circumference * (1 - pct)
  const cx = size / 2
  const cy = size / 2
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative flex flex-col items-center gap-2">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1f2937" strokeWidth={12} />
        <circle
          cx={cx} cy={cy} r={radius} fill="none"
          stroke={stats.color} strokeWidth={12}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="text-xl">{stats.icon}</span>
        <span className="text-xs font-bold text-white">{Math.round(pct * 100)}%</span>
      </div>
      <span className="text-xs text-gray-400 text-center max-w-[100px] truncate">{stats.name}</span>
      <span className="text-xs text-gray-600">{stats.done}/{stats.total} tasks</span>

      {hovered && stats.projects.length > 0 && (
        <div className="absolute top-full mt-2 z-10 bg-gray-800 border border-gray-700 rounded-lg p-3 w-44 shadow-xl">
          {stats.projects.map(p => (
            <div key={p.name} className="flex justify-between text-xs text-gray-300 py-0.5">
              <span className="truncate mr-2">{p.name}</span>
              <span className="text-gray-500 shrink-0">{p.done}/{p.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RingsView() {
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<AreaStats[]>([])
  const selectedAreaId = useSearchParams().get('area')

  useEffect(() => {
    async function load() {
      const { data: areas, error: areasError } = await supabase.from('life_areas').select('*').order('position')
      if (areasError) { console.error('Failed to load life areas:', areasError); return }
      if (!areas) return

      const { data: projects, error: projectsError } = await supabase.from('projects').select('*')
      if (projectsError) { console.error('Failed to load projects:', projectsError); return }

      const { data: tasks, error: tasksError } = await supabase.from('tasks').select('id, project_id, status')
      if (tasksError) { console.error('Failed to load tasks:', tasksError); return }

      const typedAreas = areas as LifeArea[]
      const typedProjects = (projects ?? []) as Project[]
      const typedTasks = (tasks ?? []) as Pick<Task, 'id' | 'project_id' | 'status'>[]

      setStats(typedAreas.map(area => {
        const areaProjects = typedProjects.filter(p => p.life_area_id === area.id)
        const projectStats: ProjectStat[] = areaProjects.map(p => {
          const pts = typedTasks.filter(t => t.project_id === p.id)
          return { name: p.name, total: pts.length, done: pts.filter(t => t.status === 'done').length }
        })
        const total = projectStats.reduce((s, p) => s + p.total, 0)
        const done = projectStats.reduce((s, p) => s + p.done, 0)
        return { ...area, total, done, projects: projectStats }
      }))
    }
    load()
  }, [supabase])

  const visibleStats = selectedAreaId ? stats.filter(s => s.id === selectedAreaId) : stats

  if (stats.length === 0) return <div className="text-gray-500 text-sm">No life areas yet.</div>

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-8">Progress Overview</h1>
      <div className="flex flex-wrap gap-10">
        {visibleStats.map(s => <Ring key={s.id} stats={s} size={140} />)}
      </div>
    </div>
  )
}
