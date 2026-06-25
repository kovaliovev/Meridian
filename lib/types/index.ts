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
