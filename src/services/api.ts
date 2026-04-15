import axios from 'axios'
import type {
  ApiResponse,
  Branch, BranchForm,
  Department, DepartmentForm,
  User, UserForm,
  Role, RoleForm,
  Report, ReportForm,
  ReportEntry, ReportEntryForm,
  AuthUser, LoginCredentials,
  DashboardStats, SubmissionReviewAction,
  Task, TaskForm, TaskComment, SubTask,
  Notification,
} from '../types'

const BASE_URL = '/api'

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Inject CSRF token if available
client.interceptors.request.use((config) => {
  const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content
  if (token) config.headers['X-CSRF-Token'] = token
  return config
})

// ── Mock mode ─────────────────────────────────────────
const MOCK = import.meta.env.VITE_MOCK === 'true'

const ok = <T>(data: T): ApiResponse<T> => ({ success: true, data })
const delay = <T>(data: T, ms = 300) => new Promise<ApiResponse<T>>(r => setTimeout(() => r(ok(data)), ms))

const mockUser: AuthUser = {
  id: 1,
  username: 'admin',
  full_name: 'Admin User',
  email: 'admin@digitalworld.com',
  role_id: 1,
  role_name: 'Super Admin',
  branch_id: 1,
  branch_name: 'Head Office',
  permissions: [
    'manage_users', 'manage_branches', 'manage_departments',
    'manage_roles', 'manage_reports', 'view_reports',
    'submit_reports', 'approve_reports', 'export_data',
  ],
}

const mockManagerUser: AuthUser = {
  id: 2,
  username: 'manager',
  full_name: 'John Doe',
  email: 'jdoe@digitalworld.com',
  role_id: 2,
  role_name: 'Branch Manager',
  branch_id: 2,
  branch_name: 'Cebu Branch',
  permissions: ['view_reports', 'approve_reports', 'submit_reports'],
}

const mockStaffUser: AuthUser = {
  id: 3,
  username: 'staff',
  full_name: 'Mary Smith',
  email: 'msmith@digitalworld.com',
  role_id: 3,
  role_name: 'Staff',
  branch_id: 2,
  branch_name: 'Cebu Branch',
  permissions: ['submit_reports', 'view_reports'],
}

const mockAsstManagerUser: AuthUser = {
  id: 4,
  username: 'asst_manager',
  full_name: 'Ana Cruz',
  email: 'acruz@digitalworld.com',
  role_id: 4,
  role_name: 'Assistant Manager',
  branch_id: 2,
  branch_name: 'Cebu Branch',
  permissions: ['submit_reports', 'view_reports'],
}

const mockBranchAdminUser: AuthUser = {
  id: 5,
  username: 'branch_admin',
  full_name: 'Ben Santos',
  email: 'bsantos@digitalworld.com',
  role_id: 5,
  role_name: 'Branch Administrator',
  branch_id: 2,
  branch_name: 'Cebu Branch',
  permissions: ['submit_reports', 'view_reports'],
}

// Tracks who is currently "logged in" in mock mode
let _mockSession: AuthUser = mockUser

const mockBranches: Branch[] = [
  { id: 1, name: 'Head Office', location: 'Manila', manager_id: 1, manager_name: 'Admin User', staff_count: 12, status: 'active', created_at: '2024-01-01' },
  { id: 2, name: 'Cebu Branch', location: 'Cebu City', staff_count: 8, status: 'active', created_at: '2024-02-15' },
  { id: 3, name: 'Davao Branch', location: 'Davao City', staff_count: 5, status: 'inactive', created_at: '2024-03-10' },
]

const mockDepartments: Department[] = [
  { id: 1, name: 'IT Department', description: 'Handles all tech operations', branch_id: 1, branch_name: 'Head Office', staff_count: 4, status: 'active', created_at: '2024-01-05' },
  { id: 2, name: 'HR Department', description: 'Human resources', branch_id: 1, branch_name: 'Head Office', staff_count: 3, status: 'active', created_at: '2024-01-05' },
  { id: 3, name: 'Sales', description: 'Sales and marketing', branch_id: 2, branch_name: 'Cebu Branch', staff_count: 5, status: 'active', created_at: '2024-02-15' },
]

const mockRoles: Role[] = [
  { id: 1, name: 'Super Admin', description: 'Full access', permissions: ['manage_users','manage_branches','manage_departments','manage_roles','manage_reports','view_reports','submit_reports','approve_reports','export_data'], user_count: 1, created_at: '2024-01-01' },
  { id: 2, name: 'Branch Manager', description: 'Manages a branch and creates reports for branch members', permissions: ['view_reports','approve_reports','submit_reports','manage_branch_reports'], user_count: 2, created_at: '2024-01-01' },
  { id: 3, name: 'Staff', description: 'Regular staff member', permissions: ['submit_reports','view_reports'], user_count: 8, created_at: '2024-01-01' },
  { id: 4, name: 'Assistant Manager', description: 'Assists the branch manager, handles team coordination', permissions: ['submit_reports','view_reports'], user_count: 3, created_at: '2024-01-01' },
  { id: 5, name: 'Branch Administrator', description: 'Handles branch admin, compliance and resource tracking', permissions: ['submit_reports','view_reports'], user_count: 2, created_at: '2024-01-01' },
]

const mockUsers: User[] = [
  { id: 1, username: 'admin',    email: 'admin@digitalworld.com',    full_name: 'Admin User',      role_id: 1, role_name: 'Super Admin',        branch_id: 1, branch_name: 'Head Office',  status: 'active', created_at: '2024-01-01' },
  { id: 2, username: 'jdoe',     email: 'jdoe@digitalworld.com',     full_name: 'John Doe',        role_id: 2, role_name: 'Branch Manager',     branch_id: 2, branch_name: 'Cebu Branch',  status: 'active', created_at: '2024-02-15' },
  { id: 3, username: 'msmith',   email: 'msmith@digitalworld.com',   full_name: 'Mary Smith',      role_id: 3, role_name: 'Staff',             branch_id: 2, branch_name: 'Cebu Branch',  department_id: 1, department_name: 'IT Department', status: 'active', created_at: '2024-03-01' },
  { id: 4, username: 'acruz',    email: 'acruz@digitalworld.com',    full_name: 'Ana Cruz',        role_id: 4, role_name: 'Assistant Manager', branch_id: 2, branch_name: 'Cebu Branch',  status: 'active', created_at: '2024-03-01' },
  { id: 5, username: 'bsantos',  email: 'bsantos@digitalworld.com',  full_name: 'Ben Santos',      role_id: 5, role_name: 'Branch Administrator', branch_id: 2, branch_name: 'Cebu Branch', status: 'active', created_at: '2024-03-01' },
  { id: 6, username: 'grace',    email: 'geze@digitalworld.com',     full_name: 'Grace Eze',       role_id: 3, role_name: 'Staff',             branch_id: 2, branch_name: 'Cebu Branch',  status: 'active', created_at: '2024-03-10' },
]

const mockReports: Report[] = [
  {
    id: 1, title: 'Weekly Activity Report', description: 'Submit your weekly work summary, key achievements, challenges and plans for next week.', category: 'Activity',
    priority: 'high', status: 'published', created_by: 1, creator_name: 'Admin User',
    target_roles: [1, 2, 3], target_branches: [1, 2, 3],
    fields: [
      { id: 'date', type: 'date', label: 'Report Date', required: true, width: 'half', order: 1 },
      { id: 'activities', type: 'textarea', label: 'Activities This Week', required: true, width: 'full', order: 2, placeholder: 'Describe your key activities and achievements this week...' },
      { id: 'challenges', type: 'textarea', label: 'Challenges Faced', required: false, width: 'full', order: 3, placeholder: 'Any obstacles or blockers you encountered...' },
      { id: 'next_week_plan', type: 'textarea', label: 'Plan for Next Week', required: true, width: 'full', order: 4, placeholder: 'What do you plan to accomplish next week...' },
    ],
    created_at: '2024-01-10', updated_at: '2024-01-10',
  },
  {
    id: 2, title: 'Monthly Sales Summary', description: 'Monthly branch sales performance data, targets and achievements.', category: 'Sales',
    priority: 'medium', status: 'published', created_by: 1, creator_name: 'Admin User',
    target_roles: [1, 2], target_branches: [1, 2],
    fields: [
      { id: 'total_sales', type: 'number', label: 'Total Sales (₦)', required: true, width: 'half', order: 1 },
      { id: 'top_product', type: 'text', label: 'Top Product', required: false, width: 'half', order: 2 },
      { id: 'target_met', type: 'select', label: 'Target Met?', required: true, width: 'half', order: 3, options: ['Yes', 'No', 'Partially'] },
      { id: 'comments', type: 'textarea', label: 'Additional Notes', required: false, width: 'full', order: 4 },
    ],
    created_at: '2024-02-01', updated_at: '2024-02-01',
  },
  {
    id: 3, title: 'IT Incident Report', description: 'Log any system incidents, downtime or technical issues encountered during the week.', category: 'IT',
    priority: 'low', status: 'published', created_by: 1, creator_name: 'Admin User',
    target_roles: [1, 3], target_branches: [1],
    fields: [
      { id: 'incident_date', type: 'date', label: 'Incident Date', required: true, width: 'half', order: 1 },
      { id: 'incident_type', type: 'select', label: 'Incident Type', required: true, width: 'half', order: 2, options: ['System Downtime', 'Network Issue', 'Hardware Failure', 'Security Breach', 'Other'] },
      { id: 'description', type: 'textarea', label: 'Incident Description', required: true, width: 'full', order: 3 },
      { id: 'resolution', type: 'textarea', label: 'Resolution / Action Taken', required: true, width: 'full', order: 4 },
      { id: 'resolved', type: 'select', label: 'Resolved?', required: true, width: 'half', order: 5, options: ['Yes', 'No', 'In Progress'] },
    ],
    created_at: '2024-03-01', updated_at: '2024-03-01',
  },
]

