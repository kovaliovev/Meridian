# Meridian UI Redesign — Design Spec

**Date:** 2026-06-26  
**Status:** Approved  

---

## Problem

The current app feels like a notepad rather than a task/productivity app. The main view is an edit canvas for managing life areas, projects, and tasks in a tree structure. There is no clear hierarchy of what to work on, and no gamification or motivating visual element. Navigation has 5 modes with unclear purpose distinctions.

---

## Goals

1. **Main focus = tasks.** The app's primary job is helping the user know what to work on.
2. **Gamified visual = wind rose.** Completing tasks and habits makes the rose grow and glow — the visual is the reward.
3. **Three clear pages** with distinct purposes, replacing the current 5-mode toolbar.
4. **Remove the sidebar.** Area filtering moves to the wind rose (tap a petal) and an area filter bar on the tasks page.

---

## Architecture

### Routes

| Route | Page | Purpose |
|---|---|---|
| `/dashboard` | Home — Wind Rose | Gamified overview, motivation, area navigation |
| `/dashboard/tasks` | Task Focus | Know what to work on right now |
| `/dashboard/visualize` | Visualizations | Historical data, graphs, insights |

**Removed routes:** `/dashboard/edit`, `/dashboard/graph`, `/dashboard/heatmap`, `/dashboard/rings`, `/dashboard/timeline`

### Navigation UI

- **Desktop:** Centered 3-tab nav in the header: `Home | Tasks | Visualize`. Replaces the current ModeToolbar. The `MERIDIAN` wordmark stays on the left.
- **Mobile:** Fixed bottom tab bar with icon + label for each of the 3 pages. Header shows only the wordmark. Tab bar sits above the FAB.

### Layout Shell Changes

- `DashboardClient.tsx` loses the sidebar entirely (the `<aside>` block, hamburger button, `sidebarOpen` state, `setSidebarOpen`, `lifeAreas` loading, `handleSelectArea`, the mobile backdrop). It becomes a thin wrapper: header + nav + `<main>`.
- `Sidebar.tsx`, `LifeAreaList.tsx` become unused and are deleted.
- `ModeToolbar.tsx` is rewritten as a 3-tab responsive nav (desktop: horizontal tabs; mobile: hidden — bottom bar handles it).

### FAB

Always visible on all 3 pages. Position: `bottom-6 right-6` (desktop), `bottom-20 right-4` (mobile, above the tab bar). Opens the existing `AddSheet` component unchanged.

---

## Page 1: Home — Wind Rose

**File:** `app/dashboard/page.tsx` + `components/home/WindRose.tsx` + `components/home/HomeStats.tsx`

### WindRose component

D3-powered SVG. Renders petals radiating from center, one per life area.

**Data queries (client-side, single load):**

```
lifetimeTasksDone: SELECT projects.life_area_id, COUNT(tasks.id)
  FROM tasks JOIN projects ON tasks.project_id = projects.id
  WHERE tasks.status = 'done'
  GROUP BY projects.life_area_id

lifetimeHabitsDone: SELECT habits.life_area_id, COUNT(habit_completions.id)
  FROM habit_completions JOIN habits ON habit_completions.habit_id = habits.id
  GROUP BY habits.life_area_id

recentTasksDone: same as lifetimeTasksDone + WHERE tasks.updated_at >= now() - interval '7 days'

recentHabitsDone: same as lifetimeHabitsDone + WHERE habit_completions.completed_date >= today - 7
```

**Petal sizing:**

- `lifetimeScore[area] = lifetimeTasksDone[area] + lifetimeHabitsDone[area]`
- `recentScore[area] = recentTasksDone[area] + recentHabitsDone[area]`
- `maxLifetime = max(lifetimeScore across all areas)`
- `petalLength[area] = MIN_PETAL + (lifetimeScore[area] / maxLifetime) * (MAX_PETAL - MIN_PETAL)` where MIN_PETAL = 40px, MAX_PETAL = 180px
- `glowOpacity[area] = min(recentScore[area] / 10, 1)` (saturates at 10 completions/week)

