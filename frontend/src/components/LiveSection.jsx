import React from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Radio, ShoppingBag } from 'lucide-react'
import { useSettings } from '../hooks/useSettings.js'
import { liveFromSettings, platformLabel } from '../lib/live.js'

/* Section « En direct » de l'accueil — visible seulement quand l'admin
   active le live (Paramètres → Live) avec un lien valide. */
export default function LiveSection() {
  const settings = useSettings()
  const live = liveFromSettings(settings)
  if (!live) return null

  const title = settings.live_title?.trim() || 'On est en direct !'
  const desc  = settings.live_desc?.trim() || 'Découvrez nos accessoires en vidéo, posez vos questions en direct et profitez des offres réservées au live.'
  const where = platformLabel(live.platform)

  return (
    <section id="live" className="vs-section" style={{ paddingTop: 32, scrollMarginTop: 80 }} aria-labelledby="live-title">
      <div className="vs-container">
        <motion.div className={`vs-live${live.vertical ? ' vs-live--vertical' : ''}`}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

          {/* Lecteur */}
          <div className="vs-live__media">
            {live.embed ? (
              <iframe src={live.embed} title={`Live VaRyGasy sur ${where}`} loading="lazy"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              /* Plateforme non intégrable (live TikTok…) : carte qui ouvre le live */
              <a href={live.link} target="_blank" rel="noopener noreferrer" className="vs-live__placeholder">
                <span className="vs-live__play" aria-hidden="true"><Radio size={30} /></span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Regarder le live sur {where}</span>
                <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Le direct s'ouvre dans l'application {where}</span>
              </a>
            )}
          </div>

          {/* Texte */}
          <div className="vs-live__body">
            <span className="vs-live-badge"><span className="vs-live-dot" aria-hidden="true" /> En direct</span>
            <h2 id="live-title" className="vs-h2" style={{ marginTop: 16 }}>{title}</h2>
            <p className="vs-lead" style={{ marginTop: 14 }}>{desc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
              <a href={live.link} target="_blank" rel="noopener noreferrer" className="vs-btn vs-btn--primary">
                Ouvrir sur {where} <ExternalLink size={16} />
              </a>
              <a href="/catalogue" className="vs-btn vs-btn--secondary">
                <ShoppingBag size={16} /> Voir les produits
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
