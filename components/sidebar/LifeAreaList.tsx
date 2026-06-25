'use client'
import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { LifeArea } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const PRESET_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']
const PRESET_ICONS = ['💼', '❤️', '📚', '🎮', '🏃', '🎵', '✈️', '🌱', '🍎', '💡']

type Props = {
  lifeAreas: LifeArea[]
  selectedAreaId: string | null
  onSelectArea: (id: string | null) => void
  onChanged: () => void
}

export default function LifeAreaList({ lifeAreas, selectedAreaId, onSelectArea, onChanged }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  function handleSelectArea(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedAreaId === id) {
      params.delete('area')
    } else {
      params.set('area', id)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  async function addArea() {
    if (!newName.trim()) return
    await supabase.from('life_areas').insert({
      name: newName.trim(),
      color: PRESET_COLORS[lifeAreas.length % PRESET_COLORS.length],
      icon: PRESET_ICONS[lifeAreas.length % PRESET_ICONS.length],
      position: lifeAreas.length,
    })
    setNewName('')
    setAddingNew(false)
    onChanged()
  }

  async function renameArea(id: string) {
    if (!editName.trim()) return
    await supabase.from('life_areas').update({ name: editName.trim() }).eq('id', id)
    setEditingId(null)
    onChanged()
  }

  async function deleteArea(id: string) {
    await supabase.from('life_areas').delete().eq('id', id)
    if (selectedAreaId === id) onSelectArea(null)
    onChanged()
  }

  return (
    <div className="space-y-0.5">
      {lifeAreas.map(area => (
        <div
          key={area.id}
          className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
            ${selectedAreaId === area.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
          onClick={() => handleSelectArea(area.id)}
        >
          <span className="text-base">{area.icon}</span>
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
              className="flex-1 bg-transparent text-sm text-white outline-none border-b border-indigo-500"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm text-gray-200 truncate">{area.name}</span>
          )}
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: area.color }}
          />
          <div className="hidden group-hover:flex items-center gap-1 ml-1">
            <button
              onClick={e => {
                e.stopPropagation()
                setEditingId(area.id)
                setEditName(area.name)
              }}
              className="text-gray-500 hover:text-gray-300 text-xs px-1"
              title="Rename"
            >
              ✏️
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                deleteArea(area.id)
              }}
              className="text-gray-500 hover:text-red-400 text-xs px-1"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}

      {addingNew ? (
        <div className="px-3 py-2">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={() => {
              if (newName.trim()) addArea()
              else setAddingNew(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') addArea()
              if (e.key === 'Escape') setAddingNew(false)
            }}
            placeholder="Area name…"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <span>+</span> Add area
        </button>
      )}
    </div>
  )
}
