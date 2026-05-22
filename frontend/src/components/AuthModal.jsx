import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('login')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refCode = new URLSearchParams(window.location.search).get('ref') ||
                  sessionStorage.getItem('vrg_ref') || ''
  if (refCode) sessionStorage.setItem('vrg_ref', refCode)

  const [form, setForm] = useState({ name: '', phone: '', password: '' })
  const { register, login } = useAuth()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (tab === 'register') {
      if (!form.name.trim() || !form.phone.trim() || !form.password) {
        setError('Remplis tous les champs')
        return
      }
      if (form.phone.replace(/\s/g, '').length < 10) {
        setError('Numéro de téléphone invalide')
        return
      }
      if (form.password.length < 8) {
        setError('Le mot de passe doit faire au moins 8 caractères')
        return
      }
    } else {
      if (!form.phone.trim() || !form.password) {
        setError('Remplis tous les champs')
        return
      }
    }
    setBusy(true)
    try {
      if (tab === 'register') await register({ ...form, referralCode: refCode || undefined })
      else await login({ phone: form.phone, password: form.password })
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const switchTab = (t) => { setTab(t); setError(''); setForm({ name: '', phone: '', password: '' }) }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          />

          {/* Side panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 38 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
              width: '100%', maxWidth: 420,
              background: 'rgba(8,8,18,0.99)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-40px 0 100px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Top bar */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <img src="/images/logo/logo.svg" alt="VRG" style={{ height: 44, width: 'auto' }} />
              <button onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '7px', cursor: 'pointer', display: 'flex', color: 'rgba(240,240,245,0.5)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>

              {/* Title */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f5', marginBottom: 6 }}>
                  {tab === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.4)', lineHeight: 1.5 }}>
                  {tab === 'login'
                    ? 'Connecte-toi pour passer tes commandes.'
                    : 'Inscris-toi pour commander en quelques clics.'}
                </p>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11, padding: 4, marginBottom: 24 }}>
                {[['login', 'Se connecter'], ['register', "S'inscrire"]].map(([key, label]) => (
                  <button key={key} onClick={() => switchTab(key)} style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 600, transition: 'all 0.2s', fontFamily: 'inherit',
                    background: tab === key ? 'rgba(202,138,4,0.18)' : 'transparent',
                    color: tab === key ? '#fbbf24' : 'rgba(240,240,245,0.4)',
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AnimatePresence>
                  {tab === 'register' && (
                    <motion.div
                      key="name-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <Field icon={<User size={15} />} placeholder="Nom complet" value={form.name} onChange={v => set('name', v)} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field icon={<Phone size={15} />} placeholder="Numéro de téléphone" type="tel" value={form.phone} onChange={v => set('phone', v)} />

                <Field
                  icon={<Lock size={15} />}
                  placeholder="Mot de passe"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={v => set('password', v)}
                  suffix={
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.35)', display: 'flex', padding: 0 }}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
                      <AlertCircle size={14} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={!busy ? { scale: 1.02, boxShadow: '0 6px 28px rgba(202,138,4,0.4)' } : {}}
                  whileTap={!busy ? { scale: 0.97 } : {}}
                  type="submit"
                  disabled={busy}
                  style={{ marginTop: 8, padding: '15px', borderRadius: 12, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', background: busy ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #ca8a04, #d97706)', color: busy ? 'rgba(240,240,245,0.4)' : '#fff', boxShadow: busy ? 'none' : '0 4px 20px rgba(202,138,4,0.28)', transition: 'all 0.2s' }}>
                  {busy ? '...' : tab === 'register' ? 'Créer mon compte' : 'Se connecter'}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Field({ icon, suffix, onChange, ...props }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '13px 14px' }}>
      <span style={{ color: 'rgba(240,240,245,0.3)', flexShrink: 0 }}>{icon}</span>
      <input {...props} onChange={e => onChange(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#f0f0f5', fontFamily: 'inherit' }} />
      {suffix}
    </div>
  )
}
