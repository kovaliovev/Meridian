'use client'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LifeArea, Habit } from '@/lib/types'

function toDateStr(d: Date) { return d.toLocaleDateString('en-CA') }

function buildGrid() {
  const today = new Date(); today.setHours(0,0,0,0)
  const end = new Date(today)
  const start = new Date(today)
  start.setDate(today.getDate() - 364)
  // align to Sunday
  start.setDate(start.getDate() - start.getDay())
  const days: Date[] = []
  const cur = new Date(start)
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  return days
}

export default function HeatmapView() {
  const supabase = useMemo(() => createClient(), [])
  const [completionMap, setCompletionMap] = useState<Record<string, { count: number; habits: string[] }>>({})
  const [maxCount, setMaxCount] = useState(1)
  const [habits, setHabits] = useState<(Habit & { areaColor: string; areaName: string })[]>([])
  const [filterAreaId, setFilterAreaId] = useState<string | null>(useSearchParams().get('area'))
  const [areas, setAreas] = useState<LifeArea[]>([])
  const [tooltip, setTooltip] = useState<{ date: string; habits: string[]; x: number; y: number } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: areasData, error: areasError } = await supabase.from('life_areas').select('*').order('position')
      if (areasError) { console.error('Failed to load life areas:', areasError); return }
      const { data: habitsData, error: habitsError } = await supabase.from('habits').select('*')
      if (habitsError) { console.error('Failed to load habits:', habitsError); return }
      const startDate = toDateStr(new Date(Date.now() - 365 * 86400000))
      const { data: completions, error: completionsError } = await supabase
        .from('habit_completions')
        .select('habit_id, completed_date')
        .gte('completed_date', startDate)
      if (completionsError) { console.error('Failed to load completions:', completionsError); return }
      if (!areasData || !habitsData || !completions) return

      setAreas(areasData)
      const areaMap = Object.fromEntries(areasData.map(a => [a.id, a]))
      const habitMap = Object.fromEntries(habitsData.map(h => [h.id, { ...h, areaColor: areaMap[h.life_area_id]?.color ?? '#6366f1', areaName: areaMap[h.life_area_id]?.name ?? '' }]))
      setHabits(Object.values(habitMap))

      const map: Record<string, { count: number; habits: string[] }> = {}
      for (const c of completions) {
        const h = habitMap[c.habit_id]
        if (!h) continue
        if (filterAreaId && h.life_area_id !== filterAreaId) continue
        if (!map[c.completed_date]) map[c.completed_date] = { count: 0, habits: [] }
        map[c.completed_date].count++
        map[c.completed_date].habits.push(h.name)
      }
      setCompletionMap(map)
      setMaxCount(Math.max(1, ...Object.values(map).map(v => v.count)))
    }
    load()
  }, [supabase, filterAreaId])

  const days = buildGrid()
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAY_SIZE = 13
  const GAP = 2

  function cellColor(date: Date) {
    const ds = toDateStr(date)
    const entry = completionMap[ds]
    if (!entry) return '#1f2937'
    const intensity = entry.count / maxCount
    if (intensity < 0.25) return '#065f46'
    if (intensity < 0.5) return '#059669'
    if (intensity < 0.75) return '#10b981'
    return '#34d399'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Habit History</h1>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterAreaId(null)}
            className={`px-2 py-1 rounded text-xs transition-colors ${!filterAreaId ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            All
          </button>
          {areas.map(a => (
            <button key={a.id} onClick={() => setFilterAreaId(a.id)}
              className={`px-2 py-1 rounded text-xs transition-colors ${filterAreaId === a.id ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              style={filterAreaId === a.id ? { backgroundColor: a.color } : {}}>
              {a.icon} {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="relative overflow-x-auto">
        {/* Month labels */}
        <div className="flex mb-1" style={{ marginLeft: 28 }}>
          {weeks.map((week, wi) => {
            const firstDay = week[0]
            if (firstDay.getDate() <= 7) {
              return <div key={wi} style={{ width: DAY_SIZE + GAP }} className="text-xs text-gray-600 whitespace-nowrap overflow-visible">
                {MONTHS[firstDay.getMonth()]}
              </div>
            }
            return <div key={wi} style={{ width: DAY_SIZE + GAP }} />
          })}
        </div>

        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col mr-1" style={{ gap: GAP }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ height: DAY_SIZE }} className="text-xs text-gray-700 flex items-center justify-end pr-1 w-5">
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP, marginRight: GAP }}>
              {week.map((day, di) => {
                const ds = toDateStr(day)
                const entry = completionMap[ds]
                return (
                  <div key={di}
                    style={{ width: DAY_SIZE, height: DAY_SIZE, backgroundColor: cellColor(day), borderRadius: 2, cursor: entry ? 'pointer' : 'default' }}
                    onMouseEnter={e => entry && setTooltip({ date: ds, habits: entry.habits, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl pointer-events-none text-xs text-gray-200"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}>
          <div className="font-semibold mb-1">{tooltip.date}</div>
          {tooltip.habits.map((h, i) => <div key={i} className="text-emerald-400">&#x2713; {h}</div>)}
        </div>
      )}

      {/* Streak badges */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Current Streaks</h2>
        <div className="flex flex-wrap gap-2">
          {habits.filter(h => h.streak_count > 0).map(h => (
            <div key={h.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full">
              <span className="text-xs text-gray-300">{h.name}</span>
              <span className="text-xs text-amber-400">&#x1F525; {h.streak_count}</span>
              <span className="text-xs text-gray-600">&#183; {h.areaName}</span>
            </div>
          ))}
          {habits.every(h => h.streak_count === 0) && (
            <p className="text-sm text-gray-600">Complete habits to build streaks.</p>
          )}
        </div>
      </div>
    </div>
  )
}
