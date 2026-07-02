import React, { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Package, ShoppingBag, Users, BarChart3, Settings2, UserSquare2, Scroll, LogOut, Menu, X, Bell, MessageSquare, Shield } from 'lucide-react'
import Dashboard    from './pages/Dashboard.jsx'
import Products     from './pages/Products.jsx'
import Orders       from './pages/Orders.jsx'
import UsersPage    from './pages/Users.jsx'
import Stocks       from './pages/Stocks.jsx'
import SettingsPage from './pages/Settings.jsx'
import TeamAdmin    from './pages/Team.jsx'
import LogsPage     from './pages/Logs.jsx'
import MsgsPage     from './pages/Msgs.jsx'
import AdminLogin   from './AdminLogin.jsx'

const NAV = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'products',  label: 'Articles',         icon: Package },
  { id: 'orders',    label: 'Commandes',        icon: ShoppingBag },
  { id: 'stocks',    label: 'Stocks',           icon: BarChart3 },
  { id: 'team',      label: 'Équipe',           icon: UserSquare2 },
  { id: 'msgs',      label: 'Messages',         icon: MessageSquare },
  { id: 'settings',  label: 'Paramètres',       icon: Settings2,  adminOnly: true },
  { id: 'users',     label: 'Clients',          icon: Users,      adminOnly: true },
  { id: 'staff',     label: 'Staff',            icon: Shield,     adminOnly: true },
  { id: 'logs',      label: 'Historique',       icon: Scroll,     adminOnly: true },
]

/* Deux vues de la même page Users — définies au niveau module pour
   garder une identité de composant stable entre les re-renders */
const ClientsSection = (props) => <UsersPage {...props} section="clients" />
const StaffSection   = (props) => <UsersPage {...props} section="staff" />

/* ── Auth ── */
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

/* ── Notifications temps réel (polling 5s) ── */
function useNotifications(user) {
  const [notifs, setNotifs] = useState({ orders: 0, msgs: 0 })
  const [toasts, setToasts] = useState([])
  const prev = useRef({ orders: 0, msgs: 0 })
  const timer = useRef(null)

  const addToast = (text, color) => {
    const id = Date.now()
    setToasts(t => [...t, { id, text, color }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  const sendBrowserNotif = (title, body) => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/images/logo/logo.svg', silent: false }) }
      catch {}
    }
  }

  useEffect(() => {
    if (!user) return

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const poll = async () => {
      try {
        const since = localStorage.getItem('vrg_admin_msgs_seen')
          || new Date(Date.now() - 86400000).toISOString()
        const res = await fetch(
          `/api/admin/notifications?since=${encodeURIComponent(since)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('vrg_token')}` } }
        )
        if (!res.ok) return
        const data = await res.json()

        const p = prev.current

        /* Nouvelles commandes */
        if (data.pending_orders > p.orders) {
          const n = data.pending_orders - p.orders
          addToast(`🛍 ${n} nouvelle${n > 1 ? 's' : ''} commande${n > 1 ? 's' : ''} en attente`, '#FF9900')
          sendBrowserNotif('VaRyGasy Admin — Nouvelle commande',
            `${n} commande${n > 1 ? 's' : ''} en attente`)
        }

        /* Nouveaux messages */
        if (data.unread_msgs > p.msgs) {
          const n = data.unread_msgs - p.msgs
          addToast(`💬 ${n} nouveau${n > 1 ? 'x' : ''} message${n > 1 ? 's' : ''}`, '#a78bfa')
          sendBrowserNotif('VaRyGasy Admin — Nouveau message',
            `${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}`)
        }

        prev.current = { orders: data.pending_orders, msgs: data.unread_msgs }
        setNotifs({ orders: data.pending_orders, msgs: data.unread_msgs })
      } catch {}
    }

    poll()
    timer.current = setInterval(poll, 5000)
    return () => clearInterval(timer.current)
  }, [user])

  const clearMsgs = () => {
    localStorage.setItem('vrg_admin_msgs_seen', new Date().toISOString())
    prev.current.msgs = 0
    setNotifs(n => ({ ...n, msgs: 0 }))
  }

  const clearOrders = () => {
    prev.current.orders = 0
    setNotifs(n => ({ ...n, orders: 0 }))
  }

  return { notifs, toasts, clearMsgs, clearOrders }
}

