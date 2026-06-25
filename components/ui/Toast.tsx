'use client'
import type { Toast } from '@/lib/hooks/useToast'

export default function ToastNotification({ toast }: { toast: Toast | null }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all
      ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
      {toast.message}
    </div>
  )
}
