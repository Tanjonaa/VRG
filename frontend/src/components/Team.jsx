import React, { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'

export default function Team() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/team')
      .then(r => r.json())
      .then(data => { setMembers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!loading && members.length === 0) return null

  return (
    <section style={{ position: 'relative', padding: '120px 24px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%, rgba(255,153,0,0.04) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <div style={{ display: 'inline-block', background: 'rgba(202,138,4,0.12)', border: '1px solid rgba(202,138,4,0.25)', borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 600, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
            Notre équipe
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f5', lineHeight: 1.15, marginBottom: 16 }}>
            Les personnes derrière{' '}<span style={{ color: '#FF9900' }}>VaRyGasy</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(240,240,245,0.45)', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
            Une équipe passionnée au service de vos commandes à Madagascar.
          </p>
        </motion.div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ aspectRatio: '4/3', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.05)', width: '35%' }} />
                  <div style={{ height: 16, borderRadius: 6, background: 'rgba(255,255,255,0.05)', width: '60%' }} />
                  <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.03)', width: '85%' }} />
                  <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.03)', width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {members.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MemberCard({ member, index }) {
  const [imgErr, setImgErr] = useState(false)
  const cardRef = useRef(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-60, 60], [8, -8]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-60, 60], [-8, 8]), { stiffness: 300, damping: 30 })
  const glowX   = useTransform(x, [-60, 60], ['0%', '100%'])
  const glowY   = useTransform(y, [-60, 60], ['0%', '100%'])

  const handleMouse = e => {
    const r = cardRef.current.getBoundingClientRect()
    x.set(e.clientX - r.left - r.width / 2)
    y.set(e.clientY - r.top  - r.height / 2)
  }
  const handleLeave = () => { x.set(0); y.set(0) }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, overflow: 'hidden', position: 'relative',
        rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800,
        cursor: 'default',
      }}
    >
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,153,0,0.5), transparent)', zIndex: 1 }} />

      {/* Mouse-follow glow */}
      <motion.div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(circle at ${glowX} ${glowY}, rgba(255,153,0,0.07) 0%, transparent 65%)` }} />

      {/* Photo */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        {member.photo && !imgErr ? (
          <motion.img
            src={member.photo}
            alt={member.name}
            onError={() => setImgErr(true)}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#FF9900' }}>
              {member.name?.[0]?.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '20px 22px', position: 'relative', zIndex: 1 }}>
        {member.role && (
          <div style={{ display: 'inline-block', background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.22)', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#FF9900', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
            {member.role}
          </div>
        )}
        <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-0.02em', marginBottom: member.description ? 8 : 0 }}>
          {member.name}
        </div>
        {member.description && (
          <p style={{ fontSize: 13, color: 'rgba(240,240,245,0.45)', lineHeight: 1.65, margin: 0 }}>
            {member.description}
          </p>
        )}
      </div>
    </motion.div>
  )
}