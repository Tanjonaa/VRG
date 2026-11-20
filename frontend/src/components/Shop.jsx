import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from '../context/AuthContext.jsx'
import { CartProvider, useCart } from '../context/CartContext.jsx'
import { useSettings } from '../hooks/useSettings.js'
import CartPanel from './CartPanel.jsx'
import AuthModal from './AuthModal.jsx'
import SupportChat from './SupportChat.jsx'
import ComingSoon from './ComingSoon.jsx'
import AccountPanel from './AccountPanel.jsx'
import ProductCard, { ProductCardSkeleton } from './store/ProductCard.jsx'
import {
  X, Package, Truck, Wallet, ShieldCheck, Check, ShoppingBag, MessageCircle, Link2,
  Search, User, ChevronRight, ChevronDown, SlidersHorizontal, LayoutGrid, List, SearchX, ArrowRight,
} from 'lucide-react'
import { isPromo, finalPrice, fmtAr } from '../lib/product.js'

/* ─── helpers ─── */
const fmt = n => Number(n).toLocaleString('fr-FR')
/* images arrive soit en chaîne JSON (API admin), soit déjà parsé en tableau (API publique) */
const parse = raw => { if (Array.isArray(raw)) return raw; try { const a = JSON.parse(raw); return Array.isArray(a)?a:[] } catch { return [] } }

const AGO_MS = { '7d':7*86400000, '30d':30*86400000, '90d':90*86400000 }
const isNew7 = p => p.created_at && (Date.now() - new Date(p.created_at)) < AGO_MS['7d']
const filterByDate = (list, df) => {
  const sorted = [...list].sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
  if (df === 'all') return sorted
  const cutoff = Date.now() - AGO_MS[df]
  return sorted.filter(p => p.created_at && new Date(p.created_at) >= cutoff)
}

/* ══════════════════════════════════════════
   FICHE PRODUIT (modale)
══════════════════════════════════════════ */
function ProductModal({ product, onClose, onAdd }) {
  const [idx, setIdx]       = useState(0)
  const [added, setAdded]   = useState(false)
  const [copied, setCopied] = useState(false)
  const imgs  = parse(product?.images)
  const oos   = Number(product?.stock) <= 0
  const low   = !oos && Number(product?.stock) <= 5
  const promo = product ? isPromo(product) : false
  const price = product ? finalPrice(product) : 0

  const shareUrl  = `https://varygasy.net/produit/${product?.id}`
  const shareText = `${product?.name} · ${fmt(price)} Ar — ${shareUrl}`
  const copyLink = async () => {
    /* Partage natif sur mobile, copie du lien sinon */
    if (navigator.share) { try { await navigator.share({ title: product.name, url: shareUrl }) } catch {} ; return }
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }

  useEffect(() => { setIdx(0) }, [product])
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('vs-drawer-open')   // masque la bulle de chat
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = prev; document.body.classList.remove('vs-drawer-open') }
  }, [onClose])

  if (!product) return null

  const handleAdd = () => {
    onAdd(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <AnimatePresence>
      <motion.div className="vs-pm-backdrop" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="vs-pm" role="dialog" aria-modal="true" aria-labelledby="pm-title" tabIndex={-1}
          ref={el => el && !el.contains(document.activeElement) && el.focus({ preventScroll: true })}
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>

          <button type="button" className="vs-icon-btn vs-pm__close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>

          {/* Visuels */}
          <div className="vs-pm__media">
            <div className="vs-pm__main">
              {imgs[idx]?.src
                ? <>
                    {/* Fond flou (même photo) + photo entière par-dessus, jamais recadrée */}
                    <img src={imgs[idx].src} alt="" aria-hidden="true" className="vs-pm__blur" />
                    <img src={imgs[idx].src} alt={`${product.name} — ${product.category || 'accessoire gaming'} VaRyGasy`} className="vs-pm__photo" />
                  </>
                : <Package size={56} color="var(--color-subtle)" aria-hidden="true" />}
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
                {promo && <span className="vs-badge vs-badge--promo">-{product.promo_percent}%</span>}
                {oos && <span className="vs-badge vs-badge--out">Épuisé</span>}
              </div>
            </div>
            {imgs.length > 1 && (
              <div className="vs-pm__thumbs" role="group" aria-label="Photos du produit">
                {imgs.map((im, i) => (
                  <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`Photo ${i + 1}`} aria-pressed={i === idx}>
                    <img src={im.src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="vs-pm__body">
            {product.category && <span className="vs-card__cat">{product.category}</span>}
            <h2 id="pm-title" className="vs-pm__title">{product.name}</h2>

            <div className="vs-price" style={{ marginTop: 4 }}>
              <span className={`vs-price__now${promo ? ' vs-price__now--promo' : ''}`} style={{ fontSize: 28 }}>{fmt(price)} Ar</span>
              {promo && <span className="vs-price__old" style={{ fontSize: 15 }}>{fmt(product.price)} Ar</span>}
            </div>

            <span className={`vs-stock${oos ? ' vs-stock--out' : low ? ' vs-stock--low' : ''}`} style={{ fontSize: 13 }}>
              {oos ? 'Rupture de stock' : low ? `Plus que ${product.stock} en stock` : 'En stock · expédié sous 24 h'}
            </span>

            {product.description && <p className="vs-pm__desc">{product.description}</p>}

            <ul className="vs-pm__perks">
              <li><Truck size={16} aria-hidden="true" /> Livraison 24 h sur Antananarivo</li>
              <li><Wallet size={16} aria-hidden="true" /> Mobile money ou paiement à la livraison</li>
              <li><ShieldCheck size={16} aria-hidden="true" /> Retour sous 7 jours</li>
            </ul>

            <div className="vs-pm__actions">
              <button type="button" className={`vs-btn vs-btn--block ${added ? 'vs-btn--added' : 'vs-btn--primary'}`}
                onClick={handleAdd} disabled={oos} style={{ minHeight: 52 }}>
                {added ? <><Check size={18} /> Ajouté au panier</> : oos ? 'Indisponible' : <><ShoppingBag size={18} /> Ajouter au panier</>}
              </button>
              <div className="vs-pm__share">
                <span>Partager</span>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="vs-textbtn">
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                </a>
                <button type="button" onClick={copyLink} className="vs-textbtn" aria-live="polite">
                  {copied ? <><Check size={16} aria-hidden="true" /> Lien copié</> : <><Link2 size={16} aria-hidden="true" /> Copier le lien</>}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ══════════════════════════════════════════
   EN-TÊTE BOUTIQUE
══════════════════════════════════════════ */
const TABS = [
  { id: 'catalogue',  label: 'Catalogue' },
  { id: 'nouveautes', label: 'Nouveautés' },
  { id: 'promos',     label: 'Promotions' },
]

function ShopHeader({ search, setSearch, onOpenAuth, onOpenCart, navTab, setNavTab, counts }) {
  const { user }  = useAuth()
  const { count } = useCart()
  return (
    <header className="vs-sh">
      <div className="vs-container vs-sh__bar">
        <a href="/" className="vs-sh__logo" aria-label="VaRyGasy — accueil">
          <img src="/images/logo/logo.svg" alt="VaRyGasy" width="110" height="40" />
        </a>

        <nav className="vs-sh__tabs" aria-label="Rayons de la boutique">
          {TABS.map(t => (
            <button key={t.id} type="button" className="vs-sh__tab"
              aria-current={navTab === t.id ? 'page' : undefined} onClick={() => setNavTab(t.id)}>
              {t.label}
              {counts[t.id] > 0 && (
                <span className={`vs-sh__count${t.id === 'promos' ? ' vs-sh__count--promo' : ''}`}>{counts[t.id]}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="vs-field vs-sh__search">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit…" aria-label="Rechercher un produit" />
          {search && (
            <button type="button" className="vs-sh__clear" onClick={() => setSearch('')} aria-label="Effacer la recherche">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="vs-sh__actions">
          <button type="button" className="vs-icon-btn" onClick={onOpenAuth} aria-label={user ? 'Mon compte' : 'Se connecter'}>
            <User size={20} />
          </button>
          <button type="button" className="vs-icon-btn" onClick={onOpenCart}
            aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }} className="vs-sh__badge" aria-hidden="true">
                {count}
              </motion.span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

/* ══════════════════════════════════════════
   EN-TÊTE DE PAGE (fil d'Ariane + titre)
══════════════════════════════════════════ */
function PageHead({ crumbs, title, sub }) {
  return (
    <div className="vs-ph">
      <nav className="vs-ph__crumbs" aria-label="Fil d'Ariane">
        <a href="/">Accueil</a>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={14} aria-hidden="true" />
            {c.onClick && i < crumbs.length - 1
              ? <button type="button" onClick={c.onClick}>{c.label}</button>
              : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}
          </React.Fragment>
        ))}
      </nav>
      <h1 className="vs-ph__title">{title}</h1>
      {sub && <p className="vs-ph__sub">{sub}</p>}
    </div>
  )
}

/* ══════════════════════════════════════════
   FILTRES (colonne desktop + tiroir mobile)
══════════════════════════════════════════ */
function FilterPanel({ cats, total, active, setActive, price, setPrice, priceCeil, inStock, setInStock, dirty, onReset, bare }) {
  const value = price ?? priceCeil
  const pct   = priceCeil ? Math.round((value / priceCeil) * 100) : 100
  const step  = priceCeil > 100000 ? 5000 : 1000
  return (
    <div className={`vs-fp${bare ? ' vs-fp--bare' : ''}`}>
      {!bare && (
        <div className="vs-fp__head">
          <h2 className="vs-fp__title"><SlidersHorizontal size={16} aria-hidden="true" /> Filtres</h2>
          {dirty && <button type="button" className="vs-textbtn vs-textbtn--gold" onClick={onReset}>Réinitialiser</button>}
        </div>
      )}

      <section className="vs-fp__sec" aria-labelledby="fp-cat">
        <h3 id="fp-cat" className="vs-fp__label">Catégorie</h3>
        <ul className="vs-fp__list">
          <li>
            <button type="button" className="vs-fp__opt" aria-pressed={active === null} onClick={() => setActive(null)}>
              <span>Tous les produits</span><span className="vs-fp__n">{total}</span>
            </button>
          </li>
          {cats.map(c => (
            <li key={c.name}>
              <button type="button" className="vs-fp__opt" aria-pressed={active === c.name} onClick={() => setActive(c.name)}>
                <span>{c.name}</span><span className="vs-fp__n">{c.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="vs-fp__sec">
        <div className="vs-fp__row">
          <h3 id="fp-price" className="vs-fp__label">Prix maximum</h3>
          <span className="vs-fp__val">{price == null ? 'Tous les prix' : fmtAr(price)}</span>
        </div>
        <input type="range" className="vs-range" min={0} max={priceCeil} step={step} value={value}
          onChange={e => { const v = Number(e.target.value); setPrice(v >= priceCeil ? null : v) }}
          aria-labelledby="fp-price" aria-valuetext={price == null ? 'Tous les prix' : fmtAr(price)}
          style={{ '--pct': `${pct}%` }} />
        <div className="vs-fp__scale"><span>0 Ar</span><span>{fmtAr(priceCeil)}</span></div>
      </section>

      <section className="vs-fp__sec">
        <label className="vs-switch">
          <span>
            <span className="vs-fp__swlabel">En stock uniquement</span>
            <span className="vs-fp__hint">Masquer les produits épuisés</span>
          </span>
          <input type="checkbox" role="switch" checked={inStock} onChange={e => setInStock(e.target.checked)} />
          <span className="vs-switch__track" aria-hidden="true" />
        </label>
      </section>
    </div>
  )
}

function FilterDrawer({ open, onClose, resultCount, ...panel }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => e.key === 'Escape' && onClose()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('vs-drawer-open')
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.body.classList.remove('vs-drawer-open'); window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="vs-sheet-backdrop" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="vs-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
            <div className="vs-sheet__handle" aria-hidden="true" />
            <div className="vs-sheet__head">
              <h2 id="sheet-title">Filtres</h2>
              <button type="button" className="vs-icon-btn" onClick={onClose} aria-label="Fermer les filtres" autoFocus>
                <X size={20} />
              </button>
            </div>
            <div className="vs-sheet__body"><FilterPanel {...panel} bare /></div>
            <div className="vs-sheet__foot">
              {panel.dirty && <button type="button" className="vs-btn vs-btn--ghost" onClick={panel.onReset}>Réinitialiser</button>}
              <button type="button" className="vs-btn vs-btn--primary" style={{ flex: 1 }} onClick={onClose}>
                Voir {resultCount} produit{resultCount !== 1 ? 's' : ''}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ══════════════════════════════════════════
   BARRE D'OUTILS (nombre, filtres actifs, tri, vue)
══════════════════════════════════════════ */
function ViewToggle({ view, setView }) {
  return (
    <div className="vs-seg" role="group" aria-label="Affichage">
      <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="Grille"><LayoutGrid size={16} /></button>
      <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="Liste"><List size={16} /></button>
    </div>
  )
}

function Toolbar({ count, chips = [], sort, setSort, view, setView, onFilter, filterCount = 0 }) {
  return (
    <div className="vs-tb">
      <div className="vs-tb__left">
        <p className="vs-tb__count"><strong>{count}</strong> produit{count !== 1 ? 's' : ''}</p>
        {chips.length > 0 && (
          <ul className="vs-tb__chips" aria-label="Filtres actifs">
            {chips.map(c => (
              <li key={c.key}>
                <button type="button" className="vs-fchip" onClick={c.clear} aria-label={`Retirer le filtre ${c.label}`}>
                  {c.label} <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="vs-tb__right">
        {onFilter && (
          <button type="button" className="vs-btn vs-btn--ghost vs-btn--sm vs-tb__filter" onClick={onFilter}>
            <SlidersHorizontal size={16} aria-hidden="true" /> Filtres
            {filterCount > 0 && <span className="vs-tb__fc">{filterCount}</span>}
          </button>
        )}
        {setSort && (
          <label className="vs-select">
            <span className="vs-sr">Trier par</span>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="default">Recommandés</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="name">Nom (A → Z)</option>
              <option value="stock">Disponibilité</option>
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
        )}
        {setView && <ViewToggle view={view} setView={setView} />}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   LISTE DE PRODUITS (grille ou lignes)
══════════════════════════════════════════ */
function ProductRow({ product: p, onAdd, onView }) {
  const { items } = useCart()
  const img   = parse(p.images)[0]?.src
  const promo = isPromo(p)
  const out   = Number(p.stock) <= 0
  const low   = !out && Number(p.stock) <= 5
  const inCart = items.some(i => i.id === p.id)
  return (
    <article className="vs-li">
      <div className="vs-li__media">
        {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <Package size={28} strokeWidth={1.4} aria-hidden="true" />}
        {promo && <span className="vs-badge vs-badge--promo vs-li__badge">-{p.promo_percent}%</span>}
      </div>
      <div className="vs-li__body">
        {p.category && <span className="vs-card__cat">{p.category}</span>}
        <h3 className="vs-li__name">
          <a href={`/produit/${p.id}`} className="vs-card__link" onClick={e => { e.preventDefault(); onView(p) }}>{p.name}</a>
        </h3>
        {p.description && <p className="vs-li__desc">{p.description}</p>}
        <span className={`vs-stock${out ? ' vs-stock--out' : low ? ' vs-stock--low' : ''}`}>
          {out ? 'Indisponible' : low ? `Plus que ${p.stock} en stock` : 'En stock'}
        </span>
      </div>
      <div className="vs-li__side">
        <div className="vs-price vs-li__price">
          <span className={`vs-price__now${promo ? ' vs-price__now--promo' : ''}`}>{fmtAr(finalPrice(p))}</span>
          {promo && <span className="vs-price__old">{fmtAr(p.price)}</span>}
        </div>
        <button type="button" className={`vs-btn vs-btn--sm ${inCart ? 'vs-btn--added' : 'vs-btn--primary'}`}
          disabled={out} onClick={() => onAdd(p)} style={{ position: 'relative', zIndex: 1 }}
          aria-label={out ? 'Produit indisponible' : `Ajouter ${p.name} au panier`}>
          {inCart ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
          {out ? 'Indisponible' : inCart ? 'Dans le panier' : 'Ajouter'}
        </button>
      </div>
    </article>
  )
}

function ProductList({ list, view, onAdd, onView }) {
  if (view === 'list') return (
    <div className="vs-plist">
      {list.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
          <ProductRow product={p} onAdd={onAdd} onView={onView} />
        </motion.div>
      ))}
    </div>
  )
  return (
    <div className="vs-pgrid">
      {list.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
          <ProductCard product={p} onAdd={onAdd} onView={onView} />
        </motion.div>
      ))}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="vs-pgrid" aria-busy="true" aria-label="Chargement des produits">
      {Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  )
}

function EmptyState({ title, text, action, onAction }) {
  return (
    <div className="vs-empty">
      <span className="vs-empty__icon"><SearchX size={26} aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && <button type="button" className="vs-btn vs-btn--secondary" onClick={onAction}>{action}</button>}
    </div>
  )
}

/* ══════════════════════════════════════════
   NOUVEAUTÉS
══════════════════════════════════════════ */
const DATE_FILTERS = [
  { id: '7d',  label: '7 derniers jours' },
  { id: '30d', label: '30 derniers jours' },
  { id: '90d', label: '3 derniers mois' },
  { id: 'all', label: 'Tout' },
]

function NouveautesView({ products, onAdd, onView, view, setView }) {
  const [df, setDf] = useState('30d')
  const list = filterByDate(products, df)
  return (
    <>
      <div className="vs-chiprow" role="group" aria-label="Période">
        {DATE_FILTERS.map(f => (
          <button key={f.id} type="button" className="vs-chip" aria-pressed={df === f.id} onClick={() => setDf(f.id)}>{f.label}</button>
        ))}
      </div>
      <Toolbar count={list.length} view={view} setView={setView} />
      {list.length === 0
        ? <EmptyState title="Aucun nouvel article sur cette période" text="Élargissez la période pour voir les arrivages précédents."
            action="Voir tous les articles" onAction={() => setDf('all')} />
        : <ProductList list={list} view={view} onAdd={onAdd} onView={onView} />}
    </>
  )
}

/* ══════════════════════════════════════════
   PROMOTIONS
══════════════════════════════════════════ */
function PromosView({ products, onAdd, onView, view, setView, onBrowse }) {
  const promos = products.filter(isPromo).sort((a, b) => b.promo_percent - a.promo_percent)
  if (promos.length === 0) return (
    <EmptyState title="Aucune promotion en cours" text="Revenez bientôt : nos offres apparaissent ici dès leur lancement."
      action="Parcourir le catalogue" onAction={onBrowse} />
  )
  return (
    <>
      <Toolbar count={promos.length} view={view} setView={setView} />
      <ProductList list={promos} view={view} onAdd={onAdd} onView={onView} />
    </>
  )
}

/* ══════════════════════════════════════════
   BARRE PANIER FLOTTANTE
══════════════════════════════════════════ */
function CartFloatBar({ onOpen }) {
  const { count, total } = useCart()
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div className="vs-cartbar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          <span className="vs-cartbar__n" aria-hidden="true">{count}</span>
          <div>
            <span className="vs-cartbar__label">{count} article{count > 1 ? 's' : ''} · Total</span>
            <strong>{fmtAr(total)}</strong>
          </div>
          <button type="button" className="vs-btn vs-btn--primary vs-btn--sm" onClick={onOpen}>
            Voir le panier <ArrowRight size={16} aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ══════════════════════════════════════════
   PAGE BOUTIQUE
══════════════════════════════════════════ */
const tabUrl = t => (t === 'catalogue' ? '/catalogue' : `/catalogue?tab=${t}`)

function ShopInner() {
  const { user } = useAuth()
  const { addItem } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  /* Liens profonds depuis l'accueil : ?tab=nouveautes|promos, ?cat=<catégorie>, ?q=<recherche> */
  const qs = new URLSearchParams(window.location.search)
  const [navTab, setNavTab]     = useState(() => ['nouveautes', 'promos'].includes(qs.get('tab')) ? qs.get('tab') : 'catalogue')
  const [active, setActive]     = useState(() => qs.get('cat') || null)
  const [price, setPrice]       = useState(null)          // null = pas de plafond
  const [inStock, setInStock]   = useState(false)
  const [sort, setSort]         = useState('default')
  const [view, setView]         = useState('grid')
  const [search, setSearch]     = useState(() => qs.get('q') || '')
  const [modal, setModal]       = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : []
      setProducts(list)
      setLoading(false)
      /* Arrivée directe via /produit/:id (lien partagé) → ouvre la fiche */
      const m = window.location.pathname.match(/^\/produit\/(\d+)/)
      if (m) {
        const p = list.find(x => x.id === Number(m[1]))
        if (p) setModal(p)
      }
    }).catch(() => setLoading(false))
  }, [])

  const goTab = t => {
    setNavTab(t)
    window.history.replaceState(null, '', tabUrl(t))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  /* Taper une recherche depuis Nouveautés/Promos ramène au catalogue */
  const onSearch = v => { setSearch(v); if (navTab !== 'catalogue') goTab('catalogue') }

  /* URL synchronisée avec la fiche ouverte : chaque produit est partageable */
  const openProduct  = (p) => { setModal(p); window.history.replaceState(null, '', `/produit/${p.id}`) }
  const closeProduct = () => { setModal(null); window.history.replaceState(null, '', tabUrl(navTab)) }

  const cats = Object.entries(
    products.reduce((a, p) => { if (p.category) a[p.category] = (a[p.category] || 0) + 1; return a }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  /* Plafond du curseur de prix : prix le plus élevé, arrondi au multiple de 5 000 supérieur */
  const priceCeil = Math.max(5000, Math.ceil(Math.max(0, ...products.map(finalPrice)) / 5000) * 5000)

  const newCount   = products.filter(isNew7).length
  const promoCount = products.filter(isPromo).length

  const q = search.trim().toLowerCase()
  const filtered = products
    .filter(p => !active || p.category === active)
    .filter(p => price == null || finalPrice(p) <= price)
    .filter(p => !inStock || Number(p.stock) > 0)
    .filter(p => !q || p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
    .sort((a, b) =>
      sort === 'price_asc'  ? finalPrice(a) - finalPrice(b) :
      sort === 'price_desc' ? finalPrice(b) - finalPrice(a) :
      sort === 'name'       ? a.name.localeCompare(b.name, 'fr') :
      sort === 'stock'      ? Number(b.stock) - Number(a.stock) : 0)

  const resetFilters = () => { setActive(null); setSearch(''); setInStock(false); setPrice(null) }
  const chips = [
    q       && { key: 'q',     label: `« ${search.trim()} »`,     clear: () => setSearch('') },
    active  && { key: 'cat',   label: active,                     clear: () => setActive(null) },
    price != null && { key: 'price', label: `≤ ${fmtAr(price)}`, clear: () => setPrice(null) },
    inStock && { key: 'stock', label: 'En stock',                 clear: () => setInStock(false) },
  ].filter(Boolean)
  const dirty = chips.length > 0

  const handleAdd = product => {
    const promoActive = Number(product.promo_active) === 1
    const unitPrice   = promoActive
      ? Math.round(product.price * (1 - product.promo_percent / 100))
      : product.price
    const imgs = parse(product.images)
    addItem({
      id:             product.id,
      name:           product.name,
      price:          unitPrice,
      original_price: promoActive ? product.price : null,
      promo_percent:  promoActive ? product.promo_percent : null,
      image:          imgs[0]?.src || null,
      images:         product.images,
    })
  }

  const panel = { cats, total: products.length, active, setActive, price, setPrice, priceCeil, inStock, setInStock, dirty, onReset: resetFilters }

  /* Titre de page selon l'onglet et les filtres */
  const maxPromo = promoCount ? Math.max(...products.filter(isPromo).map(p => Number(p.promo_percent))) : 0
  const head =
    navTab === 'nouveautes' ? { crumbs: [{ label: 'Boutique', onClick: () => goTab('catalogue') }, { label: 'Nouveautés' }], title: 'Nouveautés', sub: 'Les derniers accessoires arrivés en boutique, du plus récent au plus ancien.' } :
    navTab === 'promos'     ? { crumbs: [{ label: 'Boutique', onClick: () => goTab('catalogue') }, { label: 'Promotions' }], title: 'Promotions', sub: promoCount ? `${promoCount} offre${promoCount > 1 ? 's' : ''} en cours · jusqu'à -${maxPromo} %` : 'Nos offres du moment.' } :
    active                  ? { crumbs: [{ label: 'Boutique', onClick: () => setActive(null) }, { label: active }], title: active, sub: 'Accessoires gaming livrés sous 24 h à Antananarivo.' } :
                              { crumbs: [{ label: 'Boutique' }], title: q ? `Résultats pour « ${search.trim()} »` : 'Tous les produits', sub: 'Accessoires gaming livrés sous 24 h à Antananarivo · paiement mobile money ou à la livraison.' }

  return (
    <div className="vs-shop">
      <ShopHeader search={search} setSearch={onSearch}
        onOpenAuth={() => user ? setShowAccount(true) : setShowAuth(true)} onOpenCart={() => setShowCart(true)}
        navTab={navTab} setNavTab={goTab} counts={{ nouveautes: newCount, promos: promoCount }} />

      <main className="vs-container vs-shop__main">
        <PageHead {...head} />

        {navTab === 'catalogue' && (
          <div className="vs-cat-layout">
            <aside className="vs-cat-side" aria-label="Filtres"><FilterPanel {...panel} /></aside>
            <div style={{ minWidth: 0 }}>
              <Toolbar count={filtered.length} chips={chips} sort={sort} setSort={setSort} view={view} setView={setView}
                onFilter={() => setShowFilters(true)} filterCount={chips.filter(c => c.key !== 'q').length} />
              {loading ? <GridSkeleton /> : filtered.length === 0
                ? <EmptyState title="Aucun produit trouvé" text="Essayez un autre mot-clé ou retirez certains filtres."
                    action={dirty ? 'Réinitialiser les filtres' : null} onAction={resetFilters} />
                : <ProductList list={filtered} view={view} onAdd={handleAdd} onView={openProduct} />}
            </div>
          </div>
        )}

        {navTab === 'nouveautes' && (loading ? <GridSkeleton /> :
          <NouveautesView products={products} onAdd={handleAdd} onView={openProduct} view={view} setView={setView} />)}

        {navTab === 'promos' && (loading ? <GridSkeleton /> :
          <PromosView products={products} onAdd={handleAdd} onView={openProduct} view={view} setView={setView} onBrowse={() => goTab('catalogue')} />)}
      </main>

      <CartFloatBar onOpen={() => setShowCart(true)} />

      <AnimatePresence>
        {modal && <ProductModal product={modal} onClose={closeProduct} onAdd={handleAdd} />}
      </AnimatePresence>

      <CartPanel isOpen={showCart} onClose={() => setShowCart(false)} onOpenAuth={() => { setShowCart(false); setShowAuth(true) }} />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      <AccountPanel isOpen={showAccount} onClose={() => setShowAccount(false)} />

      <FilterDrawer open={showFilters} onClose={() => setShowFilters(false)} resultCount={filtered.length} {...panel} />
    </div>
  )
}

/* ─── Gate Coming Soon ─── */
function ComingSoonGate({ children }) {
  const settings = useSettings()
  const loaded = Object.keys(settings).length > 0
  if (!loaded) return <div style={{ height: '100dvh', background: 'var(--color-bg)' }} />
  if (settings.coming_soon === '1') return <ComingSoon settings={settings} />
  return children
}

/* ─── Root ─── */
export default function Shop() {
  return (
    <AuthProvider>
      <CartProvider>
        <ComingSoonGate>
          <ShopInner />
          <SupportChat />
        </ComingSoonGate>
      </CartProvider>
    </AuthProvider>
  )
}
