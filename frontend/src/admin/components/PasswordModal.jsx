import React, { useState, useEffect } from 'react'
import { Lock, X, Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react'

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

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !done) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, onClose])

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

  const type = show ? 'text' : 'password'

  return (
    <>
      <div className="adm-backdrop" onClick={done ? undefined : onClose} />
      <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="pwd-title">
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 24px' }} role="status">
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-success-soft)', border: '1px solid rgba(34,197,94,0.4)', display: 'grid', placeItems: 'center' }}>
              <Check size={26} color="var(--color-success)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Mot de passe mis à jour</div>
          </div>
        ) : (
          <>
            <div className="adm-modal__head">
              <h2 id="pwd-title" className="adm-modal__title"><Lock size={17} color="var(--color-gold)" /> Changer mon mot de passe</h2>
              <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="adm-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="adm-label" htmlFor="pwd-cur">Mot de passe actuel</label>
                <div className="adm-field">
                  <input id="pwd-cur" type={type} value={cur} onChange={e => setCur(e.target.value)} required autoComplete="current-password" autoFocus />
                  <button type="button" className="adm-field__btn" onClick={() => setShow(s => !s)}
                    aria-label={show ? 'Masquer les mots de passe' : 'Afficher les mots de passe'} aria-pressed={show}>
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="adm-label" htmlFor="pwd-new">Nouveau mot de passe <span style={{ fontWeight: 400, color: 'var(--color-subtle)' }}>· 6 caractères min.</span></label>
                <div className="adm-field">
                  <input id="pwd-new" type={type} value={nw} onChange={e => setNw(e.target.value)} required autoComplete="new-password" />
                </div>
              </div>
              <div>
                <label className="adm-label" htmlFor="pwd-cf">Confirmation</label>
                <div className="adm-field">
                  <input id="pwd-cf" type={type} value={cf} onChange={e => setCf(e.target.value)} required autoComplete="new-password" />
                </div>
              </div>
              {err && <div className="adm-alert adm-alert--error" role="alert"><AlertCircle size={16} /> {err}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" className="adm-btn adm-btn--secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
                <button type="submit" disabled={busy} className="adm-btn adm-btn--primary" style={{ flex: 1.4 }}>
                  {busy ? <><Loader2 size={16} className="vs-spin" /> Enregistrement…</> : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  )
}
