import React, { useState } from 'react'
import { Lock, X, Eye, EyeOff, Check } from 'lucide-react'

/* Modale de changement de mot de passe (compte connecté — admin ou modérateur).
   Utilise PUT /auth/profile ; renouvelle le token en cas de succès. */
export default function PasswordModal({ onClose, onDone }) {
  const [cur, setCur]   = useState('')
  const [nw, setNw]     = useState('')
  const [cf, setCf]     = useState('')
  const [err, setErr]   = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (nw.length < 6)  { setErr('Le nouveau mot de passe doit faire au moins 6 caractères'); return }
    if (nw !== cf)      { setErr('La confirmation ne correspond pas'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` },
        body: JSON.stringify({ currentPassword: cur, newPassword: nw }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Erreur'); setBusy(false); return }
      if (data.token) localStorage.setItem('vrg_token', data.token)
      setDone(true)
      setTimeout(onDone, 1400)
    } catch { setErr('Erreur réseau'); setBusy(false) }
  }

  const field = { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }
  const input = { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#f0f0f5', fontFamily: 'inherit' }

  return (
    <>
      <div onClick={done ? undefined : onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, width: 'calc(100% - 32px)', maxWidth: 400, background: 'rgba(12,12,22,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '26px 26px 22px', boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }}>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={24} color="#22c55e" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e' }}>Mot de passe mis à jour</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#f0f0f5' }}>
                <Lock size={15} color="#FF9900" /> Changer mon mot de passe
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex', color: 'rgba(240,240,245,0.5)' }}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={field}>
                <input type={show ? 'text' : 'password'} placeholder="Mot de passe actuel" value={cur} onChange={e => setCur(e.target.value)} required style={input} />
                <button type="button" onClick={() => setShow(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.35)', display: 'flex', padding: 0 }}>
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div style={field}>
                <input type={show ? 'text' : 'password'} placeholder="Nouveau mot de passe (min. 6 caractères)" value={nw} onChange={e => setNw(e.target.value)} required style={input} />
              </div>
              <div style={field}>
                <input type={show ? 'text' : 'password'} placeholder="Confirme le nouveau mot de passe" value={cf} onChange={e => setCf(e.target.value)} required style={input} />
              </div>
              {err && (
                <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '8px 12px' }}>
                  {err}
                </div>
              )}
              <button type="submit" disabled={busy}
                style={{ marginTop: 4, padding: '13px', borderRadius: 11, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                  background: busy ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #ca8a04, #d97706)', color: busy ? 'rgba(240,240,245,0.3)' : '#fff' }}>
                {busy ? '…' : 'Mettre à jour'}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  )
}
