import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from '../context/AuthContext.jsx'
import { CartProvider, useCart } from '../context/CartContext.jsx'
import { useSettings } from '../hooks/useSettings.js'
import CartPanel from './CartPanel.jsx'
import AuthModal from './AuthModal.jsx'
import SupportChat from './SupportChat.jsx'
import ComingSoon from './ComingSoon.jsx'

/* ─── helpers ─── */
const fmt = n => Number(n).toLocaleString('fr-FR')
const djb2 = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h*33)^s.charCodeAt(i))>>>0; return h }
const PALETTE = ['#FF9900','#a78bfa','#34d399','#60a5fa','#f472b6','#fb923c','#38bdf8','#4ade80','#e879f9','#f87171']
const catColor = c => PALETTE[djb2(c||'')%PALETTE.length]
const parse = raw => { try { const a = JSON.parse(raw); return Array.isArray(a)?a:[] } catch { return [] } }

const AGO_MS = { '7d':7*86400000, '30d':30*86400000, '90d':90*86400000 }
const isNew7 = p => p.created_at && (Date.now() - new Date(p.created_at)) < AGO_MS['7d']
const filterByDate = (list, df) => {
  const sorted = [...list].sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
  if (df === 'all') return sorted
  const cutoff = Date.now() - AGO_MS[df]
  return sorted.filter(p => p.created_at && new Date(p.created_at) >= cutoff)
}
const fmtDate = ts => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
}

/* ══════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════ */
const T = {
  bg:       '#05050d',
  surface:  'rgba(12,12,26,0.85)',
  glass:    'rgba(255,255,255,0.04)',
  border:   'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,153,0,0.35)',
  accent:   '#FF9900',
  accentDim:'rgba(255,153,0,0.15)',
  text:     '#f0f0f8',
  textMuted:'rgba(240,240,248,0.45)',
  textDim:  'rgba(240,240,248,0.22)',
}

