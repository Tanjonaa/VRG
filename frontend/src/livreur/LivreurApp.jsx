import React, { useState, useEffect, useCallback, useRef } from 'react'
import { LogOut, MapPin, Package, Clock, Phone, User, ChevronDown, ChevronUp, RefreshCw, MessageSquare, ChevronLeft, Send, ChevronRight } from 'lucide-react'

const TOKEN_KEY = 'vrg_livreur_token'
const BASE = '/api'
const h = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` })

/* ── Auth ── */
function useAuth() {
  const [user, setUser]     = useState(null)
  const [loading, setLoad]  = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setLoad(false); return }
    fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(({ user }) => { if (user?.role === 'livreur') setUser(user) })
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  const login = async (phone, password) => {
    const res  = await fetch(`${BASE}/auth/login`, {
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
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Numéro de téléphone" style={inputStyle} />
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Mot de passe" style={inputStyle} />
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

/* ── Chat view ── */
function ChatView({ roomId, me, onBack, title }) {
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [lastAt, setLastAt]     = useState(null)
  const bottomRef               = useRef(null)

  useEffect(() => {
    setMessages([])
    setLastAt(null)
    if (!roomId) return
    fetch(`${BASE}/livreur/chat/rooms/${roomId}/messages?limit=60`, { headers: h() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data)
          if (data.length > 0) setLastAt(data[data.length - 1].created_at)
        }
      })
      .catch(() => {})
  }, [roomId])

  useEffect(() => {
    if (!roomId || !lastAt) return
    const poll = setInterval(async () => {
      try {
        const url = `${BASE}/livreur/chat/rooms/${roomId}/messages?limit=50&since=${encodeURIComponent(lastAt)}`
        const r = await fetch(url, { headers: h() })
        const data = await r.json()
        if (Array.isArray(data) && data.length > 0) {
          setMessages(prev => [...prev, ...data])
          setLastAt(data[data.length - 1].created_at)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(poll)
  }, [roomId, lastAt])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending || !roomId) return
    setSending(true)
    try {
      const r = await fetch(`${BASE}/livreur/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { ...h(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text.trim() }),
      })
      const msg = await r.json()
      if (msg.id) { setMessages(prev => [...prev, msg]); setLastAt(msg.created_at); setText('') }
    } catch {} finally { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: '#0c0c1a', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF9900', display: 'flex', padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5' }}>{title}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(240,240,245,0.25)', fontSize: 12, marginTop: 40 }}>
            Aucun message — soyez le premier !
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe    = msg.sender_id === me?.id
          const prevSame = i > 0 && messages[i - 1].sender_id === msg.sender_id
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6, marginTop: prevSame ? 2 : 8 }}>
              {!isMe && !prevSame && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#60a5fa', flexShrink: 0 }}>
                  {msg.sender_name?.[0]?.toUpperCase()}
                </div>
              )}
              {!isMe && prevSame && <div style={{ width: 26, flexShrink: 0 }} />}
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 1 }}>
                {!isMe && !prevSame && (
                  <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.35)', fontWeight: 600, marginLeft: 2 }}>{msg.sender_name}</span>
                )}
                <div style={{ padding: '8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? 'rgba(255,153,0,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${isMe ? 'rgba(255,153,0,0.3)' : 'rgba(255,255,255,0.08)'}`, color: isMe ? '#ffd080' : '#e0e0ea', fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                  {msg.body}
                </div>
                <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.25)' }}>
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, background: '#0c0c1a', flexShrink: 0 }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Écrire un message…"
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '9px 14px', color: '#f0f0f5', fontSize: 13, outline: 'none' }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
        />
        <button type="submit" disabled={!text.trim() || sending}
          style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: text.trim() ? 'pointer' : 'default', background: text.trim() ? 'linear-gradient(135deg,#FF9900,#e67e00)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={15} color={text.trim() ? '#fff' : 'rgba(240,240,245,0.25)'} />
        </button>
      </form>
    </div>
  )
}

/* ── Messages page ── */
function MessagesPage({ user }) {
  const [rooms, setRooms]       = useState({ group: null, clients: [] })
  const [loading, setLoading]   = useState(true)
  const [activeRoom, setActiveRoom] = useState(null)
  const [activeTitle, setActiveTitle] = useState('')

  const loadRooms = useCallback(() => {
    fetch(`${BASE}/livreur/chat/rooms`, { headers: h() })
      .then(r => r.json())
      .then(data => { setRooms(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadRooms() }, [loadRooms])

  const openClientRoom = (c) => {
    if (c.id) {
      setActiveRoom(c.id)
      setActiveTitle(c.client_name || 'Client')
    } else {
      fetch(`${BASE}/livreur/chat/client/${c.order_id}`, { headers: h() })
        .then(r => r.json())
        .then(d => { if (d.room_id) { setActiveRoom(d.room_id); setActiveTitle(c.client_name || 'Client') } })
        .catch(() => {})
    }
  }

  if (activeRoom) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#07070f', display: 'flex', flexDirection: 'column' }}>
        <ChatView roomId={activeRoom} me={user} title={activeTitle} onBack={() => setActiveRoom(null)} />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Groupe livreurs */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 0 8px' }}>
          Groupe
        </div>
        {rooms.group ? (
          <button onClick={() => { setActiveRoom(rooms.group.id); setActiveTitle('Livreurs') }}
            style={{ width: '100%', background: '#0c0c1a', border: '1px solid rgba(255,153,0,0.18)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={18} color="#FF9900" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5' }}>Livreurs</div>
              <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.35)', marginTop: 2 }}>Chat groupe — tous les livreurs</div>
            </div>
            <ChevronRight size={14} color="rgba(240,240,245,0.2)" />
          </button>
        ) : (
          <div style={{ color: 'rgba(240,240,245,0.25)', fontSize: 12, padding: '8px 0' }}>Groupe non disponible</div>
        )}
      </div>

      {/* Clients */}
      <div style={{ padding: '0 16px', marginTop: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 0 8px' }}>
          Clients ({rooms.clients?.length || 0})
        </div>
        {loading && <div style={{ color: 'rgba(240,240,245,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chargement...</div>}
        {!loading && (!rooms.clients || rooms.clients.length === 0) && (
          <div style={{ color: 'rgba(240,240,245,0.25)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Prends en charge une commande pour discuter avec le client
          </div>
        )}
        {rooms.clients?.map(c => (
          <button key={c.order_id} onClick={() => openClientRoom(c)}
            style={{ width: '100%', background: '#0c0c1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>
              {c.client_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {c.client_name}
                <span style={{ fontSize: 10, fontWeight: 700, color: c.order_status === 'En livraison' ? '#60a5fa' : '#22c55e', background: c.order_status === 'En livraison' ? 'rgba(96,165,250,0.1)' : 'rgba(34,197,94,0.1)', borderRadius: 99, padding: '1px 6px' }}>
                  {c.order_status}
                </span>
              </div>
              {c.last_msg ? (
                <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.last_msg.length > 32 ? c.last_msg.slice(0, 30) + '…' : c.last_msg}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.2)', marginTop: 2 }}>Commande #{c.order_id}</div>
              )}
            </div>
            <ChevronRight size={14} color="rgba(240,240,245,0.2)" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Order card ── */
function OrderCard({ order, onStatusChange, onTaken }) {
  const [open, setOpen]               = useState(false)
  const [busy, setBusy]               = useState(false)
  const [err, setErr]                 = useState('')
  const [showPickup, setShowPickup]   = useState(false)
  const [departureTime, setDepartureTime] = useState(() => {
    const n = new Date()
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`
  })
  const isCash = order.payment === 'livraison'

  const nextStatus = order.status === 'Confirmé' ? 'En livraison' : order.status === 'En livraison' ? 'Livré' : null

  const handleStatus = async (depTime) => {
    if (!nextStatus) return
    setBusy(true); setErr('')
    try {
      const body = { status: nextStatus }
      if (nextStatus === 'En livraison' && depTime) body.departure_time = depTime
      const res = await fetch(`${BASE}/livreur/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowPickup(false)
        onStatusChange(order.id, nextStatus)
      } else {
        const data = await res.json()
        if (res.status === 409) { onTaken(order.id); return }
        setErr(data.error || 'Erreur')
      }
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

      {/* Montant */}
      <div style={{ margin: '0 12px 12px', borderRadius: 12, padding: '14px 16px', background: isCash ? 'rgba(255,153,0,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isCash ? 'rgba(255,153,0,0.25)' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      {/* Articles */}
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
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {err && <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '8px 12px' }}>{err}</div>}

          {/* Pickup modal: heure de départ */}
          {showPickup && nextStatus === 'En livraison' ? (
            <div style={{ background: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.2)', borderRadius: 12, padding: '14px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FF9900', marginBottom: 10 }}>
                Heure de départ vers le client
              </div>
              <input
                type="time"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,153,0,0.3)', background: 'rgba(255,255,255,0.04)', color: '#f0f0f5', fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowPickup(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(240,240,245,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={() => handleStatus(departureTime)} disabled={busy}
                  style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg,#FF9900,#CC5500)', color: '#fff', opacity: busy ? 0.6 : 1 }}>
                  {busy ? '...' : 'Confirmer'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => nextStatus === 'En livraison' ? setShowPickup(true) : handleStatus(null)}
              disabled={busy}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, background: nextStatus === 'Livré' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: '#fff', opacity: busy ? 0.6 : 1 }}>
              {busy ? '...' : nextStatus === 'En livraison' ? '🛵 Prendre en charge' : 'Marquer comme livré ✓'}
            </button>
          )}
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
    setLoad(true)
    try {
      const res = await fetch(`${BASE}/livreur/orders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      })
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {} finally { setLoad(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatusChange = (id, status) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  const handleTaken        = (id)          => setOrders(prev => prev.filter(o => o.id !== id))

  const shown = orders.filter(o =>
    tab === 'actif' ? ['Confirmé', 'En livraison'].includes(o.status) : o.status === 'Livré'
  )

  const actifCount = orders.filter(o => ['Confirmé', 'En livraison'].includes(o.status)).length

  return (
    <div style={{ minHeight: '100dvh', background: '#07070f', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#0c0c1a', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#FF9900' }}>
            {tab === 'messages' ? 'Messages' : 'Livraisons'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>{user.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab !== 'messages' && (
            <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px', cursor: 'pointer', color: 'rgba(240,240,245,0.5)', display: 'flex' }}>
              <RefreshCw size={15} />
            </button>
          )}
          <button onClick={logout} style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 9, padding: '8px', cursor: 'pointer', color: '#f87171', display: 'flex' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        {[
          { id: 'actif',    label: 'À livrer',  badge: actifCount },
          { id: 'livre',    label: 'Livrés',    badge: 0 },
          { id: 'messages', label: 'Messages',  badge: 0, icon: MessageSquare },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: tab === t.id ? '#FF9900' : 'rgba(255,255,255,0.05)', color: tab === t.id ? '#000' : 'rgba(240,240,245,0.45)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.icon && <t.icon size={13} />}
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: tab === t.id ? 'rgba(0,0,0,0.25)' : 'rgba(255,153,0,0.7)', color: tab === t.id ? '#000' : '#fff', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '1px 6px' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'messages' ? (
          <MessagesPage user={user} />
        ) : (
          <div style={{ padding: '12px 16px', paddingBottom: 32 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(240,240,245,0.3)', fontSize: 14 }}>Chargement...</div>
            ) : shown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(240,240,245,0.3)', fontSize: 14 }}>
                {tab === 'actif' ? 'Aucune livraison en attente' : 'Aucune livraison terminée'}
              </div>
            ) : (
              shown.map(o => <OrderCard key={o.id} order={o} onStatusChange={handleStatusChange} onTaken={handleTaken} />)
            )}
          </div>
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