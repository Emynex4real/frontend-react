import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'

// Admin pages
import DashboardPage from './pages/DashboardPage'
import BranchesPage from './pages/branches/BranchesPage'
import BranchFormPage from './pages/branches/BranchFormPage'
import DepartmentsPage from './pages/departments/DepartmentsPage'
import DepartmentFormPage from './pages/departments/DepartmentFormPage'
import UsersPage from './pages/users/UsersPage'
import UserFormPage from './pages/users/UserFormPage'
import RolesPage from './pages/roles/RolesPage'
import RoleFormPage from './pages/roles/RoleFormPage'
import ReportsPage from './pages/reports/ReportsPage'
import ReportFormPage from './pages/reports/ReportFormPage'
import EntriesPage from './pages/entries/EntriesPage'
import EntryFormPage from './pages/entries/EntryFormPage'
import EntryViewPage from './pages/entries/EntryViewPage'
import SubmissionsPage from './pages/submissions/SubmissionsPage'
import SubmissionDetailPage from './pages/submissions/SubmissionDetailPage'

// Staff pages
import StaffDashboardPage from './pages/staff/StaffDashboardPage'
import AssignedReportsPage from './pages/staff/AssignedReportsPage'
import MySubmissionsPage from './pages/staff/MySubmissionsPage'
import ResubmitEntryPage from './pages/staff/ResubmitEntryPage'

// Branch Manager pages
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage'
import ManagerTemplatesPage from './pages/manager/ManagerTemplatesPage'
import ManagerCreateTemplatePage from './pages/manager/ManagerCreateTemplatePage'
import ManagerSubmissionsPage from './pages/manager/ManagerSubmissionsPage'
import ManagerSubmissionDetailPage from './pages/manager/ManagerSubmissionDetailPage'
import ManagerTeamPage from './pages/manager/ManagerTeamPage'

// ── Smart Dashboard: renders the correct landing page by role ──────────────
function SmartDashboard() {
  const { isAdmin, isManager } = useAuth()
  if (isAdmin())   return <DashboardPage />
  if (isManager()) return <ManagerDashboardPage />
  return <StaffDashboardPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Layout />}>
        {/* ── Landing (role-aware) ── */}
        <Route index element={<SmartDashboard />} />

        {/* ── Admin-only ── */}
        <Route path="/staff"               element={<StaffDashboardPage />} />
        <Route path="/branches"            element={<BranchesPage />} />
        <Route path="/branches/new"        element={<BranchFormPage />} />
        <Route path="/branches/:id/edit"   element={<BranchFormPage />} />
        <Route path="/departments"         element={<DepartmentsPage />} />
        <Route path="/departments/new"     element={<DepartmentFormPage />} />
        <Route path="/departments/:id/edit" element={<DepartmentFormPage />} />
        <Route path="/users"               element={<UsersPage />} />
        <Route path="/users/new"           element={<UserFormPage />} />
        <Route path="/users/:id/edit"      element={<UserFormPage />} />
        <Route path="/roles"               element={<RolesPage />} />
        <Route path="/roles/new"           element={<RoleFormPage />} />
        <Route path="/roles/:id/edit"      element={<RoleFormPage />} />
        <Route path="/reports"             element={<ReportsPage />} />
        <Route path="/reports/new"         element={<ReportFormPage />} />
        <Route path="/reports/builder"     element={<ReportFormPage />} />
        <Route path="/reports/:id/edit"    element={<ReportFormPage />} />
        <Route path="/entries"             element={<EntriesPage />} />
        <Route path="/entries/new"         element={<EntryFormPage />} />
        <Route path="/entries/:id"         element={<EntryViewPage />} />
        <Route path="/submissions"         element={<SubmissionsPage />} />
        <Route path="/submissions/:id"     element={<SubmissionDetailPage />} />

        {/* ── Branch Manager pages ── */}
        <Route path="/manager"                          element={<ManagerDashboardPage />} />
        <Route path="/manager/templates"               element={<ManagerTemplatesPage />} />
        <Route path="/manager/templates/new"           element={<ManagerCreateTemplatePage />} />
        <Route path="/manager/submissions"             element={<ManagerSubmissionsPage />} />
        <Route path="/manager/submissions/:id"         element={<ManagerSubmissionDetailPage />} />
        <Route path="/manager/team"                    element={<ManagerTeamPage />} />

        {/* ── Staff pages (also visible to manager for their own reports) ── */}
        <Route path="/my-reports"                      element={<AssignedReportsPage />} />
        <Route path="/my-submissions"                  element={<MySubmissionsPage />} />
        <Route path="/my-submissions/:id/resubmit"     element={<ResubmitEntryPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