// Helper: compute ISO week start (Monday)
function weekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().split('T')[0]
}
function weekLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(new Date(dateStr).setDate(diff))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Week of ${fmt(mon)} – ${fmt(sun)}, ${sun.getFullYear()}`
}

const mockEntries: ReportEntry[] = [
  // Week 1 (Mar 24–30)
  {
    id: 1, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 2, submitter_name: 'John Doe', submitter_role: 'Branch Manager',
    manager_name: 'Admin User', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'Sales', week_start: weekStart('2026-03-24'), week_label: weekLabel('2026-03-24'),
    data: { date: '2026-03-24', activities: 'Conducted team meeting. Reviewed Q1 targets.', challenges: 'None', next_week_plan: 'Launch new client outreach campaign.' },
    status: 'approved', created_at: '2026-03-24T08:00:00Z', updated_at: '2026-03-24T10:00:00Z',
  },
  {
    id: 2, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 3, submitter_name: 'Mary Smith', submitter_role: 'Staff',
    manager_name: 'Admin User', branch_id: 1, branch_name: 'Head Office',
    department_name: 'IT Department', week_start: weekStart('2026-03-24'), week_label: weekLabel('2026-03-24'),
    data: { date: '2026-03-24', activities: 'Deployed server updates. Fixed login bug.', challenges: 'Delayed server response', next_week_plan: 'Complete API migration for module 3.' },
    status: 'approved', created_at: '2026-03-24T09:00:00Z', updated_at: '2026-03-25T09:00:00Z',
  },
  {
    id: 3, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 4, submitter_name: 'Peter Okafor', submitter_role: 'Staff',
    manager_name: 'John Doe', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'Sales', week_start: weekStart('2026-03-24'), week_label: weekLabel('2026-03-24'),
    data: { date: '2026-03-26', activities: 'Closed 3 new client accounts.', challenges: 'Pricing objections from clients', next_week_plan: 'Follow-up with 5 pending leads.' },
    status: 'rejected', rejection_comment: 'Report is incomplete. Please include budget figures for Q1 review.', created_at: '2026-03-26T11:00:00Z', updated_at: '2026-03-27T08:00:00Z',
  },
  // Week 2 (Mar 31 – Apr 6)
  {
    id: 4, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 2, submitter_name: 'John Doe', submitter_role: 'Branch Manager',
    manager_name: 'Admin User', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'Sales', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { date: '2026-03-31', activities: 'Attended regional summit. Signed 2 new partnership MOUs.', challenges: 'Travel disruptions due to weather', next_week_plan: 'Onboard new partners with orientation.' },
    status: 'pending', created_at: '2026-03-31T08:00:00Z', updated_at: '2026-03-31T08:00:00Z',
  },
  {
    id: 5, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 3, submitter_name: 'Mary Smith', submitter_role: 'Staff',
    manager_name: 'Admin User', branch_id: 1, branch_name: 'Head Office',
    department_name: 'IT Department', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { date: '2026-03-31', activities: 'Built new dashboard UI. Resolved 4 bug tickets.', challenges: 'Unclear design requirements from client', next_week_plan: 'UAT for dashboard release.' },
    status: 'pending', created_at: '2026-03-31T10:00:00Z', updated_at: '2026-03-31T10:00:00Z',
  },
  {
    id: 12, report_id: 3, report_title: 'IT Incident Report',
    submitted_by: 3, submitter_name: 'Mary Smith', submitter_role: 'Staff',
    manager_name: 'Admin User', branch_id: 1, branch_name: 'Head Office',
    department_name: 'IT Department', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { incident_date: '2026-03-31', incident_type: 'Network Issue', description: 'Internet went down for 30 mins.', resolution: 'Restarted router.', resolved: 'Yes' },
    status: 'rejected', rejection_comment: 'Please include the ticket number from the IT helpdesk and describe the business impact in more detail.', created_at: '2026-03-31T11:00:00Z', updated_at: '2026-04-01T09:00:00Z',
  },
  {
    id: 6, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 5, submitter_name: 'Grace Eze', submitter_role: 'Staff',
    manager_name: 'Admin User', branch_id: 1, branch_name: 'Head Office',
    department_name: 'HR Department', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { date: '2026-04-01', activities: 'Organised staff appraisal sessions. Updated HR policies.', challenges: 'Low participation in survey', next_week_plan: 'Complete all appraisal reviews.' },
    status: 'pending', created_at: '2026-04-01T09:30:00Z', updated_at: '2026-04-01T09:30:00Z',
  },
  {
    id: 7, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 6, submitter_name: 'Chidi Nwosu', submitter_role: 'Staff',
    manager_name: 'John Doe', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'Sales', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { date: '2026-04-01', activities: 'Hit monthly target 5 days early. Organised client lunch.', challenges: 'None', next_week_plan: 'Exceed target by 20%.' },
    status: 'approved', created_at: '2026-04-01T07:45:00Z', updated_at: '2026-04-01T11:00:00Z',
  },
  {
    id: 8, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 7, submitter_name: 'Fatima Bello', submitter_role: 'Staff',
    manager_name: 'Admin User', branch_id: 3, branch_name: 'Davao Branch',
    department_name: 'Operations', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { date: '2026-04-02', activities: 'Managed logistics for Q1 delivery batch.', challenges: 'Vendor delays affected schedule', next_week_plan: 'Resume delayed deliveries and audit warehouse.' },
    status: 'rejected', rejection_comment: 'Missing delivery tracking numbers. Please resubmit with full logistics data.', created_at: '2026-04-02T08:00:00Z', updated_at: '2026-04-02T14:00:00Z',
  },
  // Entries for logged-in admin user (id:1) — used for staff view demo
  {
    id: 9, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 1, submitter_name: 'Admin User', submitter_role: 'Super Admin',
    manager_name: '—', branch_id: 1, branch_name: 'Head Office',
    department_name: 'Administration', week_start: weekStart('2026-03-24'), week_label: weekLabel('2026-03-24'),
    data: { date: '2026-03-24', activities: 'Reviewed system architecture and onboarded new team leads.', challenges: 'Coordination across 3 branches', next_week_plan: 'Finalise Q2 planning sessions.' },
    status: 'approved', created_at: '2026-03-24T08:30:00Z', updated_at: '2026-03-25T09:00:00Z',
  },
  {
    id: 10, report_id: 2, report_title: 'Monthly Sales Summary',
    submitted_by: 1, submitter_name: 'Admin User', submitter_role: 'Super Admin',
    manager_name: '—', branch_id: 1, branch_name: 'Head Office',
    department_name: 'Administration', week_start: weekStart('2026-03-24'), week_label: weekLabel('2026-03-24'),
    data: { total_sales: 4500000, top_product: 'Enterprise Software Suite', target_met: 'Yes', comments: 'Exceeded Q1 target by 12%.' },
    status: 'approved', created_at: '2026-03-25T10:00:00Z', updated_at: '2026-03-26T08:00:00Z',
  },
  {
    id: 11, report_id: 1, report_title: 'Weekly Activity Report',
    submitted_by: 1, submitter_name: 'Admin User', submitter_role: 'Super Admin',
    manager_name: '—', branch_id: 1, branch_name: 'Head Office',
    department_name: 'Administration', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { date: '2026-03-31', activities: 'Led strategy session. Deployed new reporting module.', challenges: 'Server maintenance window caused 2h delay', next_week_plan: 'Staff performance reviews and Q2 kickoff.' },
    status: 'rejected', rejection_comment: 'Please include specific metrics for system deployment. Also attach the server maintenance log as reference.', created_at: '2026-03-31T07:00:00Z', updated_at: '2026-04-01T10:00:00Z',
  },
]

const mockStats: DashboardStats = {
  total_branches: 3,
  total_employees: 25,
  present_today: 21,
  monthly_report_rate: 87,
}

// ── Auth ──────────────────────────────────────────────
export const authApi = MOCK ? {
  login: (creds: LoginCredentials) => {
    if (creds.username === 'staff') {
      _mockSession = mockStaffUser
    } else if (creds.username === 'manager') {
      _mockSession = mockManagerUser
    } else if (creds.username === 'asst_manager') {
      _mockSession = mockAsstManagerUser
    } else if (creds.username === 'branch_admin') {
      _mockSession = mockBranchAdminUser
    } else {
      _mockSession = mockUser
    }
    return delay(_mockSession)
  },
  logout: () => { _mockSession = mockUser; return delay(null) },
  me: () => delay(_mockSession),
} : {
  login: (creds: LoginCredentials) =>
    client.post<ApiResponse<AuthUser>>('/index.php?endpoint=auth&action=login', creds).then(r => r.data),
  logout: () =>
    client.post<ApiResponse<null>>('/index.php?endpoint=auth&action=logout').then(r => r.data),
  me: () =>
    client.get<ApiResponse<AuthUser>>('/index.php?endpoint=auth&action=me').then(r => r.data),
}

// ── Branches ──────────────────────────────────────────
export const branchesApi = MOCK ? {
  getAll: () => delay(mockBranches),
  getOne: (id: number) => delay(mockBranches.find(b => b.id === id)!),
  create: (data: BranchForm) => delay({ ...data, id: Date.now(), staff_count: 0, created_at: new Date().toISOString() } as Branch),
  update: (id: number, data: Partial<BranchForm>) => delay({ ...mockBranches.find(b => b.id === id)!, ...data }),
  delete: (_id: number) => delay(null),
} : {
  getAll: () =>
    client.get<ApiResponse<Branch[]>>('/index.php?endpoint=branches').then(r => r.data),
  getOne: (id: number) =>
    client.get<ApiResponse<Branch>>(`/index.php?endpoint=branches&id=${id}`).then(r => r.data),
  create: (data: BranchForm) =>
    client.post<ApiResponse<Branch>>('/index.php?endpoint=branches', data).then(r => r.data),
  update: (id: number, data: Partial<BranchForm>) =>
    client.put<ApiResponse<Branch>>(`/index.php?endpoint=branches&id=${id}`, data).then(r => r.data),
  delete: (id: number) =>
    client.delete<ApiResponse<null>>(`/index.php?endpoint=branches&id=${id}`).then(r => r.data),
}

// ── Departments ───────────────────────────────────────
export const departmentsApi = MOCK ? {
  getAll: () => delay(mockDepartments),
  getOne: (id: number) => delay(mockDepartments.find(d => d.id === id)!),
  create: (data: DepartmentForm) => delay({ ...data, id: Date.now(), staff_count: 0, created_at: new Date().toISOString() } as Department),
  update: (id: number, data: Partial<DepartmentForm>) => delay({ ...mockDepartments.find(d => d.id === id)!, ...data }),
  delete: (_id: number) => delay(null),
} : {
  getAll: () =>
    client.get<ApiResponse<Department[]>>('/index.php?endpoint=departments').then(r => r.data),
  getOne: (id: number) =>
    client.get<ApiResponse<Department>>(`/index.php?endpoint=departments&id=${id}`).then(r => r.data),
  create: (data: DepartmentForm) =>
    client.post<ApiResponse<Department>>('/index.php?endpoint=departments', data).then(r => r.data),
  update: (id: number, data: Partial<DepartmentForm>) =>
    client.put<ApiResponse<Department>>(`/index.php?endpoint=departments&id=${id}`, data).then(r => r.data),
  delete: (id: number) =>
    client.delete<ApiResponse<null>>(`/index.php?endpoint=departments&id=${id}`).then(r => r.data),
}

// ── Users ─────────────────────────────────────────────
export const usersApi = MOCK ? {
  getAll: () => delay(mockUsers),
  getOne: (id: number) => delay(mockUsers.find(u => u.id === id)!),
  create: (data: UserForm) => delay({ ...data, id: Date.now(), created_at: new Date().toISOString() } as User),
  update: (id: number, data: Partial<UserForm>) => delay({ ...mockUsers.find(u => u.id === id)!, ...data }),
  delete: (_id: number) => delay(null),
} : {
  getAll: () =>
    client.get<ApiResponse<User[]>>('/index.php?endpoint=users').then(r => r.data),
  getOne: (id: number) =>
    client.get<ApiResponse<User>>(`/index.php?endpoint=users&id=${id}`).then(r => r.data),
  create: (data: UserForm) =>
    client.post<ApiResponse<User>>('/index.php?endpoint=users', data).then(r => r.data),
  update: (id: number, data: Partial<UserForm>) =>
    client.put<ApiResponse<User>>(`/index.php?endpoint=users&id=${id}`, data).then(r => r.data),
  delete: (id: number) =>
    client.delete<ApiResponse<null>>(`/index.php?endpoint=users&id=${id}`).then(r => r.data),
}

// ── Roles ─────────────────────────────────────────────
export const rolesApi = MOCK ? {
  getAll: () => delay(mockRoles),
  getOne: (id: number) => delay(mockRoles.find(r => r.id === id)!),
  getPermissions: () => delay(['manage_users','manage_branches','manage_departments','manage_roles','manage_reports','view_reports','submit_reports','approve_reports','export_data']),
  create: (data: RoleForm) => delay({ ...data, id: Date.now(), user_count: 0, created_at: new Date().toISOString() } as Role),
  update: (id: number, data: Partial<RoleForm>) => delay({ ...mockRoles.find(r => r.id === id)!, ...data }),
  delete: (_id: number) => delay(null),
} : {
  getAll: () =>
    client.get<ApiResponse<Role[]>>('/index.php?endpoint=roles').then(r => r.data),
  getOne: (id: number) =>
    client.get<ApiResponse<Role>>(`/index.php?endpoint=roles&id=${id}`).then(r => r.data),
  getPermissions: () =>
    client.get<ApiResponse<string[]>>('/index.php?endpoint=roles&action=permissions').then(r => r.data),
  create: (data: RoleForm) =>
    client.post<ApiResponse<Role>>('/index.php?endpoint=roles', data).then(r => r.data),
  update: (id: number, data: Partial<RoleForm>) =>
    client.put<ApiResponse<Role>>(`/index.php?endpoint=roles&id=${id}`, data).then(r => r.data),
  delete: (id: number) =>
    client.delete<ApiResponse<null>>(`/index.php?endpoint=roles&id=${id}`).then(r => r.data),
}

// ── Reports (Templates) ───────────────────────────────
export const reportsApi = MOCK ? {
  getAll: () => delay(mockReports),
  getOne: (id: number) => delay(mockReports.find(r => r.id === id)!),
  create: (data: ReportForm) => delay({ ...data, id: Date.now(), created_by: 1, creator_name: 'Admin User', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Report),
  update: (id: number, data: Partial<ReportForm>) => delay({ ...mockReports.find(r => r.id === id)!, ...data }),
  delete: (_id: number) => delay(null),
} : {
  getAll: () =>
    client.get<ApiResponse<Report[]>>('/index.php?endpoint=reports').then(r => r.data),
  getOne: (id: number) =>
    client.get<ApiResponse<Report>>(`/index.php?endpoint=reports&id=${id}`).then(r => r.data),
  create: (data: ReportForm) =>
    client.post<ApiResponse<Report>>('/index.php?endpoint=reports', data).then(r => r.data),
  update: (id: number, data: Partial<ReportForm>) =>
    client.put<ApiResponse<Report>>(`/index.php?endpoint=reports&id=${id}`, data).then(r => r.data),
  delete: (id: number) =>
    client.delete<ApiResponse<null>>(`/index.php?endpoint=reports&id=${id}`).then(r => r.data),
}

// ── Report Entries (Submissions) ──────────────────────
export const entriesApi = MOCK ? {
  getAll: () => delay(mockEntries.filter(e => e.submitted_by === 1 || true).slice(0, 2)),
  getOne: (id: number) => delay(mockEntries.find(e => e.id === id)!),
  create: (data: ReportEntryForm) => delay({
    ...data, id: Date.now(), submitted_by: 1, submitter_name: 'Admin User',
    branch_id: 1, branch_name: 'Head Office', status: 'pending' as const,
    week_start: weekStart(new Date().toISOString()),
    week_label: weekLabel(new Date().toISOString()),
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as ReportEntry),
  update: (id: number, data: Partial<ReportEntryForm>) => delay({ ...mockEntries.find(e => e.id === id)!, ...data }),
  delete: (_id: number) => delay(null),
  updateStatus: (id: number, status: 'approved' | 'rejected') => delay({ ...mockEntries.find(e => e.id === id)!, status }),
} : {
  getAll: () =>
    client.get<ApiResponse<ReportEntry[]>>('/index.php?endpoint=report_entries').then(r => r.data),
  getOne: (id: number) =>
    client.get<ApiResponse<ReportEntry>>(`/index.php?endpoint=report_entries&id=${id}`).then(r => r.data),
  create: (data: ReportEntryForm) =>
    client.post<ApiResponse<ReportEntry>>('/index.php?endpoint=report_entries', data).then(r => r.data),
  update: (id: number, data: Partial<ReportEntryForm>) =>
    client.put<ApiResponse<ReportEntry>>(`/index.php?endpoint=report_entries&id=${id}`, data).then(r => r.data),
  delete: (id: number) =>
    client.delete<ApiResponse<null>>(`/index.php?endpoint=report_entries&id=${id}`).then(r => r.data),
  updateStatus: (id: number, status: 'approved' | 'rejected') =>
    client.patch<ApiResponse<ReportEntry>>(`/index.php?endpoint=report_entries&id=${id}`, { status }).then(r => r.data),
}

// ── Submissions Admin (For Manager/Admin review) ───────────
// This API surfaces ALL submissions for people with approve_reports permission
export const submissionsApi = MOCK ? {
  getAll: () => delay(mockEntries),
  getOne: (id: number) => delay(mockEntries.find(e => e.id === id)!),
  review: (id: number, action: SubmissionReviewAction) => {
    const idx = mockEntries.findIndex(e => e.id === id)
    if (idx !== -1) {
      mockEntries[idx] = {
        ...mockEntries[idx],
        status: action.status,
        rejection_comment: action.rejection_comment,
        updated_at: new Date().toISOString(),
      }
    }
    return delay({ ...mockEntries.find(e => e.id === id) } as ReportEntry)
  },
  getWeeks: () => {
    const seen = new Set<string>()
    const weeks: { week_start: string; week_label: string }[] = []
    mockEntries.forEach(e => {
      if (e.week_start && !seen.has(e.week_start)) {
        seen.add(e.week_start)
        weeks.push({ week_start: e.week_start, week_label: e.week_label! })
      }
    })
    return delay(weeks.sort((a, b) => b.week_start.localeCompare(a.week_start)))
  },
} : {
  getAll: () =>
    client.get<ApiResponse<ReportEntry[]>>('/index.php?endpoint=submissions').then(r => r.data),
  getOne: (id: number) =>
    client.get<ApiResponse<ReportEntry>>(`/index.php?endpoint=submissions&id=${id}`).then(r => r.data),
  review: (id: number, action: SubmissionReviewAction) =>
    client.patch<ApiResponse<ReportEntry>>(`/index.php?endpoint=submissions&id=${id}&action=review`, action).then(r => r.data),
  getWeeks: () =>
    client.get<ApiResponse<{ week_start: string; week_label: string }[]>>('/index.php?endpoint=submissions&action=weeks').then(r => r.data),
}

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = MOCK ? {
  getStats: () => delay(mockStats),
} : {
  getStats: () =>
    client.get<ApiResponse<DashboardStats>>('/index.php?endpoint=dashboard&action=stats').then(r => r.data),
}

export default client

// ─── Task Manager Mock Data ────────────────────────────────────────────────

const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000).toISOString().split('T')[0]
const daysAgoDate = (n: number) => new Date(now.getTime() - n * 86400000).toISOString().split('T')[0]

let mockTasks: Task[] = [
  {
    id: 1, title: 'Complete Q2 Compliance Audit', description: 'Review all branch compliance documents for Q2. Ensure all branches have submitted their compliance reports and flag any outstanding items for follow-up.',
    type: 'compliance', status: 'in_progress', priority: 'critical', scope: 'branch',
    assigned_to: [2, 4], assignee_names: ['John Doe', 'Ana Cruz'],
    assigned_branch_id: 2, assigned_branch_name: 'Cebu Branch',
    due_date: daysFromNow(3), start_date: daysAgoDate(5),
    labels: ['Q2', 'Audit', 'Compliance'],
    subtasks: [
      { id: 's1', title: 'Collect compliance docs from all departments', completed: true },
      { id: 's2', title: 'Cross-check against regulatory checklist', completed: true },
      { id: 's3', title: 'Submit final audit report to Super Admin', completed: false },
    ],
    comments: [
      { id: 1, task_id: 1, author_id: 2, author_name: 'John Doe', author_role: 'Branch Manager', body: 'Docs from Sales and HR collected. IT department still pending.', created_at: daysAgo(2) },
      { id: 2, task_id: 1, author_id: 4, author_name: 'Ana Cruz', author_role: 'Assistant Manager', body: 'I followed up with IT. They will submit by EOD today.', created_at: daysAgo(1) },
    ],
    activity: [
      { id: 1, task_id: 1, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(5) },
      { id: 2, task_id: 1, actor_id: 1, actor_name: 'Admin User', action: 'assigned', to_value: 'John Doe, Ana Cruz', created_at: daysAgo(5) },
      { id: 3, task_id: 1, actor_id: 2, actor_name: 'John Doe', action: 'status_changed', from_value: 'todo', to_value: 'in_progress', created_at: daysAgo(4) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(5), updated_at: daysAgo(1),
  },
  {
    id: 2, title: 'Onboard New Sales Staff — Cebu Branch', description: 'Complete HR onboarding for 3 new sales staff members. Includes system access setup, orientation schedule, and documentation.',
    type: 'hr', status: 'todo', priority: 'high', scope: 'branch',
    assigned_to: [4], assignee_names: ['Ana Cruz'],
    assigned_branch_id: 2, assigned_branch_name: 'Cebu Branch',
    due_date: daysFromNow(7),
    labels: ['Onboarding', 'HR'],
    subtasks: [
      { id: 's1', title: 'Prepare welcome kit and access credentials', completed: false },
      { id: 's2', title: 'Schedule orientation with department heads', completed: false },
      { id: 's3', title: 'Complete employment contract documentation', completed: false },
    ],
    comments: [],
    activity: [
      { id: 1, task_id: 2, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(2) },
      { id: 2, task_id: 2, actor_id: 1, actor_name: 'Admin User', action: 'assigned', to_value: 'Ana Cruz', created_at: daysAgo(2) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(2), updated_at: daysAgo(2),
  },
  {
    id: 3, title: 'Monthly Sales Report Review', description: 'Review and consolidate all branch monthly sales summaries. Prepare executive summary for board meeting.',
    type: 'sales', status: 'in_review', priority: 'high', scope: 'individual',
    assigned_to: [2], assignee_names: ['John Doe'],
    due_date: daysFromNow(1),
    labels: ['Monthly', 'Sales', 'Board'],
    subtasks: [
      { id: 's1', title: 'Collect sales data from all 3 branches', completed: true },
      { id: 's2', title: 'Prepare consolidated summary document', completed: true },
      { id: 's3', title: 'Present to Super Admin for approval', completed: false },
    ],
    comments: [
      { id: 3, task_id: 3, author_id: 2, author_name: 'John Doe', author_role: 'Branch Manager', body: 'Draft summary ready for review. Attached in shared drive.', created_at: daysAgo(1) },
    ],
    activity: [
      { id: 1, task_id: 3, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(6) },
      { id: 2, task_id: 3, actor_id: 2, actor_name: 'John Doe', action: 'status_changed', from_value: 'in_progress', to_value: 'in_review', created_at: daysAgo(1) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(6), updated_at: daysAgo(1),
  },
  {
    id: 4, title: 'IT Infrastructure Upgrade — Head Office', description: 'Coordinate the server room upgrade including new switches, UPS replacement and cabling audit. Minimize downtime.',
    type: 'it', status: 'backlog', priority: 'medium', scope: 'individual',
    assigned_to: [3], assignee_names: ['Mary Smith'],
    due_date: daysFromNow(14),
    labels: ['IT', 'Infrastructure'],
    subtasks: [
      { id: 's1', title: 'Get vendor quotes for new switches', completed: false },
      { id: 's2', title: 'Schedule maintenance window with operations', completed: false },
      { id: 's3', title: 'Execute upgrade and test connectivity', completed: false },
    ],
    comments: [],
    activity: [
      { id: 1, task_id: 4, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(1) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(1), updated_at: daysAgo(1),
  },
  {
    id: 5, title: 'Q1 Financial Reconciliation', description: 'Reconcile all branch financial records for Q1. Identify discrepancies and prepare audit trail documentation.',
    type: 'finance', status: 'done', priority: 'critical', scope: 'individual',
    assigned_to: [5], assignee_names: ['Ben Santos'],
    due_date: daysAgoDate(3),
    labels: ['Finance', 'Q1', 'Audit'],
    subtasks: [
      { id: 's1', title: 'Pull all transaction records', completed: true },
      { id: 's2', title: 'Reconcile with bank statements', completed: true },
      { id: 's3', title: 'Submit reconciliation report', completed: true },
    ],
    comments: [
      { id: 4, task_id: 5, author_id: 5, author_name: 'Ben Santos', author_role: 'Branch Administrator', body: 'Reconciliation complete. All figures match. Report submitted.', created_at: daysAgo(3) },
    ],
    activity: [
      { id: 1, task_id: 5, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(14) },
      { id: 2, task_id: 5, actor_id: 5, actor_name: 'Ben Santos', action: 'status_changed', from_value: 'in_review', to_value: 'done', created_at: daysAgo(3) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(14), updated_at: daysAgo(3),
  },
  {
    id: 6, title: 'Branch Operations SOP Update', description: 'Update the standard operating procedures document for all branches to reflect the new workflows introduced in Q1.',
    type: 'operations', status: 'todo', priority: 'medium', scope: 'branch',
    assigned_to: [2, 5], assignee_names: ['John Doe', 'Ben Santos'],
    assigned_branch_id: 2, assigned_branch_name: 'Cebu Branch',
    due_date: daysFromNow(10),
    labels: ['Operations', 'SOP'],
    subtasks: [
      { id: 's1', title: 'Review current SOP document', completed: false },
      { id: 's2', title: 'Identify outdated sections', completed: false },
      { id: 's3', title: 'Draft revised procedures', completed: false },
      { id: 's4', title: 'Get sign-off from branch managers', completed: false },
    ],
    comments: [],
    activity: [
      { id: 1, task_id: 6, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(3) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(3), updated_at: daysAgo(3),
  },
  {
    id: 7, title: 'Overdue: Staff Attendance Policy Review', description: 'Review and update staff attendance policy. This has been overdue since last quarter.',
    type: 'hr', status: 'in_progress', priority: 'low', scope: 'individual',
    assigned_to: [4], assignee_names: ['Ana Cruz'],
    due_date: daysAgoDate(5),
    labels: ['HR', 'Policy'],
    subtasks: [
      { id: 's1', title: 'Gather attendance data from all branches', completed: true },
      { id: 's2', title: 'Draft new policy document', completed: false },
    ],
    comments: [],
    activity: [
      { id: 1, task_id: 7, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(20) },
      { id: 2, task_id: 7, actor_id: 4, actor_name: 'Ana Cruz', action: 'status_changed', from_value: 'todo', to_value: 'in_progress', created_at: daysAgo(10) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(20), updated_at: daysAgo(10),
  },
  {
    id: 8, title: 'General Admin: Office Supplies Procurement', description: 'Coordinate procurement of office supplies for Head Office. Get quotes from at least 3 vendors.',
    type: 'general', status: 'backlog', priority: 'low', scope: 'individual',
    assigned_to: [5], assignee_names: ['Ben Santos'],
    due_date: daysFromNow(21),
    labels: ['Admin', 'Procurement'],
    subtasks: [],
    comments: [],
    activity: [
      { id: 1, task_id: 8, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(1) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(1), updated_at: daysAgo(1),
  },
  // ── Delegation demo tasks (assigned to manager by admin) ──────────────────
  {
    id: 9,
    title: 'Q2 Branch Performance Review',
    description: 'Compile the full Q2 performance data for Cebu Branch — sales figures, compliance rate, headcount, and staff KPIs. Prepare an executive summary for the board.',
    type: 'operations', status: 'in_progress', priority: 'high', scope: 'individual',
    assigned_to: [2], assignee_names: ['John Doe'],
    due_date: daysFromNow(5), start_date: daysAgoDate(3),
    labels: ['Q2', 'Board', 'Performance'],
    subtasks: [
      { id: 's1', title: 'Compile sales figures from all departments', completed: true },
      { id: 's2', title: 'Gather compliance rate data', completed: true },
      { id: 's3', title: 'Prepare headcount and KPI summary', completed: false },
      { id: 's4', title: 'Write executive summary', completed: false },
    ],
    comments: [
      { id: 10, task_id: 9, author_id: 2, author_name: 'John Doe', author_role: 'Branch Manager', body: 'Delegated data gathering to Ana Cruz. Will compile final report myself.', created_at: daysAgo(2) },
    ],
    activity: [
      { id: 1, task_id: 9, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(4) },
      { id: 2, task_id: 9, actor_id: 1, actor_name: 'Admin User', action: 'assigned', to_value: 'John Doe', created_at: daysAgo(4) },
      { id: 3, task_id: 9, actor_id: 2, actor_name: 'John Doe', action: 'status_changed', from_value: 'todo', to_value: 'in_progress', created_at: daysAgo(3) },
    ],
    // Delegation metadata
    delegated_to: [4], delegated_names: ['Ana Cruz'],
    delegate_note: 'Ana, please pull all department KPIs and the compliance data. Send me the compiled spreadsheet by Thursday so I can write the final summary.',
    delegated_at: daysAgo(2),
    progress_note: 'Sales and compliance data collected. Ana is finalising headcount KPIs. On track for the due date.',
    progress_note_at: daysAgo(1), progress_note_author: 'John Doe',
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(4), updated_at: daysAgo(1),
  },
  {
    id: 10,
    title: 'Staff Welfare & Engagement Report — Cebu Branch',
    description: 'Prepare a comprehensive report on staff welfare initiatives, engagement scores, and retention metrics for H1. Highlight any risks and recommend actions.',
    type: 'hr', status: 'todo', priority: 'medium', scope: 'individual',
    assigned_to: [2], assignee_names: ['John Doe'],
    due_date: daysFromNow(10),
    labels: ['HR', 'Welfare', 'H1'],
    subtasks: [
      { id: 's1', title: 'Gather engagement survey results', completed: false },
      { id: 's2', title: 'Pull retention and attrition data', completed: false },
      { id: 's3', title: 'Document welfare initiatives implemented', completed: false },
      { id: 's4', title: 'Write recommendations section', completed: false },
    ],
    comments: [],
    activity: [
      { id: 1, task_id: 10, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: daysAgo(2) },
      { id: 2, task_id: 10, actor_id: 1, actor_name: 'Admin User', action: 'assigned', to_value: 'John Doe', created_at: daysAgo(2) },
    ],
    created_by: 1, creator_name: 'Admin User', created_at: daysAgo(2), updated_at: daysAgo(2),
  },
]

let mockNotifications: Notification[] = [
  { id: 1, user_id: 1, title: 'Task Assigned to You', body: 'Monthly Sales Report Review has been assigned to you by Admin User.', type: 'task_assigned', reference_id: 3, reference_type: 'task', read: false, created_at: daysAgo(1) },
  { id: 2, user_id: 1, title: 'New Comment on Task', body: 'John Doe commented on "Complete Q2 Compliance Audit".', type: 'task_comment', reference_id: 1, reference_type: 'task', read: false, created_at: daysAgo(1) },
  { id: 3, user_id: 1, title: 'Task Overdue', body: '"Overdue: Staff Attendance Policy Review" is 5 days past due date.', type: 'task_overdue', reference_id: 7, reference_type: 'task', read: false, created_at: daysAgo(0) },
  { id: 4, user_id: 1, title: 'Report Submitted', body: 'John Doe submitted Weekly Activity Report for Cebu Branch.', type: 'report_submitted', reference_id: 4, reference_type: 'submission', read: false, created_at: daysAgo(2) },
  { id: 5, user_id: 1, title: 'Task Completed', body: 'Ben Santos marked "Q1 Financial Reconciliation" as done.', type: 'task_updated', reference_id: 5, reference_type: 'task', read: true, created_at: daysAgo(3) },
  { id: 6, user_id: 1, title: 'Report Rejected', body: 'Mary Smith\'s IT Incident Report was rejected — awaiting resubmission.', type: 'report_rejected', reference_id: 12, reference_type: 'submission', read: true, created_at: daysAgo(4) },
]

// ─── Tasks API ────────────────────────────────────────────────────────────────

export const tasksApi = MOCK ? {
  getAll: () => delay([...mockTasks]),
  getOne: (id: number) => delay(mockTasks.find(t => t.id === id)!),
  create: (data: TaskForm & { assignee_names?: string[]; assigned_branch_name?: string }) => {
    const newId = Date.now()
    const newTask: Task = {
      title: data.title,
      description: data.description,
      type: data.type,
      status: 'todo',
      priority: data.priority,
      scope: data.scope,
      assigned_to: data.assigned_to,
      assignee_names: data.assignee_names,
      assigned_branch_id: data.assigned_branch_id,
      assigned_branch_name: data.assigned_branch_name,
      due_date: data.due_date,
      start_date: data.start_date,
      labels: data.labels,
      subtasks: data.subtasks.map((s, i) => ({ ...s, id: `s${newId}${i}` })),
      comments: [],
      activity: [{ id: newId, task_id: newId, actor_id: 1, actor_name: 'Admin User', action: 'created', created_at: new Date().toISOString() }],
      id: newId,
      created_by: 1,
      creator_name: 'Admin User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockTasks.push(newTask)
    return delay(newTask)
  },
  update: (id: number, data: Partial<TaskForm> & { assignee_names?: string[]; assigned_branch_name?: string }) => {
    const idx = mockTasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      const updatedSubtasks = data.subtasks
        ? data.subtasks.map((s, i) => ({ ...s, id: `s${id}${i}` }))
        : mockTasks[idx].subtasks
      mockTasks[idx] = { ...mockTasks[idx], ...data, subtasks: updatedSubtasks, updated_at: new Date().toISOString() }
      mockTasks[idx].activity.push({ id: Date.now(), task_id: id, actor_id: 1, actor_name: 'Admin User', action: 'edited', created_at: new Date().toISOString() })
    }
    return delay(mockTasks[idx])
  },
  updateStatus: (id: number, status: Task['status']) => {
    const idx = mockTasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      const prev = mockTasks[idx].status
      mockTasks[idx] = { ...mockTasks[idx], status, updated_at: new Date().toISOString() }
      mockTasks[idx].activity.push({ id: Date.now(), task_id: id, actor_id: 1, actor_name: 'Admin User', action: 'status_changed', from_value: prev, to_value: status, created_at: new Date().toISOString() })
    }
    return delay(mockTasks[idx])
  },
  toggleSubtask: (taskId: number, subtaskId: string) => {
    const idx = mockTasks.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      const sIdx = mockTasks[idx].subtasks.findIndex((s: SubTask) => s.id === subtaskId)
      if (sIdx !== -1) {
        mockTasks[idx].subtasks[sIdx].completed = !mockTasks[idx].subtasks[sIdx].completed
        if (mockTasks[idx].subtasks[sIdx].completed) {
          mockTasks[idx].activity.push({ id: Date.now(), task_id: taskId, actor_id: 1, actor_name: 'Admin User', action: 'subtask_completed', to_value: mockTasks[idx].subtasks[sIdx].title, created_at: new Date().toISOString() })
        }
      }
    }
    return delay(mockTasks[idx])
  },
  addComment: (taskId: number, body: string) => {
    const idx = mockTasks.findIndex(t => t.id === taskId)
    const comment: TaskComment = { id: Date.now(), task_id: taskId, author_id: _mockSession.id, author_name: _mockSession.full_name, author_role: _mockSession.role_name, body, created_at: new Date().toISOString() }
    if (idx !== -1) {
      mockTasks[idx].comments.push(comment)
      mockTasks[idx].activity.push({ id: Date.now() + 1, task_id: taskId, actor_id: _mockSession.id, actor_name: _mockSession.full_name, action: 'commented', to_value: body.slice(0, 60), created_at: new Date().toISOString() })
      mockTasks[idx].updated_at = new Date().toISOString()
    }
    return delay(comment)
  },
  // ── Delegation ───────────────────────────────────────
  delegate: (id: number, userIds: number[], userNames: string[], note?: string) => {
    const idx = mockTasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      mockTasks[idx] = {
        ...mockTasks[idx],
        delegated_to: userIds,
        delegated_names: userNames,
        delegate_note: note,
        delegated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockTasks[idx].activity.push({
        id: Date.now(), task_id: id, actor_id: _mockSession.id, actor_name: _mockSession.full_name,
        action: 'assigned', to_value: userNames.join(', '),
        created_at: new Date().toISOString(),
      })
      userIds.forEach(uid => {
        mockNotifications.unshift({
          id: Date.now() + uid, user_id: uid,
          title: 'Task Delegated to You',
          body: `${_mockSession.full_name} delegated "${mockTasks[idx].title}" to you.`,
          type: 'task_assigned', reference_id: id, reference_type: 'task', read: false,
          created_at: new Date().toISOString(),
        })
      })
    }
    return delay(mockTasks[idx])
  },

  // ── Progress note ─────────────────────────────────────
  addProgressNote: (id: number, note: string) => {
    const idx = mockTasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      mockTasks[idx] = {
        ...mockTasks[idx],
        progress_note: note,
        progress_note_at: new Date().toISOString(),
        progress_note_author: _mockSession.full_name,
        updated_at: new Date().toISOString(),
      }
    }
    return delay(mockTasks[idx])
  },

  // ── Workflow actions ─────────────────────────────────
  submitForReview: (id: number, achievement_summary?: string, key_outcomes?: string[], challenges_faced?: string, revision_response?: string, taggedReviewers?: number[]) => {
    const idx = mockTasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      const taggedNames = (taggedReviewers ?? []).map(uid => mockUsers.find(u => u.id === uid)?.full_name ?? `User ${uid}`)
      mockTasks[idx] = {
        ...mockTasks[idx],
        status: 'in_review',
        achievement_summary,
        key_outcomes: key_outcomes ?? [],
        challenges_faced,
        revision_response,
        submission_note: achievement_summary,          // keep compat
        tagged_reviewers: taggedReviewers ?? [],
        tagged_reviewer_names: taggedNames,
        revision_reason: undefined,
        updated_at: new Date().toISOString(),
      }
      mockTasks[idx].activity.push({
        id: Date.now(), task_id: id, actor_id: _mockSession.id, actor_name: _mockSession.full_name,
        action: 'status_changed', from_value: 'in_progress', to_value: 'in_review',
        created_at: new Date().toISOString(),
      })
      mockNotifications.unshift({
        id: Date.now(), user_id: mockTasks[idx].created_by,
        title: 'Task Ready for Review',
        body: `${_mockSession.full_name} submitted "${mockTasks[idx].title}" for your review.`,
        type: 'task_updated', reference_id: id, reference_type: 'task', read: false,
        created_at: new Date().toISOString(),
      })
    }
    return delay(mockTasks[idx])
  },
  approve: (id: number) => {
    const idx = mockTasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      mockTasks[idx] = { ...mockTasks[idx], status: 'done', updated_at: new Date().toISOString() }
      mockTasks[idx].activity.push({
        id: Date.now(), task_id: id, actor_id: _mockSession.id, actor_name: _mockSession.full_name,
        action: 'status_changed', from_value: 'in_review', to_value: 'done',
        created_at: new Date().toISOString(),
      })
      // Notify assignees
      mockTasks[idx].assigned_to.forEach(uid => {
        mockNotifications.unshift({
          id: Date.now() + uid, user_id: uid,
          title: 'Task Approved',
          body: `${_mockSession.full_name} approved your task: "${mockTasks[idx].title}".`,
          type: 'task_updated', reference_id: id, reference_type: 'task', read: false,
          created_at: new Date().toISOString(),
        })
      })
    }
    return delay(mockTasks[idx])
  },
  reject: (id: number, reason: string) => {
    const idx = mockTasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      mockTasks[idx] = {
        ...mockTasks[idx],
        status: 'needs_revision',
        revision_reason: reason,
        updated_at: new Date().toISOString(),
      }
      mockTasks[idx].activity.push({
        id: Date.now(), task_id: id, actor_id: _mockSession.id, actor_name: _mockSession.full_name,
        action: 'status_changed', from_value: 'in_review', to_value: 'needs_revision',
        created_at: new Date().toISOString(),
      })
      // Notify assignees
      mockTasks[idx].assigned_to.forEach(uid => {
        mockNotifications.unshift({
          id: Date.now() + uid, user_id: uid,
          title: 'Task Needs Revision',
          body: `${_mockSession.full_name} returned "${mockTasks[idx].title}" for revision: "${reason.slice(0, 80)}"`,
          type: 'task_updated', reference_id: id, reference_type: 'task', read: false,
          created_at: new Date().toISOString(),
        })
      })
    }
    return delay(mockTasks[idx])
  },
  resubmit: (id: number, achievement_summary?: string, key_outcomes?: string[], challenges_faced?: string, revision_response?: string) => {
    const idx = mockTasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      mockTasks[idx] = {
        ...mockTasks[idx],
        status: 'in_review',
        achievement_summary,
        key_outcomes: key_outcomes ?? [],
        challenges_faced,
        revision_response,
        submission_note: achievement_summary,
        revision_reason: undefined,
        updated_at: new Date().toISOString(),
      }
      mockTasks[idx].activity.push({
        id: Date.now(), task_id: id, actor_id: _mockSession.id, actor_name: _mockSession.full_name,
        action: 'status_changed', from_value: 'needs_revision', to_value: 'in_review',
        created_at: new Date().toISOString(),
      })
      mockNotifications.unshift({
        id: Date.now(), user_id: mockTasks[idx].created_by,
        title: 'Task Resubmitted',
        body: `${_mockSession.full_name} resubmitted "${mockTasks[idx].title}" for review.`,
        type: 'task_updated', reference_id: id, reference_type: 'task', read: false,
        created_at: new Date().toISOString(),
      })
    }
    return delay(mockTasks[idx])
  },
  // Get tasks visible to a specific user (staff/manager)
  getMyTasks: (userId: number, branchId?: number) => {
    const myTasks = mockTasks.filter(t =>
      t.status !== 'cancelled' && (
        t.assigned_to.includes(userId) ||
        (branchId && t.scope === 'branch' && t.assigned_branch_id === branchId) ||
        (t.delegated_to ?? []).includes(userId)
      )
    )
    return delay(myTasks)
  },
  // Get tasks for a Branch Manager (all branch tasks + tasks they created)
  getManagerTasks: (managerId: number, branchId: number) => {
    const managerTasks = mockTasks.filter(t =>
      t.status !== 'cancelled' && (
        t.created_by === managerId ||
        t.assigned_to.includes(managerId) ||
        (t.scope === 'branch' && t.assigned_branch_id === branchId)
      )
    )
    return delay(managerTasks)
  },
  delete: (id: number) => {
    mockTasks = mockTasks.filter(t => t.id !== id)
    return delay(null)
  },
  getStats: () => {
    const total = mockTasks.length
    const byStatus: Record<string, number> = { backlog: 0, todo: 0, in_progress: 0, in_review: 0, needs_revision: 0, done: 0, cancelled: 0 }
    const overdue = mockTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done' && t.status !== 'cancelled').length
    mockTasks.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1 })
    return delay({ total, byStatus, overdue })
  },
  getMyStats: (userId: number, branchId?: number) => {
    const myTasks = mockTasks.filter(t =>
      t.status !== 'cancelled' && (
        t.assigned_to.includes(userId) ||
        (branchId && t.scope === 'branch' && t.assigned_branch_id === branchId)
      )
    )
    const byStatus: Record<string, number> = { todo: 0, in_progress: 0, in_review: 0, needs_revision: 0, done: 0 }
    myTasks.forEach(t => { if (byStatus[t.status] !== undefined) byStatus[t.status]++ })
    const overdue = myTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length
    return delay({ total: myTasks.length, byStatus, overdue })
  },
} : {
  getAll: () => client.get<ApiResponse<Task[]>>('/index.php?endpoint=tasks').then(r => r.data),
  getOne: (id: number) => client.get<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}`).then(r => r.data),
  create: (data: TaskForm) => client.post<ApiResponse<Task>>('/index.php?endpoint=tasks', data).then(r => r.data),
  update: (id: number, data: Partial<TaskForm>) => client.put<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}`, data).then(r => r.data),
  updateStatus: (id: number, status: Task['status']) => client.patch<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}&action=status`, { status }).then(r => r.data),
  toggleSubtask: (taskId: number, subtaskId: string) => client.patch<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${taskId}&action=subtask`, { subtask_id: subtaskId }).then(r => r.data),
  addComment: (taskId: number, body: string) => client.post<ApiResponse<TaskComment>>(`/index.php?endpoint=tasks&id=${taskId}&action=comment`, { body }).then(r => r.data),
  delegate: (id: number, userIds: number[], userNames: string[], note?: string) => client.patch<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}&action=delegate`, { user_ids: userIds, user_names: userNames, note }).then(r => r.data),
  addProgressNote: (id: number, note: string) => client.patch<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}&action=progress_note`, { note }).then(r => r.data),
  submitForReview: (id: number, achievement_summary?: string, key_outcomes?: string[], challenges_faced?: string, revision_response?: string, taggedReviewers?: number[]) => client.patch<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}&action=submit`, { achievement_summary, key_outcomes, challenges_faced, revision_response, tagged_reviewers: taggedReviewers }).then(r => r.data),
  approve: (id: number) => client.patch<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}&action=approve`).then(r => r.data),
  reject: (id: number, reason: string) => client.patch<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}&action=reject`, { reason }).then(r => r.data),
  resubmit: (id: number, achievement_summary?: string, key_outcomes?: string[], challenges_faced?: string, revision_response?: string) => client.patch<ApiResponse<Task>>(`/index.php?endpoint=tasks&id=${id}&action=resubmit`, { achievement_summary, key_outcomes, challenges_faced, revision_response }).then(r => r.data),
  getMyTasks: (userId: number, branchId?: number) => client.get<ApiResponse<Task[]>>(`/index.php?endpoint=tasks&action=my&user_id=${userId}&branch_id=${branchId ?? ''}`).then(r => r.data),
  getManagerTasks: (managerId: number, branchId: number) => client.get<ApiResponse<Task[]>>(`/index.php?endpoint=tasks&action=manager&manager_id=${managerId}&branch_id=${branchId}`).then(r => r.data),
  delete: (id: number) => client.delete<ApiResponse<null>>(`/index.php?endpoint=tasks&id=${id}`).then(r => r.data),
  getStats: () => client.get<ApiResponse<{ total: number; byStatus: Record<string, number>; overdue: number }>>('/index.php?endpoint=tasks&action=stats').then(r => r.data),
  getMyStats: (userId: number, branchId?: number) => client.get<ApiResponse<{ total: number; byStatus: Record<string, number>; overdue: number }>>(`/index.php?endpoint=tasks&action=my_stats&user_id=${userId}&branch_id=${branchId ?? ''}`).then(r => r.data),
}

