import type { LifeArea } from '@/lib/types'
import LifeAreaList from './LifeAreaList'

type Props = {
  lifeAreas: LifeArea[]
  selectedAreaId: string | null
  onSelectArea: (id: string | null) => void
  onChanged: () => void
}

export default function Sidebar({ lifeAreas, selectedAreaId, onSelectArea, onChanged }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2 pt-4">
        <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Life Areas</p>
        <LifeAreaList
          lifeAreas={lifeAreas}
          selectedAreaId={selectedAreaId}
          onSelectArea={onSelectArea}
          onChanged={onChanged}
        />
      </div>
      {/* Habits section added in Task 7 */}
      <div id="habits-slot" className="border-t border-gray-800" />
    </div>
  )
}
