'use client'
import { useState, useCallback, useEffect, useMemo, Suspense } from 'react'
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

  const handleSelectArea = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchParams.get('area') === id) {
      params.delete('area')
    } else {
      params.set('area', id)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }, [router, searchParams, pathname])

  return (
    <div className="flex flex-col h-screen bg-m-bg text-m-ink">
      <header className="flex items-center justify-between px-5 h-11 border-b border-m-line bg-m-surface shrink-0">
        <span className="font-mono text-sm font-bold tracking-[0.2em] text-m-violet-bright uppercase select-none">
          Meridian
        </span>
        <Suspense fallback={<div className="w-64 h-6" />}>
          <ModeToolbar />
        </Suspense>
        <div className="w-24" />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 shrink-0 border-r border-m-line bg-m-surface overflow-y-auto">
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