// ─── Notifications API ────────────────────────────────────────────────────────

export const notificationsApi = MOCK ? {
  getAll: () => delay([...mockNotifications]),
  markRead: (id: number) => {
    const idx = mockNotifications.findIndex(n => n.id === id)
    if (idx !== -1) mockNotifications[idx].read = true
    return delay(null)
  },
  markAllRead: () => {
    mockNotifications = mockNotifications.map(n => ({ ...n, read: true }))
    return delay(null)
  },
  getUnreadCount: () => delay(mockNotifications.filter(n => !n.read).length),
} : {
  getAll: () => client.get<ApiResponse<Notification[]>>('/index.php?endpoint=notifications').then(r => r.data),
  markRead: (id: number) => client.patch<ApiResponse<null>>(`/index.php?endpoint=notifications&id=${id}&action=read`).then(r => r.data),
  markAllRead: () => client.patch<ApiResponse<null>>('/index.php?endpoint=notifications&action=read_all').then(r => r.data),
  getUnreadCount: () => client.get<ApiResponse<number>>('/index.php?endpoint=notifications&action=count').then(r => r.data),
}

// ── Staff API (for logged-in staff member's own experience) ─────
export const staffApi = MOCK ? {
  // Reports assigned to this staff member's role
  getAssignedReports: (roleId: number, branchId?: number) =>
    delay(mockReports.filter(r =>
      r.status === 'published' &&
      (r.target_roles.length === 0 || r.target_roles.includes(roleId)) &&
      (r.target_branches.length === 0 || !branchId || r.target_branches.includes(branchId))
    )),
  // Staff's own previously submitted entries
  getMyEntries: (userId: number) =>
    delay(mockEntries.filter(e => e.submitted_by === userId)),
  // Resubmit a rejected entry with corrected data
  resubmit: (id: number, data: Record<string, unknown>) => {
    const idx = mockEntries.findIndex(e => e.id === id)
    if (idx !== -1) {
      mockEntries[idx] = {
        ...mockEntries[idx],
        data,
        status: 'pending',
        rejection_comment: undefined,
        updated_at: new Date().toISOString(),
      }
    }
    return delay({ ...mockEntries[idx] } as ReportEntry)
  },
} : {
  getAssignedReports: (roleId: number, branchId?: number) =>
    client.get<ApiResponse<Report[]>>(`/index.php?endpoint=staff&action=assigned&role_id=${roleId}&branch_id=${branchId ?? ''}`).then(r => r.data),
  getMyEntries: (_userId: number) =>
    client.get<ApiResponse<ReportEntry[]>>('/index.php?endpoint=staff&action=my_entries').then(r => r.data),
  resubmit: (id: number, data: Record<string, unknown>) =>
    client.put<ApiResponse<ReportEntry>>(`/index.php?endpoint=staff&action=resubmit&id=${id}`, { data }).then(r => r.data),
}

