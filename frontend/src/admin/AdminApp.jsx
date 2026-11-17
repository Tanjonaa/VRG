import React, { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Package, ShoppingBag, Users, BarChart3, Settings2, UserSquare2, Scroll, LogOut, Menu, X, Bell, MessageSquare, Shield, Lock, Receipt, PanelLeftClose, PanelLeftOpen, ExternalLink } from 'lucide-react'
import PasswordModal from './components/PasswordModal.jsx'
import Dashboard    from './pages/Dashboard.jsx'
import Products     from './pages/Products.jsx'
import Orders       from './pages/Orders.jsx'
import UsersPage    from './pages/Users.jsx'
import Stocks       from './pages/Stocks.jsx'
import SettingsPage from './pages/Settings.jsx'
import TeamAdmin    from './pages/Team.jsx'
import LogsPage     from './pages/Logs.jsx'
import MsgsPage     from './pages/Msgs.jsx'
import Accounting   from './pages/Accounting.jsx'
import AdminLogin   from './AdminLogin.jsx'

const NAV = [
  { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard, group: 'Pilotage' },
  { id: 'orders',     label: 'Commandes',       icon: ShoppingBag,     group: 'Pilotage' },
  { id: 'msgs',       label: 'Messages',        icon: MessageSquare,   group: 'Pilotage' },
  { id: 'products',   label: 'Articles',        icon: Package,         group: 'Catalogue' },
  { id: 'stocks',     label: 'Stocks',          icon: BarChart3,       group: 'Catalogue' },
  { id: 'accounting', label: 'Comptabilité',    icon: Receipt,         group: 'Finance', adminOnly: true },
  { id: 'users',      label: 'Clients',         icon: Users,           group: 'Comptes',  adminOnly: true },
  { id: 'staff',      label: 'Staff',           icon: Shield,          group: 'Comptes',  adminOnly: true },
  { id: 'team',       label: 'Équipe',          icon: UserSquare2,     group: 'Configuration' },
  { id: 'settings',   label: 'Paramètres',      icon: Settings2,       group: 'Configuration', adminOnly: true },
  { id: 'logs',       label: 'Historique',      icon: Scroll,          group: 'Configuration', adminOnly: true },
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

  /* Identifiant : email ou téléphone (le backend accepte les deux) */
  const login = async (identifier, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
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

/* ── Déconnexion auto après inactivité ── */
const IDLE_TIMEOUT = 60 * 60 * 1000   // 1 h d'inactivité avant déconnexion auto
function useIdleLogout(user, logout) {
  const lastActivity = useRef(Date.now())
  useEffect(() => {
    if (!user) return
    lastActivity.current = Date.now()
    const bump = () => { lastActivity.current = Date.now() }
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, bump, { capture: true, passive: true }))
    const t = setInterval(() => {
      if (Date.now() - lastActivity.current >= IDLE_TIMEOUT) {
        sessionStorage.setItem('vrg_idle_logout', '1')
        logout()
      }
    }, 10000)
    return () => {
      events.forEach(e => window.removeEventListener(e, bump, { capture: true }))
      clearInterval(t)
    }
  }, [user])
}

