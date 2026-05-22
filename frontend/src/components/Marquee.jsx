import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Shield, Truck, Star, Headphones, Cpu, Radio } from 'lucide-react'

const items = [
  { icon: Zap,        text: 'Finger Sleeves Gaming dispo maintenant' },
  { icon: Truck,      text: 'Livraison 24h sur Antananarivo' },
  { icon: Star,       text: '+1 200 gamers équipés à Madagascar' },
  { icon: Cpu,        text: 'Ventilateurs Turbo — stock limité' },
  { icon: Shield,     text: 'Garantie 6 mois sur tous les produits' },
  { icon: Headphones, text: 'Support WhatsApp 7j/7 — réponse en 5 min' },
  { icon: Zap,        text: 'Finger Sleeves Gaming dispo maintenant' },
  { icon: Truck,      text: 'Livraison 24h sur Antananarivo' },
  { icon: Star,       text: '+1 200 gamers équipés à Madagascar' },
  { icon: Cpu,        text: 'Ventilateurs Turbo — stock limité' },
  { icon: Shield,     text: 'Garantie 6 mois sur tous les produits' },
  { icon: Headphones, text: 'Support WhatsApp 7j/7 — réponse en 5 min' },
]

export default function Marquee() {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 90,
      height: 44,
      display: 'flex',
      alignItems: 'stretch',
      background: 'rgba(8,8,16,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(202,138,4,0.25)',
      boxShadow: '0 -4px 32px rgba(202,138,4,0.08)',
    }}>
      {/* Glowing top border */}
      <div style={{
        position: 'absolute', top: -1, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(202,138,4,0.6) 30%, rgba(124,58,237,0.4) 70%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Label badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '0 18px',
        background: 'linear-gradient(135deg, rgba(202,138,4,0.15), rgba(202,138,4,0.05))',
        borderRight: '1px solid rgba(202,138,4,0.2)',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: '#ca8a04', flexShrink: 0 }}
        />
        <Radio size={13} color="#ca8a04" strokeWidth={2} />
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#ca8a04',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Annonces
        </span>
      </div>

      {/* Scrolling ticker */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* Fade left */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 60, zIndex: 2,
          background: 'linear-gradient(90deg, rgba(8,8,16,0.9), transparent)',
          pointerEvents: 'none',
        }} />
        {/* Fade right */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 60, zIndex: 2,
          background: 'linear-gradient(-90deg, rgba(8,8,16,0.9), transparent)',
          pointerEvents: 'none',
        }} />

        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', width: 'max-content', alignItems: 'center' }}
        >
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 32px',
                whiteSpace: 'nowrap',
                borderRight: '1px solid rgba(255,255,255,0.05)',
              }}>
                <Icon size={13} color="#ca8a04" strokeWidth={2} />
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'rgba(240,240,245,0.65)',
                  letterSpacing: '0.01em',
                }}>
                  {item.text}
                </span>
              </div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
