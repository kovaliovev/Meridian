'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithSubtasks } from '@/lib/types'
import SubtaskItem from './SubtaskItem'

const PRIORITY_DOT = { low: 'bg-m-ghost', medium: 'bg-m-amber', high: 'bg-m-red' }
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

  const isDone = task.status === 'done'
  const isInProgress = task.status === 'in_progress'

  return (
    <div>
      <div className="group flex items-center gap-2 py-1.5 pl-5 pr-1 rounded-sm hover:bg-m-raised/40 transition-colors">
        {/* Status indicator */}
        <button
          onClick={cycleStatus}
          className="shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all"
          style={{
            borderColor: isDone ? '#34d399' : isInProgress ? '#fbbf24' : '#272745',
            backgroundColor: isDone ? '#34d39920' : isInProgress ? '#fbbf2420' : 'transparent',
          }}
          title={`Status: ${task.status}`}
        >
          {isDone && <span className="text-m-green text-[7px] font-bold leading-none">✓</span>}
          {isInProgress && <span className="w-1.5 h-1.5 rounded-full bg-m-amber inline-block" />}
        </button>

        {/* Expand subtasks */}
        {task.subtasks.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-m-ghost hover:text-m-dim text-[10px] shrink-0 w-3"
          >
            {expanded ? '∨' : '›'}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

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
            className="flex-1 bg-transparent text-sm text-m-ink outline-none border-b border-m-violet pb-px"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`flex-1 text-sm cursor-default transition-colors ${isDone ? 'line-through text-m-ghost' : 'text-m-ink'}`}
          >
            {task.name}
          </span>
        )}

        {task.due_date && (
          <span className="text-[10px] text-m-ghost font-mono shrink-0">{task.due_date}</span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 shrink-0 transition-opacity">
          <button
            onClick={cyclePriority}
            className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]} transition-colors`}
            title={`Priority: ${task.priority}`}
          />
          <button
            onClick={() => { setAddingSubtask(true); setExpanded(true) }}
            className="text-[11px] text-m-dim hover:text-m-ink transition-colors"
          >
            +sub
          </button>
          <button
            onClick={deleteTask}
            className="text-[11px] text-m-dim hover:text-m-red transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div>
          {task.subtasks.map(sub => (
            <SubtaskItem key={sub.id} subtask={sub} onChanged={onChanged} />
          ))}
          {addingSubtask && (
            <div className="pl-12 pr-2 py-1">
              <input
                autoFocus
                value={newSubtaskName}
                onChange={e => setNewSubtaskName(e.target.value)}
                onBlur={() => { if (newSubtaskName.trim()) addSubtask(); else setAddingSubtask(false) }}
                onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false) }}
                placeholder="Subtask name…"
                className="w-full bg-transparent border-b border-m-violet text-xs text-m-ink outline-none pb-px placeholder:text-m-ghost"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
