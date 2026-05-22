import React, { useState } from 'react'
import { Lock, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLogin({ onLogin }) {
  const [phone, setPhone]     = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await onLogin(phone, password) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #07070f, #0c0c1a)', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/images/logo/logo.svg" alt="VRG" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 14 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f5', letterSpacing: '-0.5px' }}>VaRyGasy Admin</div>
          <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.35)', marginTop: 6 }}>Espace réservé aux administrateurs</div>
        </div>

        <form onSubmit={handle} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Field icon={<Phone size={14} />} label="Téléphone">
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="034 XX XXX XX" style={inp} />
          </Field>

          <Field icon={<Lock size={14} />} label="Mot de passe"
            suffix={
              <button type="button" onClick={() => setShowPwd(s => !s)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.3)', display: 'flex', padding: 0 }}>
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }>
            <input value={password} onChange={e => setPassword(e.target.value)} type={showPwd ? 'text' : 'password'} placeholder="••••••••" style={inp} />
          </Field>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '9px 12px' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <button type="submit" disabled={busy}
            style={{ padding: 13, borderRadius: 11, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, background: busy ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #FF9900, #CC5500)', color: busy ? 'rgba(240,240,245,0.3)' : '#fff', marginTop: 4 }}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inp = { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', fontFamily: 'inherit' }

function Field({ icon, label, children, suffix }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {icon} {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '11px 13px' }}>
        {children}{suffix}
      </div>
    </div>
  )
}
