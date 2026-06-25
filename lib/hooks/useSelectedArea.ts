import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function useSelectedArea() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const selectedAreaId = searchParams.get('area')

  const setSelectedAreaId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (id) {
        params.set('area', id)
      } else {
        params.delete('area')
      }
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [searchParams, router, pathname]
  )

  return { selectedAreaId, setSelectedAreaId }
}
