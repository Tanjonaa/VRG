import React, { useState, useEffect } from 'react'
import { AlertTriangle, Package, Check, X, Plus, Trash2, Pencil } from 'lucide-react'
import { getCatStyle } from '../../lib/catColors.js'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const ANIM_STYLE = `
@keyframes rowIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

const EMPTY_FORM = { name: '', category: '', price: '', stock: '0', description: '' }

const btnPrimary = { display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg, #FF9900, #CC5500)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }
const btnIcon    = { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: 6, cursor: 'pointer', color: 'rgba(240,240,245,0.6)', transition: 'all 0.15s' }

export default function Stocks({ onAlertsChange }) {
  const [products, setProducts]   = useState([])
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(null)
  const [filter, setFilter]       = useState('all')
  const [deleting, setDeleting]   = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formBusy, setFormBusy]   = useState(false)

  const load = async () => {
    const data = await fetch(`${BASE}/admin/stocks`, { headers: h() }).then(r => r.json())
    setProducts(data)
    onAlertsChange?.(data.filter(p => p.stock <= 5 && p.active).length)
  }
  useEffect(() => { load() }, [])

  const saveStock = async (id) => {
    setSaving(id)
    await fetch(`${BASE}/admin/stocks/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ stock: Number(editing.value) }) })
    setEditing(null)
    await load()
    setSaving(null)
  }

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`Supprimer définitivement "${name}" ?`)) return
    setDeleting(id)
    await fetch(`${BASE}/admin/products/${id}/permanent`, { method: 'DELETE', headers: h() })
    await load()
    setDeleting(null)
  }

  const createProduct = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) { setFormError('Le nom est requis'); return }
    if (!form.price || isNaN(Number(form.price))) { setFormError('Prix invalide'); return }
    setFormBusy(true)
    try {
      const res = await fetch(`${BASE}/admin/products`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), price: Number(form.price), category: form.category.trim(), stock: Number(form.stock) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Erreur'); setFormBusy(false); return }
      await load()
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch (err) { setFormError(err.message) }
    setFormBusy(false)
  }

  const active   = products.filter(p => p.active)
  const inactive = products.filter(p => !p.active)
  const critical = active.filter(p => p.stock <= 5)
  const low      = active.filter(p => p.stock > 5 && p.stock <= 15)
  const ok       = active.filter(p => p.stock > 15)

  const filtered =
    filter === 'critical' ? critical :
    filter === 'low'      ? low :
    filter === 'ok'       ? ok :
    filter === 'inactive' ? inactive :
    active

  return (
    <div>
      <style>{ANIM_STYLE}</style>

      {critical.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '13px 16px', color: '#f87171', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          <AlertTriangle size={16} />
          {critical.length} article{critical.length > 1 ? 's' : ''} en rupture de stock — action requise
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.4)' }}>
          {active.length} actifs · {inactive.length} archivés · {filtered.length} affichés
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowModal(true) }} style={btnPrimary}>
          <Plus size={15} /> Nouvel article
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <SCard label="Rupture (≤5)"       value={critical.length}  color="#ef4444" onClick={() => setFilter(f => f === 'critical' ? 'all' : 'critical')} active={filter === 'critical'} />
        <SCard label="Stock faible (6-15)" value={low.length}       color="#f59e0b" onClick={() => setFilter(f => f === 'low'      ? 'all' : 'low')}      active={filter === 'low'} />
        <SCard label="Stock OK (>15)"      value={ok.length}        color="#22c55e" onClick={() => setFilter(f => f === 'ok'       ? 'all' : 'ok')}       active={filter === 'ok'} />
        <SCard label="Archivés"            value={inactive.length}  color="#6b7280" onClick={() => setFilter(f => f === 'inactive' ? 'all' : 'inactive')} active={filter === 'inactive'} />
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '32%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['Article', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Actions'].map(c => (
                <th key={c} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{c}</th>
              ))}
            </tr>
          </thead>
        </table>

        <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '32%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <tbody>
              {filtered.map((p, i) => {
                const isInactive = !p.active
                const level  = isInactive ? 'inactive' : p.stock <= 5 ? 'critical' : p.stock <= 15 ? 'low' : 'ok'
                const color  = { critical: '#ef4444', low: '#f59e0b', ok: '#22c55e', inactive: 'rgba(240,240,245,0.3)' }[level]
                const bgBadge = { critical: 'rgba(239,68,68,0.1)', low: 'rgba(245,158,11,0.1)', ok: 'rgba(34,197,94,0.1)', inactive: 'rgba(255,255,255,0.05)' }[level]
                const bdBadge = { critical: 'rgba(239,68,68,0.2)', low: 'rgba(245,158,11,0.2)', ok: 'rgba(34,197,94,0.2)', inactive: 'rgba(255,255,255,0.08)' }[level]
                const isEditing = editing?.id === p.id
                const canDelete = isInactive || p.stock === 0
                return (
                  <tr key={p.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: isInactive ? 0.45 : 1, animation: 'rowIn 0.3s ease both', animationDelay: `${Math.min(i * 30, 300)}ms`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Article */}
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: '#f0f0f5', width: '30%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ThumbImg images={p.images} name={p.name} category={p.category} />
                        {p.name}
                      </div>
                    </td>

                    {/* Catégorie */}
                    <td style={{ padding: '13px 16px', color: 'rgba(240,240,245,0.5)' }}>{p.category || '—'}</td>

                    {/* Prix */}
                    <td style={{ padding: '13px 16px', color: '#fbbf24', fontWeight: 700 }}>Ar {Number(p.price).toLocaleString('fr-FR')}</td>

                    {/* Stock */}
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontWeight: 700, color: isInactive ? 'rgba(240,240,245,0.3)' : color }}>{p.stock}</span>
                      {level === 'critical' && !isInactive && <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444', fontWeight: 700 }}>RUPTURE</span>}
                    </td>

                    {/* Statut */}
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: bgBadge, color, border: `1px solid ${bdBadge}` }}>
                        {isInactive ? 'Archivé' : level === 'critical' ? 'Rupture' : level === 'low' ? 'Faible' : 'OK'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '13px 16px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="number" min="0" value={editing.value}
                            onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                            style={{ width: 70, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '6px 10px', color: '#f0f0f5', fontSize: 13, outline: 'none' }}
                            autoFocus onKeyDown={e => e.key === 'Enter' && saveStock(p.id)} />
                          <button onClick={() => saveStock(p.id)} disabled={saving === p.id}
                            style={{ ...btnIcon, color: '#22c55e', borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.1)' }}>
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditing(null)}
                            style={{ ...btnIcon, color: '#f87171', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!isInactive && (
                            <button onClick={() => setEditing({ id: p.id, value: p.stock })} style={btnIcon} title="Modifier le stock">
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDelete && (
                            deleting === p.id
                              ? <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.3)', padding: '6px' }}>…</span>
                              : <button onClick={() => deleteProduct(p.id, p.name)} style={{ ...btnIcon, color: '#f87171' }} title="Supprimer définitivement">
                                  <Trash2 size={13} />
                                </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              <Package size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>{filter === 'inactive' ? 'Aucun article archivé' : filter === 'all' ? 'Aucun article — utilise "Nouvel article"' : 'Aucun article dans cette catégorie'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#0f0f1f', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, width: '100%', maxWidth: 460, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'rowIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f5' }}>Nouvel article</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.4)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FRow label="Nom *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Finger Sleeve Pro" style={inp} />
              </FRow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FRow label="Prix (Ar) *">
                  <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" min="0" placeholder="15000" style={inp} />
                </FRow>
                <FRow label="Stock initial">
                  <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} type="number" min="0" placeholder="0" style={inp} />
                </FRow>
              </div>
              <FRow label="Catégorie">
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="ex: finger-sleeve" style={inp} />
              </FRow>
              <FRow label="Description">
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description courte…" style={inp} />
              </FRow>

              {formError && (
                <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '8px 12px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(240,240,245,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Annuler
                </button>
                <button type="submit" disabled={formBusy}
                  style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: formBusy ? 0.7 : 1 }}>
                  {formBusy ? '…' : "Créer l'article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ThumbImg({ images, name, category }) {
  const [err, setErr] = useState(false)
  const s = getCatStyle(category)
  let src = null
  try {
    const arr = typeof images === 'string' ? JSON.parse(images) : (images || [])
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
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 12px' }}>{children}</div>
    </div>
  )
}

function SCard({ label, value, color, onClick, active }) {
  return (
    <button onClick={onClick} style={{ background: active ? `${color}15` : 'rgba(255,255,255,0.025)', border: `1px solid ${active ? `${color}35` : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', fontWeight: 600 }}>{label}</div>
    </button>
  )
}

const inp = { width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', fontFamily: 'inherit', boxSizing: 'border-box' }
