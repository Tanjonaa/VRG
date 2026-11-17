import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, MessageCircle, Truck, ShieldCheck, RotateCcw } from 'lucide-react'
import { useSettings } from '../hooks/useSettings.js'
import { parseJSONSetting } from '../lib/product.js'

const GUARANTEE_ICONS = [Truck, ShieldCheck, RotateCcw, MessageCircle]

/* Textes éditables depuis l'admin (setting cta_content) */
const DEFAULT_CONTENT = {
  title_1:      'Prêt à passer au niveau',
  title_2:      'supérieur ?',
  subtitle:     'Envoie-nous un message WhatsApp — on te répond en moins de 5 minutes et on gère ta livraison dans la journée.',
  btn_whatsapp: 'Commander sur WhatsApp',
  btn_products: 'Voir tous les produits',
  guarantees: [
    { label: 'Livraison 24h',    sub: 'Antananarivo' },
    { label: 'Garantie 6 mois',  sub: 'Sur tous les produits' },
    { label: 'Retour 7 jours',   sub: 'Sans question' },
    { label: 'Support WhatsApp', sub: '7j/7 disponible' },
  ],
}

export default function CTA() {
  const settings = useSettings()
  const content = parseJSONSetting(settings.cta_content, DEFAULT_CONTENT)
  const guarantees = content.guarantees?.length ? content.guarantees : DEFAULT_CONTENT.guarantees
  const waHref = settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}` : null

  return (
    <section className="vs-section" aria-labelledby="cta-title">
      <div className="vs-container">
        {/* Garanties */}
        <ul className="vs-trust-grid" style={{ listStyle: 'none', marginBottom: 56 }}>
          {guarantees.map((g, i) => {
            const Icon = GUARANTEE_ICONS[i % GUARANTEE_ICONS.length]
            return (
              <li key={i} style={{ background: 'var(--color-surface)', padding: '22px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-gold-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon size={22} color="var(--color-gold)" strokeWidth={1.8} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{g.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{g.sub}</div>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Bandeau d'appel à l'action */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-gold-line)', padding: 'clamp(36px, 6vw, 64px) clamp(20px, 5vw, 56px)', textAlign: 'center', background: 'radial-gradient(ellipse at top, rgba(245,183,10,0.16), transparent 65%), var(--color-surface)' }}>
          <h2 id="cta-title" className="vs-h2" style={{ marginBottom: 14 }}>
            {content.title_1} <span className="vs-text-gold">{content.title_2}</span>
          </h2>
          <p className="vs-lead" style={{ maxWidth: 520, margin: '0 auto 30px' }}>{content.subtitle}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="vs-btn vs-btn--whatsapp">
                <MessageCircle size={18} aria-hidden="true" /> {content.btn_whatsapp}
              </a>
            )}
            <a href="/catalogue" className="vs-btn vs-btn--secondary">
              {content.btn_products} <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
