/* Helpers produit partagés par la vitrine (accueil) — même logique que le catalogue */

/* images arrive soit en chaîne JSON (API admin), soit déjà parsé (API publique) */
export function parseImages(raw) {
  if (Array.isArray(raw)) return raw
  try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}

export const firstImage = (p) => parseImages(p?.images)[0]?.src || null

export const isPromo = (p) => Number(p?.promo_active) === 1 && Number(p?.promo_percent) > 0

export const finalPrice = (p) =>
  isPromo(p) ? Math.round(p.price * (1 - p.promo_percent / 100)) : Number(p.price)

const WEEK = 7 * 86400000
export const isNew = (p) => !!p?.created_at && Date.now() - new Date(p.created_at).getTime() < WEEK

export const fmtAr = (n) => `${Number(n || 0).toLocaleString('fr-FR')} Ar`

/* Objet panier — identique au catalogue (prix promo appliqué) */
export function toCartItem(p) {
  const promo = isPromo(p)
  return {
    id:             p.id,
    name:           p.name,
    price:          finalPrice(p),
    original_price: promo ? p.price : null,
    promo_percent:  promo ? p.promo_percent : null,
    image:          firstImage(p),
    images:         p.images,
  }
}

/* Liste des produits publics — un seul fetch partagé par toutes les sections */
let _products = null
export function fetchProducts() {
  if (!_products) {
    _products = fetch('/api/products')
      .then(r => r.json())
      .then(d => (Array.isArray(d) ? d : []))
      .catch(() => { _products = null; return [] })
  }
  return _products
}

export function parseJSONSetting(raw, fallback) {
  try { return raw ? { ...fallback, ...JSON.parse(raw) } : fallback } catch { return fallback }
}
