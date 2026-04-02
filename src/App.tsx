import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />

        {/* Branches */}
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/branches/new" element={<BranchFormPage />} />
        <Route path="/branches/:id/edit" element={<BranchFormPage />} />

        {/* Departments */}
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/departments/new" element={<DepartmentFormPage />} />
        <Route path="/departments/:id/edit" element={<DepartmentFormPage />} />

        {/* Users */}
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/new" element={<UserFormPage />} />
        <Route path="/users/:id/edit" element={<UserFormPage />} />

        {/* Roles */}
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/roles/new" element={<RoleFormPage />} />
        <Route path="/roles/:id/edit" element={<RoleFormPage />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/new" element={<ReportFormPage />} />
        <Route path="/reports/builder" element={<ReportFormPage />} />
        <Route path="/reports/:id/edit" element={<ReportFormPage />} />

        {/* Entries */}
        <Route path="/entries" element={<EntriesPage />} />
        <Route path="/entries/new" element={<EntryFormPage />} />
        <Route path="/entries/:id" element={<EntryViewPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
