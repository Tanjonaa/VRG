import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ShoppingBag, Search, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../hooks/useSettings.js'
import { liveFromSettings } from '../lib/live.js'

const LINKS = [
  { label: 'Boutique',    href: '/catalogue' },
  { label: 'Nouveautés',  href: '/catalogue?tab=nouveautes' },
  { label: 'Promotions',  href: '/catalogue?tab=promos' },
  { label: 'Pourquoi nous', href: '#avantages' },
]

export default function Navbar({ onOpenAuth, onOpenAccount, onOpenCart }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const { count } = useCart()
  /* Live activé dans l'admin → lien « En direct » vers la section #live */
  const isLive = !!liveFromSettings(useSettings())

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  /* Échap ferme le menu mobile + bloque le défilement de la page derrière */
  useEffect(() => {
    if (!menuOpen) return
    const onKey = e => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(11,11,16,0.86)' : 'var(--color-bg)',
      backdropFilter: scrolled ? 'saturate(160%) blur(16px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'saturate(160%) blur(16px)' : 'none',
      borderBottom: `1px solid ${scrolled ? 'var(--color-border)' : 'transparent'}`,
      transition: 'background-color .3s, border-color .3s',
    }}>
      <nav className="vs-container" aria-label="Navigation principale"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="vs-icon-btn vs-burger" onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu" aria-expanded={menuOpen}>
            <Menu size={22} />
          </button>
          <a href="/" aria-label="VaRyGasy — accueil" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/images/logo/logo.svg" alt="VaRyGasy" width="120" height="44" style={{ height: 44, width: 'auto', display: 'block' }} />
          </a>
        </div>

        <div className="vs-nav-links">
          {isLive && (
            <a href="#live" className="vs-nav-link vs-nav-link--live"><span className="vs-live-dot" aria-hidden="true" /> En direct</a>
          )}
          {LINKS.map(l => <a key={l.href} href={l.href} className="vs-nav-link">{l.label}</a>)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isLive && (
            <a href="#live" className="vs-live-badge vs-live-mobile" aria-label="Live en cours — regarder"
              style={{ height: 28, padding: '0 10px', fontSize: 12, textDecoration: 'none', marginRight: 4 }}>
              <span className="vs-live-dot" aria-hidden="true" /> Live
            </a>
          )}
          <a href="/catalogue" className="vs-icon-btn vs-hide-mobile" aria-label="Rechercher un produit">
            <Search size={20} />
          </a>
          <button type="button" className="vs-icon-btn" onClick={user ? onOpenAccount : onOpenAuth}
            aria-label={user ? 'Mon compte' : 'Se connecter'}>
            <User size={20} />
          </button>
          <button type="button" className="vs-icon-btn" onClick={onOpenCart}
            aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }} aria-hidden="true"
                style={{ position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99, background: 'var(--color-gold)', color: 'var(--color-on-gold)', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center' }}>
                {count}
              </motion.span>
            )}
          </button>
        </div>
      </nav>

      {/* Menu mobile (tiroir gauche) */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150 }} />
            <motion.aside role="dialog" aria-modal="true" aria-label="Menu"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'fixed', top: 0, bottom: 0, left: 0, width: 'min(320px, 86vw)', zIndex: 151, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <img src="/images/logo/logo.svg" alt="VaRyGasy" style={{ height: 40, width: 'auto' }} />
                <button type="button" className="vs-icon-btn" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" autoFocus>
                  <X size={22} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: 12, gap: 2 }}>
                {isLive && (
                  <a href="#live" className="vs-nav-link vs-nav-link--live" onClick={() => setMenuOpen(false)}
                    style={{ height: 52, fontSize: 17 }}><span className="vs-live-dot" aria-hidden="true" /> En direct</a>
                )}
                {LINKS.map(l => (
                  <a key={l.href} href={l.href} className="vs-nav-link" onClick={() => setMenuOpen(false)}
                    style={{ height: 52, fontSize: 17 }}>{l.label}</a>
                ))}
              </div>
              <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="vs-btn vs-btn--primary vs-btn--block"
                  onClick={() => { setMenuOpen(false); (user ? onOpenAccount : onOpenAuth)() }}>
                  <User size={18} /> {user ? 'Mon compte' : 'Se connecter / S\'inscrire'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
