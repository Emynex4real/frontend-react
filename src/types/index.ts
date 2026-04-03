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
