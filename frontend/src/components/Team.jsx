import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSettings } from '../hooks/useSettings.js'

const DEFAULTS = {
  team_badge:    'Notre équipe',
  team_title:    'Les personnes derrière',
  team_subtitle: 'Une équipe passionnée au service de vos commandes à Madagascar.',
}

export default function Team() {
  const settings = useSettings()
  const [members, setMembers] = useState([])

  useEffect(() => {
    fetch('/api/team').then(r => r.json()).then(d => setMembers(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  if (members.length === 0) return null

  return (
    <section className="vs-section" aria-labelledby="team-title">
      <div className="vs-container">
        <div className="vs-section-head vs-section-head--center">
          <span className="vs-eyebrow">{settings.team_badge || DEFAULTS.team_badge}</span>
          <h2 id="team-title" className="vs-h2">
            {settings.team_title || DEFAULTS.team_title} <span className="vs-text-gold">VaRyGasy</span>
          </h2>
          <p className="vs-lead">{settings.team_subtitle || DEFAULTS.team_subtitle}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 20 }}>
          {members.map((m, i) => <Member key={m.id} member={m} index={i} />)}
        </div>
      </div>
    </section>
  )
}

function Member({ member, index }) {
  const [err, setErr] = useState(false)
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ aspectRatio: '1 / 1', background: 'var(--color-surface-2)' }}>
        {member.photo && !err ? (
          <img src={member.photo} alt={member.name} loading="lazy" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700, color: 'var(--color-gold)' }}>
            {member.name?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ padding: 18 }}>
        <h3 className="vs-h3">{member.name}</h3>
        {member.role && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gold)', marginTop: 4 }}>{member.role}</div>}
        {member.description && <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.6, marginTop: 8 }}>{member.description}</p>}
      </div>
    </motion.article>
  )
}
