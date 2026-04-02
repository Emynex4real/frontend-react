import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from '../services/api'
import type { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.me()
      .then(res => { if (res.success && res.data) setUser(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password })
    if (res.success && res.data) {
      setUser(res.data)
    } else {
      throw new Error(res.message ?? 'Login failed')
    }
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  const can = (permission: string) => user?.permissions.includes(permission) ?? false

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
