import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Search, Package, Upload, Image } from 'lucide-react'
import { getCatStyle } from '../../lib/catColors.js'
import AdminDropdown from '../components/AdminDropdown.jsx'

const BASE  = '/api'
const h     = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })
const hAuth = () => ({ Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const empty = { name: '', description: '', price: '', category: '', stock: '', images: [] }

const ANIM_STYLE = `
@keyframes rowIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

export default function Products() {
  const [products,    setProducts]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [modal,       setModal]       = useState(null)
  const [form,        setForm]        = useState(empty)
  const [busy,        setBusy]        = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [catFilter,   setCatFilter]   = useState('all')
  const [search,      setSearch]      = useState('')

  /* Image upload state */
  const [imageFile,    setImageFile]    = useState(null)   // File sélectionné
  const [imagePreview, setImagePreview] = useState(null)   // URL blob local
  const [uploading,    setUploading]    = useState(false)
  const [dragOver,     setDragOver]     = useState(false)
  const fileInputRef = useRef(null)

  const load = () =>
    fetch(`${BASE}/admin/products`, { headers: h() }).then(r => r.json()).then(setProducts)

  const loadCats = () =>
    fetch(`${BASE}/admin/categories`, { headers: h() }).then(r => r.json()).then(setCategories).catch(() => {})

  useEffect(() => { load(); loadCats() }, [])

  const openAdd = () => {
    setForm(empty); setModal('add'); setMsg(null)
    setImageFile(null); setImagePreview(null)
  }
  const openEdit = (p) => {
    setForm({ ...p, price: p.price, stock: p.stock, images: p.images || [] })
    setModal(p); setMsg(null)
    setImageFile(null)
    /* Pré-charger l'image existante */
    const arr = Array.isArray(p.images) ? p.images : []
    setImagePreview(arr[0]?.src || null)
  }
  const closeModal = () => {
    setModal(null)
    if (imagePreview && imageFile) URL.revokeObjectURL(imagePreview)
    setImageFile(null); setImagePreview(null); setMsg(null)
  }

  /* Sélection fichier */
  const selectFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (imageFile) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [imageFile, imagePreview])

  const onFileInput = (e) => selectFile(e.target.files[0])
  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    selectFile(e.dataTransfer.files[0])
  }

  /* Upload + save */
  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      /* 1 — Upload image si nouveau fichier */
      let images = form.images
      if (imageFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('image', imageFile)
        const up = await fetch(`${BASE}/admin/upload`, { method: 'POST', headers: hAuth(), body: fd })
        const upData = await up.json()
        setUploading(false)
        if (!up.ok) throw new Error(upData.error || 'Erreur upload')
        images = [{ src: upData.src }]
      }

      /* 2 — Sauvegarder l'article */
      const body   = { ...form, price: Number(form.price), stock: Number(form.stock), images }
      const url    = modal === 'add' ? `${BASE}/admin/products` : `${BASE}/admin/products/${modal.id}`
      const method = modal === 'add' ? 'POST' : 'PUT'
      const res  = await fetch(url, { method, headers: h(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ type: 'ok', text: modal === 'add' ? 'Article ajouté !' : 'Article mis à jour !' })
      await load(); await loadCats()
      setTimeout(() => closeModal(), 1200)
    } catch (err) {
      setUploading(false)
      setMsg({ type: 'err', text: err.message })
    } finally { setBusy(false) }
  }

  const archive = async (id) => {
    if (!confirm('Archiver cet article ?')) return
    await fetch(`${BASE}/admin/products/${id}`, { method: 'DELETE', headers: h() })
    load()
  }

  const active   = products.filter(p => p.active)
  const archived = products.filter(p => !p.active)
  const cats     = ['all', ...categories.filter(c => products.some(p => p.category === c))]
  const filtered = products
    .filter(p => catFilter === 'all' || p.category === catFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  /* Image existante dans le formulaire (si pas de nouveau fichier) */
  const existingImg = (() => {
    try {
      const arr = Array.isArray(form.images) ? form.images : JSON.parse(form.images || '[]')
      return arr[0]?.src || null
    } catch { return null }
  })()

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
        {cats.map(c => {
          const s       = c === 'all' ? null : getCatStyle(c)
          const active  = catFilter === c
          return (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background:  active ? (s ? s.bg   : 'rgba(255,153,0,0.12)') : 'rgba(255,255,255,0.03)',
                borderColor: active ? (s ? s.border : 'rgba(255,153,0,0.3)') : 'rgba(255,255,255,0.08)',
                color:       active ? (s ? s.color  : '#FF9900')             : 'rgba(240,240,245,0.45)',
              }}>
              {c === 'all' ? `Tous (${products.length})` : `${c} (${products.filter(p => p.category === c).length})`}
            </button>
          )
        })}
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

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['Article', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Actions'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col}</th>
              ))}
            </tr>
          </thead>
        </table>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: p.active ? 1 : 0.45, animation: 'rowIn 0.3s ease both', animationDelay: `${Math.min(i * 30, 300)}ms`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 600, color: '#f0f0f5', width: '30%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ThumbImg images={p.images} name={p.name} category={p.category} />
                      {p.name}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: 'rgba(240,240,245,0.5)' }}>{p.category || '—'}</td>
                  <td style={{ padding: '13px 16px', color: '#fbbf24', fontWeight: 700 }}>Ar {Number(p.price).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontWeight: 700, color: p.stock <= 5 ? '#ef4444' : p.stock <= 15 ? '#f59e0b' : '#22c55e' }}>{p.stock}</span>
                    {p.stock <= 5 && <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444', fontWeight: 700 }}>RUPTURE</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: p.active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: p.active ? '#22c55e' : 'rgba(240,240,245,0.3)', border: `1px solid ${p.active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                      {p.active ? 'Actif' : 'Archivé'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(p)} style={btnIcon} title="Modifier"><Pencil size={13} /></button>
                      {p.active && <button onClick={() => archive(p.id)} style={{ ...btnIcon, color: '#f87171' }} title="Archiver"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              <Package size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>{search ? `Aucun article pour « ${search} »` : products.length === 0 ? 'Aucun article — clique sur "Ajouter un article"' : 'Aucun article dans cette catégorie'}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ───────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: '#0f0f1f', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'rowIn 0.2s ease' }}>

            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f5' }}>
                {modal === 'add' ? 'Nouvel article' : `Modifier · ${modal.name}`}
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.4)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* ── Zone image ────────────────────────────── */}
              <div>
                <label style={labelStyle}>Image du produit</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileInput} style={{ display: 'none' }} />

                {imagePreview ? (
                  /* Prévisualisation */
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', aspectRatio: '16/9', background: '#0a0a18' }}>
                    <img src={imagePreview} alt="aperçu"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    {/* Overlay boutons */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)'; e.currentTarget.style.opacity = 1 }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = 0 }}>
                      <button type="button" onClick={() => fileInputRef.current.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'rgba(255,153,0,0.9)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        <Upload size={13} /> Changer
                      </button>
                      <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        <X size={13} /> Supprimer
                      </button>
                    </div>
                    {/* Badge source */}
                    <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: imageFile ? 'rgba(255,153,0,0.85)' : 'rgba(255,255,255,0.15)', color: '#fff' }}>
                      {imageFile ? 'Nouveau fichier' : 'Image actuelle'}
                    </div>
                  </div>
                ) : (
                  /* Drop zone */
                  <div
                    onClick={() => fileInputRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    style={{
                      border: `2px dashed ${dragOver ? 'rgba(255,153,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                      background: dragOver ? 'rgba(255,153,0,0.05)' : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.2s',
                    }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={20} color="#FF9900" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5', marginBottom: 4 }}>
                          Glisser une image ici
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)' }}>
                          ou <span style={{ color: '#FF9900', fontWeight: 600 }}>parcourir</span> — JPG, PNG, WebP, AVIF · max 5 Mo
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Champs texte */}
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
              <CategoryPicker
                value={form.category}
                categories={categories}
                onChange={cat => setForm(f => ({ ...f, category: cat }))}
              />

              {/* Message */}
              {msg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: msg.type === 'ok' ? '#22c55e' : '#f87171', background: msg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 9, padding: '8px 12px' }}>
                  {msg.type === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {msg.text}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={closeModal}
                  style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(240,240,245,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Annuler
                </button>
                <button type="submit" disabled={busy}
                  style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
                  {uploading ? '📤 Upload…' : busy ? '…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* Miniature dans le tableau */
function ThumbImg({ images, name, category }) {
  const [err, setErr] = useState(false)
  const s = getCatStyle(category)
  let src = null
  try {
    const arr = typeof images === 'string' ? JSON.parse(images) : images
    src = arr?.[0]?.src || null
  } catch {}
  if (!src || err) {
    return (
      <div style={{ width: 32, height: 32, borderRadius: 7, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Package size={14} color={s.color} />
      </div>
    )
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'cover', flexShrink: 0, border: `1px solid ${s.border}` }} />
  )
}

function FRow({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 12px' }}>{children}</div>
    </div>
  )
}

/* ── Dropdown catégorie — wrapper de AdminDropdown ───────── */
function CategoryPicker({ value, categories, onChange }) {
  const [showNew, setShowNew] = useState(false)
  const [newCat,  setNewCat]  = useState('')

  const options = [
    { value: '', label: '— Aucune catégorie —', dim: true },
    ...(categories.length > 0 ? [{ separator: true }] : []),
    ...categories.map(c => ({ value: c, label: c })),
  ]

  const footer = (close) => {
    const confirm = () => {
      const trimmed = newCat.trim()
      if (!trimmed) return
      onChange(trimmed)
      setNewCat(''); setShowNew(false); close()
    }
    return showNew ? (
      <div style={{ display: 'flex', gap: 6, padding: 10 }}>
        <input autoFocus value={newCat} onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm() } if (e.key === 'Escape') setShowNew(false) }}
          placeholder="Nom de la catégorie…"
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#f0f0f5', outline: 'none', fontFamily: 'inherit' }} />
        <button type="button" onClick={confirm}
          style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,153,0,0.15)', border: '1px solid rgba(255,153,0,0.3)', color: '#FF9900', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          <Check size={13} />
        </button>
        <button type="button" onClick={() => { setShowNew(false); setNewCat('') }}
          style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,240,245,0.4)', cursor: 'pointer' }}>
          <X size={13} />
        </button>
      </div>
    ) : (
      <button type="button" onClick={() => setShowNew(true)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF9900', fontSize: 12, fontWeight: 600 }}>
        <Plus size={13} /> Nouvelle catégorie…
      </button>
    )
  }

  return (
    <AdminDropdown
      label="Catégorie"
      value={value}
      options={options}
      onChange={onChange}
      placeholder="— Choisir —"
      onOpen={() => setShowNew(false)}
      footer={footer}
    />
  )
}

const labelStyle = { fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }
const inp        = { width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', fontFamily: 'inherit', boxSizing: 'border-box' }
const btnPrimary = { display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg, #FF9900, #CC5500)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }
const btnIcon    = { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '6px', cursor: 'pointer', color: 'rgba(240,240,245,0.6)', transition: 'all 0.15s' }
