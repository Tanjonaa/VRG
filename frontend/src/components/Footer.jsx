import React from 'react'
import { motion } from 'framer-motion'
import { useSettings } from '../hooks/useSettings.js'

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

export default function Footer() {
  const settings = useSettings()
  const { whatsapp, facebook, instagram } = settings

  const socials = [
    whatsapp  && { href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`, icon: <WhatsAppIcon />, color: '#22c55e', label: 'WhatsApp' },
    facebook  && { href: facebook,  icon: <FacebookIcon />,  color: '#60a5fa', label: 'Facebook' },
    instagram && { href: instagram, icon: <InstagramIcon />, color: '#f87171', label: 'Instagram' },
  ].filter(Boolean)

  return (
    <footer style={{ padding: '48px 24px 84px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/images/logo/logo.svg" alt="VRG" style={{ width: 30, height: 30, borderRadius: 8 }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #ca8a04, #CC5500)', display: 'none', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>V</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: 'rgba(240,240,245,0.8)' }}>
            VaRy<span style={{ color: '#ca8a04' }}>Gasy</span>
          </span>
        </div>

        <p style={{ fontSize: 13, color: 'rgba(240,240,245,0.3)', textAlign: 'center' }}>
          © 2026 VaRyGasy · Accessoires mobile made in Madagascar
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Réseaux sociaux */}
          {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 10 }}>
              {socials.map(s => (
                <motion.a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.15 }}
                  style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, textDecoration: 'none', transition: 'background 0.2s' }}>
                  {s.icon}
                </motion.a>
              ))}
            </div>
          )}

          {/* Liens légaux */}
          <div style={{ display: 'flex', gap: 20 }}>
            {['Confidentialité', 'CGU', 'Contact'].map(item => (
              <motion.a key={item} href="#" whileHover={{ color: 'rgba(240,240,245,0.8)' }}
                style={{ fontSize: 13, color: 'rgba(240,240,245,0.35)', textDecoration: 'none', cursor: 'pointer' }}>
                {item}
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
