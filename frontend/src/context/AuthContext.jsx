import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, clearToken } from '../lib/api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.get('/orders')
      setOrders(data)
    } catch {
      setOrders([])
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('vrg_token')
    if (!token) { setLoading(false); return }

    api.get('/auth/me')
      .then(({ user }) => { setUser(user); return loadOrders() })
      .catch(() => { clearToken(); setUser(null) })
      .finally(() => setLoading(false))
  }, [loadOrders])

  const register = async ({ name, phone, password, referralCode }) => {
    const { user } = await api.post('/auth/register', { name, phone, password, referralCode })
    sessionStorage.removeItem('vrg_ref')
    setUser(user)
    await loadOrders()
  }

  const login = async ({ phone, password }) => {
    const { user } = await api.post('/auth/login', { phone, password })
    setUser(user)
    await loadOrders()
  }

  const logout = () => {
    clearToken()
    setUser(null)
    setOrders([])
  }

  const updateProfile = async ({ name, phone, currentPassword, newPassword }) => {
    const data = await api.put('/auth/profile', { name, phone, currentPassword, newPassword })
    setUser(data.user)
  }

  const addOrder = async (order) => {
    const newOrder = await api.post('/orders', order)
    await loadOrders()
    return newOrder
  }

  return (
    <AuthContext.Provider value={{ user, orders, loading, register, login, logout, addOrder, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