**Petal visual structure:**

- Base shape: elongated teardrop/lance shape in the area's color at ~40% opacity
- Glow layer: same shape, narrower, area color at full saturation, opacity = `glowOpacity[area]`, with CSS `filter: blur(6px)` applied
- Label: area icon + area name rendered as SVG `<text>` just beyond the petal tip
- Area petals equally distributed around 360°

**Interactivity:**

- Click/tap a petal → `router.push('/dashboard/tasks?area=<id>')`
- Desktop hover: petal opacity bumps to 70%, tooltip shows area name, lifetime score, recent score
- Completion pulse: when a task/habit is completed anywhere in the session, the relevant petal plays a `scale(1.08) → scale(1.0)` CSS animation (300ms ease-out), re-triggerable

**Page layout:**

```
[HomeStats: greeting + week summary]
[WindRose: full-bleed centered SVG, ~70vh]
```

**HomeStats:** `"Good morning / afternoon / evening"` based on local hour. Date in mono text. One muted line: `"X completions this week"`.

**Empty state (no life areas):** Centered prompt: `"Add a life area to start growing your rose."` with a button that opens AddSheet.

---

## Page 2: Task Focus

**File:** `app/dashboard/tasks/page.tsx` + `components/tasks/TaskFocusCanvas.tsx` + `components/tasks/TaskCard.tsx` + `components/tasks/HabitsRow.tsx` + `components/tasks/AreaFilterBar.tsx`

### AreaFilterBar

Horizontal scrollable pill row. Pills: `All` + one per life area (icon + name, area color border when active). Active state driven by `?area=<id>` URL param. Clicking a pill updates the param.

### HabitsRow

Below the area filter bar. Shows today's habits as compact chips. Each chip: habit name + circle checkbox button. Completing a habit:
1. Marks chip as done (green fill, disabled)
2. Inserts row into `habit_completions` for today
3. Fires a petal-pulse event for the rose (via a shared context or URL-triggered refresh)

Filtered by selected area if an area filter is active.

### Task sections

**Section: "Today's Focus"**
- Tasks matching: `status IN ('todo', 'in_progress') AND (due_date = today OR priority = 'high' OR status = 'in_progress')`
- Sorted: `in_progress` first, then `high priority`, then `due today`
- Header: `"Today's Focus"` + count badge

**Section: "Up Next"**
- All remaining tasks with `status IN ('todo', 'in_progress')` not in Today's Focus
- Sorted: priority desc (medium → low), then due_date asc (soonest first), then position asc
- Header: `"Up Next"` + count badge

Both sections filtered by selected area if active.

### TaskCard

```
[area-color-bar 3px] [checkbox] [task name]               [priority badge] [due chip]
                                [project name — muted]
```

- **Checkbox:** Animated ring fill on click (CSS transition, 200ms)
- **Completion flow:** On checkbox click → optimistic UI (animate) → `UPDATE tasks SET status='done'` → card plays slide-up + fade-out (250ms) → removed from list. No "Done" section.
- **Tap on task name:** Opens a new `EditTaskSheet` component (bottom sheet, same visual style as AddSheet). Pre-filled with task name. Fields: name (text input), priority (pill selector), due date (date input), delete button. Does NOT change project/area — that's out of scope.
- **Priority badge:** Only shown for `high`. Small red pill `HIGH`.
- **Due date chip:** Shown if due_date is set. Red text if overdue.
- **Area color bar:** Left border, 3px, `background: area.color`

### Empty state

If no tasks match: `"Nothing here — you're all caught up."` with a subtle animation.

---

## Page 3: Visualizations Hub

**File:** `app/dashboard/visualize/page.tsx` + `components/visualize/VizHub.tsx`

### VizHub

