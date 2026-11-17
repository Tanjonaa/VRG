import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Truck, Wallet, ShieldCheck } from 'lucide-react'
import { useSettings } from '../hooks/useSettings.js'
import { fetchProducts, firstImage, finalPrice, fmtAr, isPromo, parseJSONSetting } from '../lib/product.js'

/* Textes éditables depuis l'admin (setting hero_content) */
const DEFAULT_HERO = {
  badge:         'Livraison gratuite ce week-end — Antananarivo',
  title_1:       'Dominez vos parties.',
  title_2:       'Équipez-vous comme un pro.',
  subtitle:      'Finger sleeves anti-transpiration, ventilateurs de refroidissement et accessoires gaming pour PUBG Mobile, Free Fire et MLBB — livrés chez vous en 24h à Antananarivo, avec paiement à la livraison.',
  btn_primary:   'Commander via WhatsApp',
  btn_secondary: 'Découvrir la boutique',
  social_proof:  '+1 200 gamers équipés à Madagascar',
}

const fade = (i) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] },
})

export default function Hero() {
  const settings = useSettings()
  const hero = parseJSONSetting(settings.hero_content, DEFAULT_HERO)
  const waHref = settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}` : null
  const [featured, setFeatured] = useState(null)

  /* Produit mis en avant sur le visuel : une promo en stock, sinon le premier dispo */
  useEffect(() => {
    fetchProducts().then(list => {
      const inStock = list.filter(p => Number(p.stock) > 0 && firstImage(p))
      setFeatured(inStock.find(isPromo) || inStock[0] || null)
    })
  }, [])

  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '48px 0 72px' }}>
      {/* Halo doré discret derrière le visuel */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '-10%', right: '-10%', width: '60vw', maxWidth: 820, aspectRatio: '1', background: 'radial-gradient(circle, rgba(245,183,10,0.14) 0%, transparent 62%)', pointerEvents: 'none' }} />

      <div className="vs-container vs-hero-grid" style={{ position: 'relative' }}>
        {/* Texte */}
        <div>
          {hero.badge && (
            <motion.div {...fade(0)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 99, background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: 24, maxWidth: '100%' }}>
              <span style={{ padding: '3px 10px', borderRadius: 99, background: 'var(--color-gold)', color: 'var(--color-on-gold)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Offre</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hero.badge}</span>
            </motion.div>
          )}

          <motion.h1 {...fade(1)} className="vs-h1" style={{ marginBottom: 20 }}>
            {hero.title_1}{' '}
            <span className="vs-text-gold">{hero.title_2}</span>
          </motion.h1>

          <motion.p {...fade(2)} className="vs-lead" style={{ maxWidth: 540, marginBottom: 32 }}>
            {hero.subtitle}
          </motion.p>

          <motion.div {...fade(3)} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
            <a href="/catalogue" className="vs-btn vs-btn--primary">
              {hero.btn_secondary} <ArrowRight size={18} aria-hidden="true" />
            </a>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="vs-btn vs-btn--secondary">
                {hero.btn_primary}
              </a>
            )}
          </motion.div>

          {/* Preuve sociale */}
          {hero.social_proof && (
            <motion.div {...fade(4)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 2 }} aria-label="Note 5 sur 5">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="var(--color-gold)" color="var(--color-gold)" aria-hidden="true" />)}
              </div>
              <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>{hero.social_proof}</span>
            </motion.div>
          )}
        </div>

        {/* Visuel */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative' }}>
          <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-border)', aspectRatio: '4 / 3.4', background: 'var(--color-surface)' }}>
            <img src="/images/gallery/hero-gaming.jpg" alt="Gamer mobile équipé d'accessoires VaRyGasy"
              fetchpriority="high" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(11,11,16,0.75) 100%)' }} />
          </div>

          {/* Carte produit flottante */}
          {featured && (
            <motion.a href={`/produit/${featured.id}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="vs-card"
              style={{ height: 'auto', position: 'absolute', left: 'clamp(12px, 4%, 24px)', bottom: 'clamp(12px, 4%, 24px)', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 18, maxWidth: 'calc(100% - 24px)', background: 'rgba(20,20,28,0.92)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-pop)' }}>
              <img src={firstImage(featured)} alt="" width="56" height="56" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--color-subtle)', fontWeight: 600 }}>{isPromo(featured) ? `Promo -${featured.promo_percent}%` : 'Best-seller'}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{featured.name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>{fmtAr(finalPrice(featured))}</div>
              </div>
            </motion.a>
          )}
        </motion.div>
      </div>

      {/* Mini barre de réassurance */}
      <div className="vs-container" style={{ marginTop: 48 }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '12px 28px', color: 'var(--color-muted)', fontSize: 14 }}>
          {[
            [Truck, 'Livraison 24h à Tana'],
            [Wallet, 'Mobile money ou cash à la livraison'],
            [ShieldCheck, 'Garantie sur tous les produits'],
          ].map(([Icon, label]) => (
            <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={18} color="var(--color-gold)" aria-hidden="true" /> {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
