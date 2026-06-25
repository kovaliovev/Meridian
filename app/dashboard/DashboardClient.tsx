'use client'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/sidebar/Sidebar'
import ModeToolbar from '@/components/toolbar/ModeToolbar'
import ToastNotification from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import type { LifeArea } from '@/lib/types'

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([])
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const selectedAreaId = searchParams.get('area')

  const loadLifeAreas = useCallback(async () => {
    const { data, error } = await supabase
      .from('life_areas')
      .select('*')
      .order('position')
    if (!error && data) setLifeAreas(data)
  }, [supabase])

  useEffect(() => {
    loadLifeAreas()
  }, [loadLifeAreas])

  function handleSelectArea(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) {
      params.set('area', id)
    } else {
      params.delete('area')
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <span className="font-bold text-lg tracking-tight text-white">LifeTodo</span>
        <ModeToolbar />
        <div className="w-32" />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 overflow-y-auto">
          <Sidebar
            lifeAreas={lifeAreas}
            selectedAreaId={selectedAreaId}
            onSelectArea={handleSelectArea}
            onChanged={loadLifeAreas}
          />
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <ToastNotification toast={toast} />
    </div>
  )
}
