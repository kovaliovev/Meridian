'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProjectWithTasks } from '@/lib/types'
import TaskItem from './TaskItem'

export default function ProjectCard({ project, onChanged }: { project: ProjectWithTasks; onChanged: () => void }) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')

  async function saveName() {
    if (!name.trim()) { setName(project.name); setEditing(false); return }
    const { error } = await supabase.from('projects').update({ name: name.trim() }).eq('id', project.id)
    setEditing(false)
    if (!error) onChanged()
  }

  async function deleteProject() {
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (!error) onChanged()
  }

  async function addTask() {
    if (!newTaskName.trim()) return
    const { error } = await supabase.from('tasks').insert({
      project_id: project.id,
      name: newTaskName.trim(),
      position: project.tasks.length,
    })
    if (!error) {
      setNewTaskName('')
      setAddingTask(false)
      onChanged()
    }
  }

  const doneCount = project.tasks.filter(t => t.status === 'done').length
  const totalCount = project.tasks.length

  return (
    <div className="mb-2 ml-3 pl-4 border-l border-m-line hover:border-m-spoke transition-colors">
      <div
        className="group flex items-center gap-2 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-m-ghost text-xs select-none w-3">
          {expanded ? '∨' : '›'}
        </span>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(project.name); setEditing(false) } }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-transparent text-sm font-medium text-m-ink outline-none border-b border-m-violet pb-px"
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
            className="flex-1 text-sm font-medium text-m-ink"
          >
            {project.name}
          </span>
        )}
        {totalCount > 0 && (
          <span className="text-[10px] text-m-ghost font-mono">{doneCount}/{totalCount}</span>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); setAddingTask(true); setExpanded(true) }}
            className="text-[11px] text-m-ghost hover:text-m-ink transition-colors py-1 px-1.5 touch-manipulation"
          >
            + task
          </button>
          <button
            onClick={e => { e.stopPropagation(); deleteProject() }}
            className="text-[11px] text-m-ghost hover:text-m-red transition-colors py-1 px-1 touch-manipulation"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pb-2">
          {project.tasks.length === 0 && !addingTask && (
            <p className="py-1 text-xs text-m-ghost">No tasks yet</p>
          )}
          {project.tasks.map(task => (
            <TaskItem key={task.id} task={task} onChanged={onChanged} />
          ))}
          {addingTask && (
            <div className="pl-5 py-1">
              <input
                autoFocus
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                onBlur={() => { if (newTaskName.trim()) addTask(); else setAddingTask(false) }}
                onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAddingTask(false) }}
                placeholder="Task name…"
                className="w-full bg-transparent border-b border-m-violet text-sm text-m-ink outline-none pb-px placeholder:text-m-dim"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
