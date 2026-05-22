import React from 'react'
import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <footer style={{
      padding: '48px 24px 84px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #ca8a04, #CC5500)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>V</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: 'rgba(240,240,245,0.8)' }}>
            VaRy<span style={{ color: '#ca8a04' }}>Gasy</span>
          </span>
        </div>

        <p style={{ fontSize: 13, color: 'rgba(240,240,245,0.3)', textAlign: 'center' }}>
          © 2026 VaRyGasy · Accessoires mobile made in Madagascar
        </p>

        <div style={{ display: 'flex', gap: 24 }}>
          {['Confidentialité', 'CGU', 'Contact'].map((item) => (
            <motion.a
              key={item}
              href="#"
              whileHover={{ color: 'rgba(240,240,245,0.8)' }}
              style={{
                fontSize: 13,
                color: 'rgba(240,240,245,0.35)',
                textDecoration: 'none',
                transition: 'color 0.2s',
                cursor: 'pointer',
              }}
            >
              {item}
            </motion.a>
          ))}
        </div>
      </div>
    </footer>
  )
}
