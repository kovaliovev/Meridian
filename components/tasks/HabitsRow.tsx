'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Habit, LifeArea } from '@/lib/types'

type HabitRow = Habit & { color: string; completedToday: boolean }

function toDateString(d: Date) { return d.toLocaleDateString('en-CA') }

export default function HabitsRow({ areas, filterAreaId }: { areas: LifeArea[]; filterAreaId: string | null }) {
  const supabase = useMemo(() => createClient(), [])
  const [habits, setHabits] = useState<HabitRow[]>([])

  const load = useCallback(async () => {
    const { data: habitsData } = await supabase.from('habits').select('*').order('created_at')
    if (!habitsData) return
    const today = toDateString(new Date())
    const { data: completions } = await supabase.from('habit_completions').select('habit_id').eq('completed_date', today)
    const doneIds = new Set((completions ?? []).map((c: { habit_id: string }) => c.habit_id))
    const areaMap = Object.fromEntries(areas.map(a => [a.id, a]))
    setHabits(
      (habitsData as Habit[])
        .filter(h => !filterAreaId || h.life_area_id === filterAreaId)
        .map(h => ({
          ...h,
          color: areaMap[h.life_area_id]?.color ?? '#a78bfa',
          completedToday: doneIds.has(h.id),
        }))
    )
  }, [areas, filterAreaId])

  useEffect(() => { load() }, [load])

  async function toggle(h: HabitRow) {
    if (h.completedToday) return
    const today = toDateString(new Date())
    const { error: insertError } = await supabase.from('habit_completions').insert({ habit_id: h.id, completed_date: today })
    if (insertError) return  // duplicate insert (race/multi-device) — bail silently
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toLocaleDateString('en-CA')
    const streakBroken = !h.last_completed_at || h.last_completed_at < yesterdayStr
    await supabase
      .from('habits')
      .update({
        streak_count: streakBroken ? 1 : h.streak_count + 1,
        last_completed_at: today,
      })
      .eq('id', h.id)
    await load()
  }

  if (habits.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto py-1">
      {habits.map(h => (
        <button
          key={h.id}
          onClick={() => toggle(h)}
          className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all ${
            h.completedToday
              ? 'border-transparent text-m-bg'
              : 'border-m-line text-m-dim hover:border-m-spoke hover:text-m-ink'
          }`}
          style={h.completedToday ? { backgroundColor: h.color } : {}}
        >
          <span className="text-[10px]">{h.completedToday ? '✓' : '○'}</span>
          {h.name}
          {h.streak_count > 1 && !h.completedToday && (
            <span className="text-[10px] text-m-amber font-mono">{h.streak_count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
