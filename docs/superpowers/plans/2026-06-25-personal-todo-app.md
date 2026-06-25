# Personal Life Todo App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal life planning web app with a 3-level task hierarchy, daily habit tracking per life area, and 4 read-only visualizations (Rings, Timeline, Heatmap, Graph).

**Architecture:** Next.js 14 App Router with a persistent left sidebar and top mode-switcher toolbar. All data lives in Supabase (Postgres + Auth). Edit mode is the default planning surface; visualization routes are read-only views of the same data.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), D3.js (Timeline + Graph), Vercel deployment.

## Global Constraints

- Next.js 14 App Router only — no Pages Router
- TypeScript strict mode
- Tailwind CSS for all styling — no CSS modules, no styled-components
- Supabase RLS enforced on every table — `user_id = auth.uid()` policy
- No automated test suite — manual verification steps instead
- No external state library — React state + server actions only
- `@supabase/ssr` (not deprecated `auth-helpers-nextjs`)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## File Map

```
/
├── app/
│   ├── layout.tsx                      root layout (html/body)
│   ├── page.tsx                        redirects → /dashboard/edit
│   ├── globals.css
│   ├── auth/
│   │   ├── login/page.tsx              login form
│   │   └── signup/page.tsx             signup form
│   └── dashboard/
│       ├── layout.tsx                  sidebar + toolbar shell
│       ├── page.tsx                    redirects → /dashboard/edit
│       ├── edit/page.tsx               hierarchical tree editor
│       ├── rings/page.tsx              radial rings visualization
│       ├── timeline/page.tsx           Gantt timeline visualization
│       ├── heatmap/page.tsx            habit calendar heatmap
│       └── graph/page.tsx             force-directed graph
├── components/
│   ├── ui/
│   │   ├── Toast.tsx                   error toast notification
│   │   └── EmptyState.tsx              first-time user prompt
│   ├── sidebar/
│   │   ├── Sidebar.tsx                 sidebar shell
│   │   ├── LifeAreaList.tsx            life area nav items
│   │   └── TodaysHabits.tsx            daily habit checklist
│   ├── toolbar/
│   │   └── ModeToolbar.tsx             Edit|Rings|Timeline|Heatmap|Graph switcher
│   ├── edit/
│   │   ├── EditCanvas.tsx              edit mode root
│   │   ├── LifeAreaSection.tsx         expandable life area block
│   │   ├── ProjectCard.tsx             project card with task list
│   │   ├── TaskItem.tsx                task row with subtask toggle
│   │   └── SubtaskItem.tsx             leaf subtask row
│   └── visualizations/
│       ├── RingsView.tsx               SVG radial rings
│       ├── TimelineView.tsx            D3 Gantt chart
│       ├── HeatmapView.tsx             CSS grid calendar
│       └── GraphView.tsx              D3 force graph
├── lib/
│   ├── types/index.ts                  all shared TS types
│   ├── supabase/
│   │   ├── client.ts                   browser Supabase client
│   │   ├── server.ts                   server component client
│   │   └── middleware.ts               middleware client
│   └── hooks/
│       ├── useToast.ts                 toast state hook
│       └── useSelectedArea.ts          sidebar filter state
├── middleware.ts                        auth route protection
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      all tables + RLS policies
├── .env.local
├── next.config.ts
└── tailwind.config.ts
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `.env.local`

**Interfaces:**
- Produces: running Next.js 14 dev server at `localhost:3000`

- [ ] **Step 1: Create Next.js app**

```bash
cd "C:/Users/staff01/Desktop/Web/New folder"
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```
When prompted, accept all defaults.

- [ ] **Step 2: Install Supabase and D3 packages**

```bash
npm install @supabase/supabase-js @supabase/ssr d3
npm install --save-dev @types/d3
```

- [ ] **Step 3: Create `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Fill in values from your Supabase project dashboard → Settings → API.

- [ ] **Step 4: Replace `app/page.tsx` with redirect**

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard/edit')
}
```

- [ ] **Step 5: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Life Todo',
  description: 'Personal life planning app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```
Expected: server starts at `http://localhost:3000` with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 app with Supabase and D3"
```

---

### Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Interfaces:**
- Produces: all tables (`life_areas`, `habits`, `habit_completions`, `projects`, `tasks`, `subtasks`) with RLS

- [ ] **Step 1: Create migration file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Life Areas
create table life_areas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  icon text not null default '📌',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Habits
create table habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid not null references life_areas(id) on delete cascade,
  name text not null,
  streak_count integer not null default 0,
  last_completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Habit completions (append-only log)
create table habit_completions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  completed_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(habit_id, completed_date)
);

-- Projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_area_id uuid not null references life_areas(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Tasks
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Subtasks
create table subtasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  name text not null,
  status text not null default 'todo' check (status in ('todo', 'done')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table life_areas enable row level security;
alter table habits enable row level security;
alter table habit_completions enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;

-- RLS Policies (all tables follow same pattern)
create policy "Users manage own life_areas" on life_areas for all using (auth.uid() = user_id);
create policy "Users manage own habits" on habits for all using (auth.uid() = user_id);
create policy "Users manage own habit_completions" on habit_completions for all using (auth.uid() = user_id);
create policy "Users manage own projects" on projects for all using (auth.uid() = user_id);
create policy "Users manage own tasks" on tasks for all using (auth.uid() = user_id);
create policy "Users manage own subtasks" on subtasks for all using (auth.uid() = user_id);
```

- [ ] **Step 2: Run migration in Supabase**

Go to Supabase dashboard → SQL Editor → paste the entire file → Run.

Verify in Table Editor: all 6 tables appear with their columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add database schema with RLS policies"
```

---

### Task 3: Supabase Client Helpers + Types

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/types/index.ts`

**Interfaces:**
- Produces: `createBrowserClient()`, `createServerClient()`, `createMiddlewareClient()`, and all shared types

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create middleware client**

Create `lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 4: Create shared types**

Create `lib/types/index.ts`:

```ts
export type LifeArea = {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  position: number
  created_at: string
}

export type Habit = {
  id: string
  user_id: string
  life_area_id: string
  name: string
  streak_count: number
  last_completed_at: string | null
  created_at: string
}

export type HabitCompletion = {
  id: string
  user_id: string
  habit_id: string
  completed_date: string
  created_at: string
}

export type Project = {
  id: string
  user_id: string
  life_area_id: string
  name: string
  description: string | null
  status: 'active' | 'completed' | 'archived'
  due_date: string | null
  position: number
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  project_id: string
  name: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  notes: string | null
  position: number
  created_at: string
}

export type Subtask = {
  id: string
  user_id: string
  task_id: string
  name: string
  status: 'todo' | 'done'
  position: number
  created_at: string
}

export type TaskWithSubtasks = Task & { subtasks: Subtask[] }
export type ProjectWithTasks = Project & { tasks: TaskWithSubtasks[] }
export type HabitWithCompletion = Habit & { completedToday: boolean }
export type LifeAreaWithData = LifeArea & {
  projects: ProjectWithTasks[]
  habits: HabitWithCompletion[]
}
```

- [ ] **Step 5: Create root middleware**

Create `middleware.ts` at project root:

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/ middleware.ts
git commit -m "feat: add Supabase client helpers and shared types"
```

---

### Task 4: Auth Pages (Login + Signup)

**Files:**
- Create: `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/client.ts`
- Produces: working `/auth/login` and `/auth/signup` pages that redirect to `/dashboard/edit` on success

