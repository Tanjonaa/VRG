import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function useCountdown(targetDate) {
  const calc = () => {
    if (!targetDate) return null
    const diff = new Date(targetDate) - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000)  / 60000),
      seconds: Math.floor((diff % 60000)    / 1000),
      expired: false,
    }
  }

  const [tick, setTick] = useState(calc)

  useEffect(() => {
    if (!targetDate) return
    setTick(calc())
    const id = setInterval(() => setTick(calc()), 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return tick
}

function TimeCard({ value, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '28px 24px',
        minWidth: 90,
      }}>
      <span style={{
        fontSize: 52, fontWeight: 900, color: '#f0f0f5',
        lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-2px',
        background: 'linear-gradient(180deg, #fff 0%, rgba(240,240,245,0.6) 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {String(value).padStart(2, '0')}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        {label}
      </span>
    </motion.div>
  )
}

function Separator() {
  return (
    <span style={{
      fontSize: 40, fontWeight: 900, color: 'rgba(255,153,0,0.4)',
      lineHeight: 1, paddingBottom: 24, alignSelf: 'center',
    }}>:</span>
  )
}

export default function ComingSoon({ settings = {} }) {
  const targetDate = settings.coming_soon_date || ''
  const message    = settings.coming_soon_message || 'Nous préparons quelque chose d\'exceptionnel. La boutique ouvre bientôt !'
  const whatsapp   = settings.whatsapp  || ''
  const facebook   = settings.facebook  || ''
  const instagram  = settings.instagram || ''

  const tick = useCountdown(targetDate)
  const hasDate = !!targetDate

  return (
    <div style={{
      minHeight: '100dvh', background: '#07070f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px 24px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(255,153,0,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: 48 }}>
        <img
          src="/images/logo/logo.svg" alt="VaRyGasy"
          style={{ width: 64, height: 64, borderRadius: 18, marginBottom: 14 }}
          onError={e => e.target.style.display = 'none'}
        />
        <div style={{ fontSize: 20, fontWeight: 900, color: '#FF9900', letterSpacing: '-0.5px' }}>
          VaRyGasy
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 'clamp(32px, 8vw, 64px)',
          fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1,
          background: 'linear-gradient(135deg, #ffffff 0%, rgba(240,240,245,0.6) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          Bientôt disponible
        </div>
        <div style={{
          fontSize: 'clamp(13px, 3vw, 18px)', fontWeight: 500,
          background: 'linear-gradient(135deg, #FF9900, #CC5500)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '0.04em',
        }}>
          COMING SOON
        </div>
      </motion.div>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{
          fontSize: 15, color: 'rgba(240,240,245,0.45)', lineHeight: 1.6,
          maxWidth: 440, marginBottom: 52,
        }}>
        {message}
      </motion.p>

      {/* Countdown */}
      {hasDate && tick && !tick.expired && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 52, flexWrap: 'wrap', justifyContent: 'center' }}>
          <TimeCard value={tick.days}    label="Jours" />
          <Separator />
          <TimeCard value={tick.hours}   label="Heures" />
          <Separator />
          <TimeCard value={tick.minutes} label="Minutes" />
          <Separator />
          <TimeCard value={tick.seconds} label="Secondes" />
        </motion.div>
      )}

      {hasDate && tick?.expired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginBottom: 52, padding: '14px 28px', borderRadius: 14,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            fontSize: 14, fontWeight: 700, color: '#22c55e',
          }}>
          La boutique est sur le point d'ouvrir !
        </motion.div>
      )}

      {!hasDate && (
        <div style={{ marginBottom: 52, height: 40 }} />
      )}

      {/* Social links */}
      {(whatsapp || facebook || instagram) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.3)', marginRight: 4 }}>Suivez-nous</span>

          {whatsapp && (
            <motion.a
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.15 }}
              style={socialBtn('#22c55e')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
            </motion.a>
          )}

          {facebook && (
            <motion.a href={facebook} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.15 }} style={socialBtn('#60a5fa')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </motion.a>
          )}

          {instagram && (
            <motion.a href={instagram} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.15 }} style={socialBtn('#f87171')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </motion.a>
          )}
        </motion.div>
      )}

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 24,
        fontSize: 12, color: 'rgba(240,240,245,0.2)',
      }}>
        © 2026 VaRyGasy · Antananarivo, Madagascar
      </div>
    </div>
  )
}

const socialBtn = (color) => ({
  width: 38, height: 38, borderRadius: 11,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color, textDecoration: 'none', transition: 'background 0.2s',
})