/* ══════════════════════════════════════════
   PREMIUM BUTTON
══════════════════════════════════════════ */
function Btn({ children, onClick, variant = 'ghost', size = 'md', disabled, full, style: sx = {} }) {
  const pads = { sm:'7px 16px', md:'11px 22px', lg:'14px 32px' }
  const sizes = { sm:11, md:13, lg:15 }
  const variants = {
    primary:  { background:'linear-gradient(135deg,#FF9900 0%,#e67e00 100%)', border:'none', color:'#fff', boxShadow:'0 4px 24px rgba(255,153,0,0.35)' },
    ghost:    { background:T.glass, border:`1px solid ${T.border}`, color:T.text, boxShadow:'none' },
    outline:  { background:'transparent', border:`1px solid ${T.borderHi}`, color:T.accent, boxShadow:'none' },
    danger:   { background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', boxShadow:'none' },
  }
  const v = disabled ? { background:'rgba(255,255,255,0.03)', border:`1px solid ${T.border}`, color:T.textDim, boxShadow:'none' } : variants[variant]
  return (
    <motion.button
      whileHover={disabled ? {} : variant==='primary' ? { scale:1.03, boxShadow:'0 6px 32px rgba(255,153,0,0.45)' } : { scale:1.02, background:'rgba(255,255,255,0.07)' }}
      whileTap={disabled ? {} : { scale:0.97 }}
      onClick={disabled ? undefined : onClick}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:pads[size], borderRadius:99, fontSize:sizes[size], fontWeight:700, letterSpacing:'0.01em', cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit', width:full?'100%':'auto', transition:'background 0.2s', ...v, ...sx }}>
      {children}
    </motion.button>
  )
}

/* ══════════════════════════════════════════
   GLASS CARD
══════════════════════════════════════════ */
function GlassCard({ children, style: sx = {}, glow = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${glow ? T.borderHi : T.border}`,
      borderRadius: 20,
      boxShadow: glow ? `0 8px 40px rgba(255,153,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06)` : `0 2px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
      transition: 'border-color 0.25s, box-shadow 0.25s',
      ...sx,
    }}>
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════
   PRODUCT CARD — PREMIUM
══════════════════════════════════════════ */
function ProductCard({ product, onAdd, onView, forceNew = false }) {
  const [hov, setHov] = useState(false)
  const [added, setAdded] = useState(false)
  const imgs = parse(product.images)
  const img  = imgs[0]?.src
  const oos  = product.stock === 0
  const col  = catColor(product.category)
  const nouveau = forceNew || isNew7(product)

  const handleAdd = e => {
    e.stopPropagation()
    if (oos) return
    onAdd(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <motion.div
      layout
      initial={{ opacity:0, y:20 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, scale:0.93 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onView(product)}
      style={{
        background: T.surface,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${hov ? T.borderHi : T.border}`,
        borderRadius: 22,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        cursor: 'pointer',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov
          ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,153,0,0.1)'
          : '0 4px 24px rgba(0,0,0,0.25)',
      }}>

      {/* Image */}
      <div style={{ position:'relative', aspectRatio:'4/3', overflow:'hidden', background:'rgba(255,255,255,0.02)' }}>
        {img
          ? <img src={img} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s cubic-bezier(0.4,0,0.2,1)', transform: hov?'scale(1.1)':'scale(1)' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, opacity:0.1 }}>📦</div>
        }

        {/* Gradient overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(5,5,13,0.7) 0%, transparent 50%)', pointerEvents:'none' }} />

        {/* Badges top-left */}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', flexDirection:'column', gap:5 }}>
          {nouveau && (
            <motion.span
              initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring', damping:14 }}
              style={{ fontSize:9, fontWeight:900, padding:'3px 9px', borderRadius:99, background:'linear-gradient(135deg,#4ade80,#16a34a)', color:'#fff', letterSpacing:'0.1em', textTransform:'uppercase', boxShadow:'0 2px 10px rgba(74,222,128,0.4)' }}>
              ✦ Nouveau
            </motion.span>
          )}
          {product.category && (
            <span style={{ fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:99, background:`${col}20`, color:col, border:`1px solid ${col}35`, backdropFilter:'blur(8px)', letterSpacing:'0.05em' }}>
              {product.category}
            </span>
          )}
        </div>

        {/* Out of stock */}
        {oos && (
          <div style={{ position:'absolute', inset:0, background:'rgba(5,5,13,0.65)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
            <span style={{ fontSize:12, fontWeight:800, color:'rgba(240,240,248,0.6)', border:'1px solid rgba(240,240,248,0.15)', padding:'6px 16px', borderRadius:99, letterSpacing:'0.1em', textTransform:'uppercase' }}>
              Rupture
            </span>
          </div>
        )}

        {/* Quick add overlay */}
        <AnimatePresence>
          {hov && !oos && (
            <motion.div
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
              style={{ position:'absolute', bottom:12, left:12, right:12, display:'flex', gap:8 }}
              onClick={e => e.stopPropagation()}>
              <motion.button
                whileTap={{ scale:0.95 }}
                onClick={handleAdd}
                style={{ flex:1, padding:'10px', borderRadius:12, border:'none', cursor:'pointer', background: added ? 'rgba(34,197,94,0.9)' : 'rgba(255,153,0,0.9)', color:'#fff', fontSize:12, fontWeight:800, backdropFilter:'blur(8px)', letterSpacing:'0.02em', transition:'background 0.2s' }}>
                {added ? '✓ Ajouté !' : '+ Ajouter au panier'}
              </motion.button>
              <motion.button
                whileTap={{ scale:0.95 }}
                onClick={() => onView(product)}
                style={{ padding:'10px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer', background:'rgba(5,5,13,0.7)', color:'rgba(240,240,248,0.8)', fontSize:12, fontWeight:700, backdropFilter:'blur(8px)' }}>
                Voir →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div style={{ padding:'16px 18px 18px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.text, lineHeight:1.35, letterSpacing:'-0.2px' }}>
          {product.name}
        </div>
        {product.description && (
          <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {product.description}
          </div>
        )}
        {product.created_at && (
          <div style={{ fontSize:10, color:T.textDim, display:'flex', alignItems:'center', gap:4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Ajouté le {fmtDate(product.created_at)}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:8, borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
            <span style={{ fontSize:20, fontWeight:900, color:T.accent, letterSpacing:'-1px', lineHeight:1 }}>{fmt(product.price)}</span>
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:600 }}>Ar</span>
          </div>
          {product.stock > 0 && product.stock <= 5 ? (
            <span style={{ fontSize:10, fontWeight:700, color:'#fbbf24', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', padding:'2px 8px', borderRadius:99 }}>
              {product.stock} restant{product.stock>1?'s':''}
            </span>
          ) : !oos ? (
            <span style={{ fontSize:10, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.18)', padding:'2px 8px', borderRadius:99 }}>
              En stock
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════
   PRODUCT MODAL — PREMIUM
══════════════════════════════════════════ */
function ProductModal({ product, onClose, onAdd }) {
  const [idx, setIdx]   = useState(0)
  const [added, setAdded] = useState(false)
  const imgs = parse(product?.images)
  const oos  = product?.stock === 0
  const col  = catColor(product?.category)

  useEffect(() => { setIdx(0) }, [product])
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!product) return null

  const handleAdd = () => {
    onAdd(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(4px)' }}>
        <motion.div
          initial={{ scale:0.9, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.9, opacity:0 }}
          transition={{ type:'spring', damping:26, stiffness:300 }}
          onClick={e => e.stopPropagation()}
          style={{ background:'#0b0b1a', border:`1px solid ${T.border}`, borderRadius:28, maxWidth:740, width:'100%', overflow:'hidden', display:'flex', boxShadow:'0 40px 120px rgba(0,0,0,0.7)' }}>

          {/* Left — Images */}
          <div style={{ width:340, flexShrink:0, background:'rgba(255,255,255,0.02)', display:'flex', flexDirection:'column' }}>
            <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.div key={idx} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.25 }}
                  style={{ width:'100%', height:'100%', minHeight:300 }}>
                  {imgs[idx]?.src
                    ? <img src={imgs[idx].src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div style={{ width:'100%', height:'100%', minHeight:300, display:'flex', alignItems:'center', justifyContent:'center', fontSize:72, opacity:0.08 }}>📦</div>
                  }
                </motion.div>
              </AnimatePresence>
              {/* Gradient bottom */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(to top, #0b0b1a, transparent)', pointerEvents:'none' }} />
            </div>
            {imgs.length > 1 && (
              <div style={{ display:'flex', gap:8, padding:'12px 16px' }}>
                {imgs.map((im, i) => (
                  <button key={i} onClick={() => setIdx(i)}
                    style={{ width:52, height:52, borderRadius:12, overflow:'hidden', border:`2px solid ${i===idx ? T.accent : T.border}`, cursor:'pointer', padding:0, transition:'border-color 0.2s', flexShrink:0, background:'rgba(255,255,255,0.03)' }}>
                    <img src={im.src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Info */}
          <div style={{ flex:1, padding:'32px', display:'flex', flexDirection:'column', gap:16, overflow:'auto' }}>
            {/* Close */}
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={onClose}
                style={{ width:34, height:34, borderRadius:99, border:`1px solid ${T.border}`, background:T.glass, cursor:'pointer', color:T.textMuted, fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                ✕
              </button>
            </div>

            {product.category && (
              <span style={{ fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:99, background:`${col}18`, color:col, border:`1px solid ${col}30`, alignSelf:'flex-start', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                {product.category}
              </span>
            )}

            <div>
              <h2 style={{ fontSize:22, fontWeight:900, color:T.text, lineHeight:1.25, margin:0, letterSpacing:'-0.5px' }}>{product.name}</h2>
            </div>

            {/* Price */}
            <div style={{ display:'flex', alignItems:'baseline', gap:6, padding:'16px', borderRadius:16, background:'rgba(255,153,0,0.06)', border:'1px solid rgba(255,153,0,0.15)' }}>
              <span style={{ fontSize:34, fontWeight:900, color:T.accent, letterSpacing:'-1.5px', lineHeight:1 }}>{fmt(product.price)}</span>
              <span style={{ fontSize:14, color:T.textMuted, fontWeight:700 }}>Ar</span>
            </div>

            {product.description && (
              <p style={{ fontSize:13, color:T.textMuted, lineHeight:1.7, margin:0 }}>{product.description}</p>
            )}

            {/* Stock */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12, background: oos ? 'rgba(239,68,68,0.06)' : 'rgba(74,222,128,0.06)', border: `1px solid ${oos ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}` }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: oos ? '#f87171' : '#4ade80', boxShadow: oos ? '0 0 8px rgba(248,113,113,0.5)' : '0 0 8px rgba(74,222,128,0.5)', flexShrink:0 }} />
              <span style={{ fontSize:12, fontWeight:700, color: oos ? '#f87171' : '#4ade80' }}>
                {oos ? 'Rupture de stock' : product.stock <= 5 ? `Seulement ${product.stock} en stock` : `En stock (${product.stock} disponibles)`}
              </span>
            </div>

            <div style={{ marginTop:'auto', display:'flex', gap:10 }}>
              <Btn variant="primary" size="lg" disabled={oos} onClick={handleAdd} full>
                {added ? '✓ Ajouté au panier !' : oos ? 'Indisponible' : '+ Ajouter au panier'}
              </Btn>
              <Btn variant="ghost" size="lg" onClick={onClose}>
                ✕
              </Btn>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ══════════════════════════════════════════
   SIDEBAR — PREMIUM
══════════════════════════════════════════ */
function Sidebar({ categories, active, setActive, price, setPrice, inStock, setInStock, total }) {
  return (
    <aside style={{ width:230, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>

      {/* Categories */}
      <GlassCard>
        <div style={{ padding:'16px 18px' }}>
          <div style={SC.label}>Catégories</div>
          <div style={{ display:'flex', flexDirection:'column', gap:2, marginTop:10 }}>
            <SideBtn active={active===null} onClick={() => setActive(null)} count={total} label="Tous les produits" dot={T.accent} />
            {categories.map(c => <SideBtn key={c.name} active={active===c.name} onClick={() => setActive(c.name)} count={c.count} label={c.name} dot={catColor(c.name)} />)}
          </div>
        </div>
      </GlassCard>

      {/* Price */}
      <GlassCard>
        <div style={{ padding:'16px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={SC.label}>Prix maximum</div>
            <span style={{ fontSize:12, fontWeight:800, color:T.accent }}>{fmt(price)} Ar</span>
          </div>
          <div style={{ position:'relative', height:4, borderRadius:99, background:'rgba(255,255,255,0.08)' }}>
            <div style={{ position:'absolute', left:0, top:0, height:'100%', borderRadius:99, background:`linear-gradient(90deg,${T.accent},#e67e00)`, width:`${(price/200000)*100}%`, transition:'width 0.1s' }} />
          </div>
          <input type="range" min={0} max={200000} step={5000}
            value={price} onChange={e => setPrice(Number(e.target.value))}
            style={{ width:'100%', marginTop:-4, accentColor:T.accent, cursor:'pointer', opacity:0 }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:T.textDim, marginTop:6 }}>
            <span>0 Ar</span><span>200 000 Ar</span>
          </div>
        </div>
      </GlassCard>

      {/* Stock */}
      <GlassCard>
        <div style={{ padding:'14px 18px' }}>
          <button onClick={() => setInStock(s => !s)}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <span style={{ fontSize:12, fontWeight:600, color:inStock ? T.text : T.textMuted }}>En stock uniquement</span>
            <div style={{ width:40, height:22, borderRadius:99, background: inStock ? T.accent : 'rgba(255,255,255,0.08)', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'#fff', left: inStock ? 21 : 3, transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.4)' }} />
            </div>
          </button>
        </div>
      </GlassCard>

    </aside>
  )
}

function SideBtn({ active, onClick, count, label, dot }) {
  return (
    <button onClick={onClick}
      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'8px 12px', borderRadius:12, border:'none', cursor:'pointer', background: active ? 'rgba(255,153,0,0.12)' : 'none', color: active ? T.accent : T.textMuted, fontSize:12, fontWeight: active?700:500, transition:'all 0.15s', textAlign:'left' }}>
      <span style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background: active ? T.accent : dot, opacity: active ? 1 : 0.7, flexShrink:0 }} />
        {label}
      </span>
      <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99, background:'rgba(255,255,255,0.06)', color:T.textDim }}>{count}</span>
    </button>
  )
}

