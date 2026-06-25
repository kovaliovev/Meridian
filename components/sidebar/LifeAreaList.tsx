'use client'
import { useState, useMemo } from 'react'
import type { LifeArea } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const PRESET_COLORS = ['#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#c084fc', '#f87171', '#2dd4bf']
const PRESET_ICONS = ['💼', '❤️', '📚', '🎮', '🏃', '🎵', '✈️', '🌱', '🍎', '💡']

type Props = {
  lifeAreas: LifeArea[]
  selectedAreaId: string | null
  onSelectArea: (id: string) => void
  onChanged: () => void
}

export default function LifeAreaList({ lifeAreas, selectedAreaId, onSelectArea, onChanged }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function addArea() {
    if (!newName.trim()) return
    const { error } = await supabase.from('life_areas').insert({
      name: newName.trim(),
      color: PRESET_COLORS[lifeAreas.length % PRESET_COLORS.length],
      icon: PRESET_ICONS[lifeAreas.length % PRESET_ICONS.length],
      position: lifeAreas.length,
    })
    if (error) { console.error('Failed to add area:', error); return }
    setNewName('')
    setAddingNew(false)
    onChanged()
  }

  async function renameArea(id: string) {
    if (!editName.trim()) return
    const { error } = await supabase.from('life_areas').update({ name: editName.trim() }).eq('id', id)
    if (error) { console.error('Failed to rename area:', error); return }
    setEditingId(null)
    onChanged()
  }

  async function deleteArea(id: string) {
    const { error } = await supabase.from('life_areas').delete().eq('id', id)
    if (error) { console.error('Failed to delete area:', error); return }
    onChanged()
  }

  return (
    <div className="relative px-2">
      {/* The meridian rail — a vertical thread connecting area nodes */}
      {lifeAreas.length > 0 && (
        <div className="absolute left-[19px] top-2 w-px bg-m-line" style={{ height: `calc(${lifeAreas.length} * 36px - 8px)` }} />
      )}

      <div className="space-y-0">
        {lifeAreas.map(area => (
          <div
            key={area.id}
            className={`group relative flex items-center gap-2.5 pl-9 pr-2 py-[7px] rounded-md cursor-pointer transition-colors
              ${selectedAreaId === area.id ? 'bg-m-raised' : 'hover:bg-m-raised/60'}`}
            onClick={() => onSelectArea(area.id)}
          >
            {/* Area node on the rail */}
            <div
              className="absolute left-[13px] w-[13px] h-[13px] rounded-full shrink-0 transition-all"
              style={{
                backgroundColor: area.color,
                boxShadow: selectedAreaId === area.id ? `0 0 8px ${area.color}60` : 'none',
              }}
            />

            {editingId === area.id ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => renameArea(area.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') renameArea(area.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 bg-transparent text-sm text-m-ink outline-none border-b border-m-violet pb-px"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm text-m-ink truncate leading-none">{area.name}</span>
            )}

            <div className="hidden group-hover:flex items-center gap-2 shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setEditingId(area.id); setEditName(area.name) }}
                className="text-[10px] text-m-dim hover:text-m-ink transition-colors"
              >
                rename
              </button>
              <button
                onClick={e => { e.stopPropagation(); deleteArea(area.id) }}
                className="text-[10px] text-m-dim hover:text-m-red transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {addingNew ? (
          <div className="pl-9 pr-2 py-1.5">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={() => { if (newName.trim()) addArea(); else setAddingNew(false) }}
              onKeyDown={e => {
                if (e.key === 'Enter') addArea()
                if (e.key === 'Escape') setAddingNew(false)
              }}
              placeholder="Area name…"
              className="w-full bg-transparent border-b border-m-violet text-sm text-m-ink outline-none pb-px placeholder:text-m-dim"
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingNew(true)}
            className="relative flex items-center gap-2.5 pl-9 pr-2 py-[7px] text-sm text-m-dim hover:text-m-violet transition-colors w-full rounded-md hover:bg-m-raised/60"
          >
            <span className="absolute left-[13px] w-[13px] h-[13px] rounded-full border border-m-spoke flex items-center justify-center">
              <span className="text-[8px] leading-none">+</span>
            </span>
            Add area
          </button>
        )}
      </div>
    </div>
  )
}
