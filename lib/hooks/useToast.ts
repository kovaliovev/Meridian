import { useState, useCallback } from 'react'

export type Toast = { message: string; type: 'error' | 'success' }

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((message: string, type: Toast['type'] = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  return { toast, showToast, clearToast }
}
