'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeArea, Habit } from '@/lib/types'

type HabitRow = Habit & { completedToday: boolean; lifeAreaName: string; lifeAreaColor: string }

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default function TodaysHabits({ lifeAreas }: { lifeAreas: LifeArea[] }) {
  const supabase = useMemo(() => createClient(), [])
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [addingToAreaId, setAddingToAreaId] = useState<string | null>(null)
  const [newHabitName, setNewHabitName] = useState('')

  const loadHabits = useCallback(async () => {
    const today = toDateString(new Date())
    const { data: habitsData } = await supabase.from('habits').select('*').order('created_at')
    if (!habitsData) return

    const { data: completions } = await supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('completed_date', today)

    const completedIds = new Set((completions ?? []).map((c: { habit_id: string }) => c.habit_id))

    // Reset streaks for habits missed yesterday (lazy evaluation on mount)
    const yesterday = toDateString(new Date(Date.now() - 86400000))
    const toReset = habitsData.filter((h: Habit) =>
      h.last_completed_at &&
      toDateString(new Date(h.last_completed_at)) < yesterday &&
      h.streak_count > 0
    )
    if (toReset.length > 0) {
      await supabase
        .from('habits')
        .update({ streak_count: 0 })
        .in('id', toReset.map((h: Habit) => h.id))
    }

    const areaMap = Object.fromEntries(lifeAreas.map(a => [a.id, a]))
    setHabits(
      (habitsData as Habit[]).map(h => ({
        ...h,
        streak_count: toReset.find((r: Habit) => r.id === h.id) ? 0 : h.streak_count,
        completedToday: completedIds.has(h.id),
        lifeAreaName: areaMap[h.life_area_id]?.name ?? '',
        lifeAreaColor: areaMap[h.life_area_id]?.color ?? '#6366f1',
      }))
    )
  }, [supabase, lifeAreas])

  useEffect(() => { loadHabits() }, [loadHabits])

  async function toggleHabit(habit: HabitRow) {
    if (habit.completedToday) return // append-only log — no un-checking
    const today = toDateString(new Date())
    const { error: insertError } = await supabase
      .from('habit_completions')
      .insert({ habit_id: habit.id, completed_date: today })
    if (insertError) {
      console.error('Failed to complete habit:', insertError)
      return
    }
    const { error: updateError } = await supabase
      .from('habits')
      .update({
        last_completed_at: new Date().toISOString(),
        streak_count: habit.streak_count + 1,
      })
      .eq('id', habit.id)
    if (updateError) {
      console.error('Failed to update habit streak:', updateError)
      return
    }
    await loadHabits()
  }

  async function addHabit(lifeAreaId: string) {
    if (!newHabitName.trim()) return
    const { error } = await supabase.from('habits').insert({ life_area_id: lifeAreaId, name: newHabitName.trim() })
    if (error) {
      console.error('Failed to add habit:', error)
      return
    }
    setNewHabitName('')
    setAddingToAreaId(null)
    await loadHabits()
  }

  async function deleteHabit(id: string) {
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete habit:', error)
      return
    }
    await loadHabits()
  }

  if (lifeAreas.length === 0) return null

  return (
    <div className="p-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today&apos;s Habits</p>
      {lifeAreas.map(area => {
        const areaHabits = habits.filter(h => h.life_area_id === area.id)
        const isAdding = addingToAreaId === area.id
        if (areaHabits.length === 0 && !isAdding) return null
        return (
          <div key={area.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: area.color }}>
                {area.icon} {area.name}
              </span>
              <button
                onClick={() => setAddingToAreaId(area.id)}
                className="text-xs text-gray-600 hover:text-gray-400"
              >
                +
              </button>
            </div>
            {areaHabits.map(habit => (
              <div key={habit.id} className="group flex items-center gap-2 py-0.5">
                <button
                  onClick={() => toggleHabit(habit)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    habit.completedToday
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-600 hover:border-emerald-500'
                  }`}
                >
                  {habit.completedToday && <span className="text-white text-xs">✓</span>}
                </button>
                <span
                  className={`flex-1 text-xs ${
                    habit.completedToday ? 'line-through text-gray-600' : 'text-gray-300'
                  }`}
                >
                  {habit.name}
                </span>
                {habit.streak_count > 0 && (
                  <span className="text-xs text-amber-400">🔥{habit.streak_count}</span>
                )}
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            {isAdding && (
              <input
                autoFocus
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                onBlur={() => {
                  if (newHabitName.trim()) addHabit(area.id)
                  else setAddingToAreaId(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') addHabit(area.id)
                  if (e.key === 'Escape') setAddingToAreaId(null)
                }}
                placeholder="Habit name…"
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