// ── Branch Manager Report Templates ───────────────────────────────────────
// Only templates created BY this manager (filtered by created_by)
const mockManagerTemplates: Report[] = [
  {
    id: 101, title: 'Staff Weekly Activity Report',
    description: 'Weekly work summary for all branch staff members.',
    category: 'Activity', priority: 'high', status: 'published', created_by: 2,
    creator_name: 'John Doe', target_roles: [3], target_branches: [2],
    fields: [
      { id: 'report_date', type: 'date',     label: 'Report Date',          required: true,  width: 'half', order: 1 },
      { id: 'activities',  type: 'textarea', label: 'Activities This Week', required: true,  width: 'full', order: 2, placeholder: 'List all tasks and accomplishments...' },
      { id: 'challenges',  type: 'textarea', label: 'Challenges Faced',     required: false, width: 'half', order: 3 },
      { id: 'next_plan',   type: 'textarea', label: 'Plan for Next Week',   required: true,  width: 'half', order: 4 },
    ],
    created_at: '2026-03-01', updated_at: '2026-03-01',
  },
  {
    id: 102, title: 'Assistant Manager Performance Report',
    description: 'Weekly team performance and coordination summary for assistant managers.',
    category: 'Performance', priority: 'high', status: 'published', created_by: 2,
    creator_name: 'John Doe', target_roles: [4], target_branches: [2],
    fields: [
      { id: 'period',         type: 'date',     label: 'Reporting Period',          required: true,  width: 'half',  order: 1 },
      { id: 'team_size',      type: 'number',   label: 'Team Size',                 required: true,  width: 'half',  order: 2 },
      { id: 'tasks_assigned', type: 'number',   label: 'Tasks Assigned',            required: true,  width: 'third', order: 3 },
      { id: 'tasks_done',     type: 'number',   label: 'Tasks Completed',           required: true,  width: 'third', order: 4 },
      { id: 'tasks_pending',  type: 'number',   label: 'Tasks Pending',             required: false, width: 'third', order: 5 },
      { id: 'performance',    type: 'textarea', label: 'Team Performance Summary',  required: true,  width: 'full',  order: 6 },
      { id: 'issues',         type: 'textarea', label: 'Issues Escalated',          required: false, width: 'full',  order: 7 },
    ],
    created_at: '2026-03-01', updated_at: '2026-03-01',
  },
  {
    id: 103, title: 'Branch Admin Compliance Report',
    description: 'Weekly compliance, resource, and administrative status report.',
    category: 'Compliance', priority: 'medium', status: 'published', created_by: 2,
    creator_name: 'John Doe', target_roles: [5], target_branches: [2],
    fields: [
      { id: 'week_ending',    type: 'date',     label: 'Week Ending',                required: true,  width: 'half',  order: 1 },
      { id: 'compliance_pct', type: 'number',   label: 'Compliance Rate (%)',         required: true,  width: 'half',  order: 2 },
      { id: 'resources',      type: 'textarea', label: 'Resource Status',             required: true,  width: 'full',  order: 3 },
      { id: 'incidents',      type: 'number',   label: 'Incidents This Week',         required: true,  width: 'half',  order: 4 },
      { id: 'incident_notes', type: 'textarea', label: 'Incident Details',            required: false, width: 'half',  order: 5 },
      { id: 'action_items',   type: 'textarea', label: 'Action Items for Next Week',  required: true,  width: 'full',  order: 6 },
    ],
    created_at: '2026-03-04', updated_at: '2026-03-04',
  },
]

