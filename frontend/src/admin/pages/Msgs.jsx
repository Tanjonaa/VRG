import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Users, User, Headphones, Send, ChevronRight, Package } from 'lucide-react'

const BASE = '/api'
const h = () => ({
  Authorization: `Bearer ${localStorage.getItem('vrg_token')}`,
  'Content-Type': 'application/json',
})

const TABS = [
  { id: 'admin_only',    label: 'Admins',    Icon: Users,         desc: 'Groupe admin seulement' },
  { id: 'admin_mod',     label: 'Équipe',    Icon: MessageSquare, desc: 'Admins + Modérateurs' },
  { id: 'livreur_group', label: 'Livreurs',  Icon: Package,       desc: 'Groupe livreurs' },
  { id: 'direct',        label: 'Direct',    Icon: User,          desc: 'Messages privés' },
  { id: 'clients',       label: 'Clients',   Icon: Headphones,    desc: 'Support client' },
]

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ name, role, size = 32 }) {
  const color = role === 'admin' ? '#FF9900' : role === 'moderator' ? '#60a5fa' : '#94a3b8'
  const bg    = role === 'admin' ? 'rgba(255,153,0,0.15)' : role === 'moderator' ? 'rgba(96,165,250,0.15)' : 'rgba(148,163,184,0.15)'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, border: `1.5px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function ChatArea({ roomId, me, isSupport = false }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [lastAt, setLastAt] = useState(null)
  const bottomRef = useRef(null)

  const load = useCallback(async (initial = false) => {
    try {
      const url = isSupport
        ? (initial
            ? `${BASE}/admin/chat/rooms/${roomId}/messages?limit=60`
            : `${BASE}/admin/chat/rooms/${roomId}/messages?limit=60${lastAt ? '&since=' + encodeURIComponent(lastAt) : ''}`)
        : (initial
            ? `${BASE}/admin/chat/rooms/${roomId}/messages?limit=60`
            : `${BASE}/admin/chat/rooms/${roomId}/messages?limit=60${lastAt ? '&since=' + encodeURIComponent(lastAt) : ''}`)
      const r = await fetch(url, { headers: h() })
      const data = await r.json()
      if (!Array.isArray(data)) return
      if (initial) {
        setMessages(data)
      } else if (data.length > 0) {
        setMessages(prev => [...prev, ...data])
      }
      if (data.length > 0) setLastAt(data[data.length - 1].created_at)
    } catch {}
  }, [roomId, lastAt])

  useEffect(() => {
    setMessages([])
    setLastAt(null)
    setText('')
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    fetch(`${BASE}/admin/chat/rooms/${roomId}/messages?limit=60`, { headers: h() })
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
        const url = `${BASE}/admin/chat/rooms/${roomId}/messages?limit=50&since=${encodeURIComponent(lastAt)}`
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending || !roomId) return
    setSending(true)
    try {
      const r = await fetch(`${BASE}/admin/chat/rooms/${roomId}/messages`, {
        method: 'POST', headers: h(), body: JSON.stringify({ body: text.trim() }),
      })
      const msg = await r.json()
      if (msg.id) {
        setMessages(prev => [...prev, msg])
        setLastAt(msg.created_at)
        setText('')
      }
    } catch {} finally { setSending(false) }
  }

  if (!roomId) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'rgba(240,240,245,0.2)' }}>
      <MessageSquare size={36} />
      <span style={{ fontSize: 13 }}>Sélectionne une conversation</span>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(240,240,245,0.2)', fontSize: 12, marginTop: 40 }}>
            Aucun message — soyez le premier !
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === me?.id
          const prevSame = i > 0 && messages[i - 1].sender_id === msg.sender_id
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-end', gap: 8, marginTop: prevSame ? 2 : 10 }}>
              {!isMe && !prevSame && <Avatar name={msg.sender_name} role="admin" size={28} />}
              {!isMe && prevSame && <div style={{ width: 28, flexShrink: 0 }} />}
              <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
                {!isMe && !prevSame && (
                  <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.35)', fontWeight: 600, marginLeft: 2 }}>
                    {msg.sender_name}
                  </span>
                )}
                <div style={{
                  padding: '8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isMe ? 'rgba(255,153,0,0.18)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${isMe ? 'rgba(255,153,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: isMe ? '#ffd080' : '#e0e0ea',
                  fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word',
                }}>
                  {msg.body}
                </div>
                <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.25)', marginTop: 1 }}>
                  {fmtTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{
        padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.01)',
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Écrire un message…"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '9px 16px', color: '#f0f0f5', fontSize: 13, outline: 'none',
          }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
        />
        <button type="submit" disabled={!text.trim() || sending}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            background: text.trim() ? 'linear-gradient(135deg,#FF9900,#e67e00)' : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'background 0.15s',
          }}>
          <Send size={15} color={text.trim() ? '#fff' : 'rgba(240,240,245,0.25)'} />
        </button>
      </form>
    </div>
  )
}

function StaffList({ me, onSelect, activeId }) {
  const [staff, setStaff] = useState([])

  useEffect(() => {
    fetch(`${BASE}/admin/chat/staff`, { headers: h() })
      .then(r => r.json()).then(setStaff).catch(() => {})
  }, [])

  const open = async (u) => {
    try {
      const r = await fetch(`${BASE}/admin/chat/direct/${u.id}`, { method: 'POST', headers: h() })
      const { room_id } = await r.json()
      onSelect(room_id, u)
    } catch {}
  }

  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 14px', fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        Staff ({staff.length})
      </div>
      {staff.map(u => (
        <button key={u.id} onClick={() => open(u)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', cursor: 'pointer',
            background: activeId === u.id ? 'rgba(255,153,0,0.07)' : 'none',
            borderLeft: activeId === u.id ? '2px solid #FF9900' : '2px solid transparent',
            textAlign: 'left', width: '100%',
          }}>
          <Avatar name={u.name} role={u.role} size={30} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
            <div style={{ fontSize: 10, color: u.role === 'admin' ? '#FF9900' : '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>{u.role}</div>
          </div>
          <ChevronRight size={12} color="rgba(240,240,245,0.2)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
        </button>
      ))}
    </div>
  )
}

function ClientList({ onSelect, activeId }) {
  const [supports, setSupports] = useState([])

  const load = useCallback(() => {
    fetch(`${BASE}/admin/chat/rooms`, { headers: h() })
      .then(r => r.json())
      .then(d => setSupports(d.supports || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 14px', fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        Clients ({supports.length})
      </div>
      {supports.length === 0 && (
        <div style={{ padding: 20, fontSize: 12, color: 'rgba(240,240,245,0.25)', textAlign: 'center' }}>
          Aucun message client
        </div>
      )}
      {supports.map(s => (
        <button key={s.id} onClick={() => onSelect(s.id, s)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', border: 'none', cursor: 'pointer',
            background: activeId === s.id ? 'rgba(255,153,0,0.07)' : 'none',
            borderLeft: activeId === s.id ? '2px solid #FF9900' : '2px solid transparent',
            textAlign: 'left', width: '100%',
          }}>
          <Avatar name={s.name} role="client" size={30} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
            {s.last_msg && (
              <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {s.last_msg.length > 28 ? s.last_msg.slice(0, 26) + '…' : s.last_msg}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

export default function Msgs({ user: me }) {
  const [tab, setTab]           = useState('admin_only')
  const [rooms, setRooms]       = useState({ fixed: [], directs: [], supports: [] })
  const [activeRoom, setActiveRoom] = useState(null)
  const [activeContact, setActiveContact] = useState(null)
  const [directStaffId, setDirectStaffId] = useState(null)

  useEffect(() => {
    fetch(`${BASE}/admin/chat/rooms`, { headers: h() })
      .then(r => r.json())
      .then(d => {
        setRooms(d)
        if (tab === 'admin_only' || tab === 'admin_mod') {
          const fixed = d.fixed || []
          const target = fixed.find(f => f.type === tab)
          if (target) setActiveRoom(target.id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const isFixed = ['admin_only', 'admin_mod', 'livreur_group'].includes(tab)
    if (isFixed) {
      const target = rooms.fixed.find(f => f.type === tab)
      if (target) { setActiveRoom(target.id); setActiveContact(null); setDirectStaffId(null) }
    } else {
      setActiveRoom(null)
      setActiveContact(null)
      setDirectStaffId(null)
    }
  }, [tab])

  const isAdmin = me?.role === 'admin'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.filter(t => t.id !== 'admin_only' || isAdmin).map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 10, border: '1px solid',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                background:   active ? 'rgba(255,153,0,0.12)' : 'rgba(255,255,255,0.03)',
                color:        active ? '#FF9900' : 'rgba(240,240,245,0.5)',
                borderColor:  active ? 'rgba(255,153,0,0.3)' : 'rgba(255,255,255,0.07)',
              }}>
              <Icon size={13} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Chat container */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>

        {/* Fixed group rooms */}
        {['admin_only', 'admin_mod', 'livreur_group'].includes(tab) && (
          <ChatArea roomId={activeRoom} me={me} />
        )}

        {/* Direct */}
        {tab === 'direct' && (
          <>
            <StaffList
              me={me}
              activeId={directStaffId}
              onSelect={(roomId, contact) => {
                setActiveRoom(roomId)
                setDirectStaffId(contact.id)
                setActiveContact(contact)
              }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {activeContact && (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)' }}>
                  <Avatar name={activeContact.name} role={activeContact.role} size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f5' }}>{activeContact.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: activeContact.role === 'admin' ? '#FF9900' : '#60a5fa' }}>{activeContact.role}</div>
                  </div>
                </div>
              )}
              <ChatArea roomId={activeRoom} me={me} />
            </div>
          </>
        )}

        {/* Clients support */}
        {tab === 'clients' && (
          <>
            <ClientList
              activeId={activeRoom}
              onSelect={(roomId, support) => {
                setActiveRoom(roomId)
                setActiveContact(support)
              }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {activeContact && (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)' }}>
                  <Avatar name={activeContact.name} role="client" size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f5' }}>{activeContact.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(240,240,245,0.4)', fontWeight: 600 }}>Client · support</div>
                  </div>
                </div>
              )}
              <ChatArea roomId={activeRoom} me={me} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
