import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, Minimize2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const BASE = '/api'
const ah = () => ({
  Authorization: `Bearer ${localStorage.getItem('vrg_token')}`,
  'Content-Type': 'application/json',
})

function fmtTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function SupportChat() {
  const { user } = useAuth()
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState('')
  const [roomId, setRoomId]     = useState(null)
  const [sending, setSending]   = useState(false)
  const [lastId, setLastId]     = useState(null)
  const [unread, setUnread]     = useState(0)
  const [othersRead, setOthersRead] = useState(0)   // plus grand msg lu par le staff
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const msgsRef   = useRef([])
  useEffect(() => { msgsRef.current = messages }, [messages])

  /* Marque comme lus les messages affichés — UNIQUEMENT panneau ouvert
     (le poll tourne aussi panneau fermé, il ne doit pas marquer lu) */
  const markRead = useCallback((msgs) => {
    if (!roomId) return
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (!String(msgs[i].id).startsWith('opt-')) {
        fetch(`${BASE}/chat/rooms/${roomId}/read`, {
          method: 'POST', headers: ah(), body: JSON.stringify({ last_id: msgs[i].id }),
        }).catch(() => {})
        return
      }
    }
  }, [roomId])

  const fetchReadStatus = useCallback(() => {
    if (!roomId) return
    fetch(`${BASE}/chat/rooms/${roomId}/read-status`, { headers: ah() })
      .then(r => r.json())
      .then(d => setOthersRead(Number(d.others_read) || 0))
      .catch(() => {})
  }, [roomId])

  useEffect(() => {
    if (!user) { setMessages([]); setRoomId(null); setLastId(null); setUnread(0); return }
    fetch(`${BASE}/chat/support`, { headers: ah() })
      .then(r => r.json())
      .then(d => {
        setRoomId(d.room_id)
        const msgs = d.messages || []
        setMessages(msgs)
        if (msgs.length > 0) setLastId(msgs[msgs.length - 1].id)
      })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!roomId || !user) return
    const id = setInterval(async () => {
      try {
        const url = `${BASE}/chat/support/poll${lastId ? '?after=' + lastId : ''}`
        const r = await fetch(url, { headers: ah() })
        const data = await r.json()
        if (Array.isArray(data) && data.length > 0) {
          setMessages(prev => {
            const seen = new Set(prev.map(m => m.id))
            const fresh = data.filter(m => !seen.has(m.id))
            return fresh.length ? [...prev, ...fresh] : prev
          })
          setLastId(data[data.length - 1].id)
          if (!open) setUnread(n => n + data.filter(m => m.sender_id !== user.id).length)
          else markRead(data)
        }
        if (open) fetchReadStatus()
      } catch {}
    }, 8000)
    return () => clearInterval(id)
  }, [roomId, lastId, open, user?.id, markRead, fetchReadStatus])

  useEffect(() => {
    if (open) {
      setUnread(0)
      markRead(msgsRef.current)
      fetchReadStatus()
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
        inputRef.current?.focus()
      }, 120)
    }
  }, [open, markRead, fetchReadStatus])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e) => {
    e?.preventDefault()
    if (!text.trim() || sending || !user) return
    setSending(true)
    const optimistic = { id: `opt-${Date.now()}`, sender_id: user.id, sender_name: user.name, body: text.trim(), created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setText('')
    try {
      const r = await fetch(`${BASE}/chat/support/messages`, {
        method: 'POST', headers: ah(), body: JSON.stringify({ body: optimistic.body }),
      })
      const msg = await r.json()
      if (msg.id) {
        setMessages(prev => {
          const withoutOpt = prev.filter(m => m.id !== optimistic.id)
          return withoutOpt.some(m => m.id === msg.id) ? withoutOpt : [...withoutOpt, msg]
        })
        setLastId(msg.id)
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally { setSending(false) }
  }

  return (
    <>
      <style>{`
        @keyframes vrg-slide-up {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes vrg-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .vrg-chat-input::placeholder { color: rgba(240,240,245,0.3); }
        .vrg-chat-input:focus { border-color: rgba(255,153,0,0.4) !important; }
        .vrg-msg-scroll::-webkit-scrollbar { width: 4px; }
        .vrg-msg-scroll::-webkit-scrollbar-track { background: transparent; }
        .vrg-msg-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 20, zIndex: 99999,
          width: 336, height: 480,
          borderRadius: 20,
          background: 'linear-gradient(180deg, #13132a 0%, #0d0d1e 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,153,0,0.08)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'vrg-slide-up 0.22s cubic-bezier(.16,1,.3,1)',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(255,153,0,0.12) 0%, rgba(230,126,0,0.06) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', gap: 11,
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #FF9900 0%, #e06000 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.5px',
              }}>V</div>
              <div style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 9, height: 9, borderRadius: '50%',
                background: '#22c55e', border: '2px solid #13132a',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f0f0f5', letterSpacing: '-0.2px' }}>
                Support VaRyGasy
              </div>
              <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginTop: 1 }}>
                En ligne · répond rapidement
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(240,240,245,0.5)', transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              <Minimize2 size={13} />
            </button>
          </div>

          {/* Body */}
          {!user ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, lineHeight: 1 }}>🔐</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5' }}>Connexion requise</div>
              <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)', lineHeight: 1.6 }}>
                Connectez-vous à votre compte pour écrire à notre équipe support.
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="vrg-msg-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Bulle de bienvenue fixe */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#FF9900,#e06000)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 12, color: '#fff',
                  }}>V</div>
                  <div style={{
                    maxWidth: '78%', padding: '9px 13px',
                    borderRadius: '18px 18px 18px 4px',
                    background: 'rgba(255,255,255,0.09)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 12.5, color: '#dde0f0', lineHeight: 1.5,
                  }}>
                    Bonjour {user.name} 👋 Comment pouvons-nous vous aider ?
                  </div>
                </div>

                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id
                  const prevSame = i > 0 && messages[i - 1].sender_id === msg.sender_id
                  const nextSame = i < messages.length - 1 && messages[i + 1].sender_id === msg.sender_id
                  const isOpt = String(msg.id).startsWith('opt-')
                  const lastMine = isMe && !isOpt && !messages.slice(i + 1).some(m => m.sender_id === user.id)
                  return (
                    <div key={msg.id} style={{
                      display: 'flex',
                      flexDirection: isMe ? 'row-reverse' : 'row',
                      alignItems: 'flex-end', gap: 7,
                      marginTop: prevSame ? 2 : 10,
                    }}>
                      {!isMe && (
                        <div style={{ width: 28, flexShrink: 0 }}>
                          {!nextSame && (
                            <div title={msg.sender_name} style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'linear-gradient(135deg,#FF9900,#e06000)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 12, color: '#fff',
                            }}>{msg.sender_name?.[0]?.toUpperCase() || 'V'}</div>
                          )}
                        </div>
                      )}
                      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 1 }}>
                        {/* Qui de l'équipe répond — le client sait à qui il parle */}
                        {!isMe && !prevSame && (
                          <span style={{ fontSize: 10, color: '#FF9900', fontWeight: 700, marginLeft: 3, marginBottom: 1, opacity: 0.85 }}>
                            {msg.sender_name} · équipe VaRyGasy
                          </span>
                        )}
                        <div style={{
                          padding: '9px 13px',
                          borderRadius: isMe
                            ? (prevSame ? (nextSame ? '14px 4px 4px 14px' : '14px 4px 18px 14px') : (nextSame ? '18px 4px 4px 14px' : '18px 4px 18px 18px'))
                            : (prevSame ? (nextSame ? '4px 14px 14px 4px' : '4px 18px 18px 4px') : (nextSame ? '18px 18px 14px 4px' : '18px 18px 18px 4px')),
                          background: isMe
                            ? 'linear-gradient(135deg, rgba(255,153,0,0.3), rgba(220,110,0,0.22))'
                            : 'rgba(255,255,255,0.09)',
                          border: `1px solid ${isMe ? 'rgba(255,153,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          color: isMe ? '#ffd580' : '#dde0f0',
                          fontSize: 12.5, lineHeight: 1.5, wordBreak: 'break-word',
                          opacity: isOpt ? 0.6 : 1,
                          transition: 'opacity 0.2s',
                        }}>
                          {msg.body}
                        </div>
                        {(!nextSame || !isMe) && (
                          <span style={{ fontSize: 10, color: 'rgba(240,240,245,0.2)', marginTop: 1 }}>
                            {fmtTime(msg.created_at)}
                            {lastMine && (
                              msg.id <= othersRead
                                ? <span style={{ marginLeft: 5, color: '#22c55e', fontWeight: 700 }}>✓✓ Vu</span>
                                : <span style={{ marginLeft: 5, color: 'rgba(240,240,245,0.3)', fontWeight: 600 }}>✓ Envoyé</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} style={{ height: 4 }} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <input
                  ref={inputRef}
                  className="vrg-chat-input"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Écrire un message…"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 20, padding: '9px 15px',
                    color: '#f0f0f5', fontSize: 13, outline: 'none',
                    transition: 'border-color 0.15s', resize: 'none',
                  }}
                />
                <button
                  onClick={send}
                  disabled={!text.trim() || sending}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                    cursor: text.trim() && !sending ? 'pointer' : 'default',
                    background: text.trim() && !sending
                      ? 'linear-gradient(135deg,#FF9900,#e06000)'
                      : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s, transform 0.1s',
                    transform: text.trim() ? 'scale(1)' : 'scale(0.9)',
                  }}
                >
                  <Send size={14} color={text.trim() ? '#fff' : 'rgba(240,240,245,0.25)'} style={{ marginLeft: 1 }} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bouton bulle */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Support VaRyGasy"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          cursor: 'pointer',
          background: open
            ? 'linear-gradient(135deg,#555,#333)'
            : 'linear-gradient(135deg, #FF9900 0%, #e06000 100%)',
          boxShadow: open
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 20px rgba(255,140,0,0.5), 0 0 0 0 rgba(255,140,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
          animation: !open && unread > 0 ? 'vrg-pop 0.4s ease' : 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {open
          ? <X size={22} color="#fff" />
          : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.477 2 2 6.268 2 11.5c0 2.7 1.17 5.138 3.05 6.88L4 22l4.027-1.95C9.27 20.66 10.61 21 12 21c5.523 0 10-4.268 10-9.5S17.523 2 12 2z" fill="white"/>
            </svg>
          )
        }
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 800, borderRadius: 99,
            minWidth: 18, height: 18, padding: '0 5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #080810',
            boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    </>
  )
}
