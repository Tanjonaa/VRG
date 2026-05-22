import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, LogIn, ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function Navbar({ onOpenAuth, onOpenAccount, onOpenCart }) {
  const [scrolled, setScrolled] = useState(false)
  const { user } = useAuth()
  const { count } = useCart()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <motion.header initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 24px',
        background: scrolled ? 'rgba(8,8,16,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'background 0.4s, border-color 0.4s',
      }}>
      <nav style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        {/* Logo */}
        <motion.div whileHover={{ scale: 1.02 }} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <img src="/images/logo/logo.svg" alt="VRG" style={{ height: 52, width: 'auto', display: 'block' }} />
        </motion.div>

        {/* Cart + Account */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* Cart icon */}
        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
          onClick={onOpenCart}
          style={{ position: 'relative', background: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.2)', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#FF9900' }}>
          <ShoppingCart size={18} />
          {count > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}
              style={{ position: 'absolute', top: -6, right: -6, background: '#FF9900', color: '#000', borderRadius: 99, fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {count}
            </motion.span>
          )}
        </motion.button>

        {user ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenAccount}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(202,138,4,0.12)', border: '1px solid rgba(202,138,4,0.3)', color: '#fbbf24', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <User size={15} />
            {user.name.split(' ')[0]}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenAuth}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(240,240,245,0.8)', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <LogIn size={15} />
            Connexion
          </motion.button>
        )}
        </div>
      </nav>
    </motion.header>
  )
}
