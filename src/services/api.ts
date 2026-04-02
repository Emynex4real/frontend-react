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
  DashboardStats,
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
  permissions: [
    'manage_users', 'manage_branches', 'manage_departments',
    'manage_roles', 'manage_reports', 'view_reports',
    'submit_reports', 'approve_reports', 'export_data',
  ],
}

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
  { id: 2, name: 'Branch Manager', description: 'Manages a branch', permissions: ['view_reports','approve_reports','submit_reports'], user_count: 2, created_at: '2024-01-01' },
  { id: 3, name: 'Staff', description: 'Regular staff member', permissions: ['submit_reports','view_reports'], user_count: 5, created_at: '2024-01-01' },
]

const mockUsers: User[] = [
  { id: 1, username: 'admin', email: 'admin@digitalworld.com', full_name: 'Admin User', role_id: 1, role_name: 'Super Admin', branch_id: 1, branch_name: 'Head Office', status: 'active', created_at: '2024-01-01' },
  { id: 2, username: 'jdoe', email: 'jdoe@digitalworld.com', full_name: 'John Doe', role_id: 2, role_name: 'Branch Manager', branch_id: 2, branch_name: 'Cebu Branch', status: 'active', created_at: '2024-02-15' },
  { id: 3, username: 'msmith', email: 'msmith@digitalworld.com', full_name: 'Mary Smith', role_id: 3, role_name: 'Staff', branch_id: 1, branch_name: 'Head Office', department_id: 1, department_name: 'IT Department', status: 'active', created_at: '2024-03-01' },
]

const mockReports: Report[] = [
  {
    id: 1, title: 'Daily Attendance Report', description: 'Track daily staff attendance', category: 'Attendance',
    priority: 'high', status: 'published', created_by: 1, creator_name: 'Admin User',
    target_roles: [2, 3], target_branches: [1, 2],
    fields: [
      { id: 'f1', type: 'date', label: 'Date', required: true, width: 'half', order: 1 },
      { id: 'f2', type: 'number', label: 'Present Count', required: true, width: 'half', order: 2 },
      { id: 'f3', type: 'textarea', label: 'Notes', required: false, width: 'full', order: 3 },
    ],
    created_at: '2024-01-10', updated_at: '2024-01-10',
  },
  {
    id: 2, title: 'Monthly Sales Summary', description: 'Monthly branch sales data', category: 'Sales',
    priority: 'medium', status: 'published', created_by: 1, creator_name: 'Admin User',
    target_roles: [2], target_branches: [2],
    fields: [
      { id: 'f1', type: 'number', label: 'Total Sales', required: true, width: 'half', order: 1 },
      { id: 'f2', type: 'text', label: 'Top Product', required: false, width: 'half', order: 2 },
    ],
    created_at: '2024-02-01', updated_at: '2024-02-01',
  },
]

const mockEntries: ReportEntry[] = [
  {
    id: 1, report_id: 1, report_title: 'Daily Attendance Report',
    submitted_by: 2, submitter_name: 'John Doe', branch_id: 2, branch_name: 'Cebu Branch',
    data: { f1: '2024-04-01', f2: 7, f3: 'All present' },
    status: 'pending', created_at: '2024-04-01', updated_at: '2024-04-01',
  },
  {
    id: 2, report_id: 1, report_title: 'Daily Attendance Report',
    submitted_by: 3, submitter_name: 'Mary Smith', branch_id: 1, branch_name: 'Head Office',
    data: { f1: '2024-04-01', f2: 11, f3: '' },
    status: 'approved', created_at: '2024-04-01', updated_at: '2024-04-01',
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
  login: (_creds: LoginCredentials) => delay(mockUser),
  logout: () => delay(null),
  me: () => delay(mockUser),
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
  getAll: () => delay(mockEntries),
  getOne: (id: number) => delay(mockEntries.find(e => e.id === id)!),
  create: (data: ReportEntryForm) => delay({ ...data, id: Date.now(), submitted_by: 1, submitter_name: 'Admin User', branch_id: 1, branch_name: 'Head Office', status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as ReportEntry),
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

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = MOCK ? {
  getStats: () => delay(mockStats),
} : {
  getStats: () =>
    client.get<ApiResponse<DashboardStats>>('/index.php?endpoint=dashboard&action=stats').then(r => r.data),
}

export default client
