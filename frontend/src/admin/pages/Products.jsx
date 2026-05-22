import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const CATEGORIES = ['Ventilateur', 'Finger Sleeve', 'Câble', 'Manette', 'Accessoire', 'Autre']

const empty = { name: '', description: '', price: '', category: '', stock: '', images: [] }

export default function Products() {
  const [products, setProducts] = useState([])
  const [modal, setModal]       = useState(null) // null | 'add' | product
  const [form, setForm]         = useState(empty)
  const [busy, setBusy]         = useState(false)
  const [msg, setMsg]           = useState(null)

  const load = () => fetch(`${BASE}/admin/products`, { headers: h() }).then(r => r.json()).then(setProducts)
  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(empty); setModal('add'); setMsg(null) }
  const openEdit = (p) => { setForm({ ...p, price: p.price, stock: p.stock, images: p.images || [] }); setModal(p); setMsg(null) }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock) }
      const url  = modal === 'add' ? `${BASE}/admin/products` : `${BASE}/admin/products/${modal.id}`
      const method = modal === 'add' ? 'POST' : 'PUT'
      const res = await fetch(url, { method, headers: h(), body: JSON.stringify(body) })
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

  const active = products.filter(p => p.active)
  const archived = products.filter(p => !p.active)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.4)' }}>{active.length} articles actifs · {archived.length} archivés</div>
        </div>
        <button onClick={openAdd} style={btnPrimary}>
          <Plus size={15} /> Ajouter un article
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Article', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Actions'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: p.active ? 1 : 0.45 }}>
                <td style={{ padding: '13px 16px', fontWeight: 600, color: '#f0f0f5' }}>{p.name}</td>
                <td style={{ padding: '13px 16px', color: 'rgba(240,240,245,0.5)' }}>{p.category || '—'}</td>
                <td style={{ padding: '13px 16px', color: '#fbbf24', fontWeight: 700 }}>Ar {Number(p.price).toLocaleString('fr-FR')}</td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ fontWeight: 700, color: p.stock <= 5 ? '#ef4444' : p.stock <= 15 ? '#f59e0b' : '#22c55e' }}>
                    {p.stock}
                  </span>
                  {p.stock <= 5 && <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444', fontWeight: 700 }}>RUPTURE</span>}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: p.active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: p.active ? '#22c55e' : 'rgba(240,240,245,0.3)', border: `1px solid ${p.active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                    {p.active ? 'Actif' : 'Archivé'}
                  </span>
                </td>
                <td style={{ padding: '13px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(p)} style={btnIcon}><Pencil size={13} /></button>
                    {p.active && <button onClick={() => archive(p.id)} style={{ ...btnIcon, color: '#f87171' }}><Trash2 size={13} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
            Aucun article — clique sur "Ajouter un article"
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0f0f1f', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f5' }}>{modal === 'add' ? 'Nouvel article' : 'Modifier l\'article'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.4)', display: 'flex' }}><X size={18} /></button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FRow label="Nom *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inp} /></FRow>
              <FRow label="Description"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} /></FRow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FRow label="Prix (Ar) *"><input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" min="0" required style={inp} /></FRow>
                <FRow label="Stock *"><input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} type="number" min="0" required style={inp} /></FRow>
              </div>
              <FRow label="Catégorie">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, background: 'rgba(255,255,255,0.04)' }}>
                  <option value="">— Choisir —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FRow>

              {msg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: msg.type === 'ok' ? '#22c55e' : '#f87171', background: msg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 9, padding: '8px 12px' }}>
                  {msg.type === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {msg.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(240,240,245,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
                <button type="submit" disabled={busy} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>{busy ? '…' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
const btnIcon = { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '6px', cursor: 'pointer', color: 'rgba(240,240,245,0.6)' }
