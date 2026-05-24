import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, MessageCircle, Truck, ShieldCheck, RotateCcw } from 'lucide-react'
import { useSettings } from '../hooks/useSettings.js'

const GUARANTEE_ICONS = [Truck, ShieldCheck, RotateCcw, MessageCircle]

const DEFAULT_CONTENT = {
  title_1:      'Prêt à passer au niveau',
  title_2:      'supérieur ?',
  subtitle:     'Envoie-nous un message WhatsApp — on te répond en moins de 5 minutes et on gère ta livraison dans la journée.',
  btn_whatsapp: 'Commander sur WhatsApp',
  btn_products: 'Voir tous les produits',
  guarantees: [
    { label: 'Livraison 24h',    sub: 'Antananarivo' },
    { label: 'Garantie 6 mois', sub: 'Sur tous les produits' },
    { label: 'Retour 7 jours',  sub: 'Sans question' },
    { label: 'Support WhatsApp',sub: '7j/7 disponible' },
  ],
}

const DEFAULT_REASSURANCE = 'Livraison gratuite Antananarivo · Paiement à la livraison · Retour sous 7 jours'

export default function CTA() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const settings = useSettings()
  const content = (() => { try { return settings.cta_content ? { ...DEFAULT_CONTENT, ...JSON.parse(settings.cta_content) } : DEFAULT_CONTENT } catch { return DEFAULT_CONTENT } })()
  const guarantees = content.guarantees?.length ? content.guarantees : DEFAULT_CONTENT.guarantees

  return (
    <section style={{ padding: '80px 24px 120px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(202,138,4,0.5), transparent)' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Guarantees bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 64 }}>
          {guarantees.map((g, i) => {
            const Icon = GUARANTEE_ICONS[i % GUARANTEE_ICONS.length]
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(202,138,4,0.1)', border: '1px solid rgba(202,138,4,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color="#ca8a04" strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.01em' }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.45)', marginTop: 2 }}>{g.sub}</div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Main CTA card */}
        <div ref={ref}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', padding: '72px 48px', textAlign: 'center', border: '1px solid rgba(202,138,4,0.2)' }}>

            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(202,138,4,0.1) 0%, rgba(204,85,0,0.12) 50%, rgba(37,99,235,0.08) 100%)', backdropFilter: 'blur(40px)' }} />
            <motion.div animate={{ x: [0,20,-10,15,0], y: [0,-15,10,-5,0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '-30%', left: '-10%', width: '50%', height: '200%', background: 'radial-gradient(circle, rgba(202,138,4,0.18) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <motion.div animate={{ x: [0,-18,12,-8,0], y: [0,12,-18,8,0] }} transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
              style={{ position: 'absolute', top: '-20%', right: '-15%', width: '55%', height: '200%', background: 'radial-gradient(circle, rgba(204,85,0,0.15) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5', lineHeight: 1.15, marginBottom: 18 }}>
                {content.title_1}{' '}
                <span style={{ color: '#FF9900' }}>{content.title_2}</span>
              </motion.h2>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.35, duration: 0.6 }}
                style={{ fontSize: 18, color: 'rgba(240,240,245,0.55)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.65 }}>
                {content.subtitle}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.45, duration: 0.6 }}
                style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button whileHover={{ scale: 1.05, boxShadow: '0 0 48px rgba(34,197,94,0.4)' }} whileTap={{ scale: 0.97 }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: 14, padding: '17px 32px', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
                  <MessageCircle size={20} />
                  {content.btn_whatsapp}
                </motion.button>
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.09)', scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', color: 'rgba(240,240,245,0.8)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: '17px 28px', fontSize: 17, fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}>
                  {content.btn_products} <ArrowRight size={18} />
                </motion.button>
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.6, duration: 0.6 }}
                style={{ marginTop: 24, fontSize: 13, color: 'rgba(240,240,245,0.35)' }}>
                {settings.reassurance_text || DEFAULT_REASSURANCE}
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}