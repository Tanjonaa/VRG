import React, { useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { useSettings } from '../hooks/useSettings.js'

const images = [
  { src: '/images/finger-sleeve/finger-sleeve-09.webp', label: 'Finger Sleeve PUBG',          tag: 'Best-seller', span: 2 },
  { src: '/images/fan/fan-02.webp',                     label: 'Ventilateur Semi-conducteur',  tag: 'Premium',    span: 1 },
  { src: '/images/finger-sleeve/finger-sleeve-08.webp', label: 'Finger Sleeve Ultra',          tag: 'Nouveau',    span: 1 },
  { src: '/images/fan/fan-01.jpg',                      label: 'Ventilateur Turbo',            tag: 'Populaire',  span: 1 },
  { src: '/images/finger-sleeve/finger-sleeve-07.webp', label: 'Finger Sleeve Slim',           tag: '',           span: 1 },
  { src: '/images/fan/fan-03.jpg',                      label: 'Ventilateur Clip-on',          tag: 'Nouveau',    span: 2 },
]

const tagColors = {
  'Best-seller': { bg: 'rgba(202,138,4,0.2)',  border: 'rgba(202,138,4,0.4)',  color: '#fbbf24' },
  'Premium':     { bg: 'rgba(204,85,0,0.2)',   border: 'rgba(204,85,0,0.4)',   color: '#FFB300' },
  'Nouveau':     { bg: 'rgba(14,165,233,0.2)', border: 'rgba(14,165,233,0.4)', color: '#38bdf8' },
  'Populaire':   { bg: 'rgba(202,138,4,0.2)',  border: 'rgba(202,138,4,0.4)',  color: '#fbbf24' },
}

const DEFAULT_CONTENT = {
  badge:    'Nos produits',
  title_1:  'Accessoires',
  title_2:  'mobile gaming',
  subtitle: 'Cliquer sur un produit pour commander via WhatsApp',
}

function GalleryItem({ image, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? 30 : -30, index % 2 === 0 ? -30 : 30])
  const tag = tagColors[image.tag]

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', gridColumn: image.span > 1 ? `span ${image.span}` : 'span 1', aspectRatio: image.span > 1 ? '16/9' : '1/1' }}>
      <motion.img src={image.src} alt={image.label} style={{ y, width: '100%', height: '115%', objectFit: 'cover', display: 'block' }} />

      {image.tag && tag && (
        <div style={{ position: 'absolute', top: 14, left: 14, background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 700, color: tag.color, letterSpacing: '0.05em', textTransform: 'uppercase', backdropFilter: 'blur(8px)' }}>
          {image.tag}
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} transition={{ duration: 0.25 }}
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,16,0.85) 0%, rgba(8,8,16,0.2) 60%, transparent 100%)', display: 'flex', alignItems: 'flex-end', padding: '18px 20px' }}>
        <div>
          <span style={{ color: '#f0f0f5', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', display: 'block', marginBottom: 6 }}>{image.label}</span>
          <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #ca8a04, #d97706)', color: '#fff', borderRadius: 99, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Commander →
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Gallery() {
  const settings = useSettings()
  const content = (() => { try { return settings.gallery_content ? { ...DEFAULT_CONTENT, ...JSON.parse(settings.gallery_content) } : DEFAULT_CONTENT } catch { return DEFAULT_CONTENT } })()

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
            {content.title_1}{' '}
            <span style={{ color: '#FF9900' }}>{content.title_2}</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(240,240,245,0.45)', marginTop: 12 }}>
            {content.subtitle}
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {images.map((img, i) => <GalleryItem key={i} image={img} index={i} />)}
        </div>
      </div>
    </section>
  )
}