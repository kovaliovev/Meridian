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

  const isDone = subtask.status === 'done'

  return (
    <div className="group flex items-center gap-2 py-1 pl-12 pr-2">
      <button
        onClick={toggleStatus}
        className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center transition-all ${
          isDone ? 'border-m-green bg-m-green/20' : 'border-m-spoke hover:border-m-green'
        }`}
      >
        {isDone && <span className="text-m-green text-[7px] font-bold leading-none">✓</span>}
      </button>
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(subtask.name); setEditing(false) } }}
          className="flex-1 bg-transparent text-xs text-m-ink outline-none border-b border-m-violet pb-px"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={`flex-1 text-xs cursor-default transition-colors ${isDone ? 'line-through text-m-ghost' : 'text-m-dim'}`}
        >
          {subtask.name}
        </span>
      )}
      <button
        onClick={deleteSubtask}
        className="opacity-0 group-hover:opacity-100 text-[10px] text-m-ghost hover:text-m-red transition-all"
      >
        ×
      </button>
    </div>
  )
}
