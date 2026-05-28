import React, { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { ShoppingCart, Check } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../hooks/useSettings.js'

/* Span pattern qui se répète toutes les 6 cartes */
const SPANS = [2, 1, 1, 1, 1, 2]

const DEFAULT_CONTENT = {
  badge:    'Nos produits',
  title_1:  'Accessoires',
  title_2:  'mobile gaming',
  subtitle: 'Clique sur un produit pour l\'ajouter au panier',
}

function getImage(product) {
  try {
    const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
    return imgs?.[0]?.src || null
  } catch { return null }
}

function GalleryItem({ product, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? 30 : -30, index % 2 === 0 ? -30 : 30])
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const span = SPANS[index % SPANS.length]
  const imgSrc = getImage(product)

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem({ id: product.id, name: product.name, price: product.price, image: imgSrc || '/images/logo/logo.svg', qty: 1 })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
        gridColumn: `span ${span}`,
        aspectRatio: span > 1 ? '16/9' : '1/1',
      }}>

      {imgSrc ? (
        <motion.img src={imgSrc} alt={product.name}
          style={{ y, width: '100%', height: '115%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 40, opacity: 0.2 }}>📦</span>
        </div>
      )}

      {/* Badge catégorie */}
      {product.category && (
        <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.75)', backdropFilter: 'blur(8px)', letterSpacing: '0.04em' }}>
          {product.category}
        </div>
      )}

      {/* Prix */}
      <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,153,0,0.15)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700, color: '#FF9900', backdropFilter: 'blur(8px)' }}>
        Ar {product.price?.toLocaleString('fr-FR')}
      </div>

      {/* Overlay au hover */}
      <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} transition={{ duration: 0.25 }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,16,0.88) 0%, rgba(8,8,16,0.2) 60%, transparent 100%)', display: 'flex', alignItems: 'flex-end', padding: '18px 20px' }}>
        <div style={{ width: '100%' }}>
          <span style={{ color: '#f0f0f5', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', display: 'block', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.name}
          </span>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: added ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#FF9900,#CC5500)',
              color: '#fff', border: 'none', borderRadius: 99,
              padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.3s',
            }}>
            {added ? <Check size={13} /> : <ShoppingCart size={13} />}
            {added ? 'Ajouté !' : 'Ajouter au panier'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Gallery() {
  const settings = useSettings()
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts).catch(() => {})
  }, [])

  const content = (() => {
    try { return settings.gallery_content ? { ...DEFAULT_CONTENT, ...JSON.parse(settings.gallery_content) } : DEFAULT_CONTENT }
    catch { return DEFAULT_CONTENT }
  })()

  if (products.length === 0) return null

  return (
    <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(204,85,0,0.4), transparent)' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', background: 'rgba(204,85,0,0.12)', border: '1px solid rgba(204,85,0,0.25)', borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 600, color: '#FFB300', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
            {content.badge}
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5', lineHeight: 1.15 }}>
            {content.title_1}{' '}<span style={{ color: '#FF9900' }}>{content.title_2}</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(240,240,245,0.45)', marginTop: 12 }}>{content.subtitle}</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {products.map((p, i) => <GalleryItem key={p.id} product={p} index={i} />)}
        </div>
      </div>
    </section>
  )
}
