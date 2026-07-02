import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Package, LogOut, User, Phone, Lock, Eye, EyeOff,
  Check, AlertCircle, ChevronDown, MapPin, Clock, CreditCard,
  Pencil, ShieldCheck, Star, Trophy, Zap, Gift, Link, Copy, Users
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

const PAYMENT_LABELS = {
  mvola:    'MVola',
  airtel:   'Airtel Money',
  orange:   'Orange Money',
  livraison:'À la livraison',
}

const STATUS = {
  'En attente': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  'Confirmé':   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)'  },
  'Livré':      { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)' },
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export default function AccountPanel({ isOpen, onClose }) {
  const { user, orders, logout } = useAuth()
  const [referralData, setReferralData] = useState(null)

  useEffect(() => {
    if (!user) return
    api.get('/referral').then(setReferralData).catch(() => {})
  }, [user])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 36 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
              width: '100%', maxWidth: 440,
              background: 'linear-gradient(180deg, #0c0c1a 0%, #080812 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '-60px 0 120px rgba(0,0,0,0.7)',
            }}>

            {/* Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Avatar */}
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: 'linear-gradient(135deg, #FF9900, #CC5500)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, fontWeight: 800, color: '#fff',
                  flexShrink: 0, letterSpacing: '-0.5px',
                  boxShadow: '0 4px 16px rgba(255,153,0,0.3)',
                }}>
                  {initials(user?.name)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.2px' }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.35)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={10} /> {user?.phone}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { logout(); onClose() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 9, padding: '7px 11px', cursor: 'pointer',
                    color: '#f87171', fontSize: 12, fontWeight: 600,
                  }}>
                  <LogOut size={12} /> Déconnexion
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 9, padding: '7px', cursor: 'pointer',
                    color: 'rgba(240,240,245,0.45)', display: 'flex',
                  }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <ProfileSection user={user} />
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0 20px' }} />
              <FidelitySection orders={orders} referralPoints={referralData?.points ?? 0} />
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0 20px' }} />
              <ReferralSection data={referralData} onRefresh={() => api.get('/referral').then(setReferralData).catch(() => {})} />
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0 20px' }} />
              <OrdersSection orders={orders} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Profile ─── */
