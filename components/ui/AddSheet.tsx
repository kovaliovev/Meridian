'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeAreaWithData } from '@/lib/types'

type Mode = 'task' | 'project'

type Props = {
  areas: LifeAreaWithData[]
  open: boolean
  defaultAreaId?: string | null
  onClose: () => void
  onSuccess: () => void
}

export default function AddSheet({ areas, open, defaultAreaId, onClose, onSuccess }: Props) {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('task')
  const [name, setName] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const areaId = defaultAreaId || areas[0]?.id || ''
      setSelectedAreaId(areaId)
      setName('')
      setLoading(false)
      const area = areas.find(a => a.id === areaId)
      setSelectedProjectId(area?.projects[0]?.id || '')
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open, defaultAreaId, areas])

  useEffect(() => {
    const area = areas.find(a => a.id === selectedAreaId)
    setSelectedProjectId(area?.projects[0]?.id || '')
  }, [selectedAreaId, areas])

  const selectedArea = areas.find(a => a.id === selectedAreaId)
  const availableProjects = selectedArea?.projects || []

  async function handleCreate() {
    if (!name.trim() || loading) return
    if (mode === 'task' && !selectedProjectId) return
    if (mode === 'project' && !selectedAreaId) return

    setLoading(true)

    if (mode === 'project') {
      const { error } = await supabase.from('projects').insert({
        life_area_id: selectedAreaId,
        name: name.trim(),
        position: selectedArea?.projects.length ?? 0,
      })
      if (error) { console.error(error); setLoading(false); return }
    } else {
      const project = availableProjects.find(p => p.id === selectedProjectId)
      const { error } = await supabase.from('tasks').insert({
        project_id: selectedProjectId,
        name: name.trim(),
        position: project?.tasks.length ?? 0,
      })
      if (error) { console.error(error); setLoading(false); return }
    }

    setName('')
    setLoading(false)
    onSuccess()
    onClose()
  }

  const canCreate = name.trim().length > 0 && (mode === 'project' ? !!selectedAreaId : !!selectedProjectId)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-250
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-m-surface border-t border-m-line rounded-t-2xl
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="p-6 max-w-lg mx-auto pb-8">
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-m-spoke mx-auto mb-6" />

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-m-raised mb-5">
            {(['task', 'project'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                  ${mode === m
                    ? 'bg-m-surface text-m-violet-bright shadow-sm'
                    : 'text-m-dim hover:text-m-ink'}`}
              >
                {m === 'task' ? 'Add task' : 'Add project'}
              </button>
            ))}
          </div>

          {/* Name input */}
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && canCreate) handleCreate()
              if (e.key === 'Escape') onClose()
            }}
            placeholder={mode === 'task' ? 'What needs to be done?' : 'Project name…'}
            className="w-full bg-transparent border-b border-m-spoke focus:border-m-violet text-lg text-m-ink outline-none py-2 mb-5 placeholder:text-m-ghost transition-colors"
          />

          {/* Area picker */}
          {areas.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.15em] mb-2.5">
                {mode === 'task' ? 'Area' : 'Add to'}
              </p>
              <div className="flex gap-2 flex-wrap">
                {areas.map(area => {
                  const active = selectedAreaId === area.id
                  return (
                    <button
                      key={area.id}
                      onClick={() => setSelectedAreaId(area.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all
                        ${active ? 'text-m-ink' : 'border-m-line text-m-dim hover:text-m-ink hover:border-m-spoke'}`}
                      style={active
                        ? { borderColor: area.color, backgroundColor: `${area.color}20`, color: 'var(--tw-text-opacity)' }
                        : {}}
                    >
                      <span>{area.icon}</span>
                      {area.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Project picker — task mode only */}
          {mode === 'task' && (
            <div className="mb-5">
              <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.15em] mb-2.5">Project</p>
              {availableProjects.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {availableProjects.map(project => {
                    const active = selectedProjectId === project.id
                    return (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProjectId(project.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all
                          ${active
                            ? 'bg-m-raised border-m-spoke text-m-ink'
                            : 'border-m-line text-m-dim hover:text-m-ink hover:border-m-spoke'}`}
                      >
                        {project.name}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-m-ghost italic">
                  {selectedAreaId ? 'No projects in this area yet — add one first.' : 'Select an area above.'}
                </p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-m-line rounded-xl text-sm text-m-dim hover:text-m-ink hover:border-m-spoke transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate || loading}
              className="flex-1 py-3 bg-m-violet text-m-bg rounded-xl text-sm font-semibold
                hover:bg-m-violet-bright disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