// ── Branch Manager Submissions (branch 2 submissions) ─────────────────────
const mockManagerSubmissions: ReportEntry[] = [
  {
    id: 201, report_id: 101, report_title: 'Staff Weekly Activity Report',
    submitted_by: 3, submitter_name: 'Mary Smith', submitter_role: 'Staff',
    manager_name: 'John Doe', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'IT Department', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { report_date: '2026-03-31', activities: 'Fixed critical bugs in POS system. Trained 2 new staff on ticketing tool.', challenges: 'Legacy code slowed progress', next_plan: 'Complete API integration.' },
    status: 'pending', created_at: '2026-03-31T09:00:00Z', updated_at: '2026-03-31T09:00:00Z',
  },
  {
    id: 202, report_id: 101, report_title: 'Staff Weekly Activity Report',
    submitted_by: 6, submitter_name: 'Grace Eze', submitter_role: 'Staff',
    manager_name: 'John Doe', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'Sales', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { report_date: '2026-03-31', activities: 'Achieved 110% sales target. Onboarded 3 new enterprise clients.', challenges: 'One client delayed payment', next_plan: 'Follow up on pending contracts.' },
    status: 'approved', created_at: '2026-03-31T10:30:00Z', updated_at: '2026-04-01T08:00:00Z',
  },
  {
    id: 203, report_id: 102, report_title: 'Assistant Manager Performance Report',
    submitted_by: 4, submitter_name: 'Ana Cruz', submitter_role: 'Assistant Manager',
    manager_name: 'John Doe', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'Operations', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { period: '2026-03-31', team_size: 8, tasks_assigned: 24, tasks_done: 20, tasks_pending: 4, performance: 'Team performed well despite server downtime on Tuesday.', issues: 'None escalated this week.' },
    status: 'pending', created_at: '2026-03-31T11:00:00Z', updated_at: '2026-03-31T11:00:00Z',
  },
  {
    id: 204, report_id: 103, report_title: 'Branch Admin Compliance Report',
    submitted_by: 5, submitter_name: 'Ben Santos', submitter_role: 'Branch Administrator',
    manager_name: 'John Doe', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'Admin', week_start: weekStart('2026-03-31'), week_label: weekLabel('2026-03-31'),
    data: { week_ending: '2026-04-05', compliance_pct: 92, resources: 'All office supplies adequate. Generator needs servicing.', incidents: 1, incident_notes: 'Minor data access violation — resolved.', action_items: 'Schedule generator service. Update access control list.' },
    status: 'rejected', rejection_comment: 'Please provide documentation for the data access violation incident.',
    created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-02T10:00:00Z',
  },
  {
    id: 205, report_id: 101, report_title: 'Staff Weekly Activity Report',
    submitted_by: 3, submitter_name: 'Mary Smith', submitter_role: 'Staff',
    manager_name: 'John Doe', branch_id: 2, branch_name: 'Cebu Branch',
    department_name: 'IT Department', week_start: weekStart('2026-03-24'), week_label: weekLabel('2026-03-24'),
    data: { report_date: '2026-03-24', activities: 'Deployed server updates. Fixed login bug.', challenges: 'Delayed server response', next_plan: 'Complete API migration.' },
    status: 'approved', created_at: '2026-03-24T09:00:00Z', updated_at: '2026-03-25T09:00:00Z',
  },
]

