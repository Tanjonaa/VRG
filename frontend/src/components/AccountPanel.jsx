import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, LogOut, User, Phone, Mail, Lock, Eye, EyeOff,
  Check, AlertCircle, ChevronDown, MapPin, Clock, CreditCard, Truck,
  Star, Trophy, Zap, Gift, Copy, Users, Download, Hourglass,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import Drawer from './store/Drawer.jsx'

const PAYMENT_LABELS = {
  mvola:    'MVola',
  airtel:   'Airtel Money',
  orange:   'Orange Money',
  livraison:'À la livraison',
}

/* Couleurs de statut — sémantiques, toujours accompagnées du libellé */
const STATUS = {
  'En attente': { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  'Confirmé':   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  'Livré':      { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Annulé':     { color: '#a1a1ad', bg: 'rgba(161,161,173,0.12)' },
}

const ar = (n) => `${Number(n || 0).toLocaleString('fr-FR')} Ar`

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export default function AccountPanel({ isOpen, onClose }) {
  const { user, orders, logout } = useAuth()
  const [referralData, setReferralData] = useState(null)
  const [tab, setTab] = useState('orders')

  useEffect(() => {
    if (!user) return
    api.get('/referral').then(setReferralData).catch(() => {})
  }, [user])

  const TABS = [
    ['orders',  `Commandes${orders.length ? ` (${orders.length})` : ''}`],
    ['rewards', 'Fidélité'],
    ['profile', 'Profil'],
  ]

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Mon compte"
      icon={<User size={20} color="var(--color-gold)" aria-hidden="true" />}
      footer={
        <button type="button" className="vs-btn vs-btn--ghost vs-btn--block" onClick={() => { logout(); onClose() }}>
          <LogOut size={18} aria-hidden="true" /> Se déconnecter
        </button>
      }>
      <div className="vs-drawer__pad" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Identité */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--color-gold)', color: 'var(--color-on-gold)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {initials(user?.name)}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Bonjour, {user?.name?.split(' ')[0]}</div>
            <div style={{ fontSize: 14, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || user?.phone}</div>
          </div>
        </div>

        <div className="vs-tabs" role="tablist" aria-label="Sections du compte">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {tab === 'orders'  && <OrdersSection orders={orders} onClose={onClose} />}
            {tab === 'rewards' && <>
              <FidelitySection orders={orders} referralPoints={referralData?.points ?? 0} />
              <ReferralSection data={referralData} />
            </>}
            {tab === 'profile' && <ProfileSection user={user} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Drawer>
  )
}

/* ─── Profil ─── */
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
      setPwdMsg({ type: 'ok', text: 'Mot de passe changé' })
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
    <section aria-label="Mon profil" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="vs-box" style={{ overflow: 'hidden' }}>
        <InfoRow icon={<User size={16} />} label="Nom" value={user?.name} />
        <InfoRow icon={<Phone size={16} />} label="Téléphone" value={user?.phone} />
        <InfoRow icon={<Mail size={16} />} label="Email" value={user?.email || '—'} last />
      </div>

      {msg && !showEdit && <Alert msg={msg} />}
      {pwdMsg && !showPwdForm && <Alert msg={pwdMsg} />}

      <Collapsible open={showEdit} onToggle={() => { setShowEdit(s => !s); setMsg(null) }} label="Modifier mes informations">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field id="pf-name" label="Nom complet" icon={<User size={18} />}>
            <input id="pf-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field id="pf-phone" label="Téléphone" icon={<Phone size={18} />}>
            <input id="pf-phone" value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="034 XX XXX XX" />
          </Field>
          {msg && <Alert msg={msg} />}
          <button type="submit" className="vs-btn vs-btn--primary vs-btn--block" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>
      </Collapsible>

      <Collapsible open={showPwdForm} onToggle={() => { setShowPwdForm(s => !s); setPwdMsg(null) }} label="Changer le mot de passe">
        <form onSubmit={handlePwd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field id="pw-cur" label="Mot de passe actuel" icon={<Lock size={18} />}
            suffix={<button type="button" className="vs-icon-btn" onClick={() => setShowPwd(s => !s)} aria-label={showPwd ? 'Masquer' : 'Afficher'} style={{ width: 36, height: 36, color: 'var(--color-subtle)' }}>{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>}>
            <input id="pw-cur" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} type={showPwd ? 'text' : 'password'} autoComplete="current-password" />
          </Field>
          <Field id="pw-new" label="Nouveau mot de passe" icon={<Lock size={18} />}>
            <input id="pw-new" value={newPwd} onChange={e => setNewPwd(e.target.value)} type={showPwd ? 'text' : 'password'} autoComplete="new-password" />
          </Field>
          <Field id="pw-conf" label="Confirmer le nouveau mot de passe" icon={<Lock size={18} />}>
            <input id="pw-conf" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} type={showPwd ? 'text' : 'password'} autoComplete="new-password" />
          </Field>
          {pwdMsg && <Alert msg={pwdMsg} />}
          <button type="submit" className="vs-btn vs-btn--primary vs-btn--block" disabled={pwdBusy}>{pwdBusy ? 'Enregistrement…' : 'Changer le mot de passe'}</button>
        </form>
      </Collapsible>
    </section>
  )
}

