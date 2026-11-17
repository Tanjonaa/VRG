import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSettings } from '../hooks/useSettings.js'

const DEFAULT_ITEMS = [
  'Livraison 24h sur Antananarivo',
  'Paiement mobile money ou à la livraison',
  'Garantie 6 mois sur tous les produits',
  'Support WhatsApp 7j/7',
]

/* Barre d'annonces en haut de page : un message à la fois, en rotation.
   Les textes viennent de l'admin (setting marquee_items). */
export default function AnnouncementBar() {
  const settings = useSettings()
  const [i, setI] = useState(0)

  const texts = (() => {
    try {
      const parsed = JSON.parse(settings.marquee_items || '[]')
      const list = Array.isArray(parsed) ? parsed.map(x => x.text).filter(Boolean) : []
      return list.length ? list : DEFAULT_ITEMS
    } catch { return DEFAULT_ITEMS }
  })()

  useEffect(() => {
    if (texts.length < 2) return
    const t = setInterval(() => setI(n => (n + 1) % texts.length), 4500)
    return () => clearInterval(t)
  }, [texts.length])

  return (
    <div role="region" aria-label="Annonces"
      style={{ background: 'var(--color-gold)', color: 'var(--color-on-gold)', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', zIndex: 101 }}>
      <AnimatePresence mode="wait">
        <motion.p key={i % texts.length} aria-live="polite"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{ fontSize: 13, fontWeight: 600, padding: '0 16px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
          {texts[i % texts.length]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
