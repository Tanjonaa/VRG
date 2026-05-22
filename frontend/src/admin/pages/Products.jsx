import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Search, Package } from 'lucide-react'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const CATEGORIES = ['Ventilateur', 'Finger Sleeve', 'Câble', 'Manette', 'Accessoire', 'Autre']

const empty = { name: '', description: '', price: '', category: '', stock: '', images: [] }

/* Row entrance animation injected once */
const ANIM_STYLE = `
@keyframes rowIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

export default function Products() {
  const [products, setProducts] = useState([])
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(empty)
  const [busy, setBusy]         = useState(false)
  const [msg, setMsg]           = useState(null)
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch]       = useState('')

  const load = () =>
    fetch(`${BASE}/admin/products`, { headers: h() }).then(r => r.json()).then(setProducts)
  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(empty); setModal('add'); setMsg(null) }
  const openEdit = (p) => {
    setForm({ ...p, price: p.price, stock: p.stock, images: p.images || [] })
    setModal(p); setMsg(null)
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock) }
      const url    = modal === 'add' ? `${BASE}/admin/products` : `${BASE}/admin/products/${modal.id}`
      const method = modal === 'add' ? 'POST' : 'PUT'
      const res  = await fetch(url, { method, headers: h(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ type: 'ok', text: modal === 'add' ? 'Article ajouté !' : 'Article mis à jour !' })
      await load()
      setTimeout(() => { setModal(null); setMsg(null) }, 1200)
    } catch (err) { setMsg({ type: 'err', text: err.message }) }
    finally { setBusy(false) }
  }

  const archive = async (id) => {
    if (!confirm('Archiver cet article ?')) return
    await fetch(`${BASE}/admin/products/${id}`, { method: 'DELETE', headers: h() })
    load()
  }

  /* Derived lists */
  const active   = products.filter(p => p.active)
  const archived = products.filter(p => !p.active)

  const cats = ['all', ...CATEGORIES.filter(c =>
    products.some(p => p.category === c)
  )]

  const filtered = products
    .filter(p => catFilter === 'all' || p.category === catFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <style>{ANIM_STYLE}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.4)' }}>
          {active.length} actifs · {archived.length} archivés · {filtered.length} affichés
        </div>
        <button onClick={openAdd} style={btnPrimary}>
          <Plus size={15} /> Ajouter un article
        </button>
      </div>

      {/* Category filter + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              background: catFilter === c ? 'rgba(255,153,0,0.12)' : 'rgba(255,255,255,0.03)',
              borderColor: catFilter === c ? 'rgba(255,153,0,0.3)' : 'rgba(255,255,255,0.08)',
              color: catFilter === c ? '#FF9900' : 'rgba(240,240,245,0.45)',
            }}>
            {c === 'all' ? `Tous (${products.length})` : `${c} (${products.filter(p => p.category === c).length})`}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '7px 12px' }}>
          <Search size={13} color="rgba(240,240,245,0.3)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', width: 150, fontFamily: 'inherit' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.3)', display: 'flex', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table with scrollable body */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Fixed header */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['Article', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Actions'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col}</th>
              ))}
            </tr>
          </thead>
        </table>

        {/* Scrollable rows */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    opacity: p.active ? 1 : 0.45,
                    animation: `rowIn 0.3s ease both`,
                    animationDelay: `${Math.min(i * 30, 300)}ms`,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 600, color: '#f0f0f5', width: '30%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ThumbImg images={p.images} name={p.name} />
                      {p.name}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: 'rgba(240,240,245,0.5)' }}>{p.category || '—'}</td>
                  <td style={{ padding: '13px 16px', color: '#fbbf24', fontWeight: 700 }}>
                    Ar {Number(p.price).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontWeight: 700, color: p.stock <= 5 ? '#ef4444' : p.stock <= 15 ? '#f59e0b' : '#22c55e' }}>
                      {p.stock}
                    </span>
                    {p.stock <= 5 && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444', fontWeight: 700 }}>RUPTURE</span>
                    )}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                      background: p.active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                      color: p.active ? '#22c55e' : 'rgba(240,240,245,0.3)',
                      border: `1px solid ${p.active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                      {p.active ? 'Actif' : 'Archivé'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(p)} style={btnIcon} title="Modifier"><Pencil size={13} /></button>
                      {p.active && (
                        <button onClick={() => archive(p.id)} style={{ ...btnIcon, color: '#f87171' }} title="Archiver">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              <Package size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>
                {search
                  ? `Aucun article pour « ${search} »`
                  : products.length === 0
                    ? 'Aucun article — clique sur "Ajouter un article"'
                    : 'Aucun article dans cette catégorie'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#0f0f1f', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'rowIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f5' }}>
                {modal === 'add' ? 'Nouvel article' : `Modifier · ${modal.name}`}
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.4)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FRow label="Nom *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inp} placeholder="ex: Ventilateur Turbo" />
              </FRow>
              <FRow label="Description">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Description courte du produit" />
              </FRow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FRow label="Prix (Ar) *">
                  <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" min="0" required style={inp} placeholder="5000" />
                </FRow>
                <FRow label="Stock *">
                  <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} type="number" min="0" required style={inp} placeholder="20" />
                </FRow>
              </div>
              <FRow label="Catégorie">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, background: 'rgba(255,255,255,0.04)' }}>
                  <option value="">— Choisir —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FRow>

              {msg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12,
                  color: msg.type === 'ok' ? '#22c55e' : '#f87171',
                  background: msg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: 9, padding: '8px 12px' }}>
                  {msg.type === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {msg.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setModal(null)}
                  style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(240,240,245,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Annuler
                </button>
                <button type="submit" disabled={busy} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
                  {busy ? '…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* Thumbnail from images JSON field */
function ThumbImg({ images, name }) {
  const [err, setErr] = useState(false)
  let src = null
  try {
    const arr = typeof images === 'string' ? JSON.parse(images) : images
    src = arr?.[0]?.src || null
  } catch {}

  if (!src || err) {
    return (
      <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Package size={14} color="rgba(255,153,0,0.5)" />
      </div>
    )
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }} />
  )
}

function FRow({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 12px' }}>{children}</div>
    </div>
  )
}

const inp = { width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', fontFamily: 'inherit', boxSizing: 'border-box' }
const btnPrimary = { display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg, #FF9900, #CC5500)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }
const btnIcon = { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '6px', cursor: 'pointer', color: 'rgba(240,240,245,0.6)', transition: 'all 0.15s' }