function ProfileSection({ user }) {
  const { updateProfile } = useAuth()
  const [name, setName]     = useState(user?.name || '')
  const [phone, setPhone]   = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)

  const [showEdit, setShowEdit]       = useState(false)
  const [showPwdForm, setShowPwdForm] = useState(false)
  const [showPwd, setShowPwd]         = useState(false)
  const [currentPwd, setCurrentPwd]   = useState('')
  const [newPwd, setNewPwd]           = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [pwdMsg, setPwdMsg]           = useState(null)
  const [pwdBusy, setPwdBusy]         = useState(false)

  useEffect(() => {
    setName(user?.name || '')
    setPhone(user?.phone || '')
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setSaving(true); setMsg(null)
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() })
      setMsg({ type: 'ok', text: 'Profil mis à jour' })
      setShowEdit(false)
      setTimeout(() => setMsg(null), 3000)
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handlePwd = async (e) => {
    e.preventDefault()
    if (!currentPwd || !newPwd || !confirmPwd) return
    if (newPwd.length < 6) { setPwdMsg({ type: 'err', text: 'Au moins 6 caractères' }); return }
    if (newPwd !== confirmPwd) { setPwdMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas' }); return }
    setPwdBusy(true); setPwdMsg(null)
    try {
      await updateProfile({ currentPassword: currentPwd, newPassword: newPwd })
      setPwdMsg({ type: 'ok', text: 'Mot de passe changé !' })
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setShowPwdForm(false)
      setTimeout(() => setPwdMsg(null), 3000)
    } catch (err) {
      setPwdMsg({ type: 'err', text: err.message })
    } finally {
      setPwdBusy(false)
    }
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeader icon={<User size={13} color="#FF9900" />} label="Mon profil" />

      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>

        {/* Info display — always visible */}
        <InfoRow icon={<User size={13} />} label="Nom" value={user?.name} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
        <InfoRow icon={<Phone size={13} />} label="Téléphone" value={user?.phone} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

        {/* Modifier toggle */}
        <button
          type="button"
          onClick={() => { setShowEdit(s => !s); setMsg(null) }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 15px', color: showEdit ? '#FF9900' : 'rgba(240,240,245,0.45)', fontSize: 13, fontFamily: 'inherit' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Pencil size={13} /> Modifier le profil
          </span>
          <motion.span animate={{ rotate: showEdit ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex' }}>
            <ChevronDown size={14} />
          </motion.span>
        </button>

        <AnimatePresence>
          {showEdit && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
              <form onSubmit={handleSave} style={{ padding: '0 15px 15px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ height: 12 }} />

                <LabelField label="Nom complet" icon={<User size={13} />}>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" style={inputStyle} />
                </LabelField>
                <LabelField label="Téléphone" icon={<Phone size={13} />}>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="034 XX XXX XX" type="tel" style={inputStyle} />
                </LabelField>

                <AnimatePresence>
                  {msg && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={alertStyle(msg.type)}>
                      {msg.type === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {msg.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} type="submit" disabled={saving}
                  style={{ padding: '11px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #FF9900, #CC5500)', color: saving ? 'rgba(240,240,245,0.3)' : '#fff' }}>
                  {saving ? 'Enregistrement…' : 'Sauvegarder'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Password toggle */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
        <button
          type="button"
          onClick={() => { setShowPwdForm(s => !s); setPwdMsg(null) }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 15px', color: showPwdForm ? '#FF9900' : 'rgba(240,240,245,0.45)', fontSize: 13, fontFamily: 'inherit' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <ShieldCheck size={13} /> Changer le mot de passe
          </span>
          <motion.span animate={{ rotate: showPwdForm ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex' }}>
            <ChevronDown size={14} />
          </motion.span>
        </button>

        <AnimatePresence>
          {showPwdForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
              <form onSubmit={handlePwd} style={{ padding: '0 15px 15px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ height: 12 }} />

                <LabelField label="Mot de passe actuel" icon={<Lock size={13} />}
                  suffix={
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.3)', display: 'flex', padding: 0 }}>
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }>
                  <input value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} type={showPwd ? 'text' : 'password'} placeholder="••••••" style={inputStyle} />
                </LabelField>
                <LabelField label="Nouveau mot de passe" icon={<Lock size={13} />}>
                  <input value={newPwd} onChange={e => setNewPwd(e.target.value)} type="password" placeholder="••••••" style={inputStyle} />
                </LabelField>
                <LabelField label="Confirmer" icon={<Lock size={13} />}>
                  <input value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} type="password" placeholder="••••••" style={inputStyle} />
                </LabelField>

                <AnimatePresence>
                  {pwdMsg && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={alertStyle(pwdMsg.type)}>
                      {pwdMsg.type === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {pwdMsg.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={pwdBusy}
                  style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(255,153,0,0.25)', cursor: pwdBusy ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(255,153,0,0.06)', color: '#FF9900' }}>
                  {pwdBusy ? '…' : 'Valider le nouveau mot de passe'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  )
}

/* ─── Fidelity ─── */
const TIERS = [
  { name: 'Bronze',  min: 0,    max: 199,  color: '#cd7f32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.25)', icon: Star },
  { name: 'Argent',  min: 200,  max: 499,  color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)', icon: Zap },
  { name: 'Or',      min: 500,  max: 999,  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)', icon: Trophy },
  { name: 'Platine', min: 1000, max: Infinity, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', icon: Gift },
]

/* 1 pt par 2 000 Ar — crédité uniquement quand la commande est livrée */
const PTS_PER_AR = 2000
const orderPts = (o) => Math.floor((o.total || 0) / PTS_PER_AR)

function calcPoints(orders) {
  return orders.reduce((sum, o) => o.status === 'Livré' ? sum + orderPts(o) : sum, 0)
}

function getTier(pts) {
  return TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0]
}

function FidelitySection({ orders, referralPoints = 0 }) {
  const orderPoints = calcPoints(orders)
  const points  = orderPoints + referralPoints
  const tier    = getTier(points)
  const next    = TIERS[TIERS.indexOf(tier) + 1]
  const progress = next
    ? Math.min(100, Math.round(((points - tier.min) / (next.min - tier.min)) * 100))
    : 100
  const TierIcon = tier.icon

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeader icon={<Trophy size={13} color="#fbbf24" />} label="Fidélité" />

      {/* Main card */}
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${tier.border}`,
        background: tier.bg,
        marginBottom: 10,
      }}>
        {/* Tier header */}
        <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg, ${tier.color}33, ${tier.color}11)`,
              border: `1px solid ${tier.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TierIcon size={18} color={tier.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Niveau actuel</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: tier.color, letterSpacing: '-0.3px' }}>{tier.name}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total points</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f5', letterSpacing: '-0.5px' }}>{points.toLocaleString('fr-FR')}</div>
            {referralPoints > 0 && (
              <div style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', marginTop: 2 }}>
                dont {referralPoints} pts parrainage
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {next && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(240,240,245,0.35)', marginBottom: 6 }}>
              <span>{tier.name}</span>
              <span>{next.name} à {next.min} pts</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${tier.color}99, ${tier.color})` }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)', marginTop: 6, textAlign: 'right' }}>
              {next.min - points} pts pour atteindre {next.name}
            </div>
          </div>
        )}
        {!next && (
          <div style={{ padding: '0 16px 16px', fontSize: 12, color: tier.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trophy size={13} /> Niveau maximum atteint !
          </div>
        )}
      </div>

      {/* How points work */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Comment gagner des points</div>
        <PointRule icon={<Package size={12} />} label="1 point par 2 000 Ar dépensé — crédité à la livraison" />
        <PointRule icon={<Zap size={12} color="#fbbf24" />} label="Bonus à partir du niveau Or" />
        <PointRule icon={<Gift size={12} color="#FF9900" />} label="Réductions exclusives à venir" />
      </div>

      {/* Per-order breakdown */}
      {orders.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 0' }}>Historique des points</div>
          {orders.slice(0, 4).map((o, i) => {
            const pts = orderPts(o)
            const delivered = o.status === 'Livré'
            const cancelled = o.status === 'Annulé'
            return (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '9px 12px' }}>
                <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.5)' }}>
                  {o.items?.[0]?.name || 'Commande'} · {o.date}
                </div>
                {delivered ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>+{pts} pts</span>
                ) : cancelled ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(240,240,245,0.25)' }}>annulée</span>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(240,240,245,0.35)' }}>⏳ +{pts} pts à la livraison</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function PointRule({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(240,240,245,0.45)' }}>
      <span style={{ color: 'rgba(240,240,245,0.3)' }}>{icon}</span>
      {label}
    </div>
  )
}

/* ─── Referral ─── */
function ReferralSection({ data, onRefresh }) {
  const [copied, setCopied] = useState(false)
  const loading = data === null

  const referralLink = data?.code
    ? `${window.location.origin}?ref=${data.code}`
    : ''

  const handleCopy = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeader icon={<Users size={13} color="#a78bfa" />} label="Parrainage" />

      {loading ? (
        <div style={{ height: 80, background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 8 }}>
            <StatCard value={data?.count ?? 0} label="Filleuls validés" color="#a78bfa" />
            <StatCard value={data?.points ?? 0} label="Points gagnés" color="#fbbf24" suffix=" pts" />
          </div>

          {/* Link card */}
          <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 14, padding: '14px 15px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Ton lien de parrainage
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
              <Link size={13} color="rgba(240,240,245,0.3)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: 'rgba(240,240,245,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                {referralLink}
              </span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleCopy}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(167,139,250,0.12)', border: `1px solid ${copied ? 'rgba(34,197,94,0.25)' : 'rgba(167,139,250,0.25)'}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: copied ? '#22c55e' : '#a78bfa', fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'all 0.2s' }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copié !' : 'Copier'}
              </motion.button>
            </div>

            <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.25)', marginTop: 10, lineHeight: 1.6 }}>
              Partage ce lien — tu gagnes <strong style={{ color: '#a78bfa' }}>+10 points</strong> dès que ton filleul dépense <strong style={{ color: '#a78bfa' }}>5 000 Ar</strong>.
            </div>
          </div>

          {/* Filleuls list */}
          {data?.referrals?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 0' }}>
                Amis parrainés
              </div>
              {data.referrals.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: r.validated ? 'rgba(167,139,250,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${r.validated ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 10, padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: r.validated ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${r.validated ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: r.validated ? '#a78bfa' : 'rgba(240,240,245,0.3)' }}>
                      {r.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: r.validated ? '#f0f0f5' : 'rgba(240,240,245,0.45)' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)' }}>
                        {r.validated ? r.date : `Ar ${(r.spent || 0).toLocaleString('fr-FR')} / 5 000 dépensé`}
                      </div>
                    </div>
                  </div>
                  {r.validated
                    ? <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>+10 pts</span>
                    : <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(240,240,245,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, padding: '3px 8px' }}>⏳ En attente</span>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function StatCard({ value, label, color, suffix = '' }) {
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}{suffix}</div>
      <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', marginTop: 3, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

/* ─── Orders ─── */
function OrdersSection({ orders }) {
  return (
    <section>
      <SectionHeader icon={<Package size={13} color="#fbbf24" />} label="Mes commandes">
        <span style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 99, padding: '3px 9px', fontWeight: 600 }}>
          {orders.length}
        </span>
      </SectionHeader>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'rgba(240,240,245,0.25)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Package size={24} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(240,240,245,0.3)', marginBottom: 6 }}>Aucune commande</p>
          <p style={{ fontSize: 12, color: 'rgba(240,240,245,0.18)', lineHeight: 1.6 }}>Tes commandes apparaîtront ici après ton premier achat.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map((o, i) => <OrderCard key={o.id} order={o} index={i} />)}
        </div>
      )}
    </section>
  )
}

function OrderCard({ order: o, index }) {
  const [open, setOpen] = useState(false)
  const st = STATUS[o.status] || STATUS['En attente']
  const pm = PAYMENT_LABELS[o.payment] || o.payment
  const firstItem = o.items?.[0]
  const extra = (o.items?.length || 0) - 1

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>

      {/* Summary row */}
      <button onClick={() => setOpen(s => !s)}
        style={{ width: '100%', padding: '13px 15px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {firstItem?.name || 'Commande'}{extra > 0 ? ` +${extra}` : ''}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{o.date}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <strong style={{ color: '#fbbf24', fontWeight: 700 }}>Ar {o.total?.toLocaleString('fr-FR')}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
<span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 99, border: `1px solid ${st.border}` }}>
            {o.status}
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: 'rgba(240,240,245,0.3)', display: 'flex' }}>
            <ChevronDown size={14} />
          </motion.span>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Items list */}
              {o.items?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {o.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(240,240,245,0.55)' }}>
                      <span>{item.name} × {item.qty}</span>
                      <span style={{ color: 'rgba(240,240,245,0.4)' }}>Ar {(item.price * item.qty).toLocaleString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <DetailRow icon={<MapPin size={11} />} label={o.address} />
                {o.zone && <DetailRow icon={<CreditCard size={11} />} label={`Livraison · Ar ${o.delivery_fee?.toLocaleString('fr-FR')}`} />}
                {o.hours && <DetailRow icon={<Clock size={11} />} label={o.hours} />}
                <DetailRow icon={<CreditCard size={11} />} label={pm} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#f0f0f5', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span>Total</span>
                <span style={{ color: '#fbbf24' }}>Ar {o.total?.toLocaleString('fr-FR')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Shared atoms ─── */
function SectionHeader({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,240,245,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function LabelField({ label, icon, children, suffix }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(240,240,245,0.35)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {icon} {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 12px' }}>
        {children}
        {suffix}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(240,240,245,0.35)', fontSize: 12 }}>
        {icon} {label}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>{value}</span>
    </div>
  )
}

function DetailRow({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ lineHeight: 1.5 }}>{label}</span>
    </div>
  )
}

const inputStyle = {
  flex: 1, background: 'none', border: 'none', outline: 'none',
  fontSize: 13, color: '#f0f0f5', fontFamily: 'inherit',
}

function alertStyle(type) {
  const ok = type === 'ok'
  return {
    display: 'flex', alignItems: 'center', gap: 7, fontSize: 12,
    color: ok ? '#22c55e' : '#f87171',
    background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
    border: `1px solid ${ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    borderRadius: 9, padding: '8px 12px',
  }
}
