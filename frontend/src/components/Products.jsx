import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Package } from 'lucide-react'
import ProductCard, { ProductCardSkeleton } from './store/ProductCard.jsx'
import { fetchProducts } from '../lib/product.js'

const PER_VIEW = 8

/* « Nos produits » : sélection filtrable par catégorie, 8 produits max,
   le reste est dans le catalogue complet. */
export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [active, setActive]     = useState('all')

  useEffect(() => {
    fetchProducts().then(list => { setProducts(list); setLoading(false) })
  }, [])

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  /* En stock d'abord, puis le reste */
  const visible = products
    .filter(p => active === 'all' || p.category === active)
    .sort((a, b) => (Number(b.stock) > 0) - (Number(a.stock) > 0))
    .slice(0, PER_VIEW)

  return (
    <section id="produits" className="vs-section vs-section--alt" aria-labelledby="products-title">
      <div className="vs-container">
        <div className="vs-section-head">
          <div>
            <span className="vs-eyebrow">Boutique</span>
            <h2 id="products-title" className="vs-h2" style={{ marginTop: 10 }}>Nos produits populaires</h2>
          </div>
          <a href="/catalogue" className="vs-btn vs-btn--ghost vs-btn--sm">
            Voir tout <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>

        {categories.length > 1 && (
          <div className="vs-scroll-x" role="group" aria-label="Filtrer par catégorie" style={{ marginBottom: 28 }}>
            {[['all', 'Tout'], ...categories.map(c => [c, c])].map(([key, label]) => (
              <button key={key} type="button" className="vs-chip" aria-pressed={active === key} onClick={() => setActive(key)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="vs-grid-products">
            {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-muted)' }}>
            <Package size={44} strokeWidth={1.4} style={{ marginBottom: 12, opacity: 0.6 }} aria-hidden="true" />
            <p>Aucun produit disponible pour le moment.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={active} className="vs-grid-products"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              {visible.map(p => <ProductCard key={p.id} product={p} />)}
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && products.length > PER_VIEW && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <a href={active === 'all' ? '/catalogue' : `/catalogue?cat=${encodeURIComponent(active)}`} className="vs-btn vs-btn--secondary">
              Voir les {active === 'all' ? products.length : products.filter(p => p.category === active).length} produits <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
