// Auth
export interface User {
  id: number
  username: string
  email: string
  full_name: string
  role_id: number
  role_name?: string
  branch_id?: number
  branch_name?: string
  department_id?: number
  department_name?: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface AuthUser {
  id: number
  username: string
  full_name: string
  email: string
  role_id: number
  role_name: string
  branch_id?: number
  branch_name?: string
  department_id?: number
  department_name?: string
  permissions: string[]
}

export interface LoginCredentials {
  username: string
  password: string
}

// Branch
export interface Branch {
  id: number
  name: string
  location: string
  manager_id?: number
  manager_name?: string
  staff_count?: number
  status: 'active' | 'inactive'
  created_at: string
}

export interface BranchForm {
  name: string
  location: string
  manager_id?: number
  status: 'active' | 'inactive'
}

// Department
export interface Department {
  id: number
  name: string
  description?: string
  branch_id?: number
  branch_name?: string
  head_id?: number
  head_name?: string
  staff_count?: number
  status: 'active' | 'inactive'
  created_at: string
}

export interface DepartmentForm {
  name: string
  description?: string
  branch_id?: number
  head_id?: number
  status: 'active' | 'inactive'
}

// Role
export interface Role {
  id: number
  name: string
  description?: string
  permissions: string[]
  user_count?: number
  created_at: string
}

export interface RoleForm {
  name: string
  description?: string
  permissions: string[]
}

// User form
export interface UserForm {
  username: string
  email: string
  full_name: string
  password?: string
  role_id: number
  branch_id?: number
  department_id?: number
  status: 'active' | 'inactive'
}

// Report Template
export interface ReportField {
  id: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'file' | 'rating' | 'section_header' | 'instructions'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  width: 'full' | 'half' | 'third'
  order: number
}

export interface Report {
  id: number
  title: string
  description?: string
  category?: string
  priority: 'low' | 'medium' | 'high'
  fields: ReportField[]
  target_roles: number[]
  target_branches: number[]
  status: 'draft' | 'published'
  created_by: number
  creator_name?: string
  created_at: string
  updated_at: string
}

export interface ReportForm {
  title: string
  description?: string
  category?: string
  priority: 'low' | 'medium' | 'high'
  fields: ReportField[]
  target_roles: number[]
  target_branches: number[]
  status: 'draft' | 'published'
}

// Report Entry (Submission)
export interface ReportEntry {
  id: number
  report_id: number
  report_title?: string
  submitted_by: number
  submitter_name?: string
  submitter_role?: string
  manager_name?: string
  branch_id: number
  branch_name?: string
  department_name?: string
  week_label?: string        // e.g. "Week of Mar 24 – Mar 30"
  week_start?: string        // ISO date string
  data: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  rejection_comment?: string
  created_at: string
  updated_at: string
}

export interface ReportEntryForm {
  report_id: number
  data: Record<string, unknown>
}

// Submission Review
export interface SubmissionReviewAction {
  status: 'approved' | 'rejected'
  rejection_comment?: string
}

export interface SubmissionFilter {
  branch_id?: number
  staff_id?: number
  manager_name?: string
  week_start?: string
  status?: string
  search?: string
}

// Dashboard stats
export interface DashboardStats {
  total_branches: number
  total_employees: number
  present_today: number
  monthly_report_rate: number
}

export interface BranchReport {
  branch: string
  manager: string
  total_staff: number
  present: number
  absent: number
  date: string
  status: 'complete' | 'incomplete' | 'pending'
}

// API Response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string>
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  per_page: number
}

// Permission helper
export type Permission =
  | 'manage_users'
  | 'manage_branches'
  | 'manage_departments'
  | 'manage_roles'
  | 'manage_reports'
  | 'view_reports'
  | 'submit_reports'
  | 'approve_reports'
  | 'export_data'

// ─── Task Manager ────────────────────────────────────────────────────────────

export type TaskType = 'general' | 'compliance' | 'operations' | 'hr' | 'finance' | 'it' | 'sales'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'needs_revision' | 'done' | 'cancelled'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskScope = 'individual' | 'branch'

export interface SubTask {
  id: string
  title: string
  completed: boolean
  assigned_to?: number
  assigned_name?: string
}

export interface TaskComment {
  id: number
  task_id: number
  author_id: number
  author_name: string
  author_role: string
  body: string
  created_at: string
}

export interface TaskActivity {
  id: number
  task_id: number
  actor_id: number
  actor_name: string
  action: 'created' | 'status_changed' | 'assigned' | 'commented' | 'priority_changed' | 'due_date_changed' | 'subtask_completed' | 'edited'
  from_value?: string
  to_value?: string
  created_at: string
}

export interface Task {
  id: number
  title: string
  description?: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  scope: TaskScope

  assigned_to: number[]
  assignee_names?: string[]
  assigned_branch_id?: number
  assigned_branch_name?: string

  due_date?: string
  start_date?: string
  labels: string[]

  subtasks: SubTask[]
  comments: TaskComment[]
  activity: TaskActivity[]

  // Delegation — manager can delegate a task assigned to them down to branch staff
  delegated_to?: number[]         // user IDs the manager delegated this task to
  delegated_names?: string[]      // display names of delegatees
  delegate_note?: string          // instruction from manager to delegatees
  delegated_at?: string

  // Progress — manager logs updates while task is in_progress
  progress_note?: string
  progress_note_at?: string
  progress_note_author?: string

  // Workflow fields
  submission_note?: string        // kept for backward compat (legacy)
  revision_reason?: string        // reason written by reviewer when rejecting
  tagged_reviewers?: number[]
  tagged_reviewer_names?: string[]

  // Structured achievement report (filled on submit/resubmit)
  achievement_summary?: string    // required: overall what was accomplished
  key_outcomes?: string[]         // required: at least 1 bullet outcome
  challenges_faced?: string       // optional: blockers / issues
  revision_response?: string      // only on resubmit: how feedback was addressed

  created_by: number
  creator_name?: string
  created_at: string
  updated_at: string
}

export interface TaskForm {
  title: string
  description?: string
  type: TaskType
  priority: TaskPriority
  scope: TaskScope
  assigned_to: number[]
  assigned_branch_id?: number
  due_date?: string
  start_date?: string
  labels: string[]
  subtasks: { title: string; completed: boolean }[]
}

export interface TaskFilter {
  status?: TaskStatus | ''
  priority?: TaskPriority | ''
  type?: TaskType | ''
  scope?: TaskScope | ''
  assigned_to?: number
  assigned_branch_id?: number
  search?: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_comment'
  | 'task_overdue'
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected'

export interface Notification {
  id: number
  user_id: number
  title: string
  body: string
  type: NotificationType
  reference_id?: number
  reference_type?: 'task' | 'submission'
  read: boolean
  created_at: string
}
