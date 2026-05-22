import React, { useState, useEffect } from 'react'
import { LayoutDashboard, Package, ShoppingBag, Users, BarChart3, LogOut, Menu, X, Bell } from 'lucide-react'
import Dashboard   from './pages/Dashboard.jsx'
import Products    from './pages/Products.jsx'
import Orders      from './pages/Orders.jsx'
import UsersPage   from './pages/Users.jsx'
import Stocks      from './pages/Stocks.jsx'
import AdminLogin  from './AdminLogin.jsx'

const NAV = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'products',  label: 'Articles',         icon: Package },
  { id: 'orders',    label: 'Commandes',        icon: ShoppingBag },
  { id: 'users',     label: 'Clients',          icon: Users },
  { id: 'stocks',    label: 'Stocks',           icon: BarChart3 },
]

function useAdminAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('vrg_token')
    if (!token) { setLoading(false); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(({ user }) => {
        if (['admin', 'moderator'].includes(user?.role)) setUser(user)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (phone, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    if (!['admin', 'moderator'].includes(data.user?.role))
      throw new Error('Accès refusé — compte non autorisé')
    localStorage.setItem('vrg_token', data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('vrg_token')
    setUser(null)
  }

  return { user, loading, login, logout }
}

export default function AdminApp() {
  const { user, loading, login, logout } = useAdminAuth()
  const [page, setPage]     = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(true)
  const [alerts, setAlerts] = useState(0)

  useEffect(() => {
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${localStorage.getItem('vrg_token')}` } })
      .then(r => r.json()).then(d => setAlerts(d?.alerts?.low_stock || 0)).catch(() => {})
  }, [user])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07070f', color: '#fff', fontSize: 14 }}>
      Chargement…
    </div>
  )

  if (!user) return <AdminLogin onLogin={login} />

  const PageComponent = { dashboard: Dashboard, products: Products, orders: Orders, users: UsersPage, stocks: Stocks }[page]

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#07070f', color: '#f0f0f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Sidebar */}
      <aside style={{
        width: sideOpen ? 230 : 64, flexShrink: 0, transition: 'width 0.2s',
        background: '#0c0c1a', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/images/logo/logo.svg" alt="VRG" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
          {sideOpen && <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#FF9900', letterSpacing: '-0.3px' }}>VaRyGasy</div>
            <div style={{ fontSize: 10, color: 'rgba(240,240,245,0.3)', fontWeight: 500 }}>Admin</div>
          </div>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id
            return (
              <button key={id} onClick={() => setPage(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%',
                  background: active ? 'rgba(255,153,0,0.12)' : 'none',
                  color: active ? '#FF9900' : 'rgba(240,240,245,0.45)',
                  textAlign: 'left', fontSize: 13, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden',
                  position: 'relative',
                }}>
                <Icon size={16} style={{ flexShrink: 0 }} />
                {sideOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                {id === 'stocks' && alerts > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>
                    {alerts}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {sideOpen && (
            <div style={{ padding: '8px 10px', marginBottom: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: user.role === 'admin' ? '#FF9900' : '#60a5fa', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{user.role}</div>
            </div>
          )}
          <button onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontSize: 13, fontWeight: 600 }}>
            <LogOut size={15} style={{ flexShrink: 0 }} />
            {sideOpen && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, background: '#0c0c1a', flexShrink: 0 }}>
          <button onClick={() => setSideOpen(s => !s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.5)', display: 'flex', padding: 4, borderRadius: 8 }}>
            {sideOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#f0f0f5' }}>
            {NAV.find(n => n.id === page)?.label}
          </div>
          {alerts > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#f87171', fontWeight: 600 }}>
              <Bell size={13} /> {alerts} article{alerts > 1 ? 's' : ''} en rupture
            </div>
          )}
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <PageComponent user={user} onAlertsChange={setAlerts} />
        </main>
      </div>
    </div>
  )
}
