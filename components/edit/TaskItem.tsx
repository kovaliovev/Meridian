'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithSubtasks } from '@/lib/types'
import SubtaskItem from './SubtaskItem'

const PRIORITY_COLORS = { low: 'text-gray-500', medium: 'text-amber-500', high: 'text-red-500' }
const STATUS_OPTIONS = ['todo', 'in_progress', 'done'] as const
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const

export default function TaskItem({ task, onChanged }: { task: TaskWithSubtasks; onChanged: () => void }) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(task.name)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [newSubtaskName, setNewSubtaskName] = useState('')

  async function saveName() {
    if (!name.trim()) { setName(task.name); setEditing(false); return }
    const { error } = await supabase.from('tasks').update({ name: name.trim() }).eq('id', task.id)
    setEditing(false)
    if (!error) onChanged()
  }

  async function cycleStatus() {
    const next = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(task.status) + 1) % STATUS_OPTIONS.length]
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    if (!error) onChanged()
  }

  async function cyclePriority() {
    const next = PRIORITY_OPTIONS[(PRIORITY_OPTIONS.indexOf(task.priority) + 1) % PRIORITY_OPTIONS.length]
    const { error } = await supabase.from('tasks').update({ priority: next }).eq('id', task.id)
    if (!error) onChanged()
  }

  async function deleteTask() {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (!error) onChanged()
  }

  async function addSubtask() {
    if (!newSubtaskName.trim()) return
    const { error } = await supabase.from('subtasks').insert({ task_id: task.id, name: newSubtaskName.trim(), position: task.subtasks.length })
    if (!error) {
      setNewSubtaskName('')
      setAddingSubtask(false)
      setExpanded(true)
      onChanged()
    }
  }

  const statusIcon = task.status === 'done' ? '✓' : task.status === 'in_progress' ? '◐' : '○'
  const statusColor = task.status === 'done' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-amber-500' : 'text-gray-500'

  return (
    <div>
      <div className="group flex items-center gap-2 py-1.5 pl-4 pr-2 rounded hover:bg-gray-800/40">
        <button onClick={cycleStatus} className={`text-sm shrink-0 ${statusColor}`}>{statusIcon}</button>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-400 text-xs shrink-0">
          {task.subtasks.length > 0 ? (expanded ? '▾' : '▸') : '·'}
        </button>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') { setName(task.name); setEditing(false) }
              if (e.key === 'Tab') { e.preventDefault(); saveName(); setAddingSubtask(true); setExpanded(true) }
            }}
            className="flex-1 bg-transparent text-sm text-white outline-none border-b border-indigo-500"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`flex-1 text-sm cursor-default ${task.status === 'done' ? 'line-through text-gray-600' : 'text-gray-200'}`}
          >
            {task.name}
          </span>
        )}
        <button onClick={cyclePriority} className={`text-xs hidden group-hover:block ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority[0].toUpperCase()}
        </button>
        {task.due_date && (
          <span className="text-xs text-gray-600">{task.due_date}</span>
        )}
        <button onClick={() => { setAddingSubtask(true); setExpanded(true) }} className="hidden group-hover:block text-gray-600 hover:text-gray-400 text-xs">+sub</button>
        <button onClick={deleteTask} className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs">×</button>
      </div>

      {expanded && (
        <div>
          {task.subtasks.map(sub => (
            <SubtaskItem key={sub.id} subtask={sub} onChanged={onChanged} />
          ))}
          {addingSubtask && (
            <div className="pl-8 pr-2 py-1">
              <input
                autoFocus
                value={newSubtaskName}
                onChange={e => setNewSubtaskName(e.target.value)}
                onBlur={() => { if (newSubtaskName.trim()) addSubtask(); else setAddingSubtask(false) }}
                onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false) }}
                placeholder="Subtask name…"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
