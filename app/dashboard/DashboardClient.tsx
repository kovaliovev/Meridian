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
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname, selectedAreaId])

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
      <header className="flex items-center justify-between px-4 sm:px-5 h-11 border-b border-m-line bg-m-surface shrink-0 z-20">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className="sm:hidden flex flex-col gap-[5px] justify-center w-8 h-8 shrink-0"
          aria-label="Toggle sidebar"
        >
          <span className={`block h-px w-5 bg-m-dim transition-all duration-200 ${sidebarOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block h-px w-5 bg-m-dim transition-all duration-200 ${sidebarOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-px w-5 bg-m-dim transition-all duration-200 ${sidebarOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </button>

        <span className="font-mono text-sm font-bold tracking-[0.2em] text-m-violet-bright uppercase select-none">
          Meridian
        </span>

        <Suspense fallback={<div className="w-48 h-6" />}>
          <ModeToolbar />
        </Suspense>

        <div className="hidden sm:block w-24" />
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-11 bg-black/60 z-20 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed sm:relative top-11 sm:top-auto bottom-0 sm:bottom-auto left-0
            w-52 sm:w-52 shrink-0 border-r border-m-line bg-m-surface overflow-y-auto
            z-30 sm:z-auto
            transition-transform duration-300 sm:transition-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
            h-[calc(100vh-44px)] sm:h-auto
          `}
        >
          <Sidebar
            lifeAreas={lifeAreas}
            selectedAreaId={selectedAreaId}
            onSelectArea={handleSelectArea}
            onChanged={loadLifeAreas}
          />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>

      <ToastNotification toast={toast} />
    </div>
  )
}
