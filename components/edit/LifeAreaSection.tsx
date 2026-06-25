'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeAreaWithData } from '@/lib/types'
import ProjectCard from './ProjectCard'

export default function LifeAreaSection({ area, onChanged }: { area: LifeAreaWithData; onChanged: () => void }) {
  const supabase = createClient()
  const [addingProject, setAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  async function addProject() {
    if (!newProjectName.trim()) return
    const { error } = await supabase.from('projects').insert({
      life_area_id: area.id,
      name: newProjectName.trim(),
      position: area.projects.length,
    })
    if (!error) {
      setNewProjectName('')
      setAddingProject(false)
      onChanged()
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{area.icon}</span>
        <h2 className="text-lg font-bold text-white" style={{ color: area.color }}>{area.name}</h2>
        <div className="flex-1 h-px bg-gray-800" />
        <button
          onClick={() => setAddingProject(true)}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
        >+ project</button>
      </div>

      {area.projects.length === 0 && !addingProject && (
        <p className="text-sm text-gray-600 pl-2">No projects yet.</p>
      )}

      {area.projects.map(project => (
        <ProjectCard key={project.id} project={project} onChanged={onChanged} />
      ))}

      {addingProject && (
        <div className="mb-3">
          <input
            autoFocus
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onBlur={() => { if (newProjectName.trim()) addProject(); else setAddingProject(false) }}
            onKeyDown={e => { if (e.key === 'Enter') addProject(); if (e.key === 'Escape') setAddingProject(false) }}
            placeholder="Project name…"
            className="w-full bg-gray-900 border border-indigo-500 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none"
          />
        </div>
      )}
    </div>
  )
}
