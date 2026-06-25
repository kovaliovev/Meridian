'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { LifeArea } from '@/lib/types'

interface DashboardClientProps {
  children: React.ReactNode
}

export default function DashboardClient({ children }: DashboardClientProps) {
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([])
  const searchParams = useSearchParams()
  const selectedAreaId = searchParams.get('area')

  return (
    <>
      {children}
    </>
  )
}
