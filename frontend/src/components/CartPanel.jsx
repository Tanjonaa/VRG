import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Plus, Minus, ShoppingCart, MapPin, CheckCircle, ChevronLeft, LogIn, Copy, Check, Phone, User, Hash, Clock, Navigation } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const PAYMENT_METHODS = [
  { id: 'mvola',     name: 'MVola',          sub: 'Telma',         color: '#00A651', bg: 'rgba(0,166,81,0.1)',   border: 'rgba(0,166,81,0.3)',   emoji: '🟢', merchantNumber: '034 XX XXX XX' },
  { id: 'airtel',    name: 'Airtel Money',   sub: 'Airtel',        color: '#E40032', bg: 'rgba(228,0,50,0.1)',   border: 'rgba(228,0,50,0.3)',   emoji: '🔴', merchantNumber: '033 XX XXX XX' },
  { id: 'orange',    name: 'Orange Money',   sub: 'Orange',        color: '#FF6600', bg: 'rgba(255,102,0,0.1)', border: 'rgba(255,102,0,0.3)', emoji: '🟠', merchantNumber: '032 XX XXX XX' },
  { id: 'livraison', name: 'À la livraison', sub: 'Payer en cash', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', emoji: '🚚', merchantNumber: null },
]

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

  const handleCheckout = async (e) => {
    e.preventDefault()
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 38 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
              width: '100%', maxWidth: 460,
              background: 'rgba(8,8,18,0.99)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-40px 0 100px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column',
            }}>

            {/* Top bar */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingCart size={20} color="#FF9900" />
                <span style={{ fontWeight: 700, fontSize: 17, color: '#f0f0f5' }}>Mon panier</span>
                {count > 0 && (
                  <span style={{ background: '#FF9900', color: '#000', borderRadius: 99, fontSize: 12, fontWeight: 700, padding: '2px 8px' }}>
                    {count}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {items.length > 0 && view === 'cart' && (
                  <button onClick={clearCart}
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#f87171', fontSize: 12, fontWeight: 600 }}>
                    Vider
                  </button>
                )}
                <button onClick={onClose}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '7px', cursor: 'pointer', color: 'rgba(240,240,245,0.5)', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <AnimatePresence mode="wait">
                {view === 'cart'     && <CartView     key="cart"     items={items} removeItem={removeItem} updateQty={updateQty} total={total} user={user} onCheckout={() => setView('checkout')} onOpenAuth={onOpenAuth} onClose={onClose} />}
                {view === 'checkout' && <CheckoutView key="checkout" payment={payment} setPayment={setPayment} address={address} setAddress={setAddress} zone={zone} setZone={setZone} hours={hours} setHours={setHours} note={note} setNote={setNote} transferPhone={transferPhone} setTransferPhone={setTransferPhone} transferName={transferName} setTransferName={setTransferName} transferId={transferId} setTransferId={setTransferId} subtotal={total} deliveryFee={deliveryFee} grandTotal={grandTotal} onSubmit={handleCheckout} onBack={() => setView('cart')} submitting={submitting} checkoutError={checkoutError} />}
                {view === 'success'  && <SuccessView  key="success"  order={lastOrder} onDone={() => { reset(); onClose() }} />}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Cart view ─── */
function CartView({ items, removeItem, updateQty, total, user, onCheckout, onOpenAuth, onClose }) {
  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 16 }}>
        <ShoppingCart size={52} color="rgba(240,240,245,0.15)" />
        <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(240,240,245,0.5)' }}>Votre panier est vide</p>
        <p style={{ fontSize: 13, color: 'rgba(240,240,245,0.3)', lineHeight: 1.5 }}>Parcourez nos produits et ajoutez-les à votre panier</p>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => { onClose(); window.location.href = '/catalogue' }}
          style={{ marginTop: 8, padding: '11px 24px', borderRadius: 10, border: '1px solid rgba(255,153,0,0.3)', background: 'rgba(255,153,0,0.1)', color: '#FF9900', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Voir les produits →
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
      {/* Items */}
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence>
          {items.map(item => (
            <motion.div key={item.id}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px' }}>
                <img src={item.image} alt={item.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: item.original_price ? '#f87171' : '#FF9900' }}>
                      Ar {item.price.toLocaleString('fr-FR')}
                    </span>
                    {item.original_price && (
                      <>
                        <span style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)', textDecoration: 'line-through' }}>
                          Ar {item.original_price.toLocaleString('fr-FR')}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 99, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                          -{item.promo_percent}%
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '3px' }}>
                      <button onClick={() => updateQty(item.id, item.qty - 1)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f0f5' }}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5', minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f0f5' }}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', display: 'flex', padding: 4 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom total + CTA */}
      <div style={{ padding: '16px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Économies promo */}
        {items.some(i => i.original_price) && (() => {
          const saving = items.reduce((s, i) => s + (i.original_price ? (i.original_price - i.price) * i.qty : 0), 0)
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Économies promo</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#22c55e' }}>-Ar {saving.toLocaleString('fr-FR')}</span>
            </div>
          )
        })()}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, color: 'rgba(240,240,245,0.6)' }}>Total</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#FF9900', letterSpacing: '-0.02em' }}>
            Ar {total.toLocaleString('fr-FR')}
          </span>
        </div>

        {user && user.role !== 'client' ? (
          <div style={{ textAlign: 'center', padding: '14px', borderRadius: 12, background: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.15)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,153,0,0.7)', margin: 0 }}>Compte {user.role} — les achats sont réservés aux clients</p>
          </div>
        ) : user ? (
          <motion.button whileHover={{ scale: 1.02, boxShadow: '0 6px 28px rgba(255,153,0,0.4)' }} whileTap={{ scale: 0.97 }}
            onClick={onCheckout}
            style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg, #FF9900, #CC5500)', color: '#fff', boxShadow: '0 4px 20px rgba(255,153,0,0.28)' }}>
            Passer la commande →
          </motion.button>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(240,240,245,0.45)', marginBottom: 12 }}>Connecte-toi pour finaliser ta commande</p>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onOpenAuth}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg, #FF9900, #CC5500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <LogIn size={17} /> Se connecter
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Checkout view ─── */
const ZONES = [
  { id: 'tana',        label: 'Tana Ville',   fee: 5000,  desc: 'Antananarivo centre',  color: '#FF9900' },
  { id: 'peripherique',label: 'Périphérique', fee: 10000, desc: 'Banlieue & communes',  color: '#fbbf24' },
]

function CheckoutView({ payment, setPayment, address, setAddress, zone, setZone, hours, setHours, note, setNote, transferPhone, setTransferPhone, transferName, setTransferName, transferId, setTransferId, subtotal, deliveryFee, grandTotal, onSubmit, onBack, submitting, checkoutError }) {
  const [copied, setCopied] = useState(false)
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === payment)
  const isMobile = payment && payment !== 'livraison'
  const canSubmit = payment && address.trim() && zone && hours.trim() && (!isMobile || (transferPhone.trim() && transferName.trim() && transferId.trim()))

  const copyNumber = (num) => {
    navigator.clipboard?.writeText(num.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
      <div style={{ padding: '20px 24px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.45)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, padding: 0, fontFamily: 'inherit' }}>
          <ChevronLeft size={16} /> Retour au panier
        </button>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Address */}
          <div>
            <Label>Adresse de livraison</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <MapPin size={15} color="rgba(240,240,245,0.3)" />
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Quartier, rue, numéro..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#f0f0f5', fontFamily: 'inherit' }} />
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note optionnelle (ex : appeler avant)"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'rgba(240,240,245,0.55)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Zone de livraison */}
          <div>
            <Label>Zone de livraison</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ZONES.map(z => (
                <button key={z.id} type="button" onClick={() => setZone(z.id)}
                  style={{
                    padding: '13px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    border: `1px solid ${zone === z.id ? z.color + '55' : 'rgba(255,255,255,0.07)'}`,
                    background: zone === z.id ? `${z.color}12` : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.18s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Navigation size={13} color={zone === z.id ? z.color : 'rgba(240,240,245,0.35)'} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: zone === z.id ? z.color : '#f0f0f5' }}>{z.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.38)', marginBottom: 5 }}>{z.desc}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: zone === z.id ? z.color : 'rgba(240,240,245,0.5)' }}>
                    Ar {z.fee.toLocaleString('fr-FR')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Heures de disponibilité */}
          <div>
            <Label>Heures de disponibilité</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
              <Clock size={15} color="rgba(240,240,245,0.3)" />
              <input
                value={hours} onChange={e => setHours(e.target.value)}
                placeholder="Ex : 08h–12h ou 14h–18h"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#f0f0f5', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Payment method selector */}
          <div>
            <Label>Méthode de paiement</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} type="button" onClick={() => setPayment(m.id)}
                  style={{ padding: '13px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: `1px solid ${payment === m.id ? m.border : 'rgba(255,255,255,0.07)'}`, background: payment === m.id ? m.bg : 'rgba(255,255,255,0.02)', transition: 'all 0.18s' }}>
                  <div style={{ fontSize: 20, marginBottom: 5, lineHeight: 1 }}>{m.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: payment === m.id ? m.color : '#f0f0f5' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.38)', marginTop: 2 }}>{m.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Transfer accordion — mobile money only */}
          <AnimatePresence>
            {isMobile && selectedMethod && (
              <motion.div
                key={payment}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ background: `${selectedMethod.bg}`, border: `1px solid ${selectedMethod.border}`, borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Merchant number */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Envoie le montant à ce numéro
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 14px' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', marginBottom: 3 }}>{selectedMethod.name} VRG</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: selectedMethod.color, letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
                          {selectedMethod.merchantNumber}
                        </div>
                      </div>
                      <button type="button" onClick={() => copyNumber(selectedMethod.merchantNumber)}
                        style={{ background: `${selectedMethod.color}20`, border: `1px solid ${selectedMethod.color}40`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: selectedMethod.color, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        {copied ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: `${selectedMethod.color}25` }} />

                  {/* Transfer confirmation fields */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Confirme ton transfert
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <TransferField icon={<Phone size={14} />} placeholder="Ton numéro de téléphone utilisé" value={transferPhone} onChange={setTransferPhone} type="tel" color={selectedMethod.color} />
                      <TransferField icon={<User size={14} />} placeholder="Nom inscrit sur ta puce" value={transferName} onChange={setTransferName} color={selectedMethod.color} />
                      <TransferField icon={<Hash size={14} />} placeholder="ID du transfert (envoyé par l'opérateur)" value={transferId} onChange={setTransferId} color={selectedMethod.color} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Total décomposé */}
          <div style={{ background: 'rgba(255,153,0,0.07)', border: '1px solid rgba(255,153,0,0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(240,240,245,0.55)' }}>
              <span>Sous-total</span>
              <span>Ar {subtotal.toLocaleString('fr-FR')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(240,240,245,0.55)' }}>
              <span>Livraison {zone ? `(${ZONES.find(z => z.id === zone)?.label})` : ''}</span>
              <span style={{ color: deliveryFee > 0 ? '#fbbf24' : 'rgba(240,240,245,0.55)' }}>
                {zone ? `Ar ${deliveryFee.toLocaleString('fr-FR')}` : '—'}
              </span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,153,0,0.2)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'rgba(240,240,245,0.7)', fontWeight: 600 }}>Total à payer</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#FF9900', letterSpacing: '-0.02em' }}>Ar {grandTotal.toLocaleString('fr-FR')}</span>
            </div>
          </div>

          {checkoutError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
              {checkoutError}
            </div>
          )}

          <motion.button whileHover={canSubmit && !submitting ? { scale: 1.02, boxShadow: '0 6px 28px rgba(255,153,0,0.4)' } : {}} whileTap={canSubmit && !submitting ? { scale: 0.97 } : {}}
            type="submit" disabled={!canSubmit || submitting}
            style={{ padding: '16px', borderRadius: 12, border: 'none', cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700, transition: 'all 0.2s', background: canSubmit && !submitting ? 'linear-gradient(135deg, #FF9900, #CC5500)' : 'rgba(255,255,255,0.06)', color: canSubmit && !submitting ? '#fff' : 'rgba(240,240,245,0.25)', boxShadow: canSubmit && !submitting ? '0 4px 20px rgba(255,153,0,0.28)' : 'none' }}>
            {submitting ? 'Enregistrement...' : 'Confirmer la commande'}
          </motion.button>
        </form>
      </div>
    </motion.div>
  )
}

function TransferField({ icon, placeholder, value, onChange, type = 'text', color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.25)', border: `1px solid ${color}30`, borderRadius: 10, padding: '11px 13px' }}>
      <span style={{ color: `${color}90`, flexShrink: 0 }}>{icon}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', fontFamily: 'inherit' }} />
    </div>
  )
}

/* ─── Success view ─── */
function SuccessView({ order, onDone }) {
  const pm = PAYMENT_METHODS.find(m => m.id === order?.payment)
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      style={{ padding: '40px 24px', textAlign: 'center' }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.12, type: 'spring', stiffness: 280 }}
        style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <CheckCircle size={38} color="#22c55e" />
      </motion.div>
      <h3 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f5', marginBottom: 10 }}>Commande confirmée !</h3>
      <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.5)', marginBottom: 28, lineHeight: 1.65 }}>
        On te contacte dans les <strong style={{ color: '#FF9900' }}>5 minutes</strong><br />pour confirmer ta livraison.
      </p>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Récapitulatif</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {order?.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'rgba(240,240,245,0.55)' }}>{item.name} ×{item.qty}</span>
              <span style={{ fontWeight: 600, color: '#f0f0f5' }}>Ar {(item.price * item.qty).toLocaleString('fr-FR')}</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'rgba(240,240,245,0.45)' }}>Total</span>
            <span style={{ fontWeight: 700, color: '#FF9900' }}>Ar {order?.total?.toLocaleString('fr-FR')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'rgba(240,240,245,0.45)' }}>Paiement</span>
            <span style={{ fontWeight: 600, color: '#f0f0f5' }}>{pm?.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'rgba(240,240,245,0.45)' }}>Adresse</span>
            <span style={{ fontWeight: 600, color: '#f0f0f5', textAlign: 'right', maxWidth: '60%' }}>{order?.address}</span>
          </div>
        </div>
      </div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onDone}
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #FF9900, #CC5500)', color: '#fff', fontSize: 15, fontWeight: 700 }}>
        Fermer
      </motion.button>
    </motion.div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
}