/* ══════════════════════════════════════════
   SORT BAR
══════════════════════════════════════════ */
function SortBar({ count, sort, setSort, view, setView }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, flexWrap:'wrap' }}>
      <div style={{ fontSize:13, color:T.textMuted, flex:1 }}>
        <span style={{ color:T.text, fontWeight:800 }}>{count}</span> produit{count!==1?'s':''}
      </div>
      <select value={sort} onChange={e => setSort(e.target.value)}
        style={{ padding:'9px 16px', borderRadius:99, border:`1px solid ${T.border}`, background:'rgba(255,255,255,0.04)', color:T.text, fontSize:12, fontWeight:600, outline:'none', cursor:'pointer' }}>
        <option value="default">Tri par défaut</option>
        <option value="price_asc">Prix : croissant</option>
        <option value="price_desc">Prix : décroissant</option>
        <option value="name">Nom A → Z</option>
        <option value="stock">Stock disponible</option>
      </select>
      <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:99, padding:4, border:`1px solid ${T.border}` }}>
        {[{ v:'grid', path:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
          { v:'list', path:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' }].map(b => (
          <button key={b.v} onClick={() => setView(b.v)}
            style={{ width:30, height:30, borderRadius:99, border:'none', cursor:'pointer', background: view===b.v ? T.accentDim : 'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={view===b.v?T.accent:'none'} stroke={view===b.v?T.accent:T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={b.path}/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   CART FLOAT BAR
══════════════════════════════════════════ */
function CartFloatBar({ onOpen }) {
  const { count, total } = useCart()
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y:80, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:80, opacity:0 }}
          style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:30, display:'flex', alignItems:'center', gap:20, background:'rgba(11,11,26,0.95)', backdropFilter:'blur(20px)', border:`1px solid ${T.borderHi}`, borderRadius:99, padding:'10px 16px 10px 20px', boxShadow:'0 8px 40px rgba(255,153,0,0.15), 0 2px 20px rgba(0,0,0,0.5)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ background:T.accent, color:'#000', fontSize:11, fontWeight:900, borderRadius:99, width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center' }}>{count}</span>
            <div>
              <div style={{ fontSize:11, color:T.textMuted, lineHeight:1 }}>Total panier</div>
              <div style={{ fontSize:16, fontWeight:900, color:T.accent, letterSpacing:'-0.5px', lineHeight:1.3 }}>{fmt(total)} Ar</div>
            </div>
          </div>
          <Btn variant="primary" size="sm" onClick={onOpen}>Voir le panier →</Btn>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ══════════════════════════════════════════
   HEADER — PREMIUM
══════════════════════════════════════════ */
function Header({ search, setSearch, onOpenAuth, onOpenCart, navTab, setNavTab, newCount, promoCount }) {
  const { user } = useAuth()
  const { count } = useCart()

  const NAV = [
    { id:'catalogue',  label:'Catalogue' },
    { id:'nouveautes', label:'Nouveautés', badge: newCount > 0 ? newCount : null, badgeColor:'#4ade80' },
    { id:'promos',     label:'Promotions', badge: promoCount > 0 ? promoCount : null, badgeColor:'#f87171' },
  ]

  return (
    <header style={{ background:'rgba(5,5,13,0.92)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${T.border}`, position:'sticky', top:0, zIndex:30 }}>
      {/* Topbar */}
      <div style={{ padding:'5px 40px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:11, color:T.textDim, letterSpacing:'0.03em' }}>
          ✦ Livraison 24h sur Antananarivo  ·  Paiement à la livraison  ·  Retour sous 7 jours
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {['Confidentialité','CGU','Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize:11, color:T.textDim, textDecoration:'none', transition:'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color=T.textMuted}
              onMouseLeave={e => e.currentTarget.style.color=T.textDim}>{l}</a>
          ))}
        </div>
      </div>
      {/* Main nav */}
      <div style={{ padding:'14px 40px', display:'flex', alignItems:'center', gap:24 }}>
        {/* Logo */}
        <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:36, height:36, borderRadius:11, background:'linear-gradient(135deg, #FF9900, #e67e00)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(255,153,0,0.4)' }}>
            <img src="/images/logo/logo.svg" alt="VRG" style={{ width:24, height:24 }} onError={e => { e.target.style.display='none' }} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:T.text, letterSpacing:'-0.5px', lineHeight:1 }}>VaRyGasy</div>
            <div style={{ fontSize:9, color:T.textDim, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase' }}>Gaming Store</div>
          </div>
        </a>

        {/* Nav */}
        <nav style={{ display:'flex', gap:2, marginLeft:8 }}>
          {NAV.map(n => {
            const active = navTab === n.id
            return (
              <button key={n.id} onClick={() => setNavTab(n.id)}
                style={{ position:'relative', padding:'8px 15px', borderRadius:99, fontSize:13, fontWeight:600, cursor:'pointer', background: active ? T.accentDim : 'none', color: active ? T.accent : T.textMuted, border: active ? `1px solid rgba(255,153,0,0.2)` : '1px solid transparent', transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }}>
                {n.label}
                {n.badge && (
                  <span style={{ background: n.badgeColor || '#4ade80', color:'#000', fontSize:9, fontWeight:900, borderRadius:99, padding:'1px 6px', lineHeight:1.4 }}>
                    {n.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Search */}
        <div style={{ flex:1, maxWidth:320, marginLeft:'auto', position:'relative' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2.5" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit…"
            style={{ width:'100%', padding:'10px 16px 10px 38px', borderRadius:99, border:`1px solid ${T.border}`, background:'rgba(255,255,255,0.04)', color:T.text, fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'inherit', transition:'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = T.borderHi}
            onBlur={e => e.target.style.borderColor = T.border} />
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Btn variant="ghost" size="sm" onClick={onOpenAuth}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {user ? user.name.split(' ')[0] : 'Connexion'}
          </Btn>
          <button onClick={onOpenCart}
            style={{ position:'relative', width:42, height:42, borderRadius:99, border:`1px solid ${count>0 ? T.borderHi : T.border}`, background: count>0 ? T.accentDim : T.glass, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={count>0?T.accent:T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {count>0 && (
              <motion.span key={count} initial={{ scale:1.4 }} animate={{ scale:1 }}
                style={{ position:'absolute', top:-5, right:-5, background:T.accent, color:'#000', fontSize:10, fontWeight:900, borderRadius:99, width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(255,153,0,0.4)' }}>
                {count}
              </motion.span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

/* ══════════════════════════════════════════
   SHOP INNER
══════════════════════════════════════════ */
function Loader() {
  return (
    <div style={{ textAlign:'center', padding:'100px 0' }}>
      <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:'linear' }}
        style={{ width:32, height:32, borderRadius:'50%', border:`2px solid ${T.border}`, borderTopColor:T.accent, margin:'0 auto 16px' }} />
      <div style={{ fontSize:13, color:T.textMuted }}>Chargement…</div>
    </div>
  )
}

function EmptyState({ onReset }) {
  return (
    <div style={{ textAlign:'center', padding:'100px 0', color:T.textMuted }}>
      <div style={{ fontSize:48, marginBottom:16, opacity:0.2 }}>🔍</div>
      <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:8 }}>Aucun produit trouvé</div>
      <div style={{ fontSize:13, marginBottom:24 }}>Essaie d'ajuster tes filtres</div>
      <Btn variant="ghost" onClick={onReset}>Réinitialiser les filtres</Btn>
    </div>
  )
}

/* ══════════════════════════════════════════
   NOUVEAUTÉS VIEW
══════════════════════════════════════════ */
const DATE_FILTERS = [
  { id:'7d',  label:'7 derniers jours' },
  { id:'30d', label:'30 derniers jours' },
  { id:'90d', label:'3 derniers mois' },
  { id:'all', label:'Tout (par date)' },
]

function NouveautesView({ products, onAdd, onView, view, setView }) {
  const [df, setDf] = useState('30d')

  const list = filterByDate(products, df)

  return (
    <div>
      {/* Header section */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <div style={{ width:28, height:28, borderRadius:9, background:'linear-gradient(135deg,#4ade80,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:T.text, letterSpacing:'-0.5px' }}>Nouveautés</h2>
            </div>
            <p style={{ margin:0, fontSize:13, color:T.textMuted }}>
              {list.length} article{list.length!==1?'s':''} — triés du plus récent au plus ancien
            </p>
          </div>
          {/* View toggle */}
          <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:99, padding:4, border:`1px solid ${T.border}`, alignSelf:'flex-start' }}>
            {[{ v:'grid', path:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
              { v:'list', path:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' }].map(b => (
              <button key={b.v} onClick={() => setView(b.v)}
                style={{ width:30, height:30, borderRadius:99, border:'none', cursor:'pointer', background: view===b.v ? T.accentDim : 'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={view===b.v?T.accent:'none'} stroke={view===b.v?T.accent:T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={b.path}/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Date filter chips */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {DATE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setDf(f.id)}
              style={{ padding:'8px 18px', borderRadius:99, fontSize:12, fontWeight:700, cursor:'pointer', border:'1px solid', transition:'all 0.15s',
                background: df===f.id ? 'linear-gradient(135deg,#4ade80,#16a34a)' : 'rgba(255,255,255,0.04)',
                borderColor: df===f.id ? 'transparent' : T.border,
                color: df===f.id ? '#000' : T.textMuted,
                boxShadow: df===f.id ? '0 4px 16px rgba(74,222,128,0.3)' : 'none',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats rapides */}
      {list.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:28 }}>
          {[
            { label:'Ajoutés cette semaine', value: products.filter(p => isNew7(p)).length, color:'#4ade80' },
            { label:'Ajoutés ce mois',       value: filterByDate(products,'30d').length,    color:T.accent },
            { label:'Total catalogue',       value: products.length,                        color:'#a78bfa' },
          ].map(s => (
            <GlassCard key={s.label}>
              <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:24, fontWeight:900, color:s.color, letterSpacing:'-1px' }}>{s.value}</span>
                <span style={{ fontSize:11, color:T.textMuted, lineHeight:1.4 }}>{s.label}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Product list */}
      {list.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0', color:T.textMuted }}>
          <div style={{ fontSize:40, marginBottom:14, opacity:0.2 }}>📦</div>
          <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:8 }}>Aucun article dans cette période</div>
          <div style={{ fontSize:13, marginBottom:20 }}>Essaie "3 derniers mois" ou "Tout"</div>
          <Btn variant="ghost" onClick={() => setDf('all')}>Voir tous les articles</Btn>
        </div>
      ) : view === 'grid' ? (
        <motion.div layout style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:18 }}>
          <AnimatePresence>
            {list.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}>
                <ProductCard product={p} onAdd={onAdd} onView={onView} forceNew={isNew7(p)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {list.map((p, i) => {
            const img = parse(p.images)[0]?.src
            const novo = isNew7(p)
            return (
              <motion.div key={p.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.03 }}
                onClick={() => onView(p)}
                style={{ display:'flex', gap:18, background:T.surface, backdropFilter:'blur(16px)', border:`1px solid ${novo ? 'rgba(74,222,128,0.2)' : T.border}`, borderRadius:18, overflow:'hidden', padding:16, cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,153,0,0.25)'; e.currentTarget.style.boxShadow='0 8px 30px rgba(255,153,0,0.08)' }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=novo?'rgba(74,222,128,0.2)':T.border; e.currentTarget.style.boxShadow='none' }}>
                <div style={{ width:88, height:88, borderRadius:14, background:'rgba(255,255,255,0.04)', overflow:'hidden', flexShrink:0, position:'relative' }}>
                  {img?<img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, opacity:0.1 }}>📦</div>}
                </div>
                <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center', gap:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {novo && <span style={{ fontSize:9, fontWeight:900, padding:'2px 7px', borderRadius:99, background:'linear-gradient(135deg,#4ade80,#16a34a)', color:'#fff', letterSpacing:'0.1em' }}>NOUVEAU</span>}
                    <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{p.name}</div>
                  </div>
                  <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.description}</div>
                  {p.created_at && <div style={{ fontSize:10, color:T.textDim }}>Ajouté le {fmtDate(p.created_at)}</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'space-between', flexShrink:0, gap:10 }} onClick={e=>e.stopPropagation()}>
                  <span style={{ fontSize:16, fontWeight:900, color:T.accent, letterSpacing:'-0.5px' }}>{fmt(p.price)} Ar</span>
                  <Btn variant={p.stock>0?'primary':'ghost'} size="sm" disabled={p.stock===0} onClick={()=>onAdd(p)}>
                    {p.stock>0?'+ Panier':'Rupture'}
                  </Btn>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   PROMOTIONS VIEW
══════════════════════════════════════════ */
function PromoCard({ product, onAdd, onView }) {
  const [hov, setHov]   = useState(false)
  const [added, setAdded] = useState(false)
  const imgs = parse(product.images)
  const img  = imgs[0]?.src
  const oos  = product.stock === 0
  const promoPrice = Math.round(product.price * (1 - product.promo_percent / 100))
  const saving     = product.price - promoPrice

  const handleAdd = e => {
    e.stopPropagation()
    if (oos) return
    onAdd(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => onView(product)}
      style={{ background:T.surface, backdropFilter:'blur(20px)', border:`1px solid ${hov ? 'rgba(248,113,113,0.35)' : T.border}`, borderRadius:22, overflow:'hidden', display:'flex', flexDirection:'column', cursor:'pointer', transition:'all 0.25s', transform: hov?'translateY(-4px)':'translateY(0)', boxShadow: hov?'0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(248,113,113,0.1)':'0 4px 24px rgba(0,0,0,0.25)' }}>

      {/* Image */}
      <div style={{ position:'relative', aspectRatio:'4/3', overflow:'hidden', background:'rgba(255,255,255,0.02)' }}>
        {img
          ? <img src={img} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s', transform: hov?'scale(1.08)':'scale(1)' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, opacity:0.1 }}>📦</div>
        }
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(5,5,13,0.7) 0%, transparent 50%)', pointerEvents:'none' }} />

        {/* Promo badge */}
        <motion.div
          initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', damping:12 }}
          style={{ position:'absolute', top:12, right:12, width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#f87171,#dc2626)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(248,113,113,0.5)' }}>
          <span style={{ fontSize:13, fontWeight:900, color:'#fff', lineHeight:1 }}>-{product.promo_percent}%</span>
        </motion.div>

        {oos && <div style={{ position:'absolute', inset:0, background:'rgba(5,5,13,0.65)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
          <span style={{ fontSize:12, fontWeight:800, color:'rgba(240,240,248,0.6)', border:'1px solid rgba(240,240,248,0.15)', padding:'6px 16px', borderRadius:99 }}>Rupture</span>
        </div>}
      </div>

      {/* Info */}
      <div style={{ padding:'14px 18px 18px', flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        {product.category && (
          <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:99, background:`${catColor(product.category)}18`, color:catColor(product.category), border:`1px solid ${catColor(product.category)}30`, alignSelf:'flex-start' }}>
            {product.category}
          </span>
        )}
        <div style={{ fontSize:14, fontWeight:700, color:T.text, lineHeight:1.35 }}>{product.name}</div>

        {/* Prix */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
          <span style={{ fontSize:20, fontWeight:900, color:'#f87171', letterSpacing:'-1px' }}>{Math.round(promoPrice).toLocaleString('fr-FR')}</span>
          <span style={{ fontSize:11, color:T.textMuted }}>Ar</span>
          <span style={{ fontSize:12, color:T.textDim, textDecoration:'line-through' }}>{Number(product.price).toLocaleString('fr-FR')} Ar</span>
        </div>
        <div style={{ fontSize:11, color:'#22c55e', fontWeight:700 }}>
          Tu économises {saving.toLocaleString('fr-FR')} Ar
        </div>

        <motion.button
          whileTap={{ scale:0.95 }} onClick={handleAdd} disabled={oos}
          style={{ marginTop:'auto', padding:'11px', borderRadius:12, border:'none', cursor: oos?'not-allowed':'pointer', background: added?'rgba(34,197,94,0.15)':oos?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#f87171,#dc2626)', color: added?'#22c55e':oos?T.textDim:'#fff', fontSize:13, fontWeight:800, transition:'all 0.2s' }}>
          {added ? '✓ Ajouté !' : oos ? 'Indisponible' : '+ Ajouter au panier'}
        </motion.button>
      </div>
    </motion.div>
  )
}

function PromosView({ products, onAdd, onView }) {
  const promos = products.filter(p => Number(p.promo_active) === 1)

  if (promos.length === 0) return (
    <div style={{ textAlign:'center', padding:'100px 0' }}>
      <div style={{ fontSize:48, marginBottom:16, opacity:0.2 }}>🏷</div>
      <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:8 }}>Aucune promotion en cours</div>
      <div style={{ fontSize:13, color:T.textMuted }}>Les promotions actives apparaîtront ici</div>
    </div>
  )

  const totalSaving = promos.reduce((s, p) => s + Math.round(p.price * p.promo_percent / 100), 0)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <div style={{ width:28, height:28, borderRadius:9, background:'linear-gradient(135deg,#f87171,#dc2626)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, boxShadow:'0 4px 12px rgba(248,113,113,0.4)' }}>🏷</div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:T.text, letterSpacing:'-0.5px' }}>Promotions</h2>
        </div>
        <p style={{ margin:0, fontSize:13, color:T.textMuted }}>
          {promos.length} article{promos.length>1?'s':''} en promotion — jusqu'à {Math.max(...promos.map(p=>p.promo_percent))}% de réduction
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:28 }}>
        {[
          { label:'Articles en promo', value: promos.length, color:'#f87171' },
          { label:'Réduction max',     value: `${Math.max(...promos.map(p=>p.promo_percent))}%`, color:T.accent },
          { label:'Économie totale',   value: `${totalSaving.toLocaleString('fr-FR')} Ar`, color:'#22c55e' },
        ].map(s => (
          <GlassCard key={s.label}>
            <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:s.label==='Économie totale'?13:24, fontWeight:900, color:s.color, letterSpacing:'-1px' }}>{s.value}</span>
              <span style={{ fontSize:11, color:T.textMuted, lineHeight:1.4 }}>{s.label}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Grid */}
      <motion.div layout style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:18 }}>
        <AnimatePresence>
          {promos.map((p,i) => (
            <motion.div key={p.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}>
              <PromoCard product={p} onAdd={onAdd} onView={onView} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function ShopInner() {
  const { user } = useAuth()
  const { addItem } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [navTab, setNavTab]     = useState('catalogue')
  const [active, setActive]     = useState(null)
  const [price, setPrice]       = useState(200000)
  const [inStock, setInStock]   = useState(false)
  const [sort, setSort]         = useState('default')
  const [view, setView]         = useState('grid')
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    fetch('/api/products').then(r=>r.json()).then(d=>{setProducts(Array.isArray(d)?d:[]); setLoading(false)}).catch(()=>setLoading(false))
  }, [])

  const cats = Object.entries(
    products.reduce((a,p)=>{ if(p.category) a[p.category]=(a[p.category]||0)+1; return a },{})
  ).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)

  const newCount   = products.filter(isNew7).length
  const promoCount = products.filter(p => Number(p.promo_active) === 1).length

  const filtered = products
    .filter(p => !active || p.category===active)
    .filter(p => p.price<=price)
    .filter(p => !inStock || p.stock>0)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sort==='price_asc'?a.price-b.price : sort==='price_desc'?b.price-a.price : sort==='name'?a.name.localeCompare(b.name) : sort==='stock'?b.stock-a.stock : 0)

  const handleAdd = product => {
    const promoActive = Number(product.promo_active) === 1
    const finalPrice  = promoActive
      ? Math.round(product.price * (1 - product.promo_percent / 100))
      : product.price
    const imgs = parse(product.images)
    addItem({
      id:             product.id,
      name:           product.name,
      price:          finalPrice,
      original_price: promoActive ? product.price : null,
      promo_percent:  promoActive ? product.promo_percent : null,
      image:          imgs[0]?.src || null,
      images:         product.images,
    })
  }

  const breadcrumbLabel = navTab === 'nouveautes' ? 'Nouveautés' : navTab === 'promos' ? 'Promotions' : 'Catalogue'

  return (
    <div style={{ minHeight:'100dvh', background:T.bg, color:T.text, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>

      {/* Ambient glow */}
      <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:800, height:400, background:'radial-gradient(ellipse, rgba(255,153,0,0.04) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ position:'relative', zIndex:1 }}>
        <Header search={search} setSearch={setSearch} onOpenAuth={()=>!user&&setShowAuth(true)} onOpenCart={()=>setShowCart(true)} navTab={navTab} setNavTab={setNavTab} newCount={newCount} promoCount={promoCount} />

        {/* Breadcrumb */}
        <div style={{ padding:'10px 40px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:6, fontSize:12, color:T.textDim }}>
          <a href="/" style={{ color:'inherit', textDecoration:'none' }}>Accueil</a>
          <span style={{ opacity:0.4 }}>/</span>
          <span style={{ color:T.accent, fontWeight:700 }}>{breadcrumbLabel}</span>
          {navTab === 'catalogue' && active && <><span style={{ opacity:0.4 }}>/</span><span style={{ color:T.text }}>{active}</span></>}
        </div>

        {/* Body */}
        <div style={{ maxWidth:1320, margin:'0 auto', padding:'32px 40px', display:'flex', gap:28, alignItems:'flex-start' }}>

          {/* Sidebar — seulement en mode catalogue */}
          {navTab === 'catalogue' && (
            <Sidebar categories={cats} active={active} setActive={setActive} price={price} setPrice={setPrice} inStock={inStock} setInStock={setInStock} total={products.length} />
          )}

          <div style={{ flex:1, minWidth:0 }}>

            {/* ── Onglet Nouveautés ── */}
            {navTab === 'nouveautes' && (
              loading
                ? <Loader />
                : <NouveautesView products={products} onAdd={handleAdd} onView={setModal} view={view} setView={setView} />
            )}

            {/* ── Onglet Catalogue ── */}
            {navTab === 'catalogue' && (
              <>
                <SortBar count={filtered.length} sort={sort} setSort={setSort} view={view} setView={setView} />
                {loading ? <Loader /> : filtered.length===0 ? (
                  <EmptyState onReset={()=>{ setActive(null); setSearch(''); setInStock(false); setPrice(200000) }} />
                ) : view==='grid' ? (
                  <motion.div layout style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:18 }}>
                    <AnimatePresence>
                      {filtered.map((p,i) => (
                        <motion.div key={p.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}>
                          <ProductCard product={p} onAdd={handleAdd} onView={setModal} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {filtered.map((p,i) => {
                      const img = parse(p.images)[0]?.src
                      return (
                        <motion.div key={p.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.03 }}
                          onClick={() => setModal(p)}
                          style={{ display:'flex', gap:18, background:T.surface, backdropFilter:'blur(16px)', border:`1px solid ${T.border}`, borderRadius:18, overflow:'hidden', padding:16, cursor:'pointer', transition:'border-color 0.2s, box-shadow 0.2s' }}
                          onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.borderHi; e.currentTarget.style.boxShadow='0 8px 30px rgba(255,153,0,0.08)' }}
                          onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.boxShadow='none' }}>
                          <div style={{ width:88, height:88, borderRadius:14, background:'rgba(255,255,255,0.04)', overflow:'hidden', flexShrink:0 }}>
                            {img?<img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, opacity:0.1 }}>📦</div>}
                          </div>
                          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:4 }}>{p.name}</div>
                            <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.description}</div>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'space-between', flexShrink:0, gap:10 }} onClick={e=>e.stopPropagation()}>
                            <span style={{ fontSize:18, fontWeight:900, color:T.accent, letterSpacing:'-0.5px' }}>{fmt(p.price)} Ar</span>
                            <Btn variant={p.stock>0?'primary':'ghost'} size="sm" disabled={p.stock===0} onClick={()=>handleAdd(p)}>
                              {p.stock>0?'+ Panier':'Rupture'}
                            </Btn>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Onglet Promotions ── */}
            {navTab === 'promos' && (
              loading ? <Loader /> : <PromosView products={products} onAdd={handleAdd} onView={setModal} />
            )}
          </div>
        </div>
      </div>

      {/* Floating cart bar */}
      <CartFloatBar onOpen={() => setShowCart(true)} />

      {/* Modals */}
      <AnimatePresence>
        {modal && <ProductModal product={modal} onClose={()=>setModal(null)} onAdd={handleAdd} />}
      </AnimatePresence>

      <CartPanel isOpen={showCart} onClose={()=>setShowCart(false)} onOpenAuth={()=>{ setShowCart(false); setShowAuth(true) }} />
      <AuthModal isOpen={showAuth} onClose={()=>setShowAuth(false)} onSuccess={()=>setShowAuth(false)} />

      <div style={{ position:'fixed', bottom:90, left:24, zIndex:20 }}>
        <Btn variant="ghost" size="sm" onClick={()=>window.location.href='/'}>← Retour au site</Btn>
      </div>

    </div>
  )
}

/* ─── Shared ─── */
const SC = {
  label: { fontSize:10, fontWeight:800, color:T.textDim, textTransform:'uppercase', letterSpacing:'0.1em' },
}

/* ─── Gate Coming Soon ─── */
function ComingSoonGate({ children }) {
  const settings = useSettings()
  const loaded = Object.keys(settings).length > 0
  if (!loaded) return <div style={{ height:'100dvh', background:'#05050d' }} />
  if (settings.coming_soon === '1') return <ComingSoon settings={settings} />
  return children
}

/* ─── Root ─── */
export default function Shop() {
  return (
    <AuthProvider>
      <CartProvider>
        <ComingSoonGate>
          <ShopInner />
          <SupportChat />
        </ComingSoonGate>
      </CartProvider>
    </AuthProvider>
  )
}