import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../../../shared/types'
import { get, post } from '../api/client'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (req: LoginRequest) => Promise<void>
  register: (req: RegisterRequest) => Promise<void>
  logout: () => void
  fetchCurrentUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchCurrentUser = async () => {
    setIsLoading(true)
    try {
      const data = await get<{ data: { user: User } }>('/api/auth/me')
      setUser(data.data.user)
      setIsAuthenticated(true)
      // biome-ignore lint/suspicious/noExplicitAny: error handling
    } catch (_error: any) {
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchCurrentUser()
    } else {
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run once on mount
  }, [fetchCurrentUser])

  const login = async (req: LoginRequest) => {
    const response = await post<{ data: AuthResponse }>('/api/auth/login', req)
    localStorage.setItem('token', response.data.token)
    setUser(response.data.user)
    setIsAuthenticated(true)
  }

  const register = async (req: RegisterRequest) => {
    const response = await post<{ data: AuthResponse }>(
      '/api/auth/register',
      req,
    )
    localStorage.setItem('token', response.data.token)
    setUser(response.data.user)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
