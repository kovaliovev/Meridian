import ModeToolbar from '@/components/toolbar/ModeToolbar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Top toolbar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <span className="font-bold text-lg tracking-tight text-white">LifeTodo</span>
        <ModeToolbar />
        <div className="w-32" /> {/* spacer to center toolbar */}
      </header>

      {/* Sidebar + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar placeholder — filled in Task 6 */}
        <aside id="sidebar-slot" className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 overflow-y-auto" />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
