# Meridian UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current notepad-style dashboard with a 3-page app: wind rose home, task focus, and visualizations hub.

**Architecture:** Three routes under `/dashboard` share a thin layout shell (header + nav). Each page is a self-contained client component that loads its own data. The sidebar is removed entirely; area filtering moves to URL params and an in-page filter bar.

**Tech Stack:** Next.js 14 App Router, Supabase JS client, D3 v7, Tailwind CSS, TypeScript

## Global Constraints

- All Tailwind colors use the `m-*` token system (e.g. `bg-m-surface`, `text-m-violet-bright`)
- JetBrains Mono loaded globally as `font-mono`; use `font-family="'JetBrains Mono', 'Courier New', monospace"` in SVG text
- Supabase client: always `createClient()` from `@/lib/supabase/client` in client components
- Components using `useSearchParams()` must be wrapped in `<Suspense>` at the route level
- Mobile bottom nav is `h-16` (64px); FABs must use `bottom-20 sm:bottom-6` to clear it
- No new npm packages — D3 is already installed

---

## File Map

**New files:**
- `components/toolbar/NavTabs.tsx` — desktop 3-tab nav (replaces ModeToolbar content)
- `components/toolbar/BottomNav.tsx` — mobile fixed bottom tab bar
- `components/home/WindRose.tsx` — D3 wind rose SVG, receives `AreaScore[]` as props
- `components/home/WindRoseCanvas.tsx` — loads scores, renders WindRose + HomeStats + FAB
- `components/tasks/AreaFilterBar.tsx` — horizontal scrollable area filter pills
- `components/tasks/HabitsRow.tsx` — today's habit chips with toggle
- `components/tasks/TaskCard.tsx` — task card with completion slide-out animation
- `components/tasks/TaskFocusCanvas.tsx` — loads all task data, renders sections + FAB
- `components/tasks/EditTaskSheet.tsx` — bottom sheet to edit task name/priority/due date
- `components/visualize/VizHub.tsx` — 4-tab container for existing viz components
- `app/dashboard/tasks/page.tsx` — route wrapper for TaskFocusCanvas
- `app/dashboard/visualize/page.tsx` — route wrapper for VizHub

**Modified files:**
- `app/dashboard/DashboardClient.tsx` — remove sidebar, add NavTabs + BottomNav
- `components/toolbar/ModeToolbar.tsx` — delete (replaced by NavTabs)
- `app/dashboard/page.tsx` — replace redirect with WindRoseCanvas

**Deleted after Task 6:**
- `app/dashboard/edit/page.tsx`, `app/dashboard/graph/page.tsx`, `app/dashboard/heatmap/page.tsx`, `app/dashboard/rings/page.tsx`, `app/dashboard/timeline/page.tsx`
- `components/sidebar/Sidebar.tsx`, `components/sidebar/LifeAreaList.tsx`, `components/sidebar/TodaysHabits.tsx`
- `components/edit/EditCanvas.tsx`, `components/edit/LifeAreaSection.tsx`, `components/edit/ProjectCard.tsx`, `components/edit/TaskItem.tsx`, `components/edit/SubtaskItem.tsx`
- `components/toolbar/ModeToolbar.tsx`

---

## Task 1: Navigation Shell

**Files:**
- Create: `components/toolbar/NavTabs.tsx`
- Create: `components/toolbar/BottomNav.tsx`
- Modify: `app/dashboard/DashboardClient.tsx`

**Interfaces:**
- Produces: `<NavTabs />` (hidden on mobile, 3 links on desktop), `<BottomNav />` (visible on mobile only)
- Produces: simplified `DashboardClient` with no sidebar state, no life area loading

- [ ] **Step 1: Create NavTabs**

```tsx
// components/toolbar/NavTabs.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Tasks', href: '/dashboard/tasks' },
  { label: 'Visualize', href: '/dashboard/visualize' },
]

export default function NavTabs() {
  const pathname = usePathname()
  return (
    <nav className="hidden sm:flex items-center gap-0.5">
      {TABS.map(tab => {
        const active = tab.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-4 py-1.5 text-sm font-medium transition-colors
              ${active ? 'text-m-violet-bright' : 'text-m-dim hover:text-m-ink'}`}
          >
            {tab.label}
            {active && <span className="absolute bottom-0 left-3 right-3 h-px bg-m-violet" />}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Create BottomNav**

```tsx
// components/toolbar/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Home', href: '/dashboard', icon: '◉' },
  { label: 'Tasks', href: '/dashboard/tasks', icon: '☑' },
  { label: 'Visualize', href: '/dashboard/visualize', icon: '◈' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-m-surface border-t border-m-line flex z-20">
      {TABS.map(tab => {
        const active = tab.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors
              ${active ? 'text-m-violet-bright' : 'text-m-dim hover:text-m-ink'}`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: Rewrite DashboardClient**

