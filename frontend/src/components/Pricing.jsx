import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../hooks/useSettings.js'
import { parseJSONSetting } from '../lib/product.js'

/* Textes et packs éditables depuis l'admin (setting pricing_content) */
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

export default function Pricing() {
  const settings = useSettings()
  const content = parseJSONSetting(settings.pricing_content, DEFAULT_CONTENT)
  const plans = content.plans?.length ? content.plans : DEFAULT_CONTENT.plans
  /* Mise en avant : le pack avec un badge, sinon celui du milieu */
  const highlight = plans.findIndex(p => p.badge) >= 0 ? plans.findIndex(p => p.badge) : Math.floor(plans.length / 2)

  return (
    <section className="vs-section vs-section--alt" aria-labelledby="pricing-title">
      <div className="vs-container">
        <div className="vs-section-head vs-section-head--center">
          <span className="vs-eyebrow">{content.badge}</span>
          <h2 id="pricing-title" className="vs-h2">
            {content.title_1} <span className="vs-text-gold">{content.title_2}</span>
          </h2>
          <p className="vs-lead">{content.subtitle}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20, alignItems: 'stretch' }}>
          {plans.map((plan, i) => <PlanCard key={plan.name} plan={plan} featured={i === highlight} index={i} />)}
        </div>

        {settings.reassurance_text && (
          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: 'var(--color-subtle)' }}>{settings.reassurance_text}</p>
        )}
      </div>
    </section>
  )
}

function PlanCard({ plan, featured, index }) {
  const [added, setAdded] = useState(false)
  const { addItem, items } = useCart()
  const planId = plan.name.toLowerCase().replace(/\s+/g, '-')
  const inCart = items.some(i => i.id === planId)

  const handleAdd = () => {
    addItem({ id: planId, name: plan.name, price: Number(plan.price), image: '/images/logo/logo.svg' })
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', padding: 28, borderRadius: 'var(--radius-lg)',
        background: featured ? 'linear-gradient(180deg, rgba(245,183,10,0.08), var(--color-surface) 40%)' : 'var(--color-surface)',
        border: `1px solid ${featured ? 'var(--color-gold-line)' : 'var(--color-border)'}`,
        boxShadow: featured ? '0 20px 60px rgba(245,183,10,0.08)' : 'none',
      }}>
      {plan.badge && (
        <span className="vs-badge vs-badge--promo" style={{ position: 'absolute', top: -12, left: 28 }}>{plan.badge}</span>
      )}
      <h3 className="vs-h3" style={{ fontSize: 20 }}>{plan.name}</h3>
      <p style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 6, minHeight: 44 }}>{plan.description}</p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '18px 0 4px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
          {Number(plan.price).toLocaleString('fr-FR')}
        </span>
        <span style={{ fontSize: 16, color: 'var(--color-muted)', fontWeight: 600 }}>Ar</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-subtle)', marginBottom: 22 }}>Paiement unique · sans abonnement</p>

      <button type="button" onClick={handleAdd}
        className={`vs-btn vs-btn--block ${added || inCart ? 'vs-btn--added' : featured ? 'vs-btn--primary' : 'vs-btn--secondary'}`}>
        {added || inCart ? <Check size={18} aria-hidden="true" /> : <ShoppingBag size={18} aria-hidden="true" />}
        {added ? 'Ajouté au panier' : inCart ? 'Dans le panier' : 'Ajouter au panier'}
      </button>

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24, paddingTop: 22, borderTop: '1px solid var(--color-border)' }}>
        {(plan.features || []).map((f, j) => (
          <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--color-text)' }}>
            <Check size={16} color="var(--color-gold)" style={{ marginTop: 3, flexShrink: 0 }} aria-hidden="true" /> {f}
          </li>
        ))}
      </ul>
    </motion.article>
  )
}
