'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Subtask } from '@/lib/types'

export default function SubtaskItem({ subtask, onChanged }: { subtask: Subtask; onChanged: () => void }) {
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(subtask.name)

  async function toggleStatus() {
    const { error } = await supabase.from('subtasks').update({
      status: subtask.status === 'done' ? 'todo' : 'done'
    }).eq('id', subtask.id)
    if (!error) onChanged()
  }

  async function saveName() {
    if (!name.trim()) { setName(subtask.name); setEditing(false); return }
    const { error } = await supabase.from('subtasks').update({ name: name.trim() }).eq('id', subtask.id)
    setEditing(false)
    if (!error) onChanged()
  }

  async function deleteSubtask() {
    const { error } = await supabase.from('subtasks').delete().eq('id', subtask.id)
    if (!error) onChanged()
  }

  return (
    <div className="group flex items-center gap-2 py-1 pl-8 pr-2">
      <button
        onClick={toggleStatus}
        className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors
          ${subtask.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-emerald-500'}`}
      >
        {subtask.status === 'done' && <span className="text-white text-[9px]">✓</span>}
      </button>
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(subtask.name); setEditing(false) } }}
          className="flex-1 bg-transparent text-sm text-white outline-none border-b border-indigo-500"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={`flex-1 text-sm cursor-default ${subtask.status === 'done' ? 'line-through text-gray-600' : 'text-gray-300'}`}
        >
          {subtask.name}
        </span>
      )}
      <button onClick={deleteSubtask} className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs">×</button>
    </div>
  )
}
