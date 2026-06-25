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
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-5 pl-3 border-l-2" style={{ borderColor: area.color }}>
        <span className="text-sm">{area.icon}</span>
        <h2 className="text-sm font-semibold text-m-ink tracking-wide">{area.name}</h2>
        <div className="flex-1" />
        <button
          onClick={() => setAddingProject(true)}
          className="text-[11px] text-m-ghost hover:text-m-violet transition-colors py-1 px-2 -mr-2"
        >
          + project
        </button>
      </div>

      {area.projects.length === 0 && !addingProject && (
        <p className="text-xs text-m-ghost pl-3 ml-0.5">No projects yet.</p>
      )}

      {area.projects.map(project => (
        <ProjectCard key={project.id} project={project} onChanged={onChanged} />
      ))}

      {addingProject && (
        <div className="mb-3 pl-3">
          <input
            autoFocus
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onBlur={() => { if (newProjectName.trim()) addProject(); else setAddingProject(false) }}
            onKeyDown={e => { if (e.key === 'Enter') addProject(); if (e.key === 'Escape') setAddingProject(false) }}
            placeholder="Project name…"
            className="w-full bg-transparent border-b border-m-violet text-sm font-medium text-m-ink outline-none pb-px placeholder:text-m-dim"
          />
        </div>
      )}
    </div>
  )
}