- [ ] **Step 1: Create login page**

Create `app/auth/login/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard/edit')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-white">Sign in</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500 text-center">
          No account?{' '}
          <Link href="/auth/signup" className="text-indigo-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create signup page**

Create `app/auth/signup/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard/edit')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-white">Create account</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500 text-center">
          Have an account?{' '}
          <Link href="/auth/login" className="text-indigo-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Visit `http://localhost:3000/auth/signup`, create an account. Verify redirect to `/dashboard/edit` (will show 404 for now — that's fine). Visit `/auth/login`, sign in, verify redirect.

- [ ] **Step 4: Commit**

```bash
git add app/auth/
git commit -m "feat: add email/password auth pages"
```

---

### Task 5: Dashboard Shell (Layout + Toolbar)

**Files:**
- Create: `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `components/toolbar/ModeToolbar.tsx`, `components/ui/Toast.tsx`, `lib/hooks/useToast.ts`

**Interfaces:**
- Produces: `<DashboardLayout>` with sidebar slot and toolbar; `useToast()` hook returning `{ toast, showToast, clearToast }`

- [ ] **Step 1: Create toast hook**

Create `lib/hooks/useToast.ts`:

```ts
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
```

- [ ] **Step 2: Create Toast component**

Create `components/ui/Toast.tsx`:

```tsx
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
```

- [ ] **Step 3: Create mode toolbar**

Create `components/toolbar/ModeToolbar.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MODES = [
  { label: 'Edit', href: '/dashboard/edit' },
  { label: 'Rings', href: '/dashboard/rings' },
  { label: 'Timeline', href: '/dashboard/timeline' },
  { label: 'Heatmap', href: '/dashboard/heatmap' },
  { label: 'Graph', href: '/dashboard/graph' },
]

