import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User } from '@/types/auth'
import { apiClient } from '@/lib/api-client'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setIsLoading(false)
      return
    }

    apiClient<User>('/auth/me')
      .then((userData) => {
        setUser(userData)
      })
      .catch(() => {
        localStorage.removeItem('token')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用')
  }
  return context
}
