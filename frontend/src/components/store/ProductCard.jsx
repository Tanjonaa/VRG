import React, { useState } from 'react'
import { ShoppingBag, Check, Package } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'
import { firstImage, isPromo, isNew, finalPrice, fmtAr, toCartItem } from '../../lib/product.js'

/* Carte produit de la vitrine : toute la carte ouvre la fiche (/produit/:id),
   le bouton ajoute au panier sans quitter la page. */
/* onView / onAdd optionnels : le catalogue ouvre la fiche en place (modale)
   et gère l'ajout lui-même ; sans eux, lien vers /produit/:id + panier direct. */
export default function ProductCard({ product, onView, onAdd }) {
  const { addItem, items } = useCart()
  const [added, setAdded] = useState(false)
  const [imgErr, setImgErr] = useState(false)

  const img    = firstImage(product)
  const promo  = isPromo(product)
  const out    = Number(product.stock) <= 0
  const low    = !out && Number(product.stock) <= 5
  const inCart = items.some(i => i.id === product.id)

  const handleAdd = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (out) return
    if (onAdd) onAdd(product)
    else addItem(toCartItem(product))
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <article className="vs-card">
      <div className="vs-card__media">
        {img && !imgErr ? (
          <img src={img} alt={product.name} loading="lazy" decoding="async" onError={() => setImgErr(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--color-subtle)' }}>
            <Package size={40} strokeWidth={1.4} aria-hidden="true" />
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {promo && <span className="vs-badge vs-badge--promo">-{product.promo_percent}%</span>}
          {!promo && isNew(product) && <span className="vs-badge vs-badge--new">Nouveau</span>}
        </div>
        {out && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,11,16,0.55)', display: 'grid', placeItems: 'center' }}>
            <span className="vs-badge vs-badge--out">Rupture de stock</span>
          </div>
        )}
      </div>

      <div className="vs-card__body">
        {product.category && <span className="vs-card__cat">{product.category}</span>}
        <h3 className="vs-card__name" style={{ margin: 0 }}>
          {/* Lien étendu : son ::after couvre toute la carte */}
          <a href={`/produit/${product.id}`} className="vs-card__link"
            onClick={onView ? (e) => { e.preventDefault(); onView(product) } : undefined}>{product.name}</a>
        </h3>

        <div className="vs-price">
          <span className={`vs-price__now${promo ? ' vs-price__now--promo' : ''}`}>{fmtAr(finalPrice(product))}</span>
          {promo && <span className="vs-price__old">{fmtAr(product.price)}</span>}
        </div>

        <span className={`vs-stock${out ? ' vs-stock--out' : low ? ' vs-stock--low' : ''}`}>
          {out ? 'Indisponible' : low ? `Plus que ${product.stock} en stock` : 'En stock'}
        </span>

        <button type="button" onClick={handleAdd} disabled={out}
          className={`vs-btn vs-btn--sm vs-btn--block ${added || inCart ? 'vs-btn--added' : 'vs-btn--secondary'}`}
          style={{ marginTop: 8, position: 'relative', zIndex: 1 }}
          aria-label={out ? 'Produit indisponible' : `Ajouter ${product.name} au panier`}>
          {added || inCart ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
          {out ? 'Indisponible' : added ? 'Ajouté' : inCart ? 'Dans le panier' : <span>Ajouter<span className="vs-hide-xs"> au panier</span></span>}
        </button>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="vs-card" aria-hidden="true">
      <div className="vs-card__media vs-skeleton" />
      <div className="vs-card__body">
        <div className="vs-skeleton" style={{ height: 10, width: '35%', borderRadius: 4 }} />
        <div className="vs-skeleton" style={{ height: 14, width: '85%', borderRadius: 4, marginTop: 4 }} />
        <div className="vs-skeleton" style={{ height: 18, width: '45%', borderRadius: 4, marginTop: 8 }} />
        <div className="vs-skeleton" style={{ height: 40, width: '100%', borderRadius: 10, marginTop: 12 }} />
      </div>
    </div>
  )
}
