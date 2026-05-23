import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, MapPin, Clock, CreditCard } from 'lucide-react'
import AdminDropdown from '../components/AdminDropdown.jsx'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const STATUSES = ['En attente', 'Confirmé', 'En livraison', 'Livré', 'Annulé']
const STATUS_STYLE = {
  'En attente':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  'Confirmé':      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  'En livraison':  { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  'Livré':         { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)'},
  'Annulé':        { color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
}
const PAYMENT = { mvola: 'MVola', airtel: 'Airtel Money', orange: 'Orange Money', livraison: 'À la livraison' }

export default function Orders() {
  const [orders, setOrders]   = useState([])
  const [filter, setFilter]   = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [updating, setUpdating] = useState(null)

  const load = () => fetch(`${BASE}/admin/orders`, { headers: h() }).then(r => r.json()).then(setOrders)
  useEffect(() => { load() }, [])

  const updateStatus = async (id, status) => {
    setUpdating(id)
    await fetch(`${BASE}/admin/orders/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ status }) })
    await load()
    setUpdating(null)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', ...STATUSES].map(s => {
          const active = filter === s
          const st = s === 'all' ? null : STATUS_STYLE[s]
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background: active ? (st ? st.bg : 'rgba(255,153,0,0.12)') : 'rgba(255,255,255,0.03)',
                borderColor: active ? (st ? st.border : 'rgba(255,153,0,0.3)') : 'rgba(255,255,255,0.08)',
                color: active ? (st ? st.color : '#FF9900') : 'rgba(240,240,245,0.45)' }}>
              {s === 'all' ? `Toutes (${orders.length})` : `${s} (${orders.filter(o => o.status === s).length})`}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(o => {
          const st = STATUS_STYLE[o.status] || STATUS_STYLE['En attente']
          const isOpen = expanded === o.id
          return (
            <div key={o.id} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              {/* Summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => setExpanded(isOpen ? null : o.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f5' }}>{o.user_name}</span>
                    <span style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)' }}>{o.user_phone}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)' }}>
                    #{o.id} · {o.date} · <strong style={{ color: '#fbbf24' }}>Ar {Number(o.total).toLocaleString('fr-FR')}</strong>
                  </div>
                </div>

                {/* Status selector */}
                <StatusSelect
                  value={o.status}
                  disabled={updating === o.id}
                  onChange={val => updateStatus(o.id, val)}
                />

                <span style={{ color: 'rgba(240,240,245,0.3)', display: 'flex' }}>
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </div>

              {/* Detail */}
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {o.items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(240,240,245,0.55)' }}>
                        <span>{item.name} × {item.qty}</span>
                        <span>Ar {(item.price * item.qty).toLocaleString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <Detail icon={<MapPin size={11} />} label={o.address} />
                    {o.zone && <Detail icon={<CreditCard size={11} />} label={`${o.zone === 'tana' ? 'Tana Ville' : 'Périphérique'} · Ar ${Number(o.delivery_fee).toLocaleString('fr-FR')}`} />}
                    {o.hours && <Detail icon={<Clock size={11} />} label={o.hours} />}
                    <Detail icon={<CreditCard size={11} />} label={PAYMENT[o.payment] || o.payment} />
                    {o.note && <Detail icon={<span style={{ fontSize: 11 }}>📝</span>} label={o.note} />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#f0f0f5', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>Total</span><span style={{ color: '#fbbf24' }}>Ar {Number(o.total).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
            Aucune commande dans cette catégorie
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sélecteur statut — wrapper de AdminDropdown ─────────── */
function StatusSelect({ value, disabled, onChange }) {
  const options = STATUSES.map(s => ({ value: s, label: s, ...STATUS_STYLE[s] }))
  return (
    <AdminDropdown
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      compact
      stopProp
    />
  )
}

function Detail({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'rgba(240,240,245,0.4)' }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}