/* ── Notifications temps réel (polling 5s) ── */
function useNotifications(user) {
  const [notifs, setNotifs] = useState({ orders: 0, msgs: 0 })
  const [toasts, setToasts] = useState([])
  /* null = pas encore de référence : le premier poll ne notifie jamais,
     il établit la base de comparaison. Sinon chaque rechargement de la
     page re-toaste les commandes en attente existantes. */
  const prev = useRef(null)
  const timer = useRef(null)
  /* Horloge serveur (renvoyée par l'API) — seule référence valable pour "since" :
     l'horloge du navigateur est en UTC, created_at en heure locale serveur */
  const serverNow = useRef(null)

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
        const since = localStorage.getItem('vrg_admin_msgs_seen') || ''
        const res = await fetch(
          `/api/admin/notifications${since ? `?since=${encodeURIComponent(since)}` : ''}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('vrg_token')}` } }
        )
        if (!res.ok) return
        const data = await res.json()
        if (data.server_now) serverNow.current = data.server_now

        const p = prev.current

        /* Notifie uniquement les vrais accroissements (jamais au premier poll) */
        if (p) {
          if (data.pending_orders > p.orders) {
            const n = data.pending_orders - p.orders
            addToast(`${n} nouvelle${n > 1 ? 's' : ''} commande${n > 1 ? 's' : ''} en attente`, 'var(--color-gold)')
            sendBrowserNotif('VaRyGasy Admin — Nouvelle commande',
              `${n} commande${n > 1 ? 's' : ''} en attente`)
          }
          if (data.unread_msgs > p.msgs) {
            const n = data.unread_msgs - p.msgs
            addToast(`${n} nouveau${n > 1 ? 'x' : ''} message${n > 1 ? 's' : ''}`, 'var(--color-violet)')
            sendBrowserNotif('VaRyGasy Admin — Nouveau message',
              `${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}`)
          }
        }

        prev.current = { orders: data.pending_orders, msgs: data.unread_msgs }
        setNotifs({ orders: data.pending_orders, msgs: data.unread_msgs })
      } catch {}
    }

    poll()
    /* 15 s : assez réactif, et évite de déclencher le WAF o2switch (Tiger Protect)
       qui prend les rafales de requêtes pour du trafic de bot */
    timer.current = setInterval(poll, 15000)
    return () => clearInterval(timer.current)
  }, [user])

  /* Efface les badges SANS toucher à la référence de comparaison —
     sinon le prochain poll re-notifie les éléments déjà vus (boucle) */
  const clearMsgs = () => {
    /* Toujours l'horloge SERVEUR — jamais new Date() (décalage UTC/local) */
    if (serverNow.current) localStorage.setItem('vrg_admin_msgs_seen', serverNow.current)
    if (prev.current) prev.current.msgs = 0   // le compteur serveur retombe à 0 avec le nouveau "since"
    setNotifs(n => ({ ...n, msgs: 0 }))
  }

  const clearOrders = () => {
    setNotifs(n => ({ ...n, orders: 0 }))
  }

  return { notifs, toasts, addToast, clearMsgs, clearOrders }
}

/* ── Présence staff (polling 15s) ── */
const TOAST_COOLDOWN = 10 * 60 * 1000
function useOnlineStaff(user, addToast) {
  const [online, setOnline] = useState([])
  const prevIds = useRef(null)
  const lastToastAt = useRef({})   // id → timestamp du dernier toast (anti-boucle)

  useEffect(() => {
    if (!user) return
    const poll = async () => {
      try {
        const res = await fetch('/api/admin/online', { headers: { Authorization: `Bearer ${localStorage.getItem('vrg_token')}` } })
        if (!res.ok) return
        const rows = await res.json()
        setOnline(rows)
        /* Notifie les nouvelles connexions : pas au premier chargement, pas
           soi-même, seulement si l'activité est réellement récente (ago < 60 s),
           et au plus un toast par personne par période de cooldown — sinon le
           throttling des onglets en arrière-plan fait "flapper" la présence
           et le même toast revient en boucle */
        if (prevIds.current) {
          rows.forEach(r => {
            const isNew    = !prevIds.current.has(r.id) && r.id !== user.id
            const isFresh  = (r.ago ?? 999) < 60
            const cooledDown = !lastToastAt.current[r.id] || Date.now() - lastToastAt.current[r.id] > TOAST_COOLDOWN
            if (isNew && isFresh && cooledDown) {
              addToast(`${r.name} (${r.role === 'admin' ? 'admin' : 'modérateur'}) est en ligne`, 'var(--color-success)')
              lastToastAt.current[r.id] = Date.now()
            }
          })
        }
        prevIds.current = new Set(rows.map(r => r.id))
      } catch {}
    }
    poll()
    const t = setInterval(poll, 30000)
    return () => clearInterval(t)
  }, [user])

  return online
}

/* Modale de changement de mot de passe : voir components/PasswordModal.jsx */

/* ── Toasts ── */
function ToastStack({ toasts }) {
  return (
    <div className="adm-toasts" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="adm-toast">
          <span className="adm-toast__bar" style={{ background: t.color }} aria-hidden="true" />
          {t.text}
        </div>
      ))}
    </div>
  )
}

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'