/* ─── Fidélité ─── */
const TIERS = [
  { name: 'Bronze',  min: 0,    max: 199,      color: '#d4945a', icon: Star },
  { name: 'Argent',  min: 200,  max: 499,      color: '#c0c4cc', icon: Zap },
  { name: 'Or',      min: 500,  max: 999,      color: '#f5b70a', icon: Trophy },
  { name: 'Platine', min: 1000, max: Infinity, color: '#7cb4ff', icon: Gift },
]

/* 1 pt par 2 000 Ar — crédité uniquement quand la commande est livrée */
const PTS_PER_AR = 2000
const orderPts = (o) => Math.floor((o.total || 0) / PTS_PER_AR)
const calcPoints = (orders) => orders.reduce((sum, o) => o.status === 'Livré' ? sum + orderPts(o) : sum, 0)
const getTier = (pts) => TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0]

function FidelitySection({ orders, referralPoints = 0 }) {
  const points   = calcPoints(orders) + referralPoints
  const tier     = getTier(points)
  const next     = TIERS[TIERS.indexOf(tier) + 1]
  const progress = next ? Math.min(100, Math.round(((points - tier.min) / (next.min - tier.min)) * 100)) : 100
  const TierIcon = tier.icon

  return (
    <section aria-labelledby="fid-title">
      <h3 id="fid-title" className="vs-section-title"><Trophy size={14} aria-hidden="true" /> Programme fidélité</h3>

      <div className="vs-box" style={{ padding: 18, background: `radial-gradient(ellipse at top right, ${tier.color}22, transparent 60%), var(--color-surface)` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, background: `${tier.color}22`, display: 'grid', placeItems: 'center' }}>
              <TierIcon size={22} color={tier.color} />
            </span>
            <div>
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Niveau</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: tier.color }}>{tier.name}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{points.toLocaleString('fr-FR')}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>points</div>
          </div>
        </div>

        {next ? (
          <div style={{ marginTop: 18 }}>
            <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progression vers ${next.name}`}
              style={{ height: 8, borderRadius: 99, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: tier.color }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 8 }}>
              Plus que <strong style={{ color: 'var(--color-text)' }}>{next.min - points} pts</strong> pour passer {next.name}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: tier.color, fontWeight: 600, marginTop: 14 }}>Niveau maximum atteint</p>
        )}
        {referralPoints > 0 && <p style={{ fontSize: 13, color: 'var(--color-subtle)', marginTop: 6 }}>Dont {referralPoints} pts de parrainage</p>}
      </div>

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, fontSize: 14, color: 'var(--color-muted)' }}>
        <li style={{ display: 'flex', gap: 10 }}><Package size={16} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" /> 1 point par 2 000 Ar dépensés, crédité à la livraison</li>
        <li style={{ display: 'flex', gap: 10 }}><Gift size={16} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" /> Réductions exclusives à venir pour les niveaux Or et Platine</li>
      </ul>

      {orders.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="vs-section-title" style={{ marginBottom: 8 }}>Derniers points</div>
          <div className="vs-box" style={{ overflow: 'hidden' }}>
            {orders.slice(0, 4).map((o, i, arr) => {
              const pts = orderPts(o)
              return (
                <div key={o.id} className="vs-row" style={{ padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.items?.[0]?.name || 'Commande'} · {o.date}</span>
                  {o.status === 'Livré'
                    ? <span style={{ fontWeight: 700, color: 'var(--color-gold)', flexShrink: 0 }}>+{pts} pts</span>
                    : o.status === 'Annulé'
                      ? <span style={{ color: 'var(--color-subtle)', flexShrink: 0 }}>annulée</span>
                      : <span style={{ color: 'var(--color-subtle)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}><Hourglass size={13} aria-hidden="true" /> +{pts} pts</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

/* ─── Parrainage ─── */
function ReferralSection({ data }) {
  const [copied, setCopied] = useState(false)
  const referralLink = data?.code ? `${window.location.origin}?ref=${data.code}` : ''

  const handleCopy = () => {
    if (!referralLink) return
    navigator.clipboard?.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section aria-labelledby="ref-title">
      <h3 id="ref-title" className="vs-section-title"><Users size={14} aria-hidden="true" /> Parrainage</h3>
      {data === null ? (
        <div className="vs-skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.6 }}>
            Invitez vos amis : vous gagnez <strong style={{ color: 'var(--color-text)' }}>10 points</strong> dès que votre filleul dépense 5 000 Ar.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Stat value={data?.count ?? 0} label="Filleuls validés" />
            <Stat value={`${data?.points ?? 0} pts`} label="Points gagnés" />
          </div>
          <div>
            <label className="vs-label" htmlFor="ref-link">Votre lien de parrainage</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="ref-link" readOnly value={referralLink} className="vs-input-box" onFocus={e => e.target.select()}
                style={{ fontSize: 14, color: 'var(--color-muted)' }} />
              <button type="button" className={`vs-btn ${copied ? 'vs-btn--added' : 'vs-btn--secondary'}`} onClick={handleCopy} style={{ flexShrink: 0 }}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
          </div>
          {data?.referrals?.length > 0 && (
            <div className="vs-box" style={{ overflow: 'hidden' }}>
              {data.referrals.map((r, i, arr) => (
                <div key={i} className="vs-row" style={{ padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 99, background: 'var(--color-surface-2)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>{r.name?.[0]?.toUpperCase()}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{r.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-subtle)' }}>{r.validated ? r.date : `${ar(r.spent)} / 5 000 Ar dépensés`}</div>
                    </div>
                  </div>
                  {r.validated
                    ? <span style={{ fontWeight: 700, color: 'var(--color-gold)', flexShrink: 0 }}>+10 pts</span>
                    : <span style={{ fontSize: 13, color: 'var(--color-subtle)', flexShrink: 0 }}>En attente</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Stat({ value, label }) {
  return (
    <div className="vs-box" style={{ padding: '14px 16px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{label}</div>
    </div>
  )
}

/* ─── Commandes ─── */
function OrdersSection({ orders, onClose }) {
  if (orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 12px' }}>
        <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
          <Package size={28} color="var(--color-subtle)" />
        </span>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Aucune commande pour l'instant</p>
        <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 18 }}>Vos commandes et leur suivi apparaîtront ici.</p>
        <a href="/catalogue" onClick={onClose} className="vs-btn vs-btn--primary">Découvrir la boutique</a>
      </div>
    )
  }
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orders.map(o => <OrderCard key={o.id} order={o} />)}
    </ul>
  )
}

function OrderCard({ order: o }) {
  const [open, setOpen] = useState(false)
  const st = STATUS[o.status] || STATUS['En attente']
  const firstItem = o.items?.[0]
  const extra = (o.items?.length || 0) - 1

  return (
    <li className="vs-box" style={{ overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(s => !s)} aria-expanded={open}
        style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'inherit', fontFamily: 'inherit' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {firstItem?.name || 'Commande'}{extra > 0 ? ` + ${extra} autre${extra > 1 ? 's' : ''}` : ''}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
            {o.date} · <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{ar(o.total)}</span>
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: '5px 10px', borderRadius: 99, flexShrink: 0 }}>{o.status}</span>
        <ChevronDown size={18} color="var(--color-subtle)" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid var(--color-border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {o.items?.map((item, j) => (
                <div key={j} className="vs-row"><span>{item.name} × {item.qty}</span><span>{ar(item.price * item.qty)}</span></div>
              ))}
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <Detail icon={<MapPin size={15} />} text={o.address} />
              {o.zone && <Detail icon={<Truck size={15} />} text={`Livraison · ${ar(o.delivery_fee)}`} />}
              {o.hours && <Detail icon={<Clock size={15} />} text={o.hours} />}
              <Detail icon={<CreditCard size={15} />} text={PAYMENT_LABELS[o.payment] || o.payment} />
              <div className="vs-row" style={{ paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Total</span>
                <span style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{ar(o.total)}</span>
              </div>
              {o.status === 'Livré' && <InvoiceButton orderId={o.id} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/* Téléchargement de facture (commande livrée) — fetch authentifié → blob */
function InvoiceButton({ orderId }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState(false)
  const download = async () => {
    setBusy(true); setErr(false)
    try {
      const r = await fetch(`/api/invoices/order/${orderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('vrg_token')}` },
      })
      if (!r.ok) throw new Error()
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `facture-commande-${orderId}.pdf`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setErr(true) }
    setBusy(false)
  }
  return (
    <button type="button" onClick={download} disabled={busy} className="vs-btn vs-btn--secondary vs-btn--block vs-btn--sm" style={{ marginTop: 4 }}>
      <Download size={16} aria-hidden="true" /> {busy ? 'Téléchargement…' : err ? 'Facture indisponible — réessayer' : 'Télécharger la facture (PDF)'}
    </button>
  )
}

/* ─── Atomes ─── */
function Collapsible({ open, onToggle, label, children }) {
  return (
    <div className="vs-box" style={{ overflow: 'hidden' }}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        style={{ width: '100%', minHeight: 52, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 15, fontWeight: 500 }}>
        {label}
        <ChevronDown size={18} color="var(--color-subtle)" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '4px 16px 16px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ id, label, icon, suffix, children }) {
  return (
    <div>
      <label className="vs-label" htmlFor={id}>{label}</label>
      <div className="vs-field">
        <span aria-hidden="true" style={{ display: 'flex' }}>{icon}</span>
        {children}
        {suffix}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--color-border)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-muted)', fontSize: 14 }}>
        <span aria-hidden="true" style={{ display: 'flex' }}>{icon}</span>{label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{value}</span>
    </div>
  )
}

function Detail({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--color-muted)' }}>
      <span aria-hidden="true" style={{ display: 'flex', marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <span style={{ lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

function Alert({ msg }) {
  const ok = msg.type === 'ok'
  return (
    <div className={`vs-alert ${ok ? 'vs-alert--ok' : 'vs-alert--error'}`} role={ok ? 'status' : 'alert'}>
      {ok ? <Check size={16} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />} {msg.text}
    </div>
  )
}