/* ── Toast container ── */
function ToastStack({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id}
          style={{
            background: '#0c0c1a', border: `1px solid ${t.color}40`,
            borderLeft: `3px solid ${t.color}`,
            borderRadius: 12, padding: '10px 16px',
            fontSize: 13, fontWeight: 600, color: '#f0f0f5',
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${t.color}15`,
            animation: 'slideIn 0.25s ease',
            display: 'flex', alignItems: 'center', gap: 8,
            minWidth: 240,
          }}>
          {t.text}
        </div>
      ))}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  )
}

/* ── Badge ── */
function Badge({ count, color = '#ef4444' }) {
  if (!count) return null
  return (
    <span style={{
      marginLeft: 'auto', background: color, color: color === '#a78bfa' ? '#000' : '#fff',
      fontSize: 10, fontWeight: 800, borderRadius: 99,
      padding: '1px 6px', flexShrink: 0, minWidth: 18, textAlign: 'center',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function AdminApp() {
  const { user, loading, login, logout } = useAdminAuth()
  const [page, setPage]         = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(true)
  const [alerts, setAlerts]     = useState(0)
  const { notifs, toasts, clearMsgs, clearOrders } = useNotifications(user)

  useEffect(() => {
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${localStorage.getItem('vrg_token')}` } })
      .then(r => r.json()).then(d => setAlerts(d?.alerts?.low_stock || 0)).catch(() => {})
  }, [user])

  const isAdmin = user?.role === 'admin'
  const visibleNav = NAV.filter(n => !n.adminOnly || isAdmin)

  useEffect(() => {
    if (!user) return
    const allowed = visibleNav.map(n => n.id)
    if (!allowed.includes(page)) setPage('dashboard')
  }, [user?.role])

  const navigate = (id) => {
    setPage(id)
    if (id === 'msgs')   clearMsgs()
    if (id === 'orders') clearOrders()
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07070f', color: '#fff', fontSize: 14 }}>
      Chargement…
    </div>
  )

  if (!user) return <AdminLogin onLogin={login} />

  const safePage = visibleNav.some(n => n.id === page) ? page : 'dashboard'
  const PageComponent = { dashboard: Dashboard, products: Products, orders: Orders, users: ClientsSection, staff: StaffSection, stocks: Stocks, team: TeamAdmin, settings: SettingsPage, logs: LogsPage, msgs: MsgsPage }[safePage]

  const totalNotifs = notifs.orders + notifs.msgs

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#07070f', color: '#f0f0f5', fontFamily: 'system-ui, sans-serif' }}>

      <ToastStack toasts={toasts} />

      {/* Sidebar */}
      <aside style={{
        width: sideOpen ? 230 : 64, flexShrink: 0, transition: 'width 0.2s',
        background: '#0c0c1a', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src="/images/logo/logo.svg" alt="VRG" style={{ width: 32, height: 32, borderRadius: 8 }} />
            {totalNotifs > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', background: '#ef4444', border: '2px solid #0c0c1a', animation: 'pulse 2s infinite' }} />
            )}
          </div>
          {sideOpen && <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#FF9900', letterSpacing: '-0.3px' }}>VaRyGasy</div>
            <div style={{ fontSize: 10, color: 'rgba(240,240,245,0.3)', fontWeight: 500 }}>Admin</div>
          </div>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visibleNav.map(({ id, label, icon: Icon }) => {
            const active = safePage === id
            const badge = id === 'orders' ? notifs.orders
                        : id === 'msgs'   ? notifs.msgs
                        : id === 'stocks' ? alerts
                        : 0
            const badgeColor = id === 'msgs' ? '#a78bfa' : '#ef4444'
            return (
              <button key={id} onClick={() => navigate(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%',
                  background: active ? 'rgba(255,153,0,0.12)' : 'none',
                  color: active ? '#FF9900' : 'rgba(240,240,245,0.45)',
                  textAlign: 'left', fontSize: 13, fontWeight: active ? 700 : 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', position: 'relative',
                }}>
                <span style={{ position: 'relative', flexShrink: 0 }}>
                  <Icon size={16} />
                  {badge > 0 && !sideOpen && (
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: badgeColor, border: '1.5px solid #0c0c1a' }} />
                  )}
                </span>
                {sideOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{label}</span>}
                {sideOpen && badge > 0 && <Badge count={badge} color={badgeColor} />}
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
            {NAV.find(n => n.id === safePage)?.label}
          </div>

          {/* Notification chips */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {notifs.orders > 0 && (
              <button onClick={() => navigate('orders')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#FF9900', fontWeight: 600, cursor: 'pointer' }}>
                <ShoppingBag size={13} /> {notifs.orders} commande{notifs.orders > 1 ? 's' : ''} en attente
              </button>
            )}
            {notifs.msgs > 0 && (
              <button onClick={() => navigate('msgs')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#a78bfa', fontWeight: 600, cursor: 'pointer' }}>
                <MessageSquare size={13} /> {notifs.msgs} message{notifs.msgs > 1 ? 's' : ''}
              </button>
            )}
            {alerts > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#f87171', fontWeight: 600 }}>
                <Bell size={13} /> {alerts} en rupture
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <PageComponent user={user} onAlertsChange={setAlerts} />
        </main>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}