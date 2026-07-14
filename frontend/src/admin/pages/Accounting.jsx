import React, { useState, useEffect } from 'react'
import { Receipt, TrendingUp, Calendar, Wallet, Download, Search, RefreshCw } from 'lucide-react'

const BASE = '/api'
const h    = () => ({ Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })
const fmt  = n => Number(n || 0).toLocaleString('fr-FR')
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function Accounting() {
  const [data, setData]       = useState(null)
  const [search, setSearch]   = useState('')
  const [busy, setBusy]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch(`${BASE}/admin/accounting`, { headers: h() })
      .then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  /* Téléchargement authentifié : header Bearer → blob → ouverture */
  const download = async (inv) => {
    setBusy(inv.id)
    try {
      const r = await fetch(`${BASE}/admin/accounting/${inv.id}/pdf`, { headers: h() })
      if (!r.ok) throw new Error()
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${inv.number}.pdf`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { alert('Téléchargement impossible') }
    setBusy(null)
  }

  if (loading && !data) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>Chargement…</div>

  const t = data?.totals || {}
  const maxMonth = Math.max(...((data?.monthly || []).map(m => m.total)), 1)
  const invoices = (data?.invoices || []).filter(i =>
    !search || i.number.toLowerCase().includes(search.toLowerCase()) ||
    (i.user_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      <div className="adm-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Stat icon={<Wallet size={16} />}     label="Chiffre d'affaires"  value={`Ar ${fmt(t.revenue)}`}       color="#FF9900" />
        <Stat icon={<TrendingUp size={16} />} label="CA ce mois"          value={`Ar ${fmt(t.month_revenue)}`} color="#22c55e" />
        <Stat icon={<Receipt size={16} />}    label="Factures émises"     value={fmt(t.count)}                color="#60a5fa" />
        <Stat icon={<Calendar size={16} />}   label="Panier moyen"        value={`Ar ${fmt(t.avg)}`}          color="#a78bfa" />
      </div>

      {/* Graphique mensuel */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,240,245,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Chiffre d'affaires facturé {new Date().getFullYear()}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {MONTHS.map((m, i) => {
            const d = (data?.monthly || []).find(x => x.month === i + 1)
            const hgt = d ? Math.round((d.total / maxMonth) * 100) : 0
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div title={d ? `Ar ${fmt(d.total)} · ${d.count} factures` : '0'}
                  style={{ width: '100%', height: `${Math.max(hgt, 2)}%`, background: hgt > 0 ? 'linear-gradient(180deg,#FF9900,#CC5500)' : 'rgba(255,255,255,0.06)', borderRadius: '3px 3px 0 0', minHeight: 3, cursor: 'pointer' }} />
                <span style={{ fontSize: 9, color: 'rgba(240,240,245,0.3)' }}>{m}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Barre recherche + refresh */}
      <div className="adm-toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: 'rgba(240,240,245,0.5)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Actualiser
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 12px' }}>
          <Search size={13} color="rgba(240,240,245,0.3)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° facture ou client…"
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', width: 180, fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* Tableau factures */}
      <div className="adm-table-scroll" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['N° Facture', 'Date', 'Client', 'Sous-total', 'Livraison', 'Total', ''].map(c => (
                <th key={c} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#FF9900' }}>{inv.number}</td>
                <td style={{ padding: '12px 14px', color: 'rgba(240,240,245,0.5)', whiteSpace: 'nowrap' }}>{inv.date}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#f0f0f5' }}>{inv.user_name}</div>
                  {inv.user_phone && <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)' }}>{inv.user_phone}</div>}
                </td>
                <td style={{ padding: '12px 14px', color: 'rgba(240,240,245,0.55)', whiteSpace: 'nowrap' }}>Ar {fmt(inv.subtotal)}</td>
                <td style={{ padding: '12px 14px', color: 'rgba(240,240,245,0.55)', whiteSpace: 'nowrap' }}>Ar {fmt(inv.delivery_fee)}</td>
                <td style={{ padding: '12px 14px', fontWeight: 800, color: '#fbbf24', whiteSpace: 'nowrap' }}>Ar {fmt(inv.total)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <button onClick={() => download(inv)} disabled={busy === inv.id} title="Télécharger le PDF"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,153,0,0.3)', background: 'rgba(255,153,0,0.1)', color: '#FF9900', fontSize: 12, fontWeight: 700, cursor: busy === inv.id ? 'default' : 'pointer', opacity: busy === inv.id ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                    <Download size={13} /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div style={{ padding: 44, textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
            <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.3 }}>🧾</div>
            {data?.invoices?.length ? 'Aucun résultat' : 'Aucune facture — les factures sont générées automatiquement à la livraison d\'une commande.'}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, label, value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ color, opacity: 0.85 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f5' }}>{value}</div>
      </div>
    </div>
  )
}