const isMobile = () => window.matchMedia('(max-width: 768px)').matches

export default function AdminApp() {
  const { user, loading, login, logout } = useAdminAuth()
  useIdleLogout(user, logout)
  const [page, setPage]           = useState('dashboard')
  /* Desktop : sidebar dépliée / réduite. Mobile : tiroir ouvert / fermé. */
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('vrg_adm_side') === 'collapsed' } catch { return false }
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [alerts, setAlerts]       = useState(0)
  const [showPwd, setShowPwd]     = useState(false)
  const { notifs, toasts, addToast, clearMsgs, clearOrders } = useNotifications(user)
  const online = useOnlineStaff(user, addToast)

  useEffect(() => {
    if (!user) return
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

  /* Échap ferme le tiroir mobile */
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = e => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const navigate = (id) => {
    setPage(id)
    setDrawerOpen(false)
    if (id === 'msgs')   clearMsgs()
    if (id === 'orders') clearOrders()
  }

  const toggleSide = () => {
    if (isMobile()) { setDrawerOpen(o => !o); return }
    setCollapsed(c => {
      try { localStorage.setItem('vrg_adm_side', c ? 'open' : 'collapsed') } catch {}
      return !c
    })
  }

  if (loading) return (
    <div className="adm-login" aria-busy="true">
      <img src="/images/logo/logo.svg" alt="" width="44" height="44" style={{ borderRadius: 12, animation: 'pulse 1.4s infinite' }} />
    </div>
  )

  if (!user) return <AdminLogin onLogin={login} />

  const safePage = visibleNav.some(n => n.id === page) ? page : 'dashboard'
  const PageComponent = { dashboard: Dashboard, products: Products, orders: Orders, users: ClientsSection, staff: StaffSection, stocks: Stocks, team: TeamAdmin, settings: SettingsPage, logs: LogsPage, msgs: MsgsPage, accounting: Accounting }[safePage]
  const activeOnline = online.filter(o => (o.ago ?? 0) < 60).length

  const badgeFor = id => id === 'orders' ? { n: notifs.orders, cls: '' }
                       : id === 'msgs'   ? { n: notifs.msgs, cls: 'adm-count--violet' }
                       : id === 'stocks' ? { n: alerts, cls: '' }
                       : { n: 0 }

  /* Regroupe la navigation par section (titres visibles quand la sidebar est dépliée) */
  let lastGroup = null

  return (
    <div className="adm-shell">
      <a href="#adm-main" className="vs-skip">Aller au contenu</a>
      <ToastStack toasts={toasts} />

      {/* ── Sidebar ── */}
      <aside className={`adm-side${collapsed ? ' adm-side--collapsed' : ''}${drawerOpen ? ' adm-side--open' : ''}`} aria-label="Navigation admin">
        <div className="adm-side__brand">
          <img src="/images/logo/logo.svg" alt="" />
          <div className="adm-hide-collapsed" style={{ minWidth: 0, flex: 1 }}>
            <div className="adm-side__name">VaRyGasy</div>
            <div className="adm-side__tag">Back-office</div>
          </div>
          <button type="button" className="adm-icon-btn adm-only-mobile" onClick={() => setDrawerOpen(false)} aria-label="Fermer le menu">
            <X size={18} />
          </button>
        </div>

        <nav className="adm-side__nav">
          {visibleNav.map(({ id, label, icon: Icon, group }) => {
            const showGroup = group !== lastGroup
            lastGroup = group
            const { n, cls } = badgeFor(id)
            const active = safePage === id
            return (
              <React.Fragment key={id}>
                {showGroup && <div className="adm-side__group">{group}</div>}
                <button type="button" className="adm-nav-item" onClick={() => navigate(id)}
                  aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined}>
                  <span className="adm-nav-item__icon">
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    {n > 0 && <span className="adm-nav-item__dot" style={{ background: cls ? 'var(--color-violet)' : 'var(--color-danger)' }} />}
                  </span>
                  <span className="adm-nav-item__label">{label}</span>
                  {n > 0 && <span className={`adm-count ${cls}`}>{n > 99 ? '99+' : n}</span>}
                </button>
              </React.Fragment>
            )
          })}
        </nav>

        <div className="adm-side__foot">
          {online.length > 0 && (
            <div className="adm-presence adm-hide-collapsed">
              <div className="adm-presence__title">En ligne · {activeOnline}</div>
              <div style={{ maxHeight: 92, overflowY: 'auto' }}>
                {online.map(o => {
                  const active = (o.ago ?? 0) < 60
                  return (
                    <div key={o.id} className="adm-presence__row" style={{ opacity: active ? 1 : 0.6 }}>
                      <span className={`adm-dot${active ? '' : ' adm-dot--idle'}`} />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.name}{o.id === user.id ? ' (toi)' : ''}
                      </span>
                      <span className={`adm-role adm-role--${o.role === 'admin' ? 'admin' : 'moderator'}`}>{o.role === 'admin' ? 'Admin' : 'Mod'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Compte + actions : icônes à droite (sidebar dépliée) ou empilées (réduite) */}
          <div className={collapsed ? '' : 'adm-user'} style={collapsed ? { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } : { padding: '8px 6px 8px 10px' }}>
            <span className="adm-avatar" title={collapsed ? user.name : undefined} aria-hidden="true">{initials(user.name)}</span>
            <div className="adm-hide-collapsed" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <span className={`adm-role adm-role--${user.role === 'admin' ? 'admin' : 'moderator'}`}>{user.role === 'admin' ? 'Admin' : 'Modérateur'}</span>
            </div>
            <button type="button" className="adm-icon-btn" onClick={() => setShowPwd(true)}
              title="Changer mon mot de passe" aria-label="Changer mon mot de passe" style={{ width: 36, height: 36 }}>
              <Lock size={16} />
            </button>
            <button type="button" className="adm-icon-btn" onClick={logout}
              title="Se déconnecter" aria-label="Se déconnecter" style={{ width: 36, height: 36, color: 'var(--color-danger-text)' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="adm-side-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />

      {/* ── Colonne principale ── */}
      <div className="adm-main-col">
        <header className="adm-top">
          <button type="button" className="adm-icon-btn" onClick={toggleSide}
            aria-label={collapsed ? 'Déplier le menu' : 'Menu'} aria-expanded={drawerOpen || undefined}>
            <span className="adm-only-mobile" style={{ display: 'inline-flex' }}><Menu size={20} /></span>
            <span className="adm-hide-mobile" style={{ display: 'inline-flex' }}>
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </span>
          </button>
          <h1 className="adm-top__title">{NAV.find(n => n.id === safePage)?.label}</h1>

          <div className="adm-top__actions">
            {notifs.orders > 0 && (
              <button type="button" className="adm-pill adm-pill--gold" onClick={() => navigate('orders')}>
                <ShoppingBag size={15} /> {notifs.orders}<span className="adm-pill__txt">&nbsp;en attente</span>
              </button>
            )}
            {notifs.msgs > 0 && (
              <button type="button" className="adm-pill adm-pill--violet" onClick={() => navigate('msgs')}>
                <MessageSquare size={15} /> {notifs.msgs}<span className="adm-pill__txt">&nbsp;message{notifs.msgs > 1 ? 's' : ''}</span>
              </button>
            )}
            {alerts > 0 && (
              <button type="button" className="adm-pill adm-pill--danger" onClick={() => navigate('stocks')}>
                <Bell size={15} /> {alerts}<span className="adm-pill__txt">&nbsp;en rupture</span>
              </button>
            )}
            <a href="/" target="_blank" rel="noopener" className="adm-icon-btn adm-hide-mobile" title="Voir la boutique" aria-label="Voir la boutique">
              <ExternalLink size={17} />
            </a>
          </div>
        </header>

        <main id="adm-main" className="adm-main" tabIndex={-1}>
          <div className="adm-page">
            <PageComponent user={user} onAlertsChange={setAlerts} />
          </div>
        </main>
      </div>

      {showPwd && (
        <PasswordModal
          onClose={() => setShowPwd(false)}
          onDone={() => { setShowPwd(false); addToast('Mot de passe mis à jour', 'var(--color-success)') }}
        />
      )}
    </div>
  )
}
