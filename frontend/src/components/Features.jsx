import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Fingerprint, Wind, Package } from 'lucide-react'
import useAnimatedCounter from '../hooks/useAnimatedCounter.js'
import { useSettings } from '../hooks/useSettings.js'

const CARD_META = [
  { icon: Fingerprint, color: '#ca8a04', colorBg: 'rgba(202,138,4,0.1)', colorBorder: 'rgba(202,138,4,0.2)', img: '/images/finger-sleeve/finger-sleeve-09.webp' },
  { icon: Wind,        color: '#CC5500', colorBg: 'rgba(204,85,0,0.1)',   colorBorder: 'rgba(204,85,0,0.2)',   img: '/images/fan/fan-02.webp' },
  { icon: Package,     color: '#0ea5e9', colorBg: 'rgba(14,165,233,0.1)', colorBorder: 'rgba(14,165,233,0.2)', img: '/images/finger-sleeve/finger-sleeve-08.webp' },
]

const DEFAULT_CONTENT = {
  badge:    'Pourquoi VaRyGasy ?',
  title_1:  'Tout ce qu\'il faut pour',
  title_2:  'dominer sur mobile',
  subtitle: 'Des accessoires pensés pour les gamers mobiles malgaches — qualité pro, prix accessibles.',
  cards: [
    { title: 'Finger Sleeves Pro', description: 'Ultra-fins 0.4mm en nylon argenté anti-transpiration. Précision maximale sur écran tactile pour PUBG Mobile, Free Fire et MLBB. Plus de glissement, plus de contrôle.', points: ['Anti-transpiration', 'Sensibilité 100%', 'Taille universelle', 'Lavables & durables'], metrics: [{ value: '0.4', label: 'mm épaisseur' }, { value: '360', label: '° sensibilité' }] },
    { title: 'Ventilateur de Refroidissement', description: 'Élimine la surchauffe pendant les longues sessions de jeu. Clip universel compatible tous smartphones. Silencieux ≤25dB, ne gêne pas ta concentration.', points: ['−15°C en 2 min', 'Compatible USB-C & Jack', '≤25dB silencieux', 'Autonomie illimitée'], metrics: [{ value: '15', label: '°C de moins' }, { value: '25', label: 'dB max' }] },
    { title: 'Livraison Rapide & Sûre', description: 'Commande le matin, reçois le soir. Livraison 24h sur Antananarivo, 3-5 jours dans toute l\'île. Paiement à la livraison disponible — aucun risque pour toi.', points: ['24h Antananarivo', '3-5j toute l\'île', 'Paiement à la livraison', 'Retour sous 7 jours'], metrics: [{ value: '24', label: 'h livraison Tana' }, { value: '7', label: 'j retour garanti' }] },
  ],
}

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }
const cardVariants = { hidden: { opacity: 0, y: 48, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }

function MetricValue({ value, color, inView }) {
  const num = parseFloat(value)
  const counted = useAnimatedCounter(Number.isInteger(num) ? num : 0, 1600, inView)
  const display = Number.isInteger(num) ? counted : value
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ fontSize: 30, fontWeight: 700, color, letterSpacing: '-0.03em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </motion.div>
  )
}

export default function Features() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const settings = useSettings()
  const content = (() => { try { return settings.features_content ? { ...DEFAULT_CONTENT, ...JSON.parse(settings.features_content) } : DEFAULT_CONTENT } catch { return DEFAULT_CONTENT } })()
  const cards = content.cards?.length ? content.cards : DEFAULT_CONTENT.cards

  return (
    <section style={{ position: 'relative', padding: '120px 24px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(202,138,4,0.4), transparent)' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-block', background: 'rgba(204,85,0,0.12)', border: '1px solid rgba(204,85,0,0.25)', borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 600, color: '#FFB300', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
            {content.badge}
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#f0f0f5', marginBottom: 16 }}>
            {content.title_1}<br />
            <span style={{ color: '#FF9900' }}>{content.title_2}</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(240,240,245,0.55)', maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
            {content.subtitle}
          </p>
        </motion.div>

        <motion.div ref={ref} variants={containerVariants} initial="hidden" animate={inView ? 'visible' : 'hidden'}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {cards.map((card, i) => (
            <FeatureCard key={i} card={card} meta={CARD_META[i] || CARD_META[0]} index={i} inView={inView} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureCard({ card, meta, index, inView }) {
  const Icon = meta.icon
  return (
    <motion.div variants={cardVariants} whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}
      style={{ position: 'relative', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', cursor: 'default' }}>

      <motion.div whileHover={{ opacity: 1 }} initial={{ opacity: 0 }} transition={{ duration: 0.3 }}
        style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 0%, ${meta.colorBg} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`, opacity: 0.6 }} />

      <div style={{ width: '100%', height: 200, overflow: 'hidden', position: 'relative' }}>
        <motion.img src={card.img || meta.img} alt={card.title} whileHover={{ scale: 1.06 }} transition={{ duration: 0.4 }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(8,8,16,0.9) 100%)' }} />
      </div>

      <div style={{ padding: '28px 32px 32px' }}>
        <motion.div animate={inView ? { rotate: [0, -8, 8, 0] } : {}} transition={{ delay: index * 0.15 + 0.3, duration: 0.6 }}
          style={{ width: 48, height: 48, borderRadius: 12, background: meta.colorBg, border: `1px solid ${meta.colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <Icon size={22} color={meta.color} strokeWidth={1.8} />
        </motion.div>

        <h3 style={{ fontSize: 20, fontWeight: 650, letterSpacing: '-0.02em', color: '#f0f0f5', marginBottom: 10 }}>{card.title}</h3>
        <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.55)', lineHeight: 1.7, marginBottom: 18 }}>{card.description}</p>

        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          {(card.points || []).map((pt, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(240,240,245,0.7)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
              {pt}
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {(card.metrics || []).map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <MetricValue value={m.value} color={meta.color} inView={inView} />
              <span style={{ fontSize: 13, color: 'rgba(240,240,245,0.45)', fontWeight: 500, whiteSpace: 'nowrap' }}>{m.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}