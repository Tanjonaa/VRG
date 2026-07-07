import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ShoppingCart } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../hooks/useSettings.js'

// Styling per plan index (non-editable by design)
const PLAN_STYLE = [
  { color: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)',    accentColor: '#94a3b8' },
  { color: 'linear-gradient(135deg, rgba(202,138,4,0.12) 0%, rgba(204,85,0,0.1) 100%)', borderColor: 'rgba(202,138,4,0.35)', accentColor: '#fbbf24', glow: true },
  { color: 'rgba(204,85,0,0.07)',    borderColor: 'rgba(204,85,0,0.25)',      accentColor: '#FFB300' },
]

const DEFAULT_CONTENT = {
  badge:    'Nos packs',
  title_1:  'Choisis ton pack,',
  title_2:  'commande en 1 clic',
  subtitle: 'Paiement unique à la livraison — pas d\'abonnement, pas de surprise.',
  plans: [
    { name: 'Pack Essentiel', price: 25000, description: 'L\'essentiel pour bien démarrer avec les accessoires gaming.', features: ['1 paire de finger sleeves', '1 ventilateur pour téléphone', 'Livraison gratuite Antananarivo', 'Garantie 3 mois', 'Support WhatsApp'] },
    { name: 'Pack Gamer',     price: 55000, description: 'Le pack complet pour les vrais gamers mobiles.', badge: 'Le plus populaire', features: ['3 paires de finger sleeves', '1 ventilateur turbo refroidissement', '1 support téléphone réglable', '1 câble fast-charge 100W', 'Livraison 24h Antananarivo', 'Garantie 6 mois', 'Support prioritaire'] },
    { name: 'Pack Premium',   price: 95000, description: 'L\'équipement ultime pour dominer sur mobile.', features: ['Tout le Pack Gamer', '5 paires de finger sleeves premium', '1 ventilateur semi-conducteur', '1 powerbank 20 000mAh', '1 écouteur gaming Bluetooth', 'Livraison express toute l\'île', 'Garantie 1 an', 'Support dédié 24/7'] },
  ],
}

const DEFAULT_REASSURANCE = 'La livraison sera disponible dans tous les lieux - Antananarivo · Paiement à la livraison · Retour sous 7 jours'

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }
const cardVariants = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } } }

export default function Pricing() {
  const settings = useSettings()
  const content = (() => { try { return settings.pricing_content ? { ...DEFAULT_CONTENT, ...JSON.parse(settings.pricing_content) } : DEFAULT_CONTENT } catch { return DEFAULT_CONTENT } })()
  const plans = content.plans?.length ? content.plans : DEFAULT_CONTENT.plans

  return (
    <section style={{ position: 'relative', padding: '120px 24px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(204,85,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', background: 'rgba(202,138,4,0.12)', border: '1px solid rgba(202,138,4,0.25)', borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 600, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
            {content.badge}
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5', lineHeight: 1.15, marginBottom: 16 }}>
            {content.title_1}{' '}
            <span style={{ color: '#FF9900' }}>{content.title_2}</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(240,240,245,0.55)', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
            {content.subtitle}
          </p>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'stretch' }}>
          {plans.map((plan, i) => (
            <PricingCard key={plan.name} plan={plan} style={PLAN_STYLE[i] || PLAN_STYLE[0]} />
          ))}
        </motion.div>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{ textAlign: 'center', marginTop: 40, fontSize: 13, color: 'rgba(240,240,245,0.35)' }}>
          {settings.reassurance_text || DEFAULT_REASSURANCE}
        </motion.p>
      </div>
    </section>
  )
}

function PricingCard({ plan, style }) {
  const isGlow = style.glow
  const [added, setAdded] = useState(false)
  const { addItem, items } = useCart()
  const planId = plan.name.toLowerCase().replace(/\s+/g, '-')
  const inCart = items.some(i => i.id === planId)

  const handleAdd = () => {
    addItem({ id: planId, name: plan.name, price: Number(plan.price), image: '/images/logo/logo.svg' })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <motion.div variants={cardVariants}
      whileHover={{ y: isGlow ? -6 : -4, transition: { duration: 0.25, ease: 'easeOut' } }}
      style={{ position: 'relative', background: style.color, border: `1px solid ${style.borderColor}`, borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', ...(isGlow ? { boxShadow: '0 0 60px rgba(202,138,4,0.12), 0 0 0 1px rgba(202,138,4,0.2)' } : {}) }}>

      {plan.badge && (
        <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #ca8a04, #d97706)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 99, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          {plan.badge}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: style.accentColor, background: `${style.accentColor}18`, border: `1px solid ${style.accentColor}30`, padding: '3px 12px', borderRadius: 99 }}>
          {plan.name}
        </span>
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 15, color: 'rgba(240,240,245,0.5)', fontWeight: 500 }}>Ar</span>
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5', lineHeight: 1.1 }}>
            {Number(plan.price).toLocaleString('fr-FR')}
          </span>
        </div>
        <p style={{ fontSize: 12, color: style.accentColor, fontWeight: 600, marginTop: 4 }}>Paiement unique · Pas d'abonnement</p>
      </div>

      <p style={{ fontSize: 14, color: 'rgba(240,240,245,0.5)', lineHeight: 1.6, marginBottom: 24, marginTop: 8, minHeight: 40 }}>{plan.description}</p>

      <motion.button onClick={handleAdd}
        whileHover={{ scale: 1.02, ...(isGlow && !inCart ? { boxShadow: '0 0 28px rgba(202,138,4,0.4)' } : {}) }}
        whileTap={{ scale: 0.97 }}
        animate={added ? { scale: [1, 1.06, 1] } : {}}
        style={{ width: '100%', padding: '13px 0', borderRadius: 11, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, transition: 'all 0.2s', border: inCart || added ? '1px solid rgba(34,197,94,0.4)' : isGlow ? 'none' : `1px solid ${style.borderColor}`, background: inCart || added ? 'rgba(34,197,94,0.12)' : isGlow ? 'linear-gradient(135deg, #ca8a04, #d97706)' : 'rgba(255,255,255,0.05)', color: inCart || added ? '#22c55e' : '#f0f0f5' }}>
        {inCart || added ? <Check size={16} /> : <ShoppingCart size={16} />}
        {added ? 'Ajouté au panier !' : inCart ? 'Dans le panier' : 'Ajouter au panier'}
      </motion.button>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
        {(plan.features || []).map((feat, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.05 * i, duration: 0.4 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 99, flexShrink: 0, marginTop: 1, background: `${style.accentColor}20`, border: `1px solid ${style.accentColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={11} color={style.accentColor} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 14, color: 'rgba(240,240,245,0.7)', lineHeight: 1.5 }}>{feat}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}