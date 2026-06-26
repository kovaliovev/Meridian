'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/lib/types'

export default function EditTaskSheet({ task, onClose, onSuccess }: { task: Task | null; onClose: () => void; onSuccess: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setName(task.name)
      setPriority(task.priority as 'low' | 'medium' | 'high' | null)
      setDueDate(task.due_date ?? '')
      setConfirmDelete(false)
    }
  }, [task])

  const open = task !== null

  async function handleSave() {
    if (!task) return
    setSaving(true)
    await supabase
      .from('tasks')
      .update({ name, priority: priority ?? undefined, due_date: dueDate || null })
      .eq('id', task.id)
    setSaving(false)
    onSuccess()
    onClose()
  }

  async function handleDelete() {
    if (!task) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onSuccess()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-m-bg/60 z-40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-m-surface border-t border-m-line rounded-t-xl p-5 transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="w-10 h-1 bg-m-ghost rounded-full mx-auto mb-5" />
        <h2 className="text-m-ink font-semibold mb-4 font-mono">Edit Task</h2>

        {/* Name */}
        <input
          className="w-full bg-m-card border border-m-line rounded-lg px-3 py-2 text-m-ink placeholder-m-ghost mb-4 focus:outline-none focus:border-m-violet font-mono text-sm"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Task name"
        />

        {/* Priority */}
        <div className="flex gap-2 mb-4">
          {(['low', 'medium', 'high'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriority(priority === p ? null : p)}
              className={`px-3 py-1 rounded-full text-xs font-mono border transition-colors ${
                priority === p
                  ? p === 'high'
                    ? 'bg-m-red border-m-red text-m-bg'
                    : p === 'medium'
                    ? 'bg-m-violet border-m-violet text-m-bg'
                    : 'bg-m-ghost border-m-ghost text-m-bg'
                  : 'border-m-line text-m-ghost hover:border-m-violet'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Due date */}
        <input
          type="date"
          className="w-full bg-m-card border border-m-line rounded-lg px-3 py-2 text-m-ink mb-5 focus:outline-none focus:border-m-violet font-mono text-sm"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 bg-m-violet text-m-bg rounded-lg py-2 font-mono text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {confirmDelete ? (
            <button
              onClick={handleDelete}
              className="px-4 bg-m-red text-m-bg rounded-lg py-2 font-mono text-sm font-semibold"
            >
              Confirm delete
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 border border-m-red text-m-red rounded-lg py-2 font-mono text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  )
}