// ── Branch Manager API ─────────────────────────────────────────────────────
export const branchManagerApi = MOCK ? {
  getMyTemplates: (managerId: number) =>
    delay(mockManagerTemplates.filter(t => t.created_by === managerId)),

  getBranchSubmissions: (branchId: number) =>
    delay(mockManagerSubmissions.filter(e => e.branch_id === branchId)),

  reviewSubmission: (id: number, action: { status: 'approved' | 'rejected'; comment?: string }) => {
    const idx = mockManagerSubmissions.findIndex(e => e.id === id)
    if (idx !== -1) {
      mockManagerSubmissions[idx] = {
        ...mockManagerSubmissions[idx],
        status: action.status,
        rejection_comment: action.status === 'rejected' ? (action.comment ?? '') : undefined,
        updated_at: new Date().toISOString(),
      }
    }
    return delay({ ...mockManagerSubmissions[idx] } as ReportEntry)
  },

  createTemplate: (managerId: number, data: Partial<Report>) => {
    const tpl: Report = {
      id: Date.now(), title: data.title ?? 'Untitled', description: data.description ?? '',
      category: data.category ?? 'General', priority: data.priority ?? 'medium',
      status: 'published', created_by: managerId, creator_name: 'John Doe',
      target_roles: data.target_roles ?? [], target_branches: data.target_branches ?? [],
      fields: data.fields ?? [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    mockManagerTemplates.push(tpl)
    return delay(tpl)
  },

  getBranchStats: (branchId: number) => {
    const subs = mockManagerSubmissions.filter(e => e.branch_id === branchId)
    const templates = mockManagerTemplates.filter(t => t.target_branches.includes(branchId))
    return delay({
      total_templates: templates.length,
      total_submissions: subs.length,
      pending_review: subs.filter(e => e.status === 'pending').length,
      approved: subs.filter(e => e.status === 'approved').length,
      rejected: subs.filter(e => e.status === 'rejected').length,
      compliance_rate: subs.length > 0
        ? Math.round((subs.filter(e => e.status === 'approved').length / subs.length) * 100) : 0,
    })
  },

  getBranchMembers: (branchId: number) =>
    delay(mockUsers.filter(u => u.branch_id === branchId && u.role_id !== 2)),
} : {
  getMyTemplates: (managerId: number) =>
    client.get<ApiResponse<Report[]>>(`/index.php?endpoint=manager&action=templates&manager_id=${managerId}`).then(r => r.data),
  getBranchSubmissions: (branchId: number) =>
    client.get<ApiResponse<ReportEntry[]>>(`/index.php?endpoint=manager&action=submissions&branch_id=${branchId}`).then(r => r.data),
  reviewSubmission: (id: number, action: { status: 'approved' | 'rejected'; comment?: string }) =>
    client.patch<ApiResponse<ReportEntry>>(`/index.php?endpoint=manager&action=review&id=${id}`, action).then(r => r.data),
  createTemplate: (_managerId: number, data: Partial<Report>) =>
    client.post<ApiResponse<Report>>('/index.php?endpoint=manager&action=create_template', data).then(r => r.data),
  getBranchStats: (branchId: number) =>
    client.get<ApiResponse<object>>(`/index.php?endpoint=manager&action=stats&branch_id=${branchId}`).then(r => r.data),
  getBranchMembers: (branchId: number) =>
    client.get<ApiResponse<User[]>>(`/index.php?endpoint=manager&action=members&branch_id=${branchId}`).then(r => r.data),
}