Replace the entire file content:

```tsx
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
```

- [ ] **Step 4: Verify navigation works**

Run `npm run dev`, navigate to `/dashboard`. Check:
- Desktop: header shows `Home | Tasks | Visualize` tabs, active tab has violet underline
- Mobile (dev tools responsive mode): header shows only logo, bottom bar shows 3 tabs
- Navigating between pages updates the active tab highlight
- Old sidebar is gone

- [ ] **Step 5: Commit**

```bash
git add components/toolbar/NavTabs.tsx components/toolbar/BottomNav.tsx app/dashboard/DashboardClient.tsx
git commit -m "feat: replace sidebar+toolbar with 3-tab nav (desktop top, mobile bottom)"
```

---

## Task 2: Wind Rose Home Page

**Files:**
- Create: `components/home/WindRose.tsx`
- Create: `components/home/WindRoseCanvas.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- `WindRose` consumes: `scores: AreaScore[]` where `AreaScore = { area: LifeArea; lifetimeScore: number; recentScore: number }`
- `WindRoseCanvas` produces: full home page with data loading, FAB, empty state
- Exports `AreaScore` type from `WindRose.tsx`

- [ ] **Step 1: Create WindRose D3 component**

```tsx
// components/home/WindRose.tsx
'use client'
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useRouter } from 'next/navigation'
import type { LifeArea } from '@/lib/types'

export type AreaScore = {
  area: LifeArea
  lifetimeScore: number
  recentScore: number
}

type ArcDatum = { outerRadius: number; startAngle: number; endAngle: number }