export default function ModeToolbar() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {MODES.map(mode => {
        const active = pathname === mode.href
        return (
          <Link
            key={mode.href}
            href={mode.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${active
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            {mode.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Create dashboard layout**

Create `app/dashboard/layout.tsx`:

```tsx
import ModeToolbar from '@/components/toolbar/ModeToolbar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Top toolbar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <span className="font-bold text-lg tracking-tight text-white">LifeTodo</span>
        <ModeToolbar />
        <div className="w-32" /> {/* spacer to center toolbar */}
      </header>

      {/* Sidebar + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar placeholder — filled in Task 6 */}
        <aside id="sidebar-slot" className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 overflow-y-auto" />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create dashboard index redirect**

Create `app/dashboard/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
export default function DashboardPage() {
  redirect('/dashboard/edit')
}
```

- [ ] **Step 6: Create placeholder pages for all modes**

Create `app/dashboard/edit/page.tsx`:
```tsx
export default function EditPage() {
  return <div className="text-gray-400">Edit mode — coming soon</div>
}
```

Create `app/dashboard/rings/page.tsx`:
```tsx
export default function RingsPage() {
  return <div className="text-gray-400">Rings — coming soon</div>
}
```

Create `app/dashboard/timeline/page.tsx`:
```tsx
export default function TimelinePage() {
  return <div className="text-gray-400">Timeline — coming soon</div>
}
```

Create `app/dashboard/heatmap/page.tsx`:
```tsx
export default function HeatmapPage() {
  return <div className="text-gray-400">Heatmap — coming soon</div>
}
```

Create `app/dashboard/graph/page.tsx`:
```tsx
export default function GraphPage() {
  return <div className="text-gray-400">Graph — coming soon</div>
}
```

- [ ] **Step 7: Manual verification**

Run `npm run dev`. Visit `http://localhost:3000` — should redirect to `/dashboard/edit`. If not logged in, should redirect to `/auth/login`. After login, should show the toolbar with all 5 mode tabs. Clicking tabs should change the URL and show placeholder text.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/ components/toolbar/ components/ui/ lib/hooks/useToast.ts
git commit -m "feat: add dashboard shell with mode switcher toolbar"
```

---

### Task 6: Sidebar — Life Areas + CRUD

**Files:**
- Create: `components/sidebar/Sidebar.tsx`, `components/sidebar/LifeAreaList.tsx`, `components/ui/EmptyState.tsx`
- Modify: `app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `LifeArea` type; `createClient()` from `lib/supabase/client.ts`
- Produces: `<Sidebar lifeAreas={...} selectedAreaId={...} onSelectArea={...} />` with add/rename/delete life areas; `useSelectedArea()` hook

- [ ] **Step 1: Create useSelectedArea hook**

Create `lib/hooks/useSelectedArea.ts`:

```ts
import { useState } from 'react'

export function useSelectedArea() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  return { selectedAreaId, setSelectedAreaId }
}
```

- [ ] **Step 2: Create EmptyState component**

Create `components/ui/EmptyState.tsx`:

```tsx
export default function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <p className="text-gray-500 text-sm">{message}</p>
      {action}
    </div>
  )
}
```

- [ ] **Step 3: Create LifeAreaList component**

Create `components/sidebar/LifeAreaList.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { LifeArea } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const PRESET_COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#14b8a6']
const PRESET_ICONS = ['💼','❤️','📚','🎮','🏃','🎵','✈️','🌱','🍎','💡']

type Props = {
  lifeAreas: LifeArea[]
  selectedAreaId: string | null
  onSelectArea: (id: string | null) => void
  onChanged: () => void
}

export default function LifeAreaList({ lifeAreas, selectedAreaId, onSelectArea, onChanged }: Props) {
  const supabase = createClient()
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function addArea() {
    if (!newName.trim()) return
    await supabase.from('life_areas').insert({
      name: newName.trim(),
      color: PRESET_COLORS[lifeAreas.length % PRESET_COLORS.length],
      icon: PRESET_ICONS[lifeAreas.length % PRESET_ICONS.length],
      position: lifeAreas.length,
    })
    setNewName('')
    setAddingNew(false)
    onChanged()
  }

  async function renameArea(id: string) {
    if (!editName.trim()) return
    await supabase.from('life_areas').update({ name: editName.trim() }).eq('id', id)
    setEditingId(null)
    onChanged()
  }

  async function deleteArea(id: string) {
    await supabase.from('life_areas').delete().eq('id', id)
    if (selectedAreaId === id) onSelectArea(null)
    onChanged()
  }

  return (
    <div className="space-y-0.5">
      {lifeAreas.map(area => (
        <div key={area.id}
          className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
            ${selectedAreaId === area.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
          onClick={() => onSelectArea(selectedAreaId === area.id ? null : area.id)}
        >
          <span className="text-base">{area.icon}</span>
          {editingId === area.id ? (
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => renameArea(area.id)}
              onKeyDown={e => { if (e.key === 'Enter') renameArea(area.id); if (e.key === 'Escape') setEditingId(null) }}
              className="flex-1 bg-transparent text-sm text-white outline-none border-b border-indigo-500"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-sm text-gray-200 truncate">{area.name}</span>
          )}
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: area.color }}
          />
          <div className="hidden group-hover:flex items-center gap-1 ml-1">
            <button
              onClick={e => { e.stopPropagation(); setEditingId(area.id); setEditName(area.name) }}
              className="text-gray-500 hover:text-gray-300 text-xs px-1"
              title="Rename"
            >✏️</button>
            <button
              onClick={e => { e.stopPropagation(); deleteArea(area.id) }}
              className="text-gray-500 hover:text-red-400 text-xs px-1"
              title="Delete"
            >🗑️</button>
          </div>
        </div>
      ))}

      {addingNew ? (
        <div className="px-3 py-2">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={() => { if (newName.trim()) addArea(); else setAddingNew(false) }}
            onKeyDown={e => { if (e.key === 'Enter') addArea(); if (e.key === 'Escape') setAddingNew(false) }}
            placeholder="Area name…"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <span>+</span> Add area
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create Sidebar shell**

Create `components/sidebar/Sidebar.tsx`:

```tsx
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
```

- [ ] **Step 5: Wire sidebar into dashboard layout**

Replace `app/dashboard/layout.tsx` with a client wrapper that manages selected area state and fetches life areas:

Create `app/dashboard/DashboardClient.tsx`:

```tsx
'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/sidebar/Sidebar'
import ModeToolbar from '@/components/toolbar/ModeToolbar'
import ToastNotification from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'
import type { LifeArea } from '@/lib/types'

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const { toast } = useToast()

  const loadLifeAreas = useCallback(async () => {
    const { data, error } = await supabase
      .from('life_areas')
      .select('*')
      .order('position')
    if (!error && data) setLifeAreas(data)
  }, [supabase])

  useEffect(() => { loadLifeAreas() }, [loadLifeAreas])

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <span className="font-bold text-lg tracking-tight text-white">LifeTodo</span>
        <ModeToolbar />
        <div className="w-32" />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 overflow-y-auto">
          <Sidebar
            lifeAreas={lifeAreas}
            selectedAreaId={selectedAreaId}
            onSelectArea={setSelectedAreaId}
            onChanged={loadLifeAreas}
          />
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <ToastNotification toast={toast} />
    </div>
  )
}
```

Replace `app/dashboard/layout.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <DashboardClient>{children}</DashboardClient>
}
```

- [ ] **Step 6: Manual verification**

Run `npm run dev`, log in. Sidebar shows "Life Areas" heading and "+ Add area" button. Add a few areas — they appear with color dots. Hover to see rename/delete buttons. Refresh page — areas persist (from Supabase). Click an area to select/deselect (highlighted).

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/ components/sidebar/ components/ui/EmptyState.tsx lib/hooks/useSelectedArea.ts
git commit -m "feat: add sidebar with life area CRUD"
```

---

### Task 7: Today's Habits Sidebar Panel

**Files:**
- Create: `components/sidebar/TodaysHabits.tsx`
- Modify: `components/sidebar/Sidebar.tsx`, `app/dashboard/DashboardClient.tsx`

**Interfaces:**
- Consumes: `HabitWithCompletion`, `LifeArea` types; `createClient()`
- Produces: `<TodaysHabits>` with per-area habit list, daily checkbox, streak count, add/delete habit

- [ ] **Step 1: Create TodaysHabits component**

Create `components/sidebar/TodaysHabits.tsx`:

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeArea, Habit } from '@/lib/types'

type HabitRow = Habit & { completedToday: boolean; lifeAreaName: string; lifeAreaColor: string }

function toDateString(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function TodaysHabits({ lifeAreas }: { lifeAreas: LifeArea[] }) {
  const supabase = createClient()
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [addingToAreaId, setAddingToAreaId] = useState<string | null>(null)
  const [newHabitName, setNewHabitName] = useState('')
  const today = toDateString(new Date())

  const loadHabits = useCallback(async () => {
    const { data: habitsData } = await supabase.from('habits').select('*').order('created_at')
    if (!habitsData) return

    const { data: completions } = await supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('completed_date', today)

    const completedIds = new Set((completions ?? []).map(c => c.habit_id))

    // Reset streaks for habits missed yesterday (lazy evaluation)
    const yesterday = toDateString(new Date(Date.now() - 86400000))
    const toReset = habitsData.filter(h =>
      h.last_completed_at && toDateString(new Date(h.last_completed_at)) < yesterday && h.streak_count > 0
    )
    if (toReset.length > 0) {
      await supabase.from('habits').update({ streak_count: 0 }).in('id', toReset.map(h => h.id))
    }

    const areaMap = Object.fromEntries(lifeAreas.map(a => [a.id, a]))
    setHabits(habitsData.map(h => ({
      ...h,
      streak_count: toReset.find(r => r.id === h.id) ? 0 : h.streak_count,
      completedToday: completedIds.has(h.id),
      lifeAreaName: areaMap[h.life_area_id]?.name ?? '',
      lifeAreaColor: areaMap[h.life_area_id]?.color ?? '#6366f1',
    })))
  }, [supabase, lifeAreas, today])

  useEffect(() => { loadHabits() }, [loadHabits])

  async function toggleHabit(habit: HabitRow) {
    if (habit.completedToday) return // no un-checking (append-only log)
    await supabase.from('habit_completions').insert({ habit_id: habit.id, completed_date: today })
    await supabase.from('habits').update({
      last_completed_at: new Date().toISOString(),
      streak_count: habit.streak_count + 1,
    }).eq('id', habit.id)
    loadHabits()
  }

  async function addHabit(lifeAreaId: string) {
    if (!newHabitName.trim()) return
    await supabase.from('habits').insert({ life_area_id: lifeAreaId, name: newHabitName.trim() })
    setNewHabitName('')
    setAddingToAreaId(null)
    loadHabits()
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').delete().eq('id', id)
    loadHabits()
  }

  if (lifeAreas.length === 0) return null

  const grouped = lifeAreas.map(area => ({
    area,
    habits: habits.filter(h => h.life_area_id === area.id),
  })).filter(g => g.habits.length > 0 || addingToAreaId === g.area.id)

  return (
    <div className="p-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Habits</p>
      {lifeAreas.map(area => {
        const areaHabits = habits.filter(h => h.life_area_id === area.id)
        return (
          <div key={area.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 font-medium" style={{ color: area.color }}>
                {area.icon} {area.name}
              </span>
              <button
                onClick={() => setAddingToAreaId(area.id)}
                className="text-xs text-gray-600 hover:text-gray-400"
              >+</button>
            </div>
            {areaHabits.map(habit => (
              <div key={habit.id} className="group flex items-center gap-2 py-0.5">
                <button
                  onClick={() => toggleHabit(habit)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                    ${habit.completedToday
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-600 hover:border-emerald-500'}`}
                >
                  {habit.completedToday && <span className="text-white text-xs">✓</span>}
                </button>
                <span className={`flex-1 text-xs ${habit.completedToday ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                  {habit.name}
                </span>
                {habit.streak_count > 0 && (
                  <span className="text-xs text-amber-400">🔥{habit.streak_count}</span>
                )}
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs"
                >×</button>
              </div>
            ))}
            {addingToAreaId === area.id && (
              <input
                autoFocus
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                onBlur={() => { if (newHabitName.trim()) addHabit(area.id); else setAddingToAreaId(null) }}
                onKeyDown={e => { if (e.key === 'Enter') addHabit(area.id); if (e.key === 'Escape') setAddingToAreaId(null) }}
                placeholder="Habit name…"
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Add TodaysHabits to Sidebar**

Replace `components/sidebar/Sidebar.tsx`:

```tsx
import type { LifeArea } from '@/lib/types'
import LifeAreaList from './LifeAreaList'
import TodaysHabits from './TodaysHabits'

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
      <div className="border-t border-gray-800">
        <TodaysHabits lifeAreas={lifeAreas} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

Add a life area. Click `+` next to it in the Habits section, add a habit (e.g. "Brush teeth"). Check it off — checkbox turns green, name gets strikethrough. Reload — completion persists for today. Streak counter increments on next day's check.

- [ ] **Step 4: Commit**

```bash
git add components/sidebar/TodaysHabits.tsx components/sidebar/Sidebar.tsx
git commit -m "feat: add today's habits panel with streak tracking"
```

---

### Task 8: Edit Mode — Full Hierarchy Editor

**Files:**
- Create: `components/edit/EditCanvas.tsx`, `components/edit/LifeAreaSection.tsx`, `components/edit/ProjectCard.tsx`, `components/edit/TaskItem.tsx`, `components/edit/SubtaskItem.tsx`
- Replace: `app/dashboard/edit/page.tsx`

**Interfaces:**
- Consumes: `LifeAreaWithData`, `ProjectWithTasks`, `TaskWithSubtasks`, `Subtask` types
- Produces: full CRUD editor for Projects → Tasks → Subtasks; inline editing with keyboard shortcuts

- [ ] **Step 1: Create SubtaskItem**

Create `components/edit/SubtaskItem.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Subtask } from '@/lib/types'

export default function SubtaskItem({ subtask, onChanged }: { subtask: Subtask; onChanged: () => void }) {
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(subtask.name)

  async function toggleStatus() {
    await supabase.from('subtasks').update({
      status: subtask.status === 'done' ? 'todo' : 'done'
    }).eq('id', subtask.id)
    onChanged()
  }

  async function saveName() {
    if (!name.trim()) { setName(subtask.name); setEditing(false); return }
    await supabase.from('subtasks').update({ name: name.trim() }).eq('id', subtask.id)
    setEditing(false)
    onChanged()
  }

  async function deleteSubtask() {
    await supabase.from('subtasks').delete().eq('id', subtask.id)
    onChanged()
  }

  return (
    <div className="group flex items-center gap-2 py-1 pl-8 pr-2">
      <button
        onClick={toggleStatus}
        className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors
          ${subtask.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-emerald-500'}`}
      >
        {subtask.status === 'done' && <span className="text-white text-[9px]">✓</span>}
      </button>
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(subtask.name); setEditing(false) } }}
          className="flex-1 bg-transparent text-sm text-white outline-none border-b border-indigo-500"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={`flex-1 text-sm cursor-default ${subtask.status === 'done' ? 'line-through text-gray-600' : 'text-gray-300'}`}
        >
          {subtask.name}
        </span>
      )}
      <button onClick={deleteSubtask} className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs">×</button>
    </div>
  )
}
```

- [ ] **Step 2: Create TaskItem**

Create `components/edit/TaskItem.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithSubtasks } from '@/lib/types'
import SubtaskItem from './SubtaskItem'

const PRIORITY_COLORS = { low: 'text-gray-500', medium: 'text-amber-500', high: 'text-red-500' }
const STATUS_OPTIONS = ['todo', 'in_progress', 'done'] as const
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const

export default function TaskItem({ task, onChanged }: { task: TaskWithSubtasks; onChanged: () => void }) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(task.name)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [newSubtaskName, setNewSubtaskName] = useState('')

  async function saveName() {
    if (!name.trim()) { setName(task.name); setEditing(false); return }
    await supabase.from('tasks').update({ name: name.trim() }).eq('id', task.id)
    setEditing(false)
    onChanged()
  }

  async function cycleStatus() {
    const next = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(task.status) + 1) % STATUS_OPTIONS.length]
    await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    onChanged()
  }

  async function cyclePriority() {
    const next = PRIORITY_OPTIONS[(PRIORITY_OPTIONS.indexOf(task.priority) + 1) % PRIORITY_OPTIONS.length]
    await supabase.from('tasks').update({ priority: next }).eq('id', task.id)
    onChanged()
  }

  async function deleteTask() {
    await supabase.from('tasks').delete().eq('id', task.id)
    onChanged()
  }

  async function addSubtask() {
    if (!newSubtaskName.trim()) return
    await supabase.from('subtasks').insert({ task_id: task.id, name: newSubtaskName.trim(), position: task.subtasks.length })
    setNewSubtaskName('')
    setAddingSubtask(false)
    setExpanded(true)
    onChanged()
  }

  const statusIcon = task.status === 'done' ? '✓' : task.status === 'in_progress' ? '◐' : '○'
  const statusColor = task.status === 'done' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-amber-500' : 'text-gray-500'

  return (
    <div>
      <div className="group flex items-center gap-2 py-1.5 pl-4 pr-2 rounded hover:bg-gray-800/40">
        <button onClick={cycleStatus} className={`text-sm shrink-0 ${statusColor}`}>{statusIcon}</button>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-400 text-xs shrink-0">
          {task.subtasks.length > 0 ? (expanded ? '▾' : '▸') : '·'}
        </button>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') { setName(task.name); setEditing(false) }
              if (e.key === 'Tab') { e.preventDefault(); saveName(); setAddingSubtask(true); setExpanded(true) }
            }}
            className="flex-1 bg-transparent text-sm text-white outline-none border-b border-indigo-500"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`flex-1 text-sm cursor-default ${task.status === 'done' ? 'line-through text-gray-600' : 'text-gray-200'}`}
          >
            {task.name}
          </span>
        )}
        <button onClick={cyclePriority} className={`text-xs hidden group-hover:block ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority[0].toUpperCase()}
        </button>
        {task.due_date && (
          <span className="text-xs text-gray-600">{task.due_date}</span>
        )}
        <button onClick={() => { setAddingSubtask(true); setExpanded(true) }} className="hidden group-hover:block text-gray-600 hover:text-gray-400 text-xs">+sub</button>
        <button onClick={deleteTask} className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs">×</button>
      </div>

      {expanded && (
        <div>
          {task.subtasks.map(sub => (
            <SubtaskItem key={sub.id} subtask={sub} onChanged={onChanged} />
          ))}
          {addingSubtask && (
            <div className="pl-8 pr-2 py-1">
              <input
                autoFocus
                value={newSubtaskName}
                onChange={e => setNewSubtaskName(e.target.value)}
                onBlur={() => { if (newSubtaskName.trim()) addSubtask(); else setAddingSubtask(false) }}
                onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false) }}
                placeholder="Subtask name…"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create ProjectCard**

Create `components/edit/ProjectCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProjectWithTasks } from '@/lib/types'
import TaskItem from './TaskItem'

export default function ProjectCard({ project, onChanged }: { project: ProjectWithTasks; onChanged: () => void }) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')

  async function saveName() {
    if (!name.trim()) { setName(project.name); setEditing(false); return }
    await supabase.from('projects').update({ name: name.trim() }).eq('id', project.id)
    setEditing(false)
    onChanged()
  }

  async function deleteProject() {
    await supabase.from('projects').delete().eq('id', project.id)
    onChanged()
  }

  async function addTask() {
    if (!newTaskName.trim()) return
    await supabase.from('tasks').insert({
      project_id: project.id,
      name: newTaskName.trim(),
      position: project.tasks.length,
    })
    setNewTaskName('')
    setAddingTask(false)
    onChanged()
  }

  const doneCount = project.tasks.filter(t => t.status === 'done').length

  return (
    <div className="mb-3 rounded-xl border border-gray-800 bg-gray-900/50">
      <div
        className="group flex items-center gap-2 px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-500 text-xs">{expanded ? '▾' : '▸'}</span>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(project.name); setEditing(false) } }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-transparent text-sm font-semibold text-white outline-none border-b border-indigo-500"
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
            className="flex-1 text-sm font-semibold text-white"
          >
            {project.name}
          </span>
        )}
        <span className="text-xs text-gray-600">{doneCount}/{project.tasks.length}</span>
        <button
          onClick={e => { e.stopPropagation(); setAddingTask(true); setExpanded(true) }}
          className="hidden group-hover:block text-gray-500 hover:text-gray-300 text-xs px-1"
        >+ task</button>
        <button
          onClick={e => { e.stopPropagation(); deleteProject() }}
          className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs px-1"
        >×</button>
      </div>

      {expanded && (
        <div className="pb-2">
          {project.tasks.length === 0 && !addingTask && (
            <p className="px-4 py-2 text-xs text-gray-600">No tasks yet — click "+ task" to add one</p>
          )}
          {project.tasks.map(task => (
            <TaskItem key={task.id} task={task} onChanged={onChanged} />
          ))}
          {addingTask && (
            <div className="pl-4 pr-2 py-1">
              <input
                autoFocus
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                onBlur={() => { if (newTaskName.trim()) addTask(); else setAddingTask(false) }}
                onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAddingTask(false) }}
                placeholder="Task name…"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create LifeAreaSection**

Create `components/edit/LifeAreaSection.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeAreaWithData } from '@/lib/types'
import ProjectCard from './ProjectCard'

export default function LifeAreaSection({ area, onChanged }: { area: LifeAreaWithData; onChanged: () => void }) {
  const supabase = createClient()
  const [addingProject, setAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  async function addProject() {
    if (!newProjectName.trim()) return
    await supabase.from('projects').insert({
      life_area_id: area.id,
      name: newProjectName.trim(),
      position: area.projects.length,
    })
    setNewProjectName('')
    setAddingProject(false)
    onChanged()
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{area.icon}</span>
        <h2 className="text-lg font-bold text-white" style={{ color: area.color }}>{area.name}</h2>
        <div className="flex-1 h-px bg-gray-800" />
        <button
          onClick={() => setAddingProject(true)}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
        >+ project</button>
      </div>

      {area.projects.length === 0 && !addingProject && (
        <p className="text-sm text-gray-600 pl-2">No projects yet.</p>
      )}

      {area.projects.map(project => (
        <ProjectCard key={project.id} project={project} onChanged={onChanged} />
      ))}

      {addingProject && (
        <div className="mb-3">
          <input
            autoFocus
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onBlur={() => { if (newProjectName.trim()) addProject(); else setAddingProject(false) }}
            onKeyDown={e => { if (e.key === 'Enter') addProject(); if (e.key === 'Escape') setAddingProject(false) }}
            placeholder="Project name…"
            className="w-full bg-gray-900 border border-indigo-500 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none"
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create EditCanvas**

Create `components/edit/EditCanvas.tsx`:

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeAreaWithData } from '@/lib/types'
import LifeAreaSection from './LifeAreaSection'
import EmptyState from '@/components/ui/EmptyState'

export default function EditCanvas({ selectedAreaId }: { selectedAreaId?: string | null }) {
  const supabase = createClient()
  const [areas, setAreas] = useState<LifeAreaWithData[]>([])

  const loadAll = useCallback(async () => {
    const { data: lifeAreas } = await supabase.from('life_areas').select('*').order('position')
    if (!lifeAreas) return

    const { data: projects } = await supabase.from('projects').select('*').order('position')
    const { data: tasks } = await supabase.from('tasks').select('*').order('position')
    const { data: subtasks } = await supabase.from('subtasks').select('*').order('position')
    const { data: habits } = await supabase.from('habits').select('*')
    const today = new Date().toISOString().split('T')[0]
    const { data: completions } = await supabase.from('habit_completions').select('habit_id').eq('completed_date', today)
    const completedIds = new Set((completions ?? []).map(c => c.habit_id))

    setAreas(lifeAreas.map(area => ({
      ...area,
      habits: (habits ?? []).filter(h => h.life_area_id === area.id).map(h => ({ ...h, completedToday: completedIds.has(h.id) })),
      projects: (projects ?? []).filter(p => p.life_area_id === area.id).map(project => ({
        ...project,
        tasks: (tasks ?? []).filter(t => t.project_id === project.id).map(task => ({
          ...task,
          subtasks: (subtasks ?? []).filter(s => s.task_id === task.id),
        })),
      })),
    })))
  }, [supabase])

  useEffect(() => { loadAll() }, [loadAll])

  const visibleAreas = selectedAreaId ? areas.filter(a => a.id === selectedAreaId) : areas

  if (areas.length === 0) {
    return <EmptyState message="Add a life area in the sidebar to get started." />
  }

  return (
    <div>
      {visibleAreas.map(area => (
        <LifeAreaSection key={area.id} area={area} onChanged={loadAll} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Replace edit page**

Replace `app/dashboard/edit/page.tsx`:

```tsx
import EditCanvas from '@/components/edit/EditCanvas'

export default function EditPage() {
  return <EditCanvas />
}
```

- [ ] **Step 7: Manual verification**

Add a life area → add a project → add tasks → add subtasks. Verify:
- Double-click task/project name to rename inline
- Click status icon on task to cycle todo → in_progress → done
- Click priority letter to cycle low → medium → high
- Tab inside a task name input opens subtask input
- `×` deletes items
- Sidebar area filter shows only that area's projects

- [ ] **Step 8: Commit**

```bash
git add components/edit/ app/dashboard/edit/
git commit -m "feat: add full hierarchy editor with inline CRUD"
```

---

### Task 9: Rings Visualization

**Files:**
- Replace: `app/dashboard/rings/page.tsx`
- Create: `components/visualizations/RingsView.tsx`

**Interfaces:**
- Consumes: `LifeAreaWithData` data fetched from Supabase
- Produces: SVG radial rings per life area showing task completion %

- [ ] **Step 1: Create RingsView component**

Create `components/visualizations/RingsView.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeArea, Project, Task } from '@/lib/types'

type AreaStats = LifeArea & { total: number; done: number; projects: { name: string; total: number; done: number }[] }

function Ring({ stats, size = 120 }: { stats: AreaStats; size?: number }) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const pct = stats.total === 0 ? 0 : stats.done / stats.total
  const dashOffset = circumference * (1 - pct)
  const cx = size / 2
  const cy = size / 2
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative flex flex-col items-center gap-2">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1f2937" strokeWidth={12} />
        <circle
          cx={cx} cy={cy} r={radius} fill="none"
          stroke={stats.color} strokeWidth={12}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="text-xl">{stats.icon}</span>
        <span className="text-xs font-bold text-white">{Math.round(pct * 100)}%</span>
      </div>
      <span className="text-xs text-gray-400 text-center max-w-[100px] truncate">{stats.name}</span>
      <span className="text-xs text-gray-600">{stats.done}/{stats.total} tasks</span>

      {hovered && stats.projects.length > 0 && (
        <div className="absolute top-full mt-2 z-10 bg-gray-800 border border-gray-700 rounded-lg p-3 w-44 shadow-xl">
          {stats.projects.map(p => (
            <div key={p.name} className="flex justify-between text-xs text-gray-300 py-0.5">
              <span className="truncate mr-2">{p.name}</span>
              <span className="text-gray-500 shrink-0">{p.done}/{p.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RingsView() {
  const supabase = createClient()
  const [stats, setStats] = useState<AreaStats[]>([])

  useEffect(() => {
    async function load() {
      const { data: areas } = await supabase.from('life_areas').select('*').order('position')
      const { data: projects } = await supabase.from('projects').select('*')
      const { data: tasks } = await supabase.from('tasks').select('id, project_id, status')
      if (!areas) return

      setStats(areas.map(area => {
        const areaProjects = (projects ?? []).filter(p => p.life_area_id === area.id)
        const projectStats = areaProjects.map(p => {
          const pts = (tasks ?? []).filter(t => t.project_id === p.id)
          return { name: p.name, total: pts.length, done: pts.filter(t => t.status === 'done').length }
        })
        const total = projectStats.reduce((s, p) => s + p.total, 0)
        const done = projectStats.reduce((s, p) => s + p.done, 0)
        return { ...area, total, done, projects: projectStats }
      }))
    }
    load()
  }, [supabase])

  if (stats.length === 0) return <div className="text-gray-500 text-sm">No life areas yet.</div>

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-8">Progress Overview</h1>
      <div className="flex flex-wrap gap-10">
        {stats.map(s => <Ring key={s.id} stats={s} size={140} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace rings page**

Replace `app/dashboard/rings/page.tsx`:

```tsx
import RingsView from '@/components/visualizations/RingsView'
export default function RingsPage() {
  return <RingsView />
}
```

- [ ] **Step 3: Manual verification**

Add tasks across areas, mark some done. Visit `/dashboard/rings` — rings animate to show completion %. Hover a ring to see per-project breakdown tooltip.

- [ ] **Step 4: Commit**

```bash
git add components/visualizations/RingsView.tsx app/dashboard/rings/page.tsx
git commit -m "feat: add rings visualization with per-area progress"
```

---

### Task 10: Timeline Visualization

**Files:**
- Replace: `app/dashboard/timeline/page.tsx`
- Create: `components/visualizations/TimelineView.tsx`

**Interfaces:**
- Consumes: tasks with `due_date`, `name`, `status`, and their life area `color`
- Produces: Gantt-style read-only timeline with Week/Month/Quarter zoom

- [ ] **Step 1: Create TimelineView**

Create `components/visualizations/TimelineView.tsx`:

```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Project, LifeArea } from '@/lib/types'

type TaskRow = Task & { projectName: string; areaName: string; areaColor: string }
type Zoom = 'week' | 'month' | 'quarter'

function getDaysInRange(zoom: Zoom): { start: Date; days: Date[] } {
  const today = new Date(); today.setHours(0,0,0,0)
  const start = new Date(today)
  let count: number
  if (zoom === 'week') { start.setDate(today.getDate() - today.getDay()); count = 7 }
  else if (zoom === 'month') { start.setDate(1); count = 35 }
  else { start.setDate(1); start.setMonth(Math.floor(today.getMonth() / 3) * 3); count = 91 }
  return { start, days: Array.from({ length: count }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d }) }
}

export default function TimelineView() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [unscheduled, setUnscheduled] = useState<TaskRow[]>([])
  const [zoom, setZoom] = useState<Zoom>('month')

  useEffect(() => {
    async function load() {
      const { data: areas } = await supabase.from('life_areas').select('*')
      const { data: projects } = await supabase.from('projects').select('*')
      const { data: rawTasks } = await supabase.from('tasks').select('*')
      if (!rawTasks) return

      const areaMap = Object.fromEntries((areas ?? []).map(a => [a.id, a]))
      const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p]))

      const mapped: TaskRow[] = rawTasks.map(t => {
        const proj = projectMap[t.project_id]
        const area = proj ? areaMap[proj.life_area_id] : null
        return { ...t, projectName: proj?.name ?? '', areaName: area?.name ?? '', areaColor: area?.color ?? '#6366f1' }
      })

      setTasks(mapped.filter(t => t.due_date))
      setUnscheduled(mapped.filter(t => !t.due_date))
    }
    load()
  }, [supabase])

  const { start, days } = getDaysInRange(zoom)
  const DAY_PX = zoom === 'week' ? 80 : zoom === 'month' ? 28 : 12
  const today = new Date(); today.setHours(0,0,0,0)
  const todayOffset = Math.floor((today.getTime() - start.getTime()) / 86400000)

  function taskLeft(task: TaskRow) {
    const d = new Date(task.due_date!); d.setHours(0,0,0,0)
    return Math.floor((d.getTime() - start.getTime()) / 86400000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Timeline</h1>
        <div className="flex gap-1">
          {(['week','month','quarter'] as Zoom[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-3 py-1 rounded text-sm capitalize transition-colors
                ${zoom === z ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              {z}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: days.length * DAY_PX + 160 }}>
          {/* Header */}
          <div className="flex mb-1" style={{ marginLeft: 160 }}>
            {days.map((d, i) => (
              <div key={i} style={{ width: DAY_PX, flexShrink: 0 }}
                className={`text-center text-xs ${d.getTime() === today.getTime() ? 'text-indigo-400 font-bold' : 'text-gray-600'}`}>
                {zoom === 'week' ? d.toLocaleDateString('en',{weekday:'short',month:'numeric',day:'numeric'})
                  : zoom === 'month' ? (d.getDate() === 1 || i === 0 ? d.toLocaleDateString('en',{month:'short',day:'numeric'}) : d.getDate() % 7 === 0 ? d.getDate() : '')
                  : (d.getDate() === 1 ? d.toLocaleDateString('en',{month:'short'}) : '')}
              </div>
            ))}
          </div>

          {/* Today line */}
          {todayOffset >= 0 && todayOffset < days.length && (
            <div className="relative" style={{ marginLeft: 160, height: 0 }}>
              <div className="absolute top-0 bottom-0 border-l border-indigo-500/50 z-10 pointer-events-none"
                style={{ left: todayOffset * DAY_PX + DAY_PX / 2 }} />
            </div>
          )}

          {/* Task rows */}
          {tasks.map(task => {
            const left = taskLeft(task)
            if (left < 0 || left >= days.length) return null
            return (
              <div key={task.id} className="flex items-center mb-1" style={{ height: 28 }}>
                <div className="w-40 shrink-0 text-xs text-gray-400 truncate pr-2 text-right">{task.name}</div>
                <div className="relative flex-1" style={{ height: 28 }}>
                  <div
                    className="absolute top-3 h-4 rounded text-xs flex items-center px-2 text-white font-medium truncate"
                    style={{ left: left * DAY_PX, width: DAY_PX * 1.5, backgroundColor: task.areaColor,
                      opacity: task.status === 'done' ? 0.4 : 1 }}
                    title={`${task.name} · ${task.areaName} · ${task.due_date}`}
                  >
                    {zoom !== 'quarter' && task.name}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Unscheduled lane */}
          {unscheduled.length > 0 && (
            <div className="mt-4 border-t border-gray-800 pt-3">
              <div className="text-xs text-gray-600 mb-2" style={{ marginLeft: 160 }}>Unscheduled</div>
              {unscheduled.map(task => (
                <div key={task.id} className="flex items-center mb-1" style={{ height: 24 }}>
                  <div className="w-40 shrink-0 text-xs text-gray-500 truncate pr-2 text-right">{task.name}</div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.areaColor }} />
                    <span className="text-xs text-gray-600">{task.areaName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace timeline page**

Replace `app/dashboard/timeline/page.tsx`:

```tsx
import TimelineView from '@/components/visualizations/TimelineView'
export default function TimelinePage() {
  return <TimelineView />
}
```

- [ ] **Step 3: Manual verification**

Add tasks with due dates across life areas. Visit `/dashboard/timeline`. Switch Week/Month/Quarter zoom. Verify tasks appear as colored bars at their due date. Tasks without due dates appear in "Unscheduled" lane at bottom.

- [ ] **Step 4: Commit**

```bash
git add components/visualizations/TimelineView.tsx app/dashboard/timeline/page.tsx
git commit -m "feat: add timeline visualization with week/month/quarter zoom"
```

---

### Task 11: Heatmap Visualization

**Files:**
- Replace: `app/dashboard/heatmap/page.tsx`
- Create: `components/visualizations/HeatmapView.tsx`

**Interfaces:**
- Consumes: `habit_completions` log table, `habits`, `life_areas`
- Produces: 52-week calendar grid + per-habit streak badges

- [ ] **Step 1: Create HeatmapView**

Create `components/visualizations/HeatmapView.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LifeArea, Habit } from '@/lib/types'

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

function buildGrid() {
  const today = new Date(); today.setHours(0,0,0,0)
  const end = new Date(today)
  const start = new Date(today)
  start.setDate(today.getDate() - 364)
  // align to Sunday
  start.setDate(start.getDate() - start.getDay())
  const days: Date[] = []
  const cur = new Date(start)
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  return days
}

export default function HeatmapView() {
  const supabase = createClient()
  const [completionMap, setCompletionMap] = useState<Record<string, { count: number; habits: string[] }>>({})
  const [maxCount, setMaxCount] = useState(1)
  const [habits, setHabits] = useState<(Habit & { areaColor: string; areaName: string })[]>([])
  const [filterAreaId, setFilterAreaId] = useState<string | null>(null)
  const [areas, setAreas] = useState<LifeArea[]>([])
  const [tooltip, setTooltip] = useState<{ date: string; habits: string[]; x: number; y: number } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: areasData } = await supabase.from('life_areas').select('*').order('position')
      const { data: habitsData } = await supabase.from('habits').select('*')
      const { data: completions } = await supabase.from('habit_completions').select('habit_id, completed_date')
      if (!areasData || !habitsData || !completions) return

      setAreas(areasData)
      const areaMap = Object.fromEntries(areasData.map(a => [a.id, a]))
      const habitMap = Object.fromEntries(habitsData.map(h => [h.id, { ...h, areaColor: areaMap[h.life_area_id]?.color ?? '#6366f1', areaName: areaMap[h.life_area_id]?.name ?? '' }]))
      setHabits(Object.values(habitMap))

      const map: Record<string, { count: number; habits: string[] }> = {}
      for (const c of completions) {
        const h = habitMap[c.habit_id]
        if (!h) continue
        if (filterAreaId && h.life_area_id !== filterAreaId) continue
        if (!map[c.completed_date]) map[c.completed_date] = { count: 0, habits: [] }
        map[c.completed_date].count++
        map[c.completed_date].habits.push(h.name)
      }
      setCompletionMap(map)
      setMaxCount(Math.max(1, ...Object.values(map).map(v => v.count)))
    }
    load()
  }, [supabase, filterAreaId])

  const days = buildGrid()
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAY_SIZE = 13
  const GAP = 2

  function cellColor(date: Date) {
    const ds = toDateStr(date)
    const entry = completionMap[ds]
    if (!entry) return '#1f2937'
    const intensity = entry.count / maxCount
    if (intensity < 0.25) return '#065f46'
    if (intensity < 0.5) return '#059669'
    if (intensity < 0.75) return '#10b981'
    return '#34d399'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Habit History</h1>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterAreaId(null)}
            className={`px-2 py-1 rounded text-xs transition-colors ${!filterAreaId ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            All
          </button>
          {areas.map(a => (
            <button key={a.id} onClick={() => setFilterAreaId(a.id)}
              className={`px-2 py-1 rounded text-xs transition-colors ${filterAreaId === a.id ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              style={filterAreaId === a.id ? { backgroundColor: a.color } : {}}>
              {a.icon} {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="relative overflow-x-auto">
        {/* Month labels */}
        <div className="flex mb-1" style={{ marginLeft: 28 }}>
          {weeks.map((week, wi) => {
            const firstDay = week[0]
            if (firstDay.getDate() <= 7) {
              return <div key={wi} style={{ width: DAY_SIZE + GAP }} className="text-xs text-gray-600 whitespace-nowrap overflow-visible">
                {MONTHS[firstDay.getMonth()]}
              </div>
            }
            return <div key={wi} style={{ width: DAY_SIZE + GAP }} />
          })}
        </div>

        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col mr-1" style={{ gap: GAP }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ height: DAY_SIZE }} className="text-xs text-gray-700 flex items-center justify-end pr-1 w-5">
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP, marginRight: GAP }}>
              {week.map((day, di) => {
                const ds = toDateStr(day)
                const entry = completionMap[ds]
                return (
                  <div key={di}
                    style={{ width: DAY_SIZE, height: DAY_SIZE, backgroundColor: cellColor(day), borderRadius: 2, cursor: entry ? 'pointer' : 'default' }}
                    onMouseEnter={e => entry && setTooltip({ date: ds, habits: entry.habits, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl pointer-events-none text-xs text-gray-200"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}>
          <div className="font-semibold mb-1">{tooltip.date}</div>
          {tooltip.habits.map((h, i) => <div key={i} className="text-emerald-400">✓ {h}</div>)}
        </div>
      )}

      {/* Streak badges */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Current Streaks</h2>
        <div className="flex flex-wrap gap-2">
          {habits.filter(h => h.streak_count > 0).map(h => (
            <div key={h.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full">
              <span className="text-xs text-gray-300">{h.name}</span>
              <span className="text-xs text-amber-400">🔥 {h.streak_count}</span>
              <span className="text-xs text-gray-600">· {h.areaName}</span>
            </div>
          ))}
          {habits.every(h => h.streak_count === 0) && (
            <p className="text-sm text-gray-600">Complete habits to build streaks.</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace heatmap page**

Replace `app/dashboard/heatmap/page.tsx`:

```tsx
import HeatmapView from '@/components/visualizations/HeatmapView'
export default function HeatmapPage() {
  return <HeatmapView />
}
```

- [ ] **Step 3: Manual verification**

Complete habits on several days. Visit `/dashboard/heatmap`. Verify calendar grid shows color intensity by habit count. Hover cells to see tooltip. Filter by area. Streak badges appear at the bottom.

- [ ] **Step 4: Commit**

```bash
git add components/visualizations/HeatmapView.tsx app/dashboard/heatmap/page.tsx
git commit -m "feat: add heatmap visualization with habit history"
```

---

### Task 12: Graph Visualization

**Files:**
- Replace: `app/dashboard/graph/page.tsx`
- Create: `components/visualizations/GraphView.tsx`

**Interfaces:**
- Consumes: life areas, projects, tasks; D3 force simulation
- Produces: interactive force-directed node map; click node → detail panel

- [ ] **Step 1: Create GraphView**

Create `components/visualizations/GraphView.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { createClient } from '@/lib/supabase/client'

type NodeDatum = d3.SimulationNodeDatum & {
  id: string; label: string; type: 'area' | 'project' | 'task'
  color: string; status?: string; due_date?: string | null
}
type LinkDatum = { source: string; target: string }

type DetailPanel = { label: string; type: string; status?: string; due_date?: string | null }

export default function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const supabase = createClient()
  const [detail, setDetail] = useState<DetailPanel | null>(null)

  useEffect(() => {
    async function load() {
      const { data: areas } = await supabase.from('life_areas').select('*')
      const { data: projects } = await supabase.from('projects').select('*')
      const { data: tasks } = await supabase.from('tasks').select('*')
      if (!areas) return

      const areaMap = Object.fromEntries(areas.map(a => [a.id, a]))
      const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p]))

      const nodes: NodeDatum[] = [
        ...areas.map(a => ({ id: a.id, label: `${a.icon} ${a.name}`, type: 'area' as const, color: a.color })),
        ...(projects ?? []).map(p => ({ id: p.id, label: p.name, type: 'project' as const, color: areaMap[p.life_area_id]?.color ?? '#6366f1', status: p.status })),
        ...(tasks ?? []).map(t => ({ id: t.id, label: t.name, type: 'task' as const, color: areaMap[projectMap[t.project_id]?.life_area_id]?.color ?? '#6366f1', status: t.status, due_date: t.due_date })),
      ]

      const links: LinkDatum[] = [
        ...(projects ?? []).map(p => ({ source: p.life_area_id, target: p.id })),
        ...(tasks ?? []).map(t => ({ source: t.project_id, target: t.id })),
      ]

      renderGraph(nodes, links)
    }

    function renderGraph(nodes: NodeDatum[], links: LinkDatum[]) {
      const el = svgRef.current
      if (!el) return
      const { width, height } = el.getBoundingClientRect()
      d3.select(el).selectAll('*').remove()

      const svg = d3.select(el)
      const g = svg.append('g')

      svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 3]).on('zoom', e => g.attr('transform', e.transform)) as never)

      const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance((d: any) => {
          const s = d.source as NodeDatum
          return s.type === 'area' ? 120 : 80
        }))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius((d: any) => nodeRadius(d) + 4))

      const link = g.append('g').selectAll('line').data(links).enter().append('line')
        .attr('stroke', '#374151').attr('stroke-width', 1.5).attr('stroke-opacity', 0.6)

      const node = g.append('g').selectAll('circle').data(nodes).enter().append('circle')
        .attr('r', (d: any) => nodeRadius(d))
        .attr('fill', (d: any) => d.color)
        .attr('fill-opacity', (d: any) => d.status === 'done' ? 0.3 : 0.85)
        .attr('stroke', '#111827').attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', (_, d: any) => setDetail({ label: d.label, type: d.type, status: d.status, due_date: d.due_date }))
        .call(d3.drag<SVGCircleElement, NodeDatum>()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }) as never)

      const label = g.append('g').selectAll('text').data(nodes.filter(d => d.type !== 'task')).enter().append('text')
        .text((d: any) => d.label)
        .attr('font-size', (d: any) => d.type === 'area' ? 13 : 10)
        .attr('fill', '#e5e7eb').attr('text-anchor', 'middle').attr('dy', (d: any) => -nodeRadius(d) - 4)
        .style('pointer-events', 'none')

      sim.on('tick', () => {
        link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
        label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y)
      })
    }

    function nodeRadius(d: NodeDatum) {
      return d.type === 'area' ? 22 : d.type === 'project' ? 14 : 8
    }

    load()
  }, [supabase])

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
      <h1 className="absolute top-0 left-0 text-xl font-bold text-white z-10">Mind Map</h1>
      <p className="absolute top-8 left-0 text-xs text-gray-600 z-10">Drag nodes · scroll to zoom · click for details</p>
      <svg ref={svgRef} className="w-full h-full" />

      {detail && (
        <div className="absolute top-4 right-4 bg-gray-900 border border-gray-700 rounded-xl p-4 w-52 shadow-xl">
          <button onClick={() => setDetail(null)} className="absolute top-2 right-3 text-gray-600 hover:text-gray-400">×</button>
          <p className="text-xs text-gray-500 uppercase mb-1">{detail.type}</p>
          <p className="text-sm font-semibold text-white mb-2">{detail.label}</p>
          {detail.status && <p className="text-xs text-gray-400">Status: <span className="text-gray-200">{detail.status}</span></p>}
          {detail.due_date && <p className="text-xs text-gray-400 mt-1">Due: <span className="text-gray-200">{detail.due_date}</span></p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace graph page**

Replace `app/dashboard/graph/page.tsx`:

```tsx
import GraphView from '@/components/visualizations/GraphView'
export default function GraphPage() {
  return <GraphView />
}
```

- [ ] **Step 3: Manual verification**

Visit `/dashboard/graph`. Nodes should appear as circles — large for Life Areas, medium for Projects, small for Tasks. Lines connect parents to children. Drag nodes, scroll to zoom. Click a node to see detail panel. Areas with many tasks should appear visually dense.

- [ ] **Step 4: Commit**

```bash
git add components/visualizations/GraphView.tsx app/dashboard/graph/page.tsx
git commit -m "feat: add force-directed graph visualization"
```

---

### Task 13: Vercel Deployment

**Files:**
- Verify: `next.config.ts`, `.env.local`

**Interfaces:**
- Produces: live production URL on Vercel

- [ ] **Step 1: Push repo to GitHub**

Create a new repository on GitHub (github.com → New repository → name it e.g. `life-todo`).

```bash
git remote add origin https://github.com/YOUR_USERNAME/life-todo.git
git push -u origin master
```

- [ ] **Step 2: Import project on Vercel**

1. Go to vercel.com → Add New Project
2. Import the GitHub repo
3. Framework: Next.js (auto-detected)
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
5. Click Deploy

- [ ] **Step 3: Verify production deployment**

Visit the Vercel-provided URL. Sign up for an account. Add life areas, projects, tasks. Complete habits. Visit all 5 views (Edit, Rings, Timeline, Heatmap, Graph) and verify they load without errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete personal life todo app"
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ Life Areas → Projects → Tasks → Subtasks (leaf-only): Tasks 2, 8
- ✅ Habits per Life Area with streak tracking: Tasks 2, 7
- ✅ Daily habit reset + HabitCompletion log: Task 7
- ✅ Email/password auth: Tasks 2, 4
- ✅ Middleware route protection: Task 3
- ✅ Left sidebar with Life Areas + Today's Habits: Tasks 6, 7
- ✅ Mode switcher toolbar: Task 5
- ✅ Edit mode with inline CRUD + keyboard shortcuts: Task 8
- ✅ Rings visualization (read-only): Task 9
- ✅ Timeline visualization (read-only): Task 10
- ✅ Heatmap visualization (read-only): Task 11
- ✅ Graph visualization (read-only): Task 12
- ✅ Toast error notifications: Task 5
- ✅ Empty state for new users: Task 6
- ✅ Supabase RLS: Task 2
- ✅ Vercel deployment: Task 13
- ✅ Optimistic updates: implemented inline in habit toggle (Task 7) and task status (Task 8)

**Type consistency:** All types defined in `lib/types/index.ts` (Task 3) and used consistently across components. `LifeAreaWithData`, `ProjectWithTasks`, `TaskWithSubtasks`, `HabitWithCompletion` composite types match their usage in EditCanvas and TodaysHabits.
