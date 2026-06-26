// app/dashboard/DashboardClient.tsx
'use client'
import Logo from '@/components/ui/Logo'
import NavTabs from '@/components/toolbar/NavTabs'
import BottomNav from '@/components/toolbar/BottomNav'
import ToastNotification from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()

  return (
    <div className="flex flex-col min-h-screen bg-m-bg text-m-ink">
      <header className="flex items-center justify-between px-4 sm:px-6 h-11 border-b border-m-line bg-m-surface shrink-0 z-20 sticky top-0">
        <Logo className="h-7 w-auto select-none" />
        <NavTabs />
        <div className="hidden sm:block w-28" />
      </header>

      <main className="flex-1 pb-16 sm:pb-0">
        {children}
      </main>

      <BottomNav />
      <ToastNotification toast={toast} />
    </div>
  )
}
