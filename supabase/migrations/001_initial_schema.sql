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
