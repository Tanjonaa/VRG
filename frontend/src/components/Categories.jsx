import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { fetchProducts, firstImage } from '../lib/product.js'

/* Tuiles « Acheter par catégorie » — générées depuis les produits (rien en dur) */
export default function Categories() {
  const [cats, setCats] = useState([])

  useEffect(() => {
    fetchProducts().then(list => {
      const map = new Map()
      for (const p of list) {
        if (!p.category) continue
        const c = map.get(p.category) || { name: p.category, count: 0, img: null }
        c.count++
        if (!c.img) c.img = firstImage(p)
        map.set(p.category, c)
      }
      setCats([...map.values()].sort((a, b) => b.count - a.count).slice(0, 4))
    })
  }, [])

  if (cats.length < 2) return null

  return (
    <section className="vs-section" style={{ paddingTop: 24 }} aria-labelledby="cat-title">
      <div className="vs-container">
        <div className="vs-section-head">
          <div>
            <span className="vs-eyebrow">Catégories</span>
            <h2 id="cat-title" className="vs-h2" style={{ marginTop: 10 }}>Acheter par catégorie</h2>
          </div>
          <a href="/catalogue" className="vs-btn vs-btn--ghost vs-btn--sm">Tout le catalogue</a>
        </div>

        <div className="vs-cat-grid">
          {cats.map((c, i) => (
            <motion.a key={c.name} href={`/catalogue?cat=${encodeURIComponent(c.name)}`} className="vs-cat"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}>
              {c.img && <img src={c.img} alt="" loading="lazy" />}
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(11,11,16,0.92) 100%)' }} />
              <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 4vw, 18px)', fontWeight: 600, lineHeight: 1.2 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>{c.count} produit{c.count > 1 ? 's' : ''}</div>
                </div>
                <span aria-hidden="true" className="vs-hide-xs" style={{ width: 36, height: 36, borderRadius: 99, background: 'var(--color-gold)', color: 'var(--color-on-gold)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <ArrowUpRight size={18} />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  )
}
