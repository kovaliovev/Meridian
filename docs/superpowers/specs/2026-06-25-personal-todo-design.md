# Personal Life Todo App — Design Spec
**Date:** 2026-06-25

---

## Overview

A personal planning web app for tracking tasks across all life domains (Work, Health, Study, Hobby, Relationships, etc.) with rich visualizations and daily habit tracking. The core interaction model is deliberate planning sessions: the user sits down, edits their hierarchy, then reviews progress through visualization views.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (Postgres + Supabase Auth) |
| Hosting | Vercel |
| Visualizations | D3.js or Recharts (chosen during implementation) |

---

## Data Model

All entities belong to a single authenticated user. Supabase Row Level Security (RLS) enforces per-user data isolation.

```
User
└── LifeArea
    ├── id, user_id, name, color, icon, position (sort order)
    ├── habits[]        → Habit
    └── projects[]      → Project

Habit
├── id, life_area_id, user_id
├── name
├── streak_count
└── last_completed_at

HabitCompletion (log table — never deleted)
├── id, habit_id, user_id
└── completed_date   (DATE, one row per habit per day)

Project
├── id, life_area_id, user_id
├── name, description, status (active | completed | archived)
├── due_date (optional)
└── tasks[]          → Task

Task
├── id, project_id, user_id
├── name, status (todo | in_progress | done)
├── priority (low | medium | high)
├── due_date (optional)
├── notes (optional)
└── subtasks[]       → Subtask

Subtask
├── id, task_id, user_id
├── name
└── status (todo | done)
```

**Key constraints:**
- Subtasks are leaf nodes — no subtasks of subtasks
- Subtasks have only `name` and `status` (no priority, due date, or notes)
- HabitCompletion log is append-only, used to power the Heatmap visualization

---

## App Structure

```
/app
  /auth
    /login          → email + password login form
    /signup         → email + password signup form
  /dashboard        → protected (middleware redirects unauthenticated users)
    layout.tsx      → left sidebar + top mode switcher toolbar
    /edit           → default view: hierarchical tree editor
    /rings          → radial progress visualization
    /timeline       → task timeline (Gantt-style)
    /heatmap        → habit activity calendar grid
    /graph          → force-directed node map
/components
  /sidebar          → LifeArea list + Today's Habits panel
  /toolbar          → mode switcher
  /edit             → tree editor components
  /visualizations   → Rings, Timeline, Heatmap, Graph components
/lib
  /supabase         → client, server, middleware helpers
  /hooks            → data fetching hooks
  /types            → shared TypeScript types
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  [Logo]   Edit | Rings | Timeline | Heatmap | Graph  │  ← mode switcher
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│  Work    │                                           │
│  Health  │             MAIN CANVAS                  │
│  Study   │          (changes per mode)               │
│  Hobby   │                                           │
│  Relat.  │                                           │
│  + Add   │                                           │
│          │                                           │
│──────────│                                           │
│  Today's │                                           │
│  Habits  │                                           │
└──────────┴──────────────────────────────────────────┘
```

**Left sidebar (always visible):**
- Life Areas listed with color accent and icon
- Clicking a Life Area filters/highlights the canvas to that area
- "Today's Habits" section at the bottom: all habits grouped by Life Area, checkbox to complete, streak count inline

**Mode switcher (top toolbar):**
- Active mode highlighted; switches the entire canvas

---

## Edit Mode (Default Planning Surface)

- Clicking a Life Area in the sidebar expands it in the canvas: Projects as cards, each expandable to Tasks, Tasks expandable to Subtasks
- Inline editing: click any item to rename in place
- Drag to reorder items within their level
- Keyboard shortcuts: `Enter` = add next sibling, `Tab` = indent (Task → Subtask), `Escape` = collapse/blur
- Add/delete/archive actions via context menu or inline buttons on hover

---

## Visualizations (all read-only)

### Rings
- One radial ring per Life Area, colored by area color
- Ring fill = % of tasks completed (done / total) across all projects in that area
- Arranged in a grid or circular layout on the canvas
- Hover: breakdown tooltip showing per-project completion
- Center of each ring: area name + percentage

### Timeline
- Horizontal Gantt-style layout
- Life Areas as row groups; Tasks as colored bars positioned by `due_date`
- Tasks without a due date shown in an "Unscheduled" lane at the bottom
- Zoom levels: Week / Month / Quarter (toggle in toolbar)
- Sidebar filter applies: selecting a Life Area shows only its tasks

### Heatmap
- GitHub-style calendar grid (52 weeks × 7 days)
- Cell color intensity = number of habits completed that day (0 = empty, max = all habits done)
- Hover: tooltip listing which habits were completed that day
- Toggle above grid: "All Areas" or specific Life Area (filters to that area's habits)
- Streak badges shown per habit below the grid

### Graph
- Force-directed node map using D3.js
- Node sizes: Life Areas (large) → Projects (medium) → Tasks (small)
- Node colors: inherit Life Area color
- Edges connect parent → children
- Zoom, pan, drag nodes to explore
- Clicking a node opens an inline detail panel (read-only: name, status, due date)

---

## Auth

- Supabase Auth: email + password only (no OAuth, no magic links)
- Next.js middleware checks session on all `/dashboard/**` routes; redirects to `/auth/login` if unauthenticated
- Session stored in cookies via `@supabase/ssr`
- Login and signup pages are minimal — email input, password input, submit button, inline error display
- No "forgot password" flow in v1

---

## Habits Logic

- Each Habit belongs to one Life Area
- "Today's Habits" sidebar shows all habits, grouped by Life Area, with a checkbox
- Checking a habit today:
  1. Inserts a row into `habit_completions` (habit_id, completed_date = today)
  2. Updates `last_completed_at = now()` on the Habit row
  3. Increments `streak_count`
- Streak reset: on login/app load, any habit whose `last_completed_at` date < yesterday has its `streak_count` reset to 0 (lazy evaluation, no background job needed)
- Daily reset: habits are considered "not done today" if no `habit_completions` row exists for today's date
- History is permanent in `habit_completions` — used by the Heatmap visualization

---

## State Management

- No external state library (no Redux, Zustand)
- Server Components for initial data fetching (SSR)
- Client Components for interactive parts (editor, habit checkboxes)
- Optimistic updates for habit toggles and task status changes (instant UI, rollback on Supabase error)
- Toast notifications for errors (e.g. "Failed to save — check your connection")

---

## Error Handling

- Supabase write errors → toast notification, optimistic update rolled back
- Auth errors → inline message on login/signup form
- Empty states → first-time user prompted to create their first Life Area
- No automated error reporting in v1 (personal tool)

---

## Deployment

- **Vercel:** automatic deploy on push to `main` branch
- **Environment variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Set in `.env.local` locally and in Vercel dashboard for production
- Supabase free tier is sufficient for single-user personal use

---

## Out of Scope (v1)

- Forgot password / password reset flow
- OAuth (Google, GitHub login)
- Mobile app
- Notifications or reminders
- Collaboration / sharing
- Automated tests
- Task recurrence (recurring tasks — only habits recur)
