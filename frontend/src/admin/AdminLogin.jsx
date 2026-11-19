import React, { useState } from 'react'
import { Lock, AtSign, Eye, EyeOff, AlertCircle, Clock, Loader2, ShieldCheck } from 'lucide-react'

export default function AdminLogin({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [error, setError]           = useState('')
  const [busy, setBusy]             = useState(false)
  const [notice] = useState(() => {
    if (!sessionStorage.getItem('vrg_idle_logout')) return ''
    sessionStorage.removeItem('vrg_idle_logout')
    return 'Session expirée après 1 heure d\'inactivité. Reconnecte-toi.'
  })

  const handle = async (e) => {
    e.preventDefault()
    if (!identifier.trim() || !password) { setError('Remplis les deux champs'); return }
    setBusy(true); setError('')
    try { await onLogin(identifier.trim(), password) }
    catch (err) { setError(err.message || 'Connexion impossible') }
    finally { setBusy(false) }
  }

  return (
    <main className="adm-login">
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/images/logo/logo.svg" alt="" width="52" height="52" style={{ borderRadius: 14, marginBottom: 16 }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Back-office VaRyGasy
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 6 }}>Espace réservé à l'équipe</p>
        </div>

        <form onSubmit={handle} noValidate className="adm-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'var(--shadow-card)' }}>
          {notice && (
            <div className="adm-alert adm-alert--warn" role="status"><Clock size={16} /> {notice}</div>
          )}

          <div>
            <label className="adm-label" htmlFor="adm-id">Email ou téléphone</label>
            <div className="adm-field">
              <AtSign size={17} aria-hidden="true" />
              <input id="adm-id" value={identifier} onChange={e => setIdentifier(e.target.value)}
                type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
                placeholder="nom@exemple.com" autoFocus />
            </div>
          </div>

          <div>
            <label className="adm-label" htmlFor="adm-pwd">Mot de passe</label>
            <div className="adm-field">
              <Lock size={17} aria-hidden="true" />
              <input id="adm-pwd" value={password} onChange={e => setPassword(e.target.value)}
                type={showPwd ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" />
              <button type="button" className="adm-field__btn" onClick={() => setShowPwd(s => !s)}
                aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPwd}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="adm-alert adm-alert--error" role="alert"><AlertCircle size={16} /> {error}</div>
          )}

          <button type="submit" disabled={busy} className="adm-btn adm-btn--primary adm-btn--lg adm-btn--block" style={{ marginTop: 4 }}>
            {busy ? <><Loader2 size={17} className="vs-spin" /> Connexion…</> : 'Se connecter'}
          </button>
        </form>

        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, fontSize: 12, color: 'var(--color-subtle)' }}>
          <ShieldCheck size={14} aria-hidden="true" /> Connexion sécurisée · déconnexion auto après 1 h d'inactivité
        </p>
      </div>
    </main>
  )
}
