import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, UserCog, UserPlus, Pencil, Archive, ChevronLeft, ChevronRight } from 'lucide-react'

const BASE  = '/api'
const h     = () => ({ Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })
const LIMIT = 25

const ACTION_META = {
  role_change:  { label: 'Changement de rôle',   color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', Icon: UserCog   },
  team_add:     { label: 'Membre ajouté',         color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   Icon: UserPlus  },
  team_edit:    { label: 'Membre modifié',        color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  Icon: Pencil    },
  team_archive: { label: 'Membre archivé',        color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', Icon: Archive   },
}

const FILTERS = [
  { value: '',             label: 'Tout' },
  { value: 'role_change',  label: 'Rôles' },
  { value: 'team_add',     label: 'Ajouts' },
  { value: 'team_edit',    label: 'Modifications' },
  { value: 'team_archive', label: 'Archives' },
]

function fmtDate(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function ValueChip({ value, color }) {
  if (!value) return <span style={{ color: 'rgba(240,240,245,0.25)', fontSize: 11 }}>—</span>
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: `rgba(${color},0.1)`, color: `rgb(${color})`,
      border: `1px solid rgba(${color},0.2)`, textTransform: 'capitalize' }}>
      {value}
    </span>
  )
}

const ROLE_COLOR = { admin: '255,153,0', moderator: '96,165,250', client: '148,163,184', actif: '34,197,94', archivé: '248,113,113' }

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

  const pages     = Math.max(1, Math.ceil(total / LIMIT))
  const curPage   = Math.floor(offset / LIMIT) + 1

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.4)', flex: 1 }}>
          {total} entrée{total !== 1 ? 's' : ''}
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => changeFilter(f.value)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: filter === f.value ? 'rgba(255,153,0,0.12)' : 'none',
                color:      filter === f.value ? '#FF9900' : 'rgba(240,240,245,0.45)',
                borderColor: filter === f.value ? 'rgba(255,153,0,0.3)' : 'rgba(255,255,255,0.08)',
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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['Action', 'Cible', 'Avant → Après', 'Effectué par', 'Date'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                  color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {rows.map((row, i) => {
                const meta = ACTION_META[row.action] || ACTION_META.team_edit
                const { Icon } = meta
                const oldColor = ROLE_COLOR[row.old_value] || '148,163,184'
                const newColor = ROLE_COLOR[row.new_value] || '148,163,184'
                return (
                  <tr key={row.id}
                    style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    {/* Action */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: meta.bg, border: `1px solid ${meta.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={13} color={meta.color} />
                        </div>
                        <span style={{ color: meta.color, fontWeight: 600, fontSize: 12 }}>{meta.label}</span>
                      </div>
                    </td>

                    {/* Cible */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#f0f0f5' }}>{row.target_name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)', marginTop: 2 }}>
                        #{row.target_id} · {row.target_type === 'user' ? 'utilisateur' : 'équipe'}
                      </div>
                    </td>

                    {/* Avant → Après */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ValueChip value={row.old_value} color={oldColor} />
                        {(row.old_value || row.new_value) && (
                          <span style={{ color: 'rgba(240,240,245,0.2)', fontSize: 13 }}>→</span>
                        )}
                        <ValueChip value={row.new_value} color={newColor} />
                      </div>
                    </td>

                    {/* Admin */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 800, color: '#FF9900' }}>
                          {row.admin_name?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ color: 'rgba(240,240,245,0.7)', fontWeight: 600, fontSize: 12 }}>{row.admin_name}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '12px 16px', color: 'rgba(240,240,245,0.35)', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {fmtDate(row.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!loading && rows.length === 0 && (
            <div style={{ padding: '56px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📋</div>
              <div>Aucun historique pour ce filtre</div>
            </div>
          )}

          {loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              Chargement…
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <button onClick={() => setOffset(o => Math.max(0, o - LIMIT))} disabled={offset === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'none', cursor: offset === 0 ? 'default' : 'pointer',
              color: offset === 0 ? 'rgba(240,240,245,0.2)' : 'rgba(240,240,245,0.6)', fontSize: 12, fontWeight: 600 }}>
            <ChevronLeft size={14} /> Précédent
          </button>
          <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.35)' }}>
            Page {curPage} / {pages}
          </span>
          <button onClick={() => setOffset(o => o + LIMIT)} disabled={curPage >= pages}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'none', cursor: curPage >= pages ? 'default' : 'pointer',
              color: curPage >= pages ? 'rgba(240,240,245,0.2)' : 'rgba(240,240,245,0.6)', fontSize: 12, fontWeight: 600 }}>
            Suivant <ChevronRight size={14} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}