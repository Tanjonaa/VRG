import React, { useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { ChevronLeft, ChevronRight, ShoppingCart, Check } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'

const categories = [
  {
    id: 'finger-sleeve',
    label: 'Finger Sleeves',
    color: '#ca8a04',
    colorBg: 'rgba(202,138,4,0.1)',
    colorBorder: 'rgba(202,138,4,0.25)',
    images: [
      { id: 'fs-01', src: '/images/finger-sleeve/finger-sleeve-01.png', name: 'Finger Sleeve Pro',     price: 5000 },
      { id: 'fs-02', src: '/images/finger-sleeve/finger-sleeve-02.jpg', name: 'Finger Sleeve Classic', price: 4000 },
      { id: 'fs-03', src: '/images/finger-sleeve/finger-sleeve-03.jpg', name: 'Finger Sleeve Nylon',   price: 4500 },
      { id: 'fs-04', src: '/images/finger-sleeve/finger-sleeve-04.jpg', name: 'Finger Sleeve Silver',  price: 6000 },
      { id: 'fs-05', src: '/images/finger-sleeve/finger-sleeve-05.jpg', name: 'Finger Sleeve Gamer',   price: 5500 },
      { id: 'fs-06', src: '/images/finger-sleeve/finger-sleeve-06.jpg', name: 'Finger Sleeve Duo',     price: 4000 },
      { id: 'fs-07', src: '/images/finger-sleeve/finger-sleeve-07.webp',name: 'Finger Sleeve Slim',    price: 4500 },
      { id: 'fs-08', src: '/images/finger-sleeve/finger-sleeve-08.webp',name: 'Finger Sleeve Ultra',   price: 7000 },
      { id: 'fs-09', src: '/images/finger-sleeve/finger-sleeve-09.webp',name: 'Finger Sleeve PUBG',    price: 5000 },
    ],
  },
  {
    id: 'fan',
    label: 'Ventilateurs',
    color: '#CC5500',
    colorBg: 'rgba(204,85,0,0.1)',
    colorBorder: 'rgba(204,85,0,0.25)',
    images: [
      { id: 'fan-01', src: '/images/fan/fan-01.jpg',  name: 'Ventilateur Turbo',          price: 18000 },
      { id: 'fan-02', src: '/images/fan/fan-02.webp', name: 'Ventilateur Semi-conducteur', price: 25000 },
      { id: 'fan-03', src: '/images/fan/fan-03.jpg',  name: 'Ventilateur Clip-on',         price: 15000 },
      { id: 'fan-04', src: '/images/fan/fan-04.jpg',  name: 'Ventilateur RGB',              price: 20000 },
      { id: 'fan-05', src: '/images/fan/fan-05.jpg',  name: 'Ventilateur Silencieux',      price: 16000 },
      { id: 'fan-06', src: '/images/fan/fan-06.jpg',  name: 'Ventilateur Compact',         price: 14000 },
      { id: 'fan-07', src: '/images/fan/fan-07.avif', name: 'Ventilateur Premium',         price: 28000 },
    ],
  },
]

export default function Products() {
  const [activeCategory, setActiveCategory] = useState('finger-sleeve')
  const [page, setPage] = useState(0)
  const COLS = 3
  const ROWS = 2
  const PER_PAGE = COLS * ROWS

  const category = categories.find(c => c.id === activeCategory)
  const totalPages = Math.ceil(category.images.length / PER_PAGE)
  const visible = category.images.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  const switchCategory = (id) => {
    setActiveCategory(id)
    setPage(0)
  }

  return (
    <section style={{ position: 'relative', padding: '120px 24px', overflow: 'hidden' }}>
      {/* Background */}
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
            display: 'inline-block',
            background: 'rgba(202,138,4,0.12)',
            border: '1px solid rgba(202,138,4,0.25)',
            borderRadius: 99,
            padding: '5px 16px',
            fontSize: 12,
            fontWeight: 600,
            color: '#fbbf24',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Catalogue
          </div>

          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#f0f0f5',
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Nos{' '}
            <span style={{ color: '#FF9900' }}>
              produits disponibles
            </span>
          </h2>
        </motion.div>

        {/* Category tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 40,
          }}
        >
          {categories.map(cat => (
            <motion.button
              key={cat.id}
              onClick={() => switchCategory(cat.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '10px 24px',
                borderRadius: 99,
                border: `1px solid ${activeCategory === cat.id ? cat.colorBorder : 'rgba(255,255,255,0.1)'}`,
                background: activeCategory === cat.id ? cat.colorBg : 'rgba(255,255,255,0.04)',
                color: activeCategory === cat.id ? cat.color : 'rgba(240,240,245,0.55)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Product grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${page}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {visible.map((item, i) => (
              <ProductCard key={item.id} item={item} category={category} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              marginTop: 40,
            }}
          >
            <motion.button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              whileHover={page > 0 ? { scale: 1.05 } : {}}
              whileTap={page > 0 ? { scale: 0.95 } : {}}
              style={{
                width: 40, height: 40,
                borderRadius: 99,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: page === 0 ? 'rgba(240,240,245,0.25)' : '#f0f0f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={18} />
            </motion.button>

            <span style={{ fontSize: 13, color: 'rgba(240,240,245,0.45)' }}>
              {page + 1} / {totalPages}
            </span>

            <motion.button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              whileHover={page < totalPages - 1 ? { scale: 1.05 } : {}}
              whileTap={page < totalPages - 1 ? { scale: 0.95 } : {}}
              style={{
                width: 40, height: 40,
                borderRadius: 99,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: page === totalPages - 1 ? 'rgba(240,240,245,0.25)' : '#f0f0f5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </div>
    </section>
  )
}

function ProductCard({ item, category, index }) {
  const [imgError, setImgError] = useState(false)
  const [added, setAdded] = useState(false)
  const { addItem, items } = useCart()
  const inCart = items.some(i => i.id === item.id)
  const cardRef = useRef(null)

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem({ id: item.id, name: item.name, price: item.price, image: item.src })
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
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 800,
      }}
    >
      {/* Top accent */}
      <div style={{
        position: 'absolute', top: 0, left: '20%', right: '20%',
        height: 1,
        background: `linear-gradient(90deg, transparent, ${category.color}, transparent)`,
        opacity: 0.5,
        zIndex: 1,
      }} />

      {/* Mouse follow glow */}
      <motion.div
        style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `radial-gradient(circle at ${glowX} ${glowY}, ${category.colorBg} 0%, transparent 65%)`,
          opacity: 0.8,
        }}
      />

      {/* Image */}
      <div style={{
        width: '100%',
        aspectRatio: '1 / 1',
        background: 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {imgError ? (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40,
            color: 'rgba(240,240,245,0.15)',
          }}>
            📦
          </div>
        ) : (
          <motion.img
            src={item.src}
            alt={item.name}
            onError={() => setImgError(true)}
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '18px 20px' }}>
        <p style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#f0f0f5',
          marginBottom: 8,
          letterSpacing: '-0.01em',
        }}>
          {item.name}
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: category.color, letterSpacing: '-0.01em' }}>
            Ar {item.price.toLocaleString('fr-FR')}
          </span>

          <motion.button
            onClick={handleAdd}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            animate={added ? { scale: [1, 1.15, 1] } : {}}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 99,
              border: `1px solid ${added || inCart ? 'rgba(34,197,94,0.4)' : category.colorBorder}`,
              background: added || inCart ? 'rgba(34,197,94,0.12)' : category.colorBg,
              color: added || inCart ? '#22c55e' : category.color,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {added || inCart ? <Check size={13} /> : <ShoppingCart size={13} />}
            {added ? 'Ajouté !' : inCart ? 'Dans le panier' : 'Ajouter'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
