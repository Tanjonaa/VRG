import React from 'react'
import { motion } from 'framer-motion'
import { Fingerprint, Wind, Truck, Check } from 'lucide-react'
import { useSettings } from '../hooks/useSettings.js'
import { parseJSONSetting } from '../lib/product.js'

const CARD_META = [
  { icon: Fingerprint, img: '/images/finger-sleeve/finger-sleeve-09.webp' },
  { icon: Wind,        img: '/images/fan/fan-02.webp' },
  { icon: Truck,       img: '/images/finger-sleeve/finger-sleeve-08.webp' },
]

/* Textes éditables depuis l'admin (setting features_content) */
const DEFAULT_CONTENT = {
  badge:    'Pourquoi VaRyGasy ?',
  title_1:  'Tout ce qu\'il faut pour',
  title_2:  'dominer sur mobile',
  subtitle: 'Des accessoires pensés pour les gamers mobiles malgaches — qualité pro, prix accessibles.',
  cards: [
    { title: 'Finger Sleeves Pro', description: 'Ultra-fins (0,4 mm) en nylon argenté anti-transpiration. Précision maximale sur écran tactile pour PUBG Mobile, Free Fire et MLBB : fini les doigts qui glissent.', points: ['Anti-transpiration', 'Sensibilité 100%', 'Taille universelle', 'Lavables & durables'], metrics: [{ value: '0,4', label: 'mm d\'épaisseur' }, { value: '360', label: '° de sensibilité' }] },
    { title: 'Ventilateur de refroidissement', description: 'Votre téléphone reste frais pendant les longues sessions, sans perte de performance. Clip universel compatible avec tous les smartphones, silencieux (≤ 25 dB).', points: ['−15°C en 2 min', 'USB-C & Jack', '≤ 25 dB, silencieux', 'Autonomie illimitée'], metrics: [{ value: '15', label: '°C de moins' }, { value: '25', label: 'dB max' }] },
    { title: 'Livraison rapide et sûre', description: 'Commandez le matin, recevez le soir. 24h sur Antananarivo, 3 à 5 jours dans toute l\'île. Vous payez à la livraison : aucun risque.', points: ['24h Antananarivo', '3 à 5 j dans toute l\'île', 'Paiement à la livraison', 'Retour sous 7 jours'], metrics: [{ value: '24', label: 'h livraison Tana' }, { value: '7', label: 'j de retour' }] },
  ],
}

export default function Features() {
  const settings = useSettings()
  const content = parseJSONSetting(settings.features_content, DEFAULT_CONTENT)
  const cards = content.cards?.length ? content.cards : DEFAULT_CONTENT.cards

  return (
    <section id="avantages" className="vs-section" aria-labelledby="features-title" style={{ scrollMarginTop: 80 }}>
      <div className="vs-container">
        <div className="vs-section-head vs-section-head--center">
          <span className="vs-eyebrow">{content.badge}</span>
          <h2 id="features-title" className="vs-h2">
            {content.title_1} <span className="vs-text-gold">{content.title_2}</span>
          </h2>
          <p className="vs-lead">{content.subtitle}</p>
        </div>

        <div className="vs-feature-grid">
          {cards.map((card, i) => {
            const meta = CARD_META[i] || CARD_META[0]
            const Icon = meta.icon
            return (
              <motion.article key={i}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ aspectRatio: '16 / 9', overflow: 'hidden', background: 'var(--color-surface-2)' }}>
                  <img src={card.img || meta.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-gold-soft)', border: '1px solid var(--color-gold-line)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon size={20} color="var(--color-gold)" strokeWidth={1.8} />
                    </span>
                    <h3 className="vs-h3">{card.title}</h3>
                  </div>
                  <p style={{ fontSize: 15, color: 'var(--color-muted)', lineHeight: 1.65 }}>{card.description}</p>
                  <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                    {(card.points || []).map((pt, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--color-text)' }}>
                        <Check size={16} color="var(--color-gold)" style={{ marginTop: 3, flexShrink: 0 }} aria-hidden="true" /> {pt}
                      </li>
                    ))}
                  </ul>
                  {card.metrics?.length > 0 && (
                    <div style={{ display: 'flex', gap: 28, marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                      {card.metrics.map((m, j) => (
                        <div key={j}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{m.value}</div>
                          <div style={{ fontSize: 13, color: 'var(--color-subtle)' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