export default function WindRose({ scores }: { scores: AreaScore[] }) {
  const ref = useRef<SVGSVGElement>(null)
  const router = useRouter()

  useEffect(() => {
    const el = ref.current
    if (!el || scores.length === 0) return
    const { width, height } = el.getBoundingClientRect()
    if (width === 0 || height === 0) return

    const cx = width / 2
    const cy = height / 2
    const maxRadius = Math.min(cx, cy) * 0.68
    const n = scores.length
    const angleStep = (2 * Math.PI) / n
    const petalHalfWidth = Math.min(angleStep * 0.42, 0.38)
    const maxLifetime = Math.max(1, ...scores.map(s => s.lifetimeScore))
    const MIN_R = 48

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    // Glow filter
    const defs = svg.append('defs')
    const filt = defs.append('filter')
      .attr('id', 'petal-glow')
      .attr('x', '-60%').attr('y', '-60%')
      .attr('width', '220%').attr('height', '220%')
    filt.append('feGaussianBlur')
      .attr('in', 'SourceGraphic').attr('stdDeviation', '10').attr('result', 'blur')
    const merge = filt.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Subtle background rings
    ;[0.33, 0.66, 1].forEach(t => {
      svg.append('circle').attr('cx', cx).attr('cy', cy)
        .attr('r', maxRadius * t)
        .attr('fill', 'none')
        .attr('stroke', '#1a1a30')
        .attr('stroke-width', 1)
    })

    const arcGen = d3.arc<ArcDatum>()
      .innerRadius(6)
      .outerRadius(d => d.outerRadius)
      .startAngle(d => d.startAngle)
      .endAngle(d => d.endAngle)
      .cornerRadius(3)

    scores.forEach((s, i) => {
      const angle = i * angleStep
      const startAngle = angle - petalHalfWidth
      const endAngle = angle + petalHalfWidth
      const r = MIN_R + (s.lifetimeScore / maxLifetime) * (maxRadius - MIN_R)
      const recentOpacity = Math.min(s.recentScore / 8, 1)

      const g = svg.append('g')
        .attr('transform', `translate(${cx},${cy})`)
        .style('cursor', 'pointer')
        .on('click', () => router.push(`/dashboard/tasks?area=${s.area.id}`))

      if (recentOpacity > 0.05) {
        g.append('path')
          .datum({ outerRadius: r, startAngle, endAngle })
          .attr('d', arcGen)
          .attr('fill', s.area.color)
          .attr('opacity', recentOpacity * 0.6)
          .attr('filter', 'url(#petal-glow)')
      }

      const petal = g.append('path')
        .datum({ outerRadius: r, startAngle, endAngle })
        .attr('d', arcGen)
        .attr('fill', s.area.color)
        .attr('opacity', 0.3)

      petal
        .on('mouseenter', function() { d3.select(this).attr('opacity', 0.55) })
        .on('mouseleave', function() { d3.select(this).attr('opacity', 0.3) })

      // Tip dot
      const tipX = Math.sin(angle) * (r + 4)
      const tipY = -Math.cos(angle) * (r + 4)
      g.append('circle').attr('cx', tipX).attr('cy', tipY)
        .attr('r', 2.5).attr('fill', s.area.color).attr('opacity', 0.75)

      // Label
      const labelR = r + (r < 80 ? 22 : 26)
      const labelX = Math.sin(angle) * labelR
      const labelY = -Math.cos(angle) * labelR
      g.append('text')
        .attr('x', labelX).attr('y', labelY)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '11').attr('fill', '#625f7a')
        .style('pointer-events', 'none')
        .text(`${s.area.icon} ${s.area.name}`)
    })

    // Center dot
    svg.append('circle').attr('cx', cx).attr('cy', cy)
      .attr('r', 5).attr('fill', '#272745')

  }, [scores, router])

  return <svg ref={ref} className="w-full h-full" />
}
```

- [ ] **Step 2: Create WindRoseCanvas**

```tsx
// components/home/WindRoseCanvas.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import WindRose, { type AreaScore } from './WindRose'
import AddSheet from '@/components/ui/AddSheet'
import EmptyState from '@/components/ui/EmptyState'
import type { LifeAreaWithData, Task } from '@/lib/types'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function WindRoseCanvas() {
  const supabase = createClient()
  const [scores, setScores] = useState<AreaScore[]>([])
  const [weekCount, setWeekCount] = useState(0)
  const [areasWithData, setAreasWithData] = useState<LifeAreaWithData[]>([])
  const [fabOpen, setFabOpen] = useState(false)

  const load = useCallback(async () => {
    const { data: lifeAreas } = await supabase.from('life_areas').select('*').order('position')
    if (!lifeAreas || lifeAreas.length === 0) { setScores([]); return }

    const [
      { data: projects },
      { data: allTasks },
      { data: subtasks },
      { data: habits },
      { data: allCompletions },
      { data: recentCompletions },
    ] = await Promise.all([
      supabase.from('projects').select('*').order('position'),
      supabase.from('tasks').select('*').order('position'),
      supabase.from('subtasks').select('*').order('position'),
      supabase.from('habits').select('id, life_area_id'),
      supabase.from('habit_completions').select('habit_id'),
      supabase.from('habit_completions').select('habit_id, completed_date')
        .gte('completed_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
    ])

    const projectAreaMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.life_area_id]))
    const habitAreaMap = Object.fromEntries((habits ?? []).map(h => [h.id, h.life_area_id]))

    const lifetimeTasks: Record<string, number> = {}
    for (const t of (allTasks ?? []) as Task[]) {
      if (t.status !== 'done') continue
      const areaId = projectAreaMap[t.project_id]
      if (areaId) lifetimeTasks[areaId] = (lifetimeTasks[areaId] ?? 0) + 1
    }

    const lifetimeHabits: Record<string, number> = {}
    for (const c of allCompletions ?? []) {
      const areaId = habitAreaMap[c.habit_id]
      if (areaId) lifetimeHabits[areaId] = (lifetimeHabits[areaId] ?? 0) + 1
    }

    const recentByArea: Record<string, number> = {}
    for (const c of recentCompletions ?? []) {
      const areaId = habitAreaMap[c.habit_id]
      if (areaId) recentByArea[areaId] = (recentByArea[areaId] ?? 0) + 1
    }

    let totalWeek = 0
    const scored: AreaScore[] = lifeAreas.map(area => {
      const lifetime = (lifetimeTasks[area.id] ?? 0) + (lifetimeHabits[area.id] ?? 0)
      const recent = recentByArea[area.id] ?? 0
      totalWeek += recent
      return { area, lifetimeScore: lifetime, recentScore: recent }
    })

    setScores(scored)
    setWeekCount(totalWeek)
    setAreasWithData(lifeAreas.map(area => ({
      ...area,
      habits: [],
      projects: (projects ?? []).filter(p => p.life_area_id === area.id).map(project => ({
        ...project,
        tasks: (allTasks ?? [] as Task[]).filter(t => t.project_id === project.id).map(task => ({
          ...task,
          subtasks: (subtasks ?? []).filter(s => s.task_id === task.id),
        })),
      })),
    })))
  }, [supabase])

  useEffect(() => { load() }, [load])

  const dateStr = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
  const hasAreas = scores.length > 0

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 44px)' }}>
      {/* Stats header */}
      <div className="px-4 sm:px-6 pt-5 pb-3 shrink-0">
        <p className="font-mono text-[10px] text-m-ghost uppercase tracking-[0.2em] mb-1">{dateStr}</p>
        <p className="text-sm text-m-dim">
          {getGreeting()} —&nbsp;
          {weekCount > 0
            ? `${weekCount} completion${weekCount === 1 ? '' : 's'} this week`
            : 'Complete tasks and habits to grow your rose'}
        </p>
      </div>

      {/* Rose or empty state */}
      <div className="flex-1 min-h-0">
        {hasAreas ? (
          <WindRose scores={scores} />
        ) : (
          <EmptyState message="Add a life area to start growing your rose." />
        )}
      </div>

      {/* FAB */}
      {hasAreas && (
        <button
          onClick={() => setFabOpen(true)}
          aria-label="Add task or project"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-12 h-12 rounded-full bg-m-violet text-m-bg flex items-center justify-center text-2xl font-light shadow-lg shadow-black/40 hover:bg-m-violet-bright hover:scale-105 active:scale-95 transition-all z-30 select-none"
        >
          +
        </button>
      )}

      <AddSheet
        areas={areasWithData}
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        onSuccess={() => { setFabOpen(false); load() }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Update app/dashboard/page.tsx**

```tsx
// app/dashboard/page.tsx
import WindRoseCanvas from '@/components/home/WindRoseCanvas'

export default function DashboardHome() {
  return <WindRoseCanvas />
}
```

- [ ] **Step 4: Verify wind rose renders**

Run `npm run dev`, navigate to `/dashboard`. Check:
- Greeting and date appear at top
- If you have life areas: petals radiate from center, one per area, colored with area color
- Hovering a petal brightens it
- Clicking a petal navigates to `/dashboard/tasks?area=<id>`
- Areas with recent habit completions (last 7 days) show a glow halo
- If no areas: empty state message shows

- [ ] **Step 5: Commit**

```bash
git add components/home/WindRose.tsx components/home/WindRoseCanvas.tsx app/dashboard/page.tsx
git commit -m "feat: wind rose home page with D3 petals (lifetime + recent glow)"
```

---

## Task 3: Task Focus Page

**Files:**
- Create: `components/tasks/AreaFilterBar.tsx`
- Create: `components/tasks/HabitsRow.tsx`
- Create: `components/tasks/TaskCard.tsx`
- Create: `components/tasks/TaskFocusCanvas.tsx`
- Create: `app/dashboard/tasks/page.tsx`

**Interfaces:**
- `AreaFilterBar` consumes: `areas: LifeArea[]` — reads/writes `?area` URL param
- `HabitsRow` consumes: `areas: LifeArea[]`, `filterAreaId: string | null`
- `TaskCard` consumes: `task: Task`, `project: Project`, `area: LifeArea`, `onCompleted: (id: string) => void`, `onEdit: (task: Task) => void`
- `TaskFocusCanvas` produces: full page, no props needed
- Exports: `EnrichedTask = Task & { project: Project; area: LifeArea }` (internal to canvas)

- [ ] **Step 1: Create AreaFilterBar**

```tsx
// components/tasks/AreaFilterBar.tsx
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { LifeArea } from '@/lib/types'

export default function AreaFilterBar({ areas }: { areas: LifeArea[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('area')

  function select(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === null) params.delete('area')
    else params.set('area', id)
    const q = params.toString()
    router.push(q ? `${pathname}?${q}` : pathname)
  }

  return (
    <div className="flex gap-2 overflow-x-auto py-1">
      <button
        onClick={() => select(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all
          ${!selectedId
            ? 'bg-m-violet text-m-bg border-m-violet'
            : 'border-m-line text-m-dim hover:text-m-ink hover:border-m-spoke'}`}
      >
        All
      </button>
      {areas.map(area => {
        const active = selectedId === area.id
        return (
          <button
            key={area.id}
            onClick={() => select(area.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all
              ${active ? 'text-m-ink' : 'border-m-line text-m-dim hover:text-m-ink hover:border-m-spoke'}`}
            style={active ? { borderColor: area.color, backgroundColor: `${area.color}22` } : {}}
          >
            <span>{area.icon}</span>
            {area.name}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create HabitsRow**

```tsx
// components/tasks/HabitsRow.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Habit, LifeArea } from '@/lib/types'

type HabitRow = Habit & { color: string; completedToday: boolean }

function toDateString(d: Date) { return d.toLocaleDateString('en-CA') }

export default function HabitsRow({ areas, filterAreaId }: { areas: LifeArea[]; filterAreaId: string | null }) {
  const supabase = createClient()
  const [habits, setHabits] = useState<HabitRow[]>([])

  const load = useCallback(async () => {
    const { data: habitsData } = await supabase.from('habits').select('*').order('created_at')
    if (!habitsData) return
    const today = toDateString(new Date())
    const { data: completions } = await supabase.from('habit_completions').select('habit_id').eq('completed_date', today)
    const doneIds = new Set((completions ?? []).map((c: { habit_id: string }) => c.habit_id))
    const areaMap = Object.fromEntries(areas.map(a => [a.id, a]))
    setHabits(
      (habitsData as Habit[])
        .filter(h => !filterAreaId || h.life_area_id === filterAreaId)
        .map(h => ({
          ...h,
          color: areaMap[h.life_area_id]?.color ?? '#a78bfa',
          completedToday: doneIds.has(h.id),
        }))
    )
  }, [supabase, areas, filterAreaId])

  useEffect(() => { load() }, [load])

  async function toggle(h: HabitRow) {
    if (h.completedToday) return
    const today = toDateString(new Date())
    await supabase.from('habit_completions').insert({ habit_id: h.id, completed_date: today })
    await supabase.from('habits').update({
      last_completed_at: new Date().toISOString(),
      streak_count: h.streak_count + 1,
    }).eq('id', h.id)
    await load()
  }

  if (habits.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto py-1">
      {habits.map(h => (
        <button
          key={h.id}
          onClick={() => toggle(h)}
          className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all ${
            h.completedToday
              ? 'border-transparent text-m-bg'
              : 'border-m-line text-m-dim hover:border-m-spoke hover:text-m-ink'
          }`}
          style={h.completedToday ? { backgroundColor: h.color } : {}}
        >
          <span className="text-[10px]">{h.completedToday ? '✓' : '○'}</span>
          {h.name}
          {h.streak_count > 1 && !h.completedToday && (
            <span className="text-[10px] text-m-amber font-mono">{h.streak_count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create TaskCard**

```tsx
// components/tasks/TaskCard.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Project, LifeArea } from '@/lib/types'

type Props = {
  task: Task
  project: Project
  area: LifeArea
  onCompleted: (id: string) => void
  onEdit: (task: Task) => void
}

export default function TaskCard({ task, project, area, onCompleted, onEdit }: Props) {
  const supabase = createClient()
  const [leaving, setLeaving] = useState(false)
  const today = new Date().toLocaleDateString('en-CA')
  const isOverdue = !!task.due_date && task.due_date < today

  async function handleComplete() {
    if (leaving) return
    setLeaving(true)
    await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id)
    setTimeout(() => onCompleted(task.id), 280)
  }

  return (
    <div
      className={`transition-all duration-[280ms] ease-out overflow-hidden
        ${leaving ? 'opacity-0 -translate-y-1 max-h-0' : 'opacity-100 translate-y-0 max-h-32'}`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-m-line last:border-b-0 group">
        {/* Area color bar */}
        <div className="w-0.5 h-9 rounded-full shrink-0" style={{ backgroundColor: area.color }} />

        {/* Checkbox */}
        <button
          onClick={handleComplete}
          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all
            ${leaving ? 'border-m-violet bg-m-violet/20' : 'border-m-spoke hover:border-m-violet hover:bg-m-violet/10'}`}
          aria-label="Complete task"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
          <p className={`text-sm text-m-ink leading-snug truncate hover:text-m-violet-bright transition-colors
            ${task.status === 'in_progress' ? 'font-semibold' : ''}`}>
            {task.name}
          </p>
          <p className="text-[11px] text-m-ghost mt-0.5 truncate">{project.name}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {task.priority === 'high' && (
            <span className="text-[9px] font-mono font-bold text-m-red border border-m-red/40 rounded px-1.5 py-0.5 tracking-wider">HIGH</span>
          )}
          {task.due_date && (
            <span className={`text-[10px] font-mono ${isOverdue ? 'text-m-red' : 'text-m-ghost'}`}>
              {task.due_date}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create TaskFocusCanvas**

```tsx
// components/tasks/TaskFocusCanvas.tsx
'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AreaFilterBar from './AreaFilterBar'
import HabitsRow from './HabitsRow'
import TaskCard from './TaskCard'
import EditTaskSheet from './EditTaskSheet'
import AddSheet from '@/components/ui/AddSheet'
import EmptyState from '@/components/ui/EmptyState'
import type { Task, Project, LifeArea, LifeAreaWithData } from '@/lib/types'

type EnrichedTask = Task & { project: Project; area: LifeArea }

const PRIORITY_ORDER: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 }

function sortFocus(tasks: EnrichedTask[]): EnrichedTask[] {
  const statusOrder: Record<string, number> = { in_progress: 0, todo: 1 }
  return [...tasks].sort((a, b) => (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1))
}

function sortUpNext(tasks: EnrichedTask[]): EnrichedTask[] {
  return [...tasks].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (pd !== 0) return pd
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return a.position - b.position
  })
}

export default function TaskFocusCanvas() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const filterAreaId = searchParams.get('area')

  const [areas, setAreas] = useState<LifeArea[]>([])
  const [tasks, setTasks] = useState<EnrichedTask[]>([])
  const [areasWithData, setAreasWithData] = useState<LifeAreaWithData[]>([])
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [fabOpen, setFabOpen] = useState(false)

  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), [])

  const load = useCallback(async () => {
    const [
      { data: lifeAreas },
      { data: projects },
      { data: rawTasks },
      { data: subtasks },
    ] = await Promise.all([
      supabase.from('life_areas').select('*').order('position'),
      supabase.from('projects').select('*').order('position'),
      supabase.from('tasks').select('*').order('position'),
      supabase.from('subtasks').select('*').order('position'),
    ])

    if (!lifeAreas || !projects || !rawTasks) return

    setAreas(lifeAreas)

    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))
    const areaMap = Object.fromEntries(lifeAreas.map(a => [a.id, a]))

    const enriched: EnrichedTask[] = (rawTasks as Task[])
      .filter(t => t.status !== 'done')
      .map(t => {
        const project = projectMap[t.project_id] as Project
        const area = project ? (areaMap[project.life_area_id] as LifeArea) : undefined
        return { ...t, project, area: area! }
      })
      .filter(t => t.project && t.area)

    setTasks(enriched)
    setAreasWithData(lifeAreas.map(area => ({
      ...area,
      habits: [],
      projects: projects.filter(p => p.life_area_id === area.id).map(project => ({
        ...project,
        tasks: (rawTasks as Task[]).filter(t => t.project_id === project.id).map(task => ({
          ...task,
          subtasks: (subtasks ?? []).filter(s => s.task_id === task.id),
        })),
      })),
    })))
  }, [supabase])

  useEffect(() => { load() }, [load])

  function removeTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const visible = filterAreaId ? tasks.filter(t => t.area?.id === filterAreaId) : tasks

  function isFocus(t: EnrichedTask) {
    return t.status === 'in_progress' || t.priority === 'high' || t.due_date === today
  }

  const focusTasks = sortFocus(visible.filter(isFocus))
  const upNextTasks = sortUpNext(visible.filter(t => !isFocus(t)))

  if (areas.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        <EmptyState message="No life areas yet — start from the Home page." />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 pb-28">
      {/* Filter bar */}
      <div className="mb-4">
        <AreaFilterBar areas={areas} />
      </div>

      {/* Habits */}
      <div className="mb-5">
        <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.2em] mb-2.5">Today's Habits</p>
        <HabitsRow areas={areas} filterAreaId={filterAreaId} />
      </div>

      {/* Today's Focus */}
      {focusTasks.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.2em]">Today's Focus</p>
            <span className="text-[10px] font-mono text-m-violet-bright bg-m-violet/10 rounded px-1.5 py-0.5">{focusTasks.length}</span>
          </div>
          <div className="rounded-xl overflow-hidden border border-m-line bg-m-surface">
            {focusTasks.map(t => (
              <TaskCard key={t.id} task={t} project={t.project} area={t.area}
                onCompleted={removeTask} onEdit={setEditingTask} />
            ))}
          </div>
        </section>
      )}

      {/* Up Next */}
      {upNextTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.2em]">Up Next</p>
            <span className="text-[10px] font-mono text-m-dim bg-m-raised rounded px-1.5 py-0.5">{upNextTasks.length}</span>
          </div>
          <div className="rounded-xl overflow-hidden border border-m-line bg-m-surface">
            {upNextTasks.map(t => (
              <TaskCard key={t.id} task={t} project={t.project} area={t.area}
                onCompleted={removeTask} onEdit={setEditingTask} />
            ))}
          </div>
        </section>
      )}

      {visible.length === 0 && tasks.length > 0 && (
        <EmptyState message="No tasks in this area." />
      )}
      {tasks.length === 0 && (
        <EmptyState message="Nothing here — you're all caught up." />
      )}

      <EditTaskSheet
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSuccess={() => { setEditingTask(null); load() }}
      />

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        aria-label="Add task or project"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-12 h-12 rounded-full bg-m-violet text-m-bg flex items-center justify-center text-2xl font-light shadow-lg shadow-black/40 hover:bg-m-violet-bright hover:scale-105 active:scale-95 transition-all z-30 select-none"
      >
        +
      </button>

      <AddSheet
        areas={areasWithData}
        open={fabOpen}
        defaultAreaId={filterAreaId}
        onClose={() => setFabOpen(false)}
        onSuccess={() => { setFabOpen(false); load() }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Create route page**

```tsx
// app/dashboard/tasks/page.tsx
import { Suspense } from 'react'
import TaskFocusCanvas from '@/components/tasks/TaskFocusCanvas'

export default function TasksPage() {
  return (
    <Suspense>
      <TaskFocusCanvas />
    </Suspense>
  )
}
```

- [ ] **Step 6: Verify task page**

Navigate to `/dashboard/tasks`. Check:
- Area filter pills appear at top; clicking one filters tasks and updates URL
- Today's habits show as chips; clicking checks them off (chip fills with area color)
- Tasks split into "Today's Focus" (high priority / in_progress / due today) and "Up Next"
- Clicking a task checkbox triggers slide-up animation then task disappears
- Tapping a task name — the EditTaskSheet opens (it will be a no-op until Task 4)
- FAB opens AddSheet; after creating a task it appears in the list
- Clicking a wind rose petal navigates here with area pre-filtered

- [ ] **Step 7: Commit**

```bash
git add components/tasks/ app/dashboard/tasks/
git commit -m "feat: task focus page with area filter, habits row, and completion animation"
```

---

## Task 4: Edit Task Sheet

**Files:**
- Create: `components/tasks/EditTaskSheet.tsx`

**Interfaces:**
- Consumes: `task: Task | null`, `onClose: () => void`, `onSuccess: () => void`
- When `task` is null, the sheet is hidden. When non-null, it's open and pre-filled.

- [ ] **Step 1: Create EditTaskSheet**

```tsx
// components/tasks/EditTaskSheet.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/lib/types'

type Props = {
  task: Task | null
  onClose: () => void
  onSuccess: () => void
}

export default function EditTaskSheet({ task, onClose, onSuccess }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const open = task !== null

  useEffect(() => {
    if (task) {
      setName(task.name)
      setPriority(task.priority)
      setDueDate(task.due_date ?? '')
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [task])

  async function handleSave() {
    if (!task || !name.trim() || loading) return
    setLoading(true)
    const { error } = await supabase.from('tasks').update({
      name: name.trim(),
      priority,
      due_date: dueDate || null,
    }).eq('id', task.id)
    setLoading(false)
    if (!error) onSuccess()
  }

  async function handleDelete() {
    if (!task || loading) return
    setLoading(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    setLoading(false)
    onSuccess()
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-250
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-m-surface border-t border-m-line rounded-t-2xl
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="p-6 max-w-lg mx-auto pb-8">
          <div className="w-10 h-1 rounded-full bg-m-spoke mx-auto mb-6" />
          <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.2em] mb-4">Edit Task</p>

          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
            className="w-full bg-transparent border-b border-m-spoke focus:border-m-violet text-lg text-m-ink outline-none py-2 mb-5 placeholder:text-m-ghost transition-colors"
          />

          <div className="mb-4">
            <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.15em] mb-2.5">Priority</p>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as Task['priority'][]).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize
                    ${priority === p
                      ? p === 'high' ? 'bg-m-red/15 border-m-red/60 text-m-red'
                        : p === 'medium' ? 'bg-m-amber/10 border-m-amber/40 text-m-amber'
                        : 'bg-m-raised border-m-spoke text-m-ink'
                      : 'border-m-line text-m-dim hover:text-m-ink'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-[10px] font-mono text-m-ghost uppercase tracking-[0.15em] mb-2.5">Due Date</p>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-transparent border border-m-line rounded-lg px-3 py-2 text-sm text-m-ink focus:border-m-violet outline-none transition-colors [color-scheme:dark]"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={loading}
              className="py-3 px-4 border border-m-red/30 rounded-xl text-sm text-m-red hover:bg-m-red/10 disabled:opacity-30 transition-colors">
              Delete
            </button>
            <button onClick={onClose}
              className="flex-1 py-3 border border-m-line rounded-xl text-sm text-m-dim hover:text-m-ink hover:border-m-spoke transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!name.trim() || loading}
              className="flex-1 py-3 bg-m-violet text-m-bg rounded-xl text-sm font-semibold hover:bg-m-violet-bright disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify edit sheet**

On the Tasks page, tap a task name. Check:
- Bottom sheet slides up, pre-filled with task name
- Priority pills highlight the current priority
- Saving updates the task name/priority/due date in Supabase and refreshes the list
- Delete removes the task
- Tapping backdrop closes without saving

- [ ] **Step 3: Commit**

```bash
git add components/tasks/EditTaskSheet.tsx
git commit -m "feat: EditTaskSheet for editing task name, priority, and due date"
```

---

## Task 5: Visualizations Hub

**Files:**
- Create: `components/visualize/VizHub.tsx`
- Create: `app/dashboard/visualize/page.tsx`

**Interfaces:**
- `VizHub` reads `?view=heatmap|rings|timeline|graph` from URL; defaults to `heatmap`
- Passes no props to the existing viz components — they load their own data

- [ ] **Step 1: Create VizHub**

```tsx
// components/visualize/VizHub.tsx
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import HeatmapView from '@/components/visualizations/HeatmapView'
import RingsView from '@/components/visualizations/RingsView'
import TimelineView from '@/components/visualizations/TimelineView'
import GraphView from '@/components/visualizations/GraphView'

const TABS = [
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'rings',   label: 'Rings'   },
  { id: 'timeline', label: 'Timeline' },
  { id: 'graph',   label: 'Graph'   },
] as const

type ViewId = typeof TABS[number]['id']

export default function VizHub() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') ?? 'heatmap') as ViewId

  function selectView(id: ViewId) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="px-4 sm:px-6 py-5">
      <div className="flex gap-0 mb-6 border-b border-m-line">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => selectView(tab.id)}
            className={`relative pb-2.5 px-4 text-sm font-medium transition-colors
              ${view === tab.id ? 'text-m-violet-bright' : 'text-m-dim hover:text-m-ink'}`}
          >
            {tab.label}
            {view === tab.id && <span className="absolute bottom-0 left-2 right-2 h-px bg-m-violet" />}
          </button>
        ))}
      </div>

      {view === 'heatmap'  && <HeatmapView />}
      {view === 'rings'    && <RingsView />}
      {view === 'timeline' && <TimelineView />}
      {view === 'graph'    && <GraphView />}
    </div>
  )
}
```

- [ ] **Step 2: Create route page**

```tsx
// app/dashboard/visualize/page.tsx
import { Suspense } from 'react'
import VizHub from '@/components/visualize/VizHub'

