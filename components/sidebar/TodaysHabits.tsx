'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeArea, Habit } from '@/lib/types'

type HabitRow = Habit & { completedToday: boolean; lifeAreaName: string; lifeAreaColor: string }

function toDateString(date: Date): string {
  return date.toLocaleDateString('en-CA')
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

    const yesterday = toDateString(new Date(Date.now() - 86400000))
    const toReset = habitsData.filter((h: Habit) =>
      h.last_completed_at &&
      toDateString(new Date(h.last_completed_at)) < yesterday &&
      h.streak_count > 0
    )
    if (toReset.length > 0) {
      const yesterdayEnd = new Date(Date.now() - 86400000)
      yesterdayEnd.setHours(23, 59, 59, 999)
      await supabase
        .from('habits')
        .update({ streak_count: 0 })
        .in('id', toReset.map((h: Habit) => h.id))
        .lt('last_completed_at', yesterdayEnd.toISOString())
    }

    const areaMap = Object.fromEntries(lifeAreas.map(a => [a.id, a]))
    setHabits(
      (habitsData as Habit[]).map(h => ({
        ...h,
        streak_count: toReset.find((r: Habit) => r.id === h.id) ? 0 : h.streak_count,
        completedToday: completedIds.has(h.id),
        lifeAreaName: areaMap[h.life_area_id]?.name ?? '',
        lifeAreaColor: areaMap[h.life_area_id]?.color ?? '#a78bfa',
      }))
    )
  }, [supabase, lifeAreas])

  useEffect(() => { loadHabits() }, [loadHabits])

  async function toggleHabit(habit: HabitRow) {
    if (habit.completedToday) return
    const today = toDateString(new Date())
    const { error: insertError } = await supabase
      .from('habit_completions')
      .insert({ habit_id: habit.id, completed_date: today })
    if (insertError) { console.error('Failed to complete habit:', insertError); return }
    const { error: updateError } = await supabase
      .from('habits')
      .update({
        last_completed_at: new Date().toISOString(),
        streak_count: habit.streak_count + 1,
      })
      .eq('id', habit.id)
    if (updateError) { console.error('Failed to update habit streak:', updateError); return }
    await loadHabits()
  }

  async function addHabit(lifeAreaId: string) {
    if (!newHabitName.trim()) return
    const { error } = await supabase.from('habits').insert({ life_area_id: lifeAreaId, name: newHabitName.trim() })
    if (error) { console.error('Failed to add habit:', error); return }
    setNewHabitName('')
    setAddingToAreaId(null)
    await loadHabits()
  }

  async function deleteHabit(id: string) {
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (error) { console.error('Failed to delete habit:', error); return }
    await loadHabits()
  }

  if (lifeAreas.length === 0) return null

  const hasAnyHabits = habits.length > 0
  if (!hasAnyHabits && !addingToAreaId) return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-mono font-semibold text-m-ghost uppercase tracking-[0.2em] mb-2">Habits</p>
      <button
        onClick={() => lifeAreas[0] && setAddingToAreaId(lifeAreas[0].id)}
        className="text-xs text-m-dim hover:text-m-violet transition-colors"
      >
        + add habit
      </button>
    </div>
  )

  return (
    <div className="px-4 py-3 space-y-3">
      <p className="text-[10px] font-mono font-semibold text-m-ghost uppercase tracking-[0.2em]">Habits</p>
      {lifeAreas.map(area => {
        const areaHabits = habits.filter(h => h.life_area_id === area.id)
        const isAdding = addingToAreaId === area.id
        if (areaHabits.length === 0 && !isAdding) return null
        return (
          <div key={area.id}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: area.color }}>
                {area.name}
              </span>
              <button
                onClick={() => setAddingToAreaId(area.id)}
                className="text-[10px] text-m-ghost hover:text-m-dim transition-colors"
              >
                +
              </button>
            </div>
            {areaHabits.map(habit => (
              <div key={habit.id} className="group flex items-center gap-2 py-0.5">
                <button
                  onClick={() => toggleHabit(habit)}
                  className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all ${
                    habit.completedToday ? 'border-transparent' : 'border-m-spoke hover:border-m-violet'
                  }`}
                  style={habit.completedToday ? { backgroundColor: habit.lifeAreaColor } : {}}
                >
                  {habit.completedToday && <span className="text-[#080810] text-[7px] font-bold leading-none">✓</span>}
                </button>
                <span className={`flex-1 text-xs transition-colors ${habit.completedToday ? 'line-through text-m-ghost' : 'text-m-dim'}`}>
                  {habit.name}
                </span>
                {habit.streak_count > 1 && (
                  <span className="text-[10px] text-m-amber font-mono">{habit.streak_count}</span>
                )}
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="hidden group-hover:block text-[10px] text-m-ghost hover:text-m-red transition-colors"
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
                onBlur={() => { if (newHabitName.trim()) addHabit(area.id); else setAddingToAreaId(null) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') addHabit(area.id)
                  if (e.key === 'Escape') setAddingToAreaId(null)
                }}
                placeholder="Habit name…"
                className="w-full mt-1 bg-transparent border-b border-m-violet text-xs text-m-ink outline-none pb-px placeholder:text-m-ghost"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
