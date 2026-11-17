import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { useSettings } from '../hooks/useSettings.js'

const DEFAULT_ITEMS = [
  'Livraison 24h sur Antananarivo',
  'Paiement mobile money ou à la livraison',
  'Garantie 6 mois sur tous les produits',
  'Support WhatsApp 7j/7',
]

/* Barre d'annonces discrète en haut de page : un message à la fois, en rotation.
   Les textes viennent de l'admin (setting marquee_items). Masquable pour la session. */
export default function AnnouncementBar() {
  const settings = useSettings()
  const [i, setI] = useState(0)
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('vrg_bar_hidden') === '1' } catch { return false }
  })

  const texts = (() => {
    try {
      const parsed = JSON.parse(settings.marquee_items || '[]')
      const list = Array.isArray(parsed) ? parsed.map(x => x.text).filter(Boolean) : []
      return list.length ? list : DEFAULT_ITEMS
    } catch { return DEFAULT_ITEMS }
  })()

  useEffect(() => {
    if (hidden || texts.length < 2) return
    const t = setInterval(() => setI(n => (n + 1) % texts.length), 5000)
    return () => clearInterval(t)
  }, [texts.length, hidden])

  const hide = () => {
    setHidden(true)
    try { sessionStorage.setItem('vrg_bar_hidden', '1') } catch {}
  }

  if (hidden) return null

  return (
    <div role="region" aria-label="Annonces"
      style={{ position: 'relative', zIndex: 101, height: 36, background: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 44px', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        <motion.p key={i % texts.length} aria-live="polite"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%' }}>
          <Sparkles size={14} color="var(--color-gold)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{texts[i % texts.length]}</span>
        </motion.p>
      </AnimatePresence>
      <button type="button" onClick={hide} aria-label="Masquer les annonces"
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, display: 'grid', placeItems: 'center', background: 'none', border: 'none', borderRadius: 8, color: 'var(--color-subtle)', cursor: 'pointer' }}>
        <X size={15} />
      </button>
    </div>
  )
}
