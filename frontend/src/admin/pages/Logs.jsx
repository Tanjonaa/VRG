import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, UserPlus, Pencil, Archive, ChevronLeft, ChevronRight,
         Package, ShoppingBag, BarChart3, Settings2, Shield, CreditCard } from 'lucide-react'

const BASE  = '/api'
const h     = () => ({ Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })
const LIMIT = 25

const ACTION_META = {
  role_change:     { label: 'Changement de rôle',   color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', Icon: Shield    },
  team_add:        { label: 'Membre équipe ajouté',  color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   Icon: UserPlus  },
  team_edit:       { label: 'Membre équipe modifié', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  Icon: Pencil    },
  team_archive:    { label: 'Membre équipe archivé', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', Icon: Archive   },
  product_add:     { label: 'Article ajouté',        color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  Icon: Package   },
  product_edit:    { label: 'Article modifié',       color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  Icon: Pencil    },
  product_archive: { label: 'Article archivé',       color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', Icon: Archive   },
  order_status:    { label: 'Statut commande',       color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)',  Icon: ShoppingBag },
  order_payment:   { label: 'Paiement commande',     color: '#FF9900', bg: 'rgba(255,153,0,0.08)',   border: 'rgba(255,153,0,0.2)',   Icon: CreditCard  },
  stock_update:    { label: 'Mise à jour stock',     color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)',   Icon: BarChart3 },
  settings_update: { label: 'Paramètre modifié',     color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', Icon: Settings2 },
}

const FILTERS = [
  { value: '',               label: 'Tout' },
  { value: 'product_add',    label: 'Ajouts article' },
  { value: 'product_edit',   label: 'Modifs article' },
  { value: 'product_archive',label: 'Archives article' },
  { value: 'order_status',   label: 'Commandes' },
  { value: 'stock_update',   label: 'Stocks' },
  { value: 'role_change',    label: 'Rôles' },
  { value: 'team_add',       label: 'Équipe' },
  { value: 'settings_update',label: 'Paramètres' },
]

const VALUE_COLOR = {
  admin: '255,153,0', moderator: '96,165,250', client: '148,163,184',
  actif: '34,197,94', archivé: '248,113,113',
  'En attente': '251,191,36', 'Confirmé': '34,197,94',
  'En livraison': '96,165,250', 'Livré': '52,211,153', 'Annulé': '248,113,113',
  confirmé: '34,197,94', 'non confirmé': '148,163,184',
}

function fmtDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function ValueChip({ value }) {
  if (value == null || value === '') return <span style={{ color: 'rgba(240,240,245,0.25)', fontSize: 11 }}>—</span>
  const rgb = VALUE_COLOR[value] || '148,163,184'
  const display = String(value).length > 30 ? String(value).slice(0, 28) + '…' : value
  return (
    <span title={value} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: `rgba(${rgb},0.1)`, color: `rgb(${rgb})`,
      border: `1px solid rgba(${rgb},0.2)`, maxWidth: 140, display: 'inline-block',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
      {display}
    </span>
  )
}

export default function Logs() {
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('')
  const [offset,  setOffset]  = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, offset })
    if (filter) params.set('action', filter)
    fetch(`${BASE}/admin/logs?${params}`, { headers: h() })
      .then(r => r.json())
      .then(d => { setRows(d.rows || []); setTotal(d.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter, offset])

  useEffect(() => { load() }, [load])

  const changeFilter = (f) => { setFilter(f); setOffset(0) }
  const pages   = Math.max(1, Math.ceil(total / LIMIT))
  const curPage = Math.floor(offset / LIMIT) + 1

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.4)', flex: 1 }}>
          {total} entrée{total !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => changeFilter(f.value)}
              style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background:   filter === f.value ? 'rgba(255,153,0,0.12)' : 'none',
                color:        filter === f.value ? '#FF9900' : 'rgba(240,240,245,0.45)',
                borderColor:  filter === f.value ? 'rgba(255,153,0,0.3)' : 'rgba(255,255,255,0.08)',
              }}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px',
            color: 'rgba(240,240,245,0.5)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 200px 140px 150px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          {['Action', 'Cible', 'Avant → Après', 'Effectué par', 'Date'].map(col => (
            <div key={col} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700,
              color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {col}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              Chargement…
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div style={{ padding: 56, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📋</div>
              Aucun historique pour ce filtre
            </div>
          )}
          {!loading && rows.map((row, i) => {
            const meta = ACTION_META[row.action] || ACTION_META.product_edit
            const { Icon } = meta
            return (
              <div key={row.id}
                style={{ display: 'grid', gridTemplateColumns: '200px 1fr 200px 140px 150px',
                  borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition: 'background 0.15s', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Action */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: meta.bg, border: `1px solid ${meta.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} color={meta.color} />
                  </div>
                  <span style={{ color: meta.color, fontWeight: 600, fontSize: 11, lineHeight: 1.3 }}>{meta.label}</span>
                </div>

                {/* Cible */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#f0f0f5', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.target_name}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(240,240,245,0.3)', marginTop: 2 }}>
                    {row.target_type === 'user' ? 'utilisateur' : row.target_type === 'order' ? 'commande' : row.target_type === 'setting' ? 'paramètre' : 'produit / équipe'}
                    {row.target_id > 0 ? ` · #${row.target_id}` : ''}
                  </div>
                </div>

                {/* Avant → Après */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <ValueChip value={row.old_value} />
                  {(row.old_value != null || row.new_value != null) && (
                    <span style={{ color: 'rgba(240,240,245,0.2)', fontSize: 12 }}>→</span>
                  )}
                  <ValueChip value={row.new_value} />
                </div>

                {/* Admin */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#FF9900' }}>
                    {row.admin_name?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ color: 'rgba(240,240,245,0.7)', fontWeight: 600, fontSize: 12,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.admin_name}
                  </span>
                </div>

                {/* Date */}
                <div style={{ padding: '12px 16px', color: 'rgba(240,240,245,0.35)', fontSize: 11, display: 'flex', alignItems: 'center' }}>
                  {fmtDate(row.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <button onClick={() => setOffset(o => Math.max(0, o - LIMIT))} disabled={offset === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'none',
              cursor: offset === 0 ? 'default' : 'pointer',
              color: offset === 0 ? 'rgba(240,240,245,0.2)' : 'rgba(240,240,245,0.6)',
              fontSize: 12, fontWeight: 600 }}>
            <ChevronLeft size={14} /> Précédent
          </button>
          <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.35)' }}>
            Page {curPage} / {pages}
          </span>
          <button onClick={() => setOffset(o => o + LIMIT)} disabled={curPage >= pages}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'none',
              cursor: curPage >= pages ? 'default' : 'pointer',
              color: curPage >= pages ? 'rgba(240,240,245,0.2)' : 'rgba(240,240,245,0.6)',
              fontSize: 12, fontWeight: 600 }}>
            Suivant <ChevronRight size={14} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}