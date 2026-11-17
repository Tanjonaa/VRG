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
      .then(({ user }) => {
        setUser(user)
        const path = window.location.pathname
        if (user?.role === 'livreur' && !path.startsWith('/livreur')) {
          window.location.href = '/livreur'; return
        }
        if (['admin', 'moderator'].includes(user?.role) && !path.startsWith('/admin')) {
          window.location.href = '/admin'; return
        }
        return loadOrders()
      })
      .catch(() => { clearToken(); setUser(null) })
      .finally(() => setLoading(false))
  }, [loadOrders])

  /* Étape 1 : envoie le code OTP à l'adresse email */
  const sendRegisterOtp = ({ name, phone, email }) =>
    api.post('/auth/register/send-otp', { name, phone, email })

  /* Étape 2 : crée le compte avec le code reçu */
  const register = async ({ name, phone, email, otp, password, referralCode }) => {
    const { user } = await api.post('/auth/register', { name, phone, email, otp, password, referralCode })
    sessionStorage.removeItem('vrg_ref')
    setUser(user)
    await loadOrders()
  }

  /* identifier : numéro de téléphone ou adresse email */
  const login = async ({ identifier, password }) => {
    const { user } = await api.post('/auth/login', { identifier, password })
    setUser(user)
    if (['admin', 'moderator'].includes(user?.role)) {
      window.location.href = '/admin'; return
    }
    if (user?.role === 'livreur') {
      window.location.href = '/livreur'; return
    }
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
    <AuthContext.Provider value={{ user, orders, loading, register, sendRegisterOtp, login, logout, addOrder, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
