import React, { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import ProductCard from './store/ProductCard.jsx'
import { useSettings } from '../hooks/useSettings.js'
import { fetchProducts, parseJSONSetting } from '../lib/product.js'

/* Section « Nouveautés » : les 4 derniers produits ajoutés.
   Textes éditables depuis l'admin (setting gallery_content). */
const DEFAULT_CONTENT = {
  badge:    'Nouveautés',
  title_1:  'Derniers',
  title_2:  'arrivages',
  subtitle: 'Les accessoires tout juste ajoutés à la boutique.',
}

export default function Gallery() {
  const settings = useSettings()
  const content = parseJSONSetting(settings.gallery_content, DEFAULT_CONTENT)
  const [latest, setLatest] = useState([])

  useEffect(() => {
    fetchProducts().then(list => {
      setLatest([...list]
        .filter(p => p.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4))
    })
  }, [])

  if (latest.length < 2) return null

  return (
    <section className="vs-section" aria-labelledby="new-title">
      <div className="vs-container">
        <div className="vs-section-head">
          <div>
            <span className="vs-eyebrow">{content.badge}</span>
            <h2 id="new-title" className="vs-h2" style={{ marginTop: 10 }}>
              {content.title_1} <span className="vs-text-gold">{content.title_2}</span>
            </h2>
            {content.subtitle && <p className="vs-lead" style={{ marginTop: 10, fontSize: 16 }}>{content.subtitle}</p>}
          </div>
          <a href="/catalogue?tab=nouveautes" className="vs-btn vs-btn--ghost vs-btn--sm">
            Toutes les nouveautés <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="vs-grid-products">
          {latest.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  )
}
