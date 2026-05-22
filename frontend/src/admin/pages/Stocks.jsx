import React, { useState, useEffect } from 'react'
import { AlertTriangle, Package, Check, X } from 'lucide-react'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const ANIM_STYLE = `
@keyframes rowIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

export default function Stocks({ onAlertsChange }) {
  const [products, setProducts] = useState([])
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(null)
  const [filter, setFilter]     = useState('all')

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

  const critical = products.filter(p => p.stock <= 5 && p.active)
  const low      = products.filter(p => p.stock > 5 && p.stock <= 15 && p.active)
  const ok       = products.filter(p => p.stock > 15 && p.active)

  const filtered = filter === 'all' ? products.filter(p => p.active)
    : filter === 'critical' ? critical
    : filter === 'low' ? low : ok

  return (
    <div>
      <style>{ANIM_STYLE}</style>
      {/* Alert banner */}
      {critical.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '13px 16px', color: '#f87171', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          <AlertTriangle size={16} />
          {critical.length} article{critical.length > 1 ? 's' : ''} en rupture de stock — action requise
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <SCard label="Rupture (≤5)" value={critical.length} color="#ef4444" onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')} active={filter === 'critical'} />
        <SCard label="Stock faible (6-15)" value={low.length} color="#f59e0b" onClick={() => setFilter(filter === 'low' ? 'all' : 'low')} active={filter === 'low'} />
        <SCard label="Stock OK (>15)" value={ok.length} color="#22c55e" onClick={() => setFilter(filter === 'ok' ? 'all' : 'ok')} active={filter === 'ok'} />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Fixed header */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['Article', 'Catégorie', 'Prix', 'Stock actuel', 'Statut', 'Modifier le stock'].map(c => (
                <th key={c} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{c}</th>
              ))}
            </tr>
          </thead>
        </table>

        {/* Scrollable body */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {filtered.map((p, i) => {
                const level = p.stock <= 5 ? 'critical' : p.stock <= 15 ? 'low' : 'ok'
                const color = { critical: '#ef4444', low: '#f59e0b', ok: '#22c55e' }[level]
                const isEditing = editing?.id === p.id
                return (
                  <tr key={p.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: level === 'critical' ? 'rgba(239,68,68,0.03)' : 'transparent',
                    animation: 'rowIn 0.3s ease both',
                    animationDelay: `${Math.min(i * 25, 250)}ms`,
                    transition: 'background 0.15s',
                  }}>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {level === 'critical' && <AlertTriangle size={13} color="#ef4444" />}
                        <span style={{ fontWeight: 600, color: '#f0f0f5' }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', color: 'rgba(240,240,245,0.45)' }}>{p.category || '—'}</td>
                    <td style={{ padding: '13px 16px', color: '#fbbf24', fontWeight: 600 }}>Ar {Number(p.price).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color }}>{p.stock}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${color}15`, color, border: `1px solid ${color}30` }}>
                        {level === 'critical' ? 'Rupture' : level === 'low' ? 'Faible' : 'OK'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="number" min="0" value={editing.value}
                            onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                            style={{ width: 70, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '6px 10px', color: '#f0f0f5', fontSize: 13, outline: 'none' }}
                            autoFocus onKeyDown={e => e.key === 'Enter' && saveStock(p.id)} />
                          <button onClick={() => saveStock(p.id)} disabled={saving === p.id}
                            style={{ display: 'flex', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 7, padding: 6, cursor: 'pointer', color: '#22c55e' }}>
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditing(null)}
                            style={{ display: 'flex', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: 6, cursor: 'pointer', color: '#f87171' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditing({ id: p.id, value: p.stock })}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'rgba(240,240,245,0.6)', fontSize: 12 }}>
                          <Package size={12} /> Mettre à jour
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              {filter === 'all' ? "Aucun article — ajoute des articles depuis l'onglet Articles" : 'Aucun article dans cette catégorie'}
            </div>
          )}
        </div>
      </div>
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
