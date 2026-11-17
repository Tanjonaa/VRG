import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, MapPin, CheckCircle2, ChevronLeft, LogIn, Copy, Check, Phone, User, Hash, ArrowRight, Package, AlertCircle } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import Drawer from './store/Drawer.jsx'

const PAYMENT_METHODS = [
  { id: 'mvola',     name: 'MVola',          sub: 'Telma',         color: '#00A651', merchantNumber: '034 XX XXX XX' },
  { id: 'airtel',    name: 'Airtel Money',   sub: 'Airtel',        color: '#E40032', merchantNumber: '033 XX XXX XX' },
  { id: 'orange',    name: 'Orange Money',   sub: 'Orange',        color: '#FF6600', merchantNumber: '032 XX XXX XX' },
  { id: 'livraison', name: 'À la livraison', sub: 'Payer en cash', color: '#22c55e', merchantNumber: null },
]

const ZONES = [
  { id: 'tana',         label: 'Tana Ville',   fee: 5000,  desc: 'Antananarivo centre' },
  { id: 'peripherique', label: 'Périphérique', fee: 10000, desc: 'Banlieue & communes' },
]

const ar = (n) => `${Number(n || 0).toLocaleString('fr-FR')} Ar`
const fade = { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 }, transition: { duration: 0.2 } }

