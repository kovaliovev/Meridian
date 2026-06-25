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

  return (
    <div className="mb-3 rounded-xl border border-gray-800 bg-gray-900/50">
      <div
        className="group flex items-center gap-2 px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-500 text-xs">{expanded ? '▾' : '▸'}</span>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(project.name); setEditing(false) } }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-transparent text-sm font-semibold text-white outline-none border-b border-indigo-500"
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
            className="flex-1 text-sm font-semibold text-white"
          >
            {project.name}
          </span>
        )}
        <span className="text-xs text-gray-600">{doneCount}/{project.tasks.length}</span>
        <button
          onClick={e => { e.stopPropagation(); setAddingTask(true); setExpanded(true) }}
          className="hidden group-hover:block text-gray-500 hover:text-gray-300 text-xs px-1"
        >+ task</button>
        <button
          onClick={e => { e.stopPropagation(); deleteProject() }}
          className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs px-1"
        >×</button>
      </div>

      {expanded && (
        <div className="pb-2">
          {project.tasks.length === 0 && !addingTask && (
            <p className="px-4 py-2 text-xs text-gray-600">No tasks yet — click &quot;+ task&quot; to add one</p>
          )}
          {project.tasks.map(task => (
            <TaskItem key={task.id} task={task} onChanged={onChanged} />
          ))}
          {addingTask && (
            <div className="pl-4 pr-2 py-1">
              <input
                autoFocus
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                onBlur={() => { if (newTaskName.trim()) addTask(); else setAddingTask(false) }}
                onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAddingTask(false) }}
                placeholder="Task name…"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
