import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'
import { reconnect } from './events'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('fl_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const persist = (token, user) => {
    localStorage.setItem('fl_token', token)
    localStorage.setItem('fl_user', JSON.stringify(user))
    setUser(user)
    reconnect() // open SSE with the new token
  }

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password })
    persist(data.token, data.user)
    return data
  }

  const register = async (email, name, password) => {
    const data = await api.auth.register({ email, name, password })
    persist(data.token, data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('fl_token')
    localStorage.removeItem('fl_user')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