export default function CartPanel({ isOpen, onClose, onOpenAuth }) {
  const { items, removeItem, updateQty, clearCart, total, count } = useCart()
  const { user, addOrder } = useAuth()
  const [view, setView]               = useState('cart')
  const [payment, setPayment]         = useState(null)
  const [address, setAddress]         = useState('')
  const [zone, setZone]               = useState(null)
  const [hours, setHours]             = useState('')
  const [note, setNote]               = useState('')
  const [transferPhone, setTransferPhone] = useState('')
  const [transferName, setTransferName]   = useState('')
  const [transferId, setTransferId]       = useState('')
  const [lastOrder, setLastOrder]     = useState(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [submitting, setSubmitting]   = useState(false)

  const isMobile = payment && payment !== 'livraison'
  const deliveryFee = zone === 'tana' ? 5000 : zone === 'peripherique' ? 10000 : 0
  const grandTotal  = total + deliveryFee
  const canSubmit = payment && address.trim() && zone && hours.trim() && (!isMobile || (transferPhone.trim() && transferName.trim() && transferId.trim()))

  const handleCheckout = async (e) => {
    e?.preventDefault()
    if (!payment || !address.trim() || !zone || !hours.trim() || items.length === 0) return
    if (isMobile && (!transferPhone.trim() || !transferName.trim() || !transferId.trim())) return
    setSubmitting(true)
    setCheckoutError('')
    try {
      const order = await addOrder({
        items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        payment, address, zone, delivery_fee: deliveryFee, hours, note,
        total: grandTotal,
        transfer: isMobile ? { phone: transferPhone, name: transferName, id: transferId } : null,
      })
      setLastOrder(order)
      clearCart()
      setView('success')
    } catch (err) {
      setCheckoutError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setPayment(null); setAddress(''); setZone(null); setHours(''); setNote('')
    setTransferPhone(''); setTransferName(''); setTransferId('')
    setView('cart')
  }

  const saving = items.reduce((s, i) => s + (i.original_price ? (i.original_price - i.price) * i.qty : 0), 0)

  /* Pied de tiroir fixe : total + action principale selon l'étape */
  let footer = null
  if (view === 'cart' && items.length > 0) {
    footer = (
      <>
        {saving > 0 && <div className="vs-row" style={{ marginBottom: 6 }}><span>Économies promo</span><span style={{ color: 'var(--color-success)', fontWeight: 600 }}>−{ar(saving)}</span></div>}
        <div className="vs-row" style={{ marginBottom: 4 }}>
          <span>Sous-total</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{ar(total)}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-subtle)', marginBottom: 14 }}>Frais de livraison calculés à l'étape suivante.</p>
        {user && user.role !== 'client' ? (
          <div className="vs-alert vs-alert--info">Compte {user.role} — les achats sont réservés aux clients.</div>
        ) : user ? (
          <button type="button" className="vs-btn vs-btn--primary vs-btn--block" onClick={() => setView('checkout')}>
            Passer la commande <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <>
            <button type="button" className="vs-btn vs-btn--primary vs-btn--block" onClick={onOpenAuth}>
              <LogIn size={18} aria-hidden="true" /> Se connecter pour commander
            </button>
            <p style={{ fontSize: 13, color: 'var(--color-subtle)', textAlign: 'center', marginTop: 10 }}>Pas de compte ? L'inscription prend 1 minute.</p>
          </>
        )}
      </>
    )
  } else if (view === 'checkout') {
    footer = (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          <div className="vs-row"><span>Sous-total</span><span>{ar(total)}</span></div>
          <div className="vs-row"><span>Livraison{zone ? ` · ${ZONES.find(z => z.id === zone)?.label}` : ''}</span><span>{zone ? ar(deliveryFee) : '—'}</span></div>
          <div className="vs-row" style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Total à payer</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>{ar(grandTotal)}</span>
          </div>
        </div>
        {checkoutError && <div className="vs-alert vs-alert--error" role="alert" style={{ marginBottom: 12 }}><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />{checkoutError}</div>}
        <button type="submit" form="vs-checkout" className="vs-btn vs-btn--primary vs-btn--block" disabled={!canSubmit || submitting}>
          {submitting ? 'Enregistrement…' : 'Confirmer la commande'}
        </button>
        {!canSubmit && <p style={{ fontSize: 13, color: 'var(--color-subtle)', textAlign: 'center', marginTop: 10 }}>Complète l'adresse, la zone et le paiement.</p>}
      </>
    )
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose}
      title={view === 'checkout' ? 'Finaliser la commande' : view === 'success' ? 'Commande envoyée' : 'Mon panier'}
      icon={<ShoppingBag size={20} color="var(--color-gold)" aria-hidden="true" />}
      actions={view === 'cart' && count > 0 && (
        <button type="button" className="vs-textbtn vs-textbtn--danger" onClick={clearCart} style={{ marginRight: 4 }}>Vider</button>
      )}
      footer={footer}>
      <AnimatePresence mode="wait">
        {view === 'cart' && (
          <motion.div key="cart" {...fade}>
            {items.length === 0
              ? <EmptyCart onClose={onClose} />
              : <ul className="vs-drawer__pad" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <AnimatePresence initial={false}>
                    {items.map(item => <CartItem key={item.id} item={item} updateQty={updateQty} removeItem={removeItem} />)}
                  </AnimatePresence>
                </ul>}
          </motion.div>
        )}
        {view === 'checkout' && (
          <motion.div key="checkout" {...fade}>
            <CheckoutForm {...{ payment, setPayment, address, setAddress, zone, setZone, setHours, note, setNote, transferPhone, setTransferPhone, transferName, setTransferName, transferId, setTransferId }}
              onSubmit={handleCheckout} onBack={() => setView('cart')} />
          </motion.div>
        )}
        {view === 'success' && (
          <motion.div key="success" {...fade}>
            <SuccessView order={lastOrder} onDone={() => { reset(); onClose() }} />
          </motion.div>
        )}
      </AnimatePresence>
    </Drawer>
  )
}

function EmptyCart({ onClose }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '72px 24px', gap: 10 }}>
      <span aria-hidden="true" style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'grid', placeItems: 'center', marginBottom: 8 }}>
        <ShoppingBag size={30} color="var(--color-subtle)" />
      </span>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Ton panier est vide</p>
      <p style={{ fontSize: 14, color: 'var(--color-muted)', maxWidth: 280 }}>Parcours nos accessoires et ajoute ceux qui te plaisent.</p>
      <a href="/catalogue" onClick={onClose} className="vs-btn vs-btn--primary" style={{ marginTop: 14 }}>
        Voir les produits <ArrowRight size={18} aria-hidden="true" />
      </a>
    </div>
  )
}

