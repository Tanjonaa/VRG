import React, { useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { ArrowRight, ChevronDown, Star, Zap, Shield, Cpu, Flame } from 'lucide-react'
import Particles from './Particles.jsx'
import { useSettings } from '../hooks/useSettings.js'

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
}

const DEFAULT_HERO = {
  badge:          '🔥 Livraison gratuite ce weekend — Antananarivo',
  title_1:        'Domine le jeu mobile.',
  title_2:        'Équipe-toi maintenant.',
  subtitle:       'Finger sleeves anti-transpiration, ventilateurs de refroidissement et accessoires gaming pour dominer sur PUBG Mobile, Free Fire et MLBB — livrés chez toi à Madagascar.',
  btn_primary:    'Commander via WhatsApp',
  btn_secondary:  'Voir les produits',
  social_proof:   '+1 200 gamers équipés à Madagascar',
}

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const settings = useSettings()
  const hero = (() => { try { return settings.hero_content ? { ...DEFAULT_HERO, ...JSON.parse(settings.hero_content) } : DEFAULT_HERO } catch { return DEFAULT_HERO } })()

  return (
    <section ref={ref} style={{
      position: 'relative', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', padding: '120px 24px 80px',
    }}>
      <GradientBg />
      <Particles count={50} />

      <FloatingIcon icon={Zap}   x="8%"  y="25%" delay={0}   color="#ca8a04" />
      <FloatingIcon icon={Cpu}   x="88%" y="20%" delay={1.5} color="#CC5500" />
      <FloatingIcon icon={Shield} x="6%" y="70%" delay={3}   color="#0ea5e9" />
      <FloatingIcon icon={Flame} x="90%" y="65%" delay={2}   color="#ca8a04" />

      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', pointerEvents: 'none', opacity: 0.4,
      }} />

      <FloatingProductImg src="/images/finger-sleeve/finger-sleeve-09.webp" side="left"  delay={1.2} accentColor="#ca8a04" />
      <FloatingProductImg src="/images/fan/fan-02.webp"                     side="right" delay={1.5} accentColor="#CC5500" />

      <motion.div style={{ y, opacity, position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 820 }}>
        {/* Urgency badge */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(202,138,4,0.12)', border: '1px solid rgba(202,138,4,0.3)',
          borderRadius: 99, padding: '6px 16px', fontSize: 13, fontWeight: 600,
          color: '#fbbf24', marginBottom: 28, backdropFilter: 'blur(8px)',
        }}>
          <Flame size={13} fill="#fbbf24" />
          {hero.badge}
        </motion.div>

        {/* Headline */}
        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1} style={{
          fontSize: 'clamp(40px, 7vw, 78px)', fontWeight: 700,
          lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 24, color: '#f0f0f5',
        }}>
          {hero.title_1}{' '}
          <span style={{ color: '#FF9900' }}>
            {hero.title_2}
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2} style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'rgba(240,240,245,0.6)',
          lineHeight: 1.65, maxWidth: 580, margin: '0 auto 40px', fontWeight: 400,
        }}>
          {hero.subtitle}
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <MagneticButton primary style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #ca8a04, #d97706)',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '15px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em',
          }}>
            {hero.btn_primary} <ArrowRight size={18} />
          </MagneticButton>
          <MagneticButton style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)', color: 'rgba(240,240,245,0.85)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
            padding: '15px 28px', fontSize: 16, fontWeight: 500, cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}>
            {hero.btn_secondary}
          </MagneticButton>
        </motion.div>

        {/* Social proof */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 48 }}>
          <div style={{ display: 'flex' }}>
            {['R','T','M','A','F'].map((l, i) => (
              <div key={i} style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '2px solid rgba(8,8,16,0.9)', marginLeft: i > 0 ? -10 : 0,
                background: `hsl(${i * 50 + 200}, 60%, 45%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, color: '#fff',
              }}>{l}</div>
            ))}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />)}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(240,240,245,0.55)', margin: 0 }}>
              <strong style={{ color: 'rgba(240,240,245,0.85)' }}>{hero.social_proof.split(' ').slice(0,2).join(' ')}</strong>{' '}
              {hero.social_proof.split(' ').slice(2).join(' ')}
            </p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={22} color="rgba(240,240,245,0.3)" />
        </motion.div>
      </motion.div>
    </section>
  )
}

function FloatingProductImg({ src, side, delay, accentColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -80 : 80, rotate: side === 'left' ? -12 : 12 }}
      animate={{ opacity: 1, x: 0, rotate: side === 'left' ? -6 : 6 }}
      transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: 'absolute', [side]: '2%', bottom: '12%', zIndex: 2, pointerEvents: 'none', width: 'clamp(110px, 13vw, 190px)' }}
    >
      <motion.img src={src} alt="produit"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5 + Math.random(), repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: '100%', borderRadius: 16, border: `1px solid ${accentColor}40`, boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${accentColor}25`, objectFit: 'cover', aspectRatio: '1/1' }}
      />
    </motion.div>
  )
}

function MagneticButton({ children, style, primary = false }) {
  const ref = useRef(null)
  const x = useMotionValue(0), y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 20 })
  const sy = useSpring(y, { stiffness: 200, damping: 20 })
  const handleMouse = (e) => {
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - r.left - r.width / 2) * 0.25)
    y.set((e.clientY - r.top - r.height / 2) * 0.25)
  }
  return (
    <motion.button ref={ref} onMouseMove={handleMouse} onMouseLeave={() => { x.set(0); y.set(0) }}
      style={{ x: sx, y: sy, ...style }} whileTap={{ scale: 0.96 }}
      {...(primary
        ? { whileHover: { scale: 1.04, boxShadow: '0 0 40px rgba(202,138,4,0.45)' } }
        : { whileHover: { background: 'rgba(255,255,255,0.08)', scale: 1.02 } }
      )}>
      {children}
    </motion.button>
  )
}

function FloatingIcon({ icon: Icon, x, y, delay, color }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: 'absolute', left: x, top: y, zIndex: 2, pointerEvents: 'none' }}>
      <motion.div
        animate={{ y: [0, -14, 0], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.5 }}
        style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}35`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </motion.div>
    </motion.div>
  )
}

function GradientBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#080810' }} />
      <motion.div animate={{ x: ['0%','15%','-10%','5%','0%'], y: ['0%','-20%','10%','-5%','0%'], scale: [1,1.15,0.95,1.05,1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '-20%', left: '-10%', width: '70vw', height: '70vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(202,138,4,0.22) 0%, rgba(202,138,4,0.05) 50%, transparent 70%)', filter: 'blur(60px)' }} />
      <motion.div animate={{ x: ['0%','-12%','8%','-4%','0%'], y: ['0%','15%','-12%','6%','0%'], scale: [1,0.9,1.1,0.95,1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ position: 'absolute', top: '10%', right: '-15%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,85,0,0.2) 0%, rgba(204,85,0,0.05) 50%, transparent 70%)', filter: 'blur(60px)' }} />
      <motion.div animate={{ x: ['0%','8%','-15%','3%','0%'], y: ['0%','-8%','18%','-3%','0%'], scale: [1,1.2,0.85,1.1,1] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        style={{ position: 'absolute', bottom: '-10%', left: '20%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0.04) 50%, transparent 70%)', filter: 'blur(60px)' }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 75%)',
      }} />
    </div>
  )
}