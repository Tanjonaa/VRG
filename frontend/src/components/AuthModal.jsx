import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Lock, User, Eye, EyeOff, AlertCircle, Check, Loader2, Mail, KeyRound, ArrowLeft, MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { normalizeMgPhone, MG_PHONE_HINT } from '../lib/phone.js'
import Drawer from './store/Drawer.jsx'

/* Connexion (téléphone ou email) / inscription en 2 étapes avec code OTP par email */
export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('login')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phoneStatus, setPhoneStatus] = useState(null) // null | 'checking' | 'available' | 'taken'

  const refCode = new URLSearchParams(window.location.search).get('ref') ||
                  sessionStorage.getItem('vrg_ref') || ''
  if (refCode) sessionStorage.setItem('vrg_ref', refCode)

  const EMPTY = { name: '', phone: '', email: '', password: '' }
  const [form, setForm] = useState(EMPTY)
  const [emailStatus, setEmailStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [step, setStep] = useState('form')             // inscription : 'form' puis 'otp'
  const [otp, setOtp] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [info, setInfo] = useState('')
  const { register, sendRegisterOtp, login } = useAuth()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())

  /* Compte à rebours avant de pouvoir renvoyer le code */
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  /* Vérification temps réel de l'email (inscription) : format puis disponibilité */
  useEffect(() => {
    if (tab !== 'register' || !form.email.trim()) { setEmailStatus(null); return }
    if (!emailValid(form.email)) { setEmailStatus(form.email.includes('@') && form.email.includes('.') ? 'invalid' : null); return }
    setEmailStatus('checking')
    const t = setTimeout(() => {
      fetch(`/api/auth/check-email?email=${encodeURIComponent(form.email.trim())}`)
        .then(r => r.json())
        .then(d => setEmailStatus(d.invalid ? 'invalid' : d.available ? 'available' : 'taken'))
        .catch(() => setEmailStatus(null))
    }, 500)
    return () => clearTimeout(t)
  }, [form.email, tab])

  const requestOtp = async () => {
    setError(''); setInfo('')
    setBusy(true)
    try {
      const d = await sendRegisterOtp({ name: form.name.trim(), phone: normalizeMgPhone(form.phone), email: form.email.trim() })
      setStep('otp'); setOtp('')
      setResendIn(d.resendIn || 60)
      setInfo(`Code envoyé à ${form.email.trim()}`)
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  /* Vérification temps réel du numéro (inscription) : format malgache puis disponibilité */
  useEffect(() => {
    if (tab !== 'register') { setPhoneStatus(null); return }
    const cleaned = form.phone.replace(/[\s.\-()]/g, '')
    if (cleaned.length < 10) { setPhoneStatus(null); return }
    const normalized = normalizeMgPhone(form.phone)
    if (!normalized) { setPhoneStatus('invalid'); return }
    setPhoneStatus('checking')
    const t = setTimeout(() => {
      fetch(`/api/auth/check-phone?phone=${encodeURIComponent(normalized)}`)
        .then(r => r.json())
        .then(d => setPhoneStatus(d.available ? 'available' : 'taken'))
        .catch(() => setPhoneStatus(null))
    }, 500)
    return () => clearTimeout(t)
  }, [form.phone, tab])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (tab === 'register' && step === 'otp') {
      if (!/^\d{6}$/.test(otp)) { setError('Saisissez le code à 6 chiffres reçu par email'); return }
      setBusy(true)
      try {
        await register({ ...form, email: form.email.trim(), phone: normalizeMgPhone(form.phone), otp, referralCode: refCode || undefined })
        onSuccess()
      } catch (err) { setError(err.message) }
      finally { setBusy(false) }
      return
    }
    if (tab === 'register') {
      if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password) {
        setError('Veuillez remplir tous les champs')
        return
      }
      if (!normalizeMgPhone(form.phone)) {
        setError(MG_PHONE_HINT)
        return
      }
      if (phoneStatus === 'taken') {
        setError('Ce numéro est déjà enregistré')
        return
      }
      if (!emailValid(form.email)) {
        setError('Adresse email invalide')
        return
      }
      if (emailStatus === 'taken') {
        setError('Cette adresse email est déjà utilisée')
        return
      }
      if (form.password.length < 8) {
        setError('Le mot de passe doit faire au moins 8 caractères')
        return
      }
      return requestOtp()
    } else {
      if (!form.phone.trim() || !form.password) {
        setError('Veuillez remplir tous les champs')
        return
      }
    }
    setBusy(true)
    try {
      await login({ identifier: form.phone.trim(), password: form.password })
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const switchTab = (t) => {
    setTab(t); setError(''); setInfo(''); setPhoneStatus(null); setEmailStatus(null)
    setStep('form'); setOtp(''); setForm(EMPTY)
  }

  const isRegister = tab === 'register'
  const isOtp = isRegister && step === 'otp'
  const blocked = busy || (isRegister && (isOtp
    ? otp.length !== 6
    : (phoneStatus === 'taken' || phoneStatus === 'checking' || phoneStatus === 'invalid' ||
       emailStatus === 'taken' || emailStatus === 'checking' || emailStatus === 'invalid')))

  const statusIcon = (s) => s === 'checking'
    ? <Loader2 size={18} className="vs-spin" aria-hidden="true" />
    : s === 'available' ? <Check size={18} color="var(--color-success)" aria-hidden="true" />
    : s ? <AlertCircle size={18} color="var(--color-danger)" aria-hidden="true" /> : null
  const fieldState = (s) => s === 'available' ? ' vs-field--ok' : (s === 'taken' || s === 'invalid') ? ' vs-field--error' : ''

  const pwdToggle = (
    <button type="button" className="vs-icon-btn" onClick={() => setShowPwd(s => !s)}
      aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      style={{ width: 36, height: 36, marginRight: -8, color: 'var(--color-subtle)' }}>
      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )

  return (
    <Drawer isOpen={isOpen} onClose={onClose} maxWidth={440}
      title={isOtp ? 'Vérifiez votre email' : isRegister ? 'Créer un compte' : 'Connexion'}>
      <div className="vs-drawer__pad" style={{ paddingTop: 28 }}>
        {!isOtp && (
          <>
            <p style={{ fontSize: 15, color: 'var(--color-muted)', marginBottom: 20, lineHeight: 1.55 }}>
              {isRegister
                ? 'Créez votre compte en 1 minute : commandez en quelques clics, suivez vos livraisons et cumulez des points de fidélité.'
                : 'Ravi de vous revoir ! Connectez-vous pour suivre vos commandes.'}
            </p>
            <div className="vs-tabs" role="tablist" aria-label="Connexion ou inscription" style={{ marginBottom: 24 }}>
              {[['login', 'Se connecter'], ['register', "S'inscrire"]].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => switchTab(key)}>{label}</button>
              ))}
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isOtp ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--color-gold-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                  <MailCheck size={30} color="var(--color-gold)" />
                </span>
                <p style={{ fontSize: 15, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                  Nous avons envoyé un code à 6 chiffres à<br />
                  <strong style={{ color: 'var(--color-text)' }}>{form.email.trim()}</strong>
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-subtle)', marginTop: 6 }}>Pensez à vérifier vos spams.</p>
              </div>
              <div>
                <label className="vs-label" htmlFor="auth-otp">Code de vérification</label>
                <input id="auth-otp" className="vs-input-box" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••"
                  style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '0.5em', minHeight: 60, paddingLeft: '0.5em' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="vs-textbtn" onClick={() => { setStep('form'); setError(''); setInfo('') }}>
                  <ArrowLeft size={16} /> Modifier
                </button>
                <button type="button" className={`vs-textbtn${resendIn > 0 ? '' : ' vs-textbtn--gold'}`} disabled={resendIn > 0 || busy} onClick={requestOtp}
                  style={{ cursor: resendIn > 0 ? 'default' : 'pointer' }}>
                  {resendIn > 0 ? `Renvoyer le code (${resendIn}s)` : 'Renvoyer le code'}
                </button>
              </div>
              {info && !error && <div className="vs-alert vs-alert--ok" role="status"><Check size={16} style={{ flexShrink: 0, marginTop: 2 }} />{info}</div>}
            </>
          ) : (
            <>
              {isRegister && (
                <div>
                  <label className="vs-label" htmlFor="auth-name">Nom complet</label>
                  <div className="vs-field">
                    <User size={18} aria-hidden="true" />
                    <input id="auth-name" value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" placeholder="Prénom Nom" />
                  </div>
                </div>
              )}

              <div>
                <label className="vs-label" htmlFor="auth-id">{isRegister ? 'Numéro de téléphone' : 'Téléphone ou email'}</label>
                <div className={`vs-field${isRegister ? fieldState(phoneStatus) : ''}`}>
                  {!isRegister && form.phone.includes('@') ? <Mail size={18} aria-hidden="true" /> : <Phone size={18} aria-hidden="true" />}
                  <input id="auth-id" value={form.phone}
                    onChange={e => set('phone', isRegister ? e.target.value.replace(/[^\d\s+]/g, '') : e.target.value)}
                    type={isRegister ? 'tel' : 'text'} inputMode={isRegister ? 'tel' : undefined}
                    autoComplete={isRegister ? 'tel' : 'username'}
                    placeholder={isRegister ? '034 12 345 67' : '034 12 345 67 ou vous@email.com'}
                    aria-describedby={isRegister ? 'auth-phone-hint' : undefined}
                    aria-invalid={isRegister && (phoneStatus === 'taken' || phoneStatus === 'invalid')} />
                  {isRegister && statusIcon(phoneStatus)}
                </div>
                {isRegister && (
                  <p id="auth-phone-hint" className={`vs-hint${phoneStatus === 'taken' || phoneStatus === 'invalid' ? ' vs-hint--error' : phoneStatus === 'available' ? ' vs-hint--ok' : ''}`}
                    style={{ color: phoneStatus ? undefined : 'var(--color-subtle)' }} aria-live="polite">
                    {phoneStatus === 'taken' ? 'Ce numéro est déjà enregistré — connectez-vous plutôt.'
                      : phoneStatus === 'invalid' ? MG_PHONE_HINT
                      : phoneStatus === 'available' ? 'Numéro disponible'
                      : 'Numéro malgache (032, 033, 034, 037 ou 038)'}
                  </p>
                )}
              </div>

              {isRegister && (
                <div>
                  <label className="vs-label" htmlFor="auth-email">Adresse email</label>
                  <div className={`vs-field${fieldState(emailStatus)}`}>
                    <Mail size={18} aria-hidden="true" />
                    <input id="auth-email" type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="vous@email.com" aria-describedby="auth-email-hint" aria-invalid={emailStatus === 'taken' || emailStatus === 'invalid'} />
                    {statusIcon(emailStatus)}
                  </div>
                  <p id="auth-email-hint" className={`vs-hint${emailStatus === 'taken' || emailStatus === 'invalid' ? ' vs-hint--error' : ''}`}
                    style={{ color: emailStatus === 'taken' || emailStatus === 'invalid' ? undefined : 'var(--color-subtle)' }} aria-live="polite">
                    {emailStatus === 'taken' ? 'Cette adresse email est déjà utilisée.'
                      : emailStatus === 'invalid' ? 'Adresse email invalide.'
                      : 'Un code de vérification y sera envoyé.'}
                  </p>
                </div>
              )}

              <div>
                <label className="vs-label" htmlFor="auth-pwd">Mot de passe</label>
                <div className="vs-field">
                  <Lock size={18} aria-hidden="true" />
                  <input id="auth-pwd" type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                    autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? '8 caractères minimum' : '••••••••'} />
                  {pwdToggle}
                </div>
              </div>
            </>
          )}

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="vs-alert vs-alert--error" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" className="vs-btn vs-btn--primary vs-btn--block" disabled={blocked} style={{ marginTop: 4 }}>
            {busy && <Loader2 size={18} className="vs-spin" aria-hidden="true" />}
            {isOtp ? 'Vérifier et créer mon compte' : isRegister ? 'Recevoir le code par email' : 'Se connecter'}
          </button>

          {!isOtp && (
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-muted)' }}>
              {isRegister ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
              <button type="button" className="vs-textbtn vs-textbtn--gold" style={{ display: 'inline', minHeight: 0, padding: 0, fontWeight: 600 }}
                onClick={() => switchTab(isRegister ? 'login' : 'register')}>
                {isRegister ? 'Se connecter' : "Créer un compte"}
              </button>
            </p>
          )}
        </form>
      </div>
    </Drawer>
  )
}