4-tab switcher at top. Tabs: `Heatmap | Rings | Timeline | Graph`. Active tab stored in `?view=heatmap|rings|timeline|graph` URL param (defaults to `heatmap`).

Each tab renders the corresponding existing component:
- `Heatmap` → `components/visualizations/HeatmapView.tsx` (unchanged)
- `Rings` → `components/visualizations/RingsView.tsx` (unchanged)
- `Timeline` → `components/visualizations/TimelineView.tsx` (unchanged)
- `Graph` → `components/visualizations/GraphView.tsx` (unchanged)

The VizHub provides consistent tab chrome; the visualization components are not modified.

---

## File Map

### New files

| File | Purpose |
|---|---|
| `components/home/WindRose.tsx` | D3 wind rose SVG component |
| `components/home/HomeStats.tsx` | Greeting + weekly summary |
| `app/dashboard/tasks/page.tsx` | Task Focus route |
| `components/tasks/TaskFocusCanvas.tsx` | Full task page data + layout |
| `components/tasks/TaskCard.tsx` | Individual task card with animation |
| `components/tasks/HabitsRow.tsx` | Today's habit chips |
| `components/tasks/AreaFilterBar.tsx` | Horizontal area filter pills |
| `app/dashboard/visualize/page.tsx` | Visualizations route |
| `components/visualize/VizHub.tsx` | 4-tab viz container |

### Modified files

| File | Change |
|---|---|
| `app/dashboard/page.tsx` | Replace EditCanvas with Wind Rose home |
| `app/dashboard/layout.tsx` | Remove sidebar props/imports |
| `app/dashboard/DashboardClient.tsx` | Remove sidebar, add responsive 3-tab nav |
| `components/toolbar/ModeToolbar.tsx` | Rewrite as 3-tab nav (desktop) |

### Deleted files / routes

| File / Route | Reason |
|---|---|
| `app/dashboard/edit/page.tsx` | Replaced by /dashboard/tasks |
| `app/dashboard/graph/page.tsx` | Moved to /dashboard/visualize |
| `app/dashboard/heatmap/page.tsx` | Moved to /dashboard/visualize |
| `app/dashboard/rings/page.tsx` | Moved to /dashboard/visualize |
| `app/dashboard/timeline/page.tsx` | Moved to /dashboard/visualize |
| `components/sidebar/Sidebar.tsx` | Removed |
| `components/sidebar/LifeAreaList.tsx` | Removed |

### Unchanged files

| File | Reason |
|---|---|
| `components/ui/AddSheet.tsx` | Used as-is by FAB everywhere |
| `components/visualizations/*` | Rehoused in VizHub, not modified |
| `lib/types/index.ts` | No type changes needed |
| `lib/supabase/*` | No auth changes |

### Also deleted

| File | Reason |
|---|---|
| `components/sidebar/TodaysHabits.tsx` | Logic superseded by HabitsRow |
| `components/edit/EditCanvas.tsx` | Replaced by TaskFocusCanvas |
| `components/edit/LifeAreaSection.tsx` | Unused after EditCanvas removed |
| `components/edit/ProjectCard.tsx` | Unused after EditCanvas removed |
| `components/edit/TaskItem.tsx` | Unused after EditCanvas removed |
| `components/edit/SubtaskItem.tsx` | Unused after EditCanvas removed |

### New files (updated)

| File | Purpose |
|---|---|
| `components/tasks/EditTaskSheet.tsx` | Bottom sheet for editing task name/priority/due date |

---

## Design Tokens (unchanged)

Existing `m-*` Tailwind tokens remain. No new colors. The wind rose uses each area's stored `color` hex value directly (inline styles on SVG elements).

---

## Out of Scope

- Task drag-and-drop reordering
- Subtask display on the task page (subtasks remain in DB, just not surfaced in this page — future work)
- Push notifications / reminders
- User settings / profile page
- Editing or deleting life areas (creation still works via AddSheet; management UI is a future concern)
- Subtask display in task cards
