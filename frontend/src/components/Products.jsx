import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Package } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { getCatStyle as _getCat } from '../lib/catColors.js'

/* Adapte le format { color, bg, border } → { color, colorBg, colorBorder } */
const getCatStyle = (cat) => {
  const s = _getCat(cat)
  return { color: s.color, colorBg: s.bg, colorBorder: s.border }
}

const COLS = 3
const ROWS = 2
const PER_PAGE = COLS * ROWS

export default function Products() {
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        setAllProducts(data)
        if (data.length > 0) setActiveCategory(data[0].category)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  /* Catégories uniques dans l'ordre d'apparition */
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))]

  const switchCategory = (cat) => { setActiveCategory(cat); setPage(0) }

  const visible_all = allProducts.filter(p => p.category === activeCategory)
  const totalPages  = Math.ceil(visible_all.length / PER_PAGE)
  const visible     = visible_all.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const catStyle    = getCatStyle(activeCategory)

  return (
    <section style={{ position: 'relative', padding: '120px 24px', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 50%, rgba(202,138,4,0.05) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <div style={{
            display: 'inline-block', background: 'rgba(202,138,4,0.12)',
            border: '1px solid rgba(202,138,4,0.25)', borderRadius: 99,
            padding: '5px 16px', fontSize: 12, fontWeight: 600, color: '#fbbf24',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20,
          }}>
            Catalogue
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5', lineHeight: 1.15, marginBottom: 16 }}>
            Nos{' '}<span style={{ color: '#FF9900' }}>produits disponibles</span>
          </h2>
        </motion.div>

        {/* Category tabs */}
        {!loading && categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}
          >
            {categories.map(cat => {
              const s = getCatStyle(cat)
              return (
                <motion.button key={cat} onClick={() => switchCategory(cat)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '10px 24px', borderRadius: 99, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    border: `1px solid ${activeCategory === cat ? s.colorBorder : 'rgba(255,255,255,0.1)'}`,
                    background: activeCategory === cat ? s.colorBg : 'rgba(255,255,255,0.04)',
                    color: activeCategory === cat ? s.color : 'rgba(240,240,245,0.55)',
                    transition: 'all 0.2s',
                  }}>
                  {cat}
                </motion.button>
              )
            })}
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.05)', width: '70%' }} />
                  <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.03)', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && allProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(240,240,245,0.3)' }}>
            <Package size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <div style={{ fontSize: 16 }}>Aucun produit disponible pour le moment</div>
          </div>
        )}

        {/* Product grid */}
        {!loading && visible.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${page}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}
            >
              {visible.map((item, i) => (
                <ProductCard key={item.id} item={item} catStyle={catStyle} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 40 }}>
            <motion.button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              whileHover={page > 0 ? { scale: 1.05 } : {}} whileTap={page > 0 ? { scale: 0.95 } : {}}
              style={{ width: 40, height: 40, borderRadius: 99, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: page === 0 ? 'rgba(240,240,245,0.25)' : '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === 0 ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft size={18} />
            </motion.button>
            <span style={{ fontSize: 13, color: 'rgba(240,240,245,0.45)' }}>{page + 1} / {totalPages}</span>
            <motion.button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              whileHover={page < totalPages - 1 ? { scale: 1.05 } : {}} whileTap={page < totalPages - 1 ? { scale: 0.95 } : {}}
              style={{ width: 40, height: 40, borderRadius: 99, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: page === totalPages - 1 ? 'rgba(240,240,245,0.25)' : '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer' }}>
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </div>
    </section>
  )
}

function ProductCard({ item, catStyle, index }) {
  const [imgError, setImgError] = useState(false)
  const [added, setAdded]       = useState(false)
  const { addItem, items }       = useCart()
  const inCart  = items.some(i => i.id === item.id)
  const cardRef = useRef(null)

  /* Résout l'image depuis le champ images JSON */
  const imgSrc = (() => {
    try {
      const arr = Array.isArray(item.images) ? item.images : JSON.parse(item.images || '[]')
      return arr[0]?.src || null
    } catch { return null }
  })()

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem({ id: item.id, name: item.name, price: item.price, image: imgSrc })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-60, 60], [10, -10]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-60, 60], [-10, 10]), { stiffness: 300, damping: 30 })
  const glowX = useTransform(x, [-60, 60], ['0%', '100%'])
  const glowY = useTransform(y, [-60, 60], ['0%', '100%'])

  const handleMouse = (e) => {
    const rect = cardRef.current.getBoundingClientRect()
    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }
  const handleLeave = () => { x.set(0); y.set(0) }

  return (
    <motion.div ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18, overflow: 'hidden', cursor: 'pointer', position: 'relative',
        rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800,
      }}
    >
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${catStyle.color}, transparent)`, opacity: 0.5, zIndex: 1 }} />

      {/* Mouse follow glow */}
      <motion.div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(circle at ${glowX} ${glowY}, ${catStyle.colorBg} 0%, transparent 65%)`, opacity: 0.8 }} />

      {/* Image */}
      <div style={{ width: '100%', aspectRatio: '1/1', background: 'rgba(255,255,255,0.04)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!imgSrc || imgError ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,240,245,0.15)' }}>
            <Package size={48} />
          </div>
        ) : (
          <motion.img src={imgSrc} alt={item.name} onError={() => setImgError(true)}
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>

      {/* Badge rupture */}
      {item.stock <= 0 && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          Rupture
        </div>
      )}

      {/* Info */}
      <div style={{ padding: '18px 20px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f5', marginBottom: 8, letterSpacing: '-0.01em' }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: catStyle.color, letterSpacing: '-0.01em' }}>
            Ar {Number(item.price).toLocaleString('fr-FR')}
          </span>
          <motion.button onClick={handleAdd} disabled={item.stock <= 0}
            whileHover={item.stock > 0 ? { scale: 1.06 } : {}}
            whileTap={item.stock > 0 ? { scale: 0.93 } : {}}
            animate={added ? { scale: [1, 1.15, 1] } : {}}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99,
              border: `1px solid ${added || inCart ? 'rgba(34,197,94,0.4)' : catStyle.colorBorder}`,
              background: item.stock <= 0 ? 'rgba(255,255,255,0.04)' : added || inCart ? 'rgba(34,197,94,0.12)' : catStyle.colorBg,
              color: item.stock <= 0 ? 'rgba(240,240,245,0.25)' : added || inCart ? '#22c55e' : catStyle.color,
              fontSize: 12, fontWeight: 600,
              cursor: item.stock <= 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}>
            {added || inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
            {item.stock <= 0 ? 'Indisponible' : added ? 'Ajouté !' : inCart ? 'Dans le panier' : 'Ajouter'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
