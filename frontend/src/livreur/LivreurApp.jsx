import React, { useState, useEffect, useCallback } from 'react'
import { LogOut, MapPin, Package, Clock, Phone, User, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

const TOKEN_KEY = 'vrg_livreur_token'

/* ── Auth ── */
function useAuth() {
  const [user, setUser]     = useState(null)
  const [loading, setLoad]  = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setLoad(false); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(({ user }) => { if (user?.role === 'livreur') setUser(user) })
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  const login = async (phone, password) => {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    if (data.user?.role !== 'livreur') throw new Error('Compte non autorisé')
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
  }

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null) }
  return { user, loading, login, logout }
}

/* ── Login screen ── */
function Login({ onLogin }) {
  const [phone, setPhone]   = useState('')
  const [pass, setPass]     = useState('')
  const [err, setErr]       = useState('')
  const [busy, setBusy]     = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await onLogin(phone, pass) }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#07070f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/images/logo/logo.svg" alt="VRG" style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 14 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: '#FF9900', letterSpacing: '-0.5px' }}>Espace Livreur</div>
          <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.4)', marginTop: 4 }}>VaRyGasy — Livraisons</div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Numéro de téléphone"
            style={inputStyle}
          />
          <input
            type="password" value={pass} onChange={e => setPass(e.target.value)}
            placeholder="Mot de passe"
            style={inputStyle}
          />
          {err && <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: '10px 14px' }}>{err}</div>}
          <button type="submit" disabled={busy}
            style={{ padding: '14px', borderRadius: 12, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, background: busy ? 'rgba(255,153,0,0.4)' : 'linear-gradient(135deg,#FF9900,#CC5500)', color: '#fff', marginTop: 4 }}>
            {busy ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Order card ── */
function OrderCard({ order, onStatusChange }) {
  const [open, setOpen]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const isCash = order.payment === 'livraison'

  const nextStatus = order.status === 'Confirmé' ? 'En livraison' : order.status === 'En livraison' ? 'Livré' : null
  const nextLabel  = order.status === 'Confirmé' ? '🛵 Prendre en charge' : 'Marquer comme livré ✓'

  const handleStatus = async () => {
    if (!nextStatus) return
    setBusy(true)
    try {
      const res = await fetch(`/api/livreur/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) onStatusChange(order.id, nextStatus)
    } finally { setBusy(false) }
  }

  const statusColor = order.status === 'Confirmé' ? '#22c55e' : order.status === 'En livraison' ? '#60a5fa' : '#a78bfa'

  return (
    <div style={{ background: '#0c0c1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#f0f0f5' }}>#{order.id}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}35`, borderRadius: 99, padding: '2px 8px' }}>
            {order.status}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.35)' }}>{order.date}</div>
      </div>

      {/* Montant à collecter */}
      <div style={{
        margin: '0 12px 12px',
        borderRadius: 12,
        padding: '14px 16px',
        background: isCash ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isCash ? 'rgba(255,153,0,0.25)' : 'rgba(255,255,255,0.07)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: isCash ? '#FF9900' : 'rgba(240,240,245,0.4)', marginBottom: 3 }}>
            {isCash ? 'À encaisser' : 'Frais de livraison'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: isCash ? '#FF9900' : 'rgba(240,240,245,0.6)', letterSpacing: '-0.5px' }}>
            Ar {(isCash ? order.total : order.delivery_fee).toLocaleString('fr-FR')}
          </div>
          {isCash && order.delivery_fee > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', marginTop: 2 }}>
              dont Ar {order.delivery_fee.toLocaleString('fr-FR')} de livraison
            </div>
          )}
        </div>
        <div style={{ fontSize: 28 }}>{isCash ? '💵' : '✅'}</div>
      </div>

      {/* Infos client */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <InfoRow icon={<User size={14} />}    text={order.user_name} />
        <InfoRow icon={<Phone size={14} />}   text={order.user_phone} />
        <InfoRow icon={<MapPin size={14} />}  text={order.address} bold />
        {order.hours && <InfoRow icon={<Clock size={14} />} text={`Disponible : ${order.hours}`} />}
        {order.note  && <InfoRow icon={<Package size={14} />} text={order.note} muted />}
      </div>

      {/* Articles (expandable) */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(240,240,245,0.5)', fontSize: 13 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Package size={13} /> {order.items?.length || 0} article{order.items?.length > 1 ? 's' : ''}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'rgba(240,240,245,0.6)' }}>{item.name} ×{item.qty}</span>
              <span style={{ fontWeight: 600, color: '#f0f0f5' }}>Ar {(item.price * item.qty).toLocaleString('fr-FR')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action */}
      {nextStatus && (
        <div style={{ padding: '12px' }}>
          <button onClick={handleStatus} disabled={busy}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, background: nextStatus === 'Livré' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: '#fff', opacity: busy ? 0.6 : 1 }}>
            {busy ? '...' : nextLabel}
          </button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, text, bold, muted }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: muted ? 'rgba(240,240,245,0.3)' : bold ? '#f0f0f5' : 'rgba(240,240,245,0.55)', fontSize: 13, fontWeight: bold ? 600 : 400 }}>
      <span style={{ marginTop: 1, flexShrink: 0, color: 'rgba(240,240,245,0.3)' }}>{icon}</span>
      {text}
    </div>
  )
}

/* ── Main page ── */
function DeliveryPage({ user, logout }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoad]  = useState(true)
  const [tab, setTab]       = useState('actif')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/livreur/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      })
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {} finally { setLoad(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatusChange = (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const shown = orders.filter(o =>
    tab === 'actif' ? ['Confirmé', 'En livraison'].includes(o.status) : o.status === 'Livré'
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#07070f', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#0c0c1a', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#FF9900' }}>Livraisons</div>
          <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>{user.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px', cursor: 'pointer', color: 'rgba(240,240,245,0.5)', display: 'flex' }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={logout} style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 9, padding: '8px', cursor: 'pointer', color: '#f87171', display: 'flex' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[{ id: 'actif', label: 'À livrer' }, { id: 'livre', label: 'Livrés' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 18px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: tab === t.id ? '#FF9900' : 'rgba(255,255,255,0.05)', color: tab === t.id ? '#000' : 'rgba(240,240,245,0.45)', transition: 'all 0.15s' }}>
            {t.label}
            {t.id === 'actif' && orders.filter(o => ['En attente','En cours'].includes(o.status)).length > 0 && (
              <span style={{ marginLeft: 6, background: tab === 'actif' ? 'rgba(0,0,0,0.25)' : 'rgba(255,153,0,0.7)', color: tab === 'actif' ? '#000' : '#fff', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '1px 6px' }}>
                {orders.filter(o => ['Confirmé','En livraison'].includes(o.status)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '12px 16px', paddingBottom: 32 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(240,240,245,0.3)', fontSize: 14 }}>Chargement...</div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(240,240,245,0.3)', fontSize: 14 }}>
            {tab === 'actif' ? 'Aucune livraison en attente' : 'Aucune livraison terminée'}
          </div>
        ) : (
          shown.map(o => <OrderCard key={o.id} order={o} onStatusChange={handleStatusChange} />)
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '13px 16px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)',
  color: '#f0f0f5', fontSize: 15, fontFamily: 'system-ui, sans-serif',
  outline: 'none', boxSizing: 'border-box',
}

export default function LivreurApp() {
  const { user, loading, login, logout } = useAuth()
  if (loading) return <div style={{ height: '100dvh', background: '#07070f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 14 }}>Chargement…</div>
  if (!user) return <Login onLogin={login} />
  return <DeliveryPage user={user} logout={logout} />
}