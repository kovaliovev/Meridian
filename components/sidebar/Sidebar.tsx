import type { LifeArea } from '@/lib/types'
import LifeAreaList from './LifeAreaList'
import TodaysHabits from './TodaysHabits'

type Props = {
  lifeAreas: LifeArea[]
  selectedAreaId: string | null
  onSelectArea: (id: string) => void
  onChanged: () => void
}

export default function Sidebar({ lifeAreas, selectedAreaId, onSelectArea, onChanged }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pt-5 pb-2">
        <p className="px-4 text-[10px] font-mono font-semibold text-m-ghost uppercase tracking-[0.2em] mb-3">
          Areas
        </p>
        <LifeAreaList
          lifeAreas={lifeAreas}
          selectedAreaId={selectedAreaId}
          onSelectArea={onSelectArea}
          onChanged={onChanged}
        />
      </div>
      <div className="border-t border-m-line">
        <TodaysHabits lifeAreas={lifeAreas} />
      </div>
    </div>
  )
}