export default function VisualizePage() {
  return (
    <Suspense>
      <VizHub />
    </Suspense>
  )
}
```

- [ ] **Step 3: Verify visualizations hub**

Navigate to `/dashboard/visualize`. Check:
- Four tabs at top: Heatmap, Rings, Timeline, Graph
- Each tab switches the visualization below
- Active tab has violet underline
- All four charts render correctly (data loads from Supabase)
- URL updates to `?view=rings` etc. when switching tabs

- [ ] **Step 4: Commit**

```bash
git add components/visualize/VizHub.tsx app/dashboard/visualize/page.tsx
git commit -m "feat: visualizations hub with 4-tab switcher"
```

---

## Task 6: Cleanup

**Files:**
- Delete: 5 old route directories under `app/dashboard/`
- Delete: sidebar and edit component directories
- Delete: `components/toolbar/ModeToolbar.tsx`
- Verify: `npm run build` passes with no unused import errors

- [ ] **Step 1: Delete old routes**

```bash
Remove-Item -Recurse -Force "app/dashboard/edit"
Remove-Item -Recurse -Force "app/dashboard/graph"
Remove-Item -Recurse -Force "app/dashboard/heatmap"
Remove-Item -Recurse -Force "app/dashboard/rings"
Remove-Item -Recurse -Force "app/dashboard/timeline"
```

- [ ] **Step 2: Delete old components**

```bash
Remove-Item -Recurse -Force "components/sidebar"
Remove-Item -Recurse -Force "components/edit"
Remove-Item -Force "components/toolbar/ModeToolbar.tsx"
```

- [ ] **Step 3: Check for remaining imports of deleted files**

Search for any remaining references and fix them:

```bash
# In PowerShell:
Select-String -Path "app/**/*.tsx","components/**/*.tsx" -Pattern "ModeToolbar|EditCanvas|LifeAreaSection|ProjectCard|TaskItem|SubtaskItem|Sidebar|LifeAreaList|TodaysHabits" -Recurse
```

Fix any references found before continuing.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Compilation succeeds with no errors. If TypeScript errors appear, fix them (common issues: unused imports in DashboardClient, type mismatches in Task queries).

- [ ] **Step 5: Final verify**

Run `npm run dev` and test the full user flow:
1. Land on `/dashboard` → wind rose renders, petals glow for areas with recent completions
2. Click a petal → `/dashboard/tasks?area=<id>` opens with that area pre-filtered
3. Check off a task → slide-out animation, task gone
4. Open FAB → AddSheet opens, can create task/project
5. Navigate to `/dashboard/visualize` → Heatmap loads, tab switching works
6. Mobile (responsive mode): bottom nav shows, FAB clears it, top nav is hidden

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove old routes (edit/graph/heatmap/rings/timeline) and sidebar/edit components"
```