function CartItem({ item, updateQty, removeItem }) {
  const [err, setErr] = useState(false)
  return (
    <motion.li layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
      <div className="vs-box" style={{ display: 'flex', gap: 14, padding: 12 }}>
        <div style={{ width: 76, height: 76, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--color-surface-2)', display: 'grid', placeItems: 'center' }}>
          {item.image && !err
            ? <img src={item.image} alt="" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Package size={26} color="var(--color-subtle)" aria-hidden="true" />}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</p>
            <button type="button" className="vs-icon-btn" onClick={() => removeItem(item.id)} aria-label={`Retirer ${item.name} du panier`}
              style={{ width: 36, height: 36, marginTop: -6, marginRight: -6, color: 'var(--color-subtle)', flexShrink: 0 }}>
              <Trash2 size={16} />
            </button>
          </div>
          <div className="vs-price">
            <span className={`vs-price__now${item.original_price ? ' vs-price__now--promo' : ''}`} style={{ fontSize: 16 }}>{ar(item.price)}</span>
            {item.original_price && <span className="vs-price__old">{ar(item.original_price)}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div className="vs-qty" role="group" aria-label={`Quantité de ${item.name}`}>
              <button type="button" onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Diminuer la quantité"><Minus size={14} /></button>
              <span aria-live="polite">{item.qty}</span>
              <button type="button" onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Augmenter la quantité"><Plus size={14} /></button>
            </div>
            {item.qty > 1 && <span style={{ fontSize: 14, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>{ar(item.price * item.qty)}</span>}
          </div>
        </div>
      </div>
    </motion.li>
  )
}

function CheckoutForm({ payment, setPayment, address, setAddress, zone, setZone, setHours, note, setNote, transferPhone, setTransferPhone, transferName, setTransferName, transferId, setTransferId, onSubmit, onBack }) {
  const [copied, setCopied] = useState(false)
  const method = PAYMENT_METHODS.find(m => m.id === payment)
  const isMobile = payment && payment !== 'livraison'

  const copyNumber = (num) => {
    navigator.clipboard?.writeText(num.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <form id="vs-checkout" onSubmit={onSubmit} className="vs-drawer__pad" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <button type="button" className="vs-textbtn" onClick={onBack} style={{ alignSelf: 'flex-start', marginLeft: -4 }}>
        <ChevronLeft size={18} /> Retour au panier
      </button>

      <Step n={1} title="Adresse de livraison">
        <label className="vs-label" htmlFor="co-address">Adresse</label>
        <div className="vs-field">
          <MapPin size={18} aria-hidden="true" />
          <input id="co-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Quartier, rue, numéro…" autoComplete="street-address" required />
        </div>
        <label className="vs-label" htmlFor="co-note" style={{ marginTop: 14 }}>Instructions <small>(optionnel)</small></label>
        <input id="co-note" className="vs-input-box" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex : appeler avant de passer" />
      </Step>

      <Step n={2} title="Zone de livraison">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} role="group" aria-label="Zone de livraison">
          {ZONES.map(z => (
            <button key={z.id} type="button" className="vs-option" aria-pressed={zone === z.id} onClick={() => setZone(z.id)}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{z.label}</span>
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{z.desc}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-gold)', marginTop: 4 }}>{ar(z.fee)}</span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={3} title="Date et créneau de disponibilité">
        <DeliveryScheduler onChange={setHours} />
      </Step>

      <Step n={4} title="Paiement">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} role="group" aria-label="Méthode de paiement">
          {PAYMENT_METHODS.map(m => (
            <button key={m.id} type="button" className="vs-option" aria-pressed={payment === m.id} onClick={() => setPayment(m.id)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600 }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 99, background: m.color, flexShrink: 0 }} />
                {m.name}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{m.sub}</span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {isMobile && method && (
            <motion.div key={payment} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden' }}>
              <div className="vs-box" style={{ marginTop: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>1. Envoie <strong style={{ color: 'var(--color-text)' }}>le total à payer</strong> à ce numéro {method.name} :</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>{method.merchantNumber}</span>
                    <button type="button" className={`vs-btn vs-btn--sm ${copied ? 'vs-btn--added' : 'vs-btn--secondary'}`} onClick={() => copyNumber(method.merchantNumber)}>
                      {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>2. Confirme ton transfert :</p>
                  <TransferField id="tr-phone" label="Numéro utilisé pour le transfert" icon={<Phone size={18} />} value={transferPhone} onChange={setTransferPhone} type="tel" placeholder="034 XX XXX XX" />
                  <TransferField id="tr-name" label="Nom inscrit sur la puce" icon={<User size={18} />} value={transferName} onChange={setTransferName} placeholder="Nom complet" />
                  <TransferField id="tr-id" label="ID du transfert (SMS de l'opérateur)" icon={<Hash size={18} />} value={transferId} onChange={setTransferId} placeholder="Ex : PP231117.1234.A12345" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Step>
    </form>
  )
}

function Step({ n, title, children }) {
  return (
    <fieldset style={{ border: 'none' }}>
      <legend style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontSize: 16, fontWeight: 600 }}>
        <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function TransferField({ id, label, icon, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="vs-label" htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', marginBottom: 6 }}>{label}</label>
      <div className="vs-field">
        <span aria-hidden="true" style={{ display: 'flex' }}>{icon}</span>
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required />
      </div>
    </div>
  )
}

function SuccessView({ order, onDone }) {
  const pm = PAYMENT_METHODS.find(m => m.id === order?.payment)
  return (
    <div className="vs-drawer__pad" style={{ textAlign: 'center', paddingTop: 40 }}>
      <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
        aria-hidden="true" style={{ width: 76, height: 76, borderRadius: 99, background: 'var(--color-success-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
        <CheckCircle2 size={40} color="var(--color-success)" />
      </motion.span>
      <h3 className="vs-h2" style={{ fontSize: 24, marginBottom: 8 }}>Merci pour ta commande !</h3>
      <p style={{ fontSize: 15, color: 'var(--color-muted)', marginBottom: 28, lineHeight: 1.6 }}>
        On te contacte dans les <strong style={{ color: 'var(--color-gold)' }}>5 minutes</strong> pour confirmer la livraison.
      </p>
      <div className="vs-box" style={{ padding: 18, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <div className="vs-section-title" style={{ marginBottom: 2 }}>Récapitulatif</div>
        {order?.items?.map((item, i) => (
          <div key={i} className="vs-row"><span>{item.name} × {item.qty}</span><span>{ar(item.price * item.qty)}</span></div>
        ))}
        <div style={{ height: 1, background: 'var(--color-border)' }} />
        <div className="vs-row"><span>Total</span><span style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{ar(order?.total)}</span></div>
        <div className="vs-row"><span>Paiement</span><span>{pm?.name}</span></div>
        <div className="vs-row" style={{ alignItems: 'flex-start' }}><span>Adresse</span><span style={{ textAlign: 'right', maxWidth: '60%' }}>{order?.address}</span></div>
      </div>
      <button type="button" className="vs-btn vs-btn--primary vs-btn--block" onClick={onDone}>Continuer mes achats</button>
    </div>
  )
}

/* Sélecteur d'heure sombre inline (pas de portal : reste aligné dans le tiroir qui défile) */
function HourPick({ value, options, onChange, label }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const key = e => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))
    document.addEventListener('mousedown', fn)
    document.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('keydown', key, true) }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label} : ${value}h00`}
        className="vs-field" style={{ width: '100%', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--color-text)', fontSize: 16, fontFamily: 'inherit', borderColor: open ? 'var(--color-gold)' : undefined }}>
        <span>{value}h00</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ color: 'var(--color-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={label} style={{ listStyle: 'none', position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, maxHeight: 220, overflowY: 'auto', background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)', borderRadius: 12, boxShadow: 'var(--shadow-pop)', padding: 4 }}>
          {options.map(h => (
            <li key={h} role="option" aria-selected={h === value}>
              <button type="button" onClick={() => { onChange(h); setOpen(false) }}
                style={{ width: '100%', minHeight: 40, padding: '0 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: h === value ? 'var(--color-gold-soft)' : 'transparent', color: h === value ? 'var(--color-gold)' : 'var(--color-text)', fontWeight: h === value ? 700 : 400 }}>
                {h}h00 {h === value && <Check size={15} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* Livraison à J+1 minimum, créneau horaire entre 10h et 17h */
function DeliveryScheduler({ onChange }) {
  /* Date locale (pas toISOString : UTC décale d'un jour tôt le matin à Madagascar) */
  const localStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minStr = localStr(tomorrow)

  const [date, setDate]     = React.useState(minStr)
  const [startH, setStartH] = React.useState('10')
  const [endH, setEndH]     = React.useState('12')

  const HOURS = Array.from({ length: 8 }, (_, i) => String(i + 10).padStart(2, '0'))  // 10 → 17

  React.useEffect(() => {
    const d = new Date(date + 'T12:00:00')
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    onChange(`${label}, ${startH}h → ${endH}h`)
  }, [date, startH, endH])

  const validEnd = HOURS.filter(h => Number(h) > Number(startH))
  const safeEnd  = validEnd.includes(endH) ? endH : validEnd[0] || '17'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label className="vs-label" htmlFor="co-date">Date</label>
        <input id="co-date" type="date" className="vs-input-box" value={date} min={minStr}
          onChange={e => { if (e.target.value && e.target.value >= minStr) setDate(e.target.value) }} style={{ cursor: 'pointer' }} />
      </div>
      <div>
        <span className="vs-label">Créneau <small>(entre 10h et 17h)</small></span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
          <HourPick label="Heure de début" value={startH} options={HOURS.slice(0, -1)}
            onChange={v => { setStartH(v); if (Number(v) >= Number(safeEnd)) setEndH(String(Number(v) + 1).padStart(2, '0')) }} />
          <span aria-hidden="true" style={{ color: 'var(--color-subtle)' }}>à</span>
          <HourPick label="Heure de fin" value={safeEnd} options={validEnd} onChange={setEndH} />
        </div>
      </div>
    </div>
  )
}
