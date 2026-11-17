import React, { useState, useEffect } from 'react'
import { TrendingUp, ShoppingBag, Users, Eye, Clock, CheckCircle, Package, AlertTriangle, Wallet } from 'lucide-react'

function adminFetch(path) {
  return fetch(`/api${path}`, { headers: { Authorization: `Bearer ${localStorage.getItem('vrg_token')}` } }).then(r => r.json())
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => { adminFetch('/admin/stats').then(setStats).catch(() => {}) }, [])

  if (!stats) return <Skeleton />

  const fmt = n => Number(n || 0).toLocaleString('fr-FR')
  const nowMonth = new Date().getMonth() + 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {stats.alerts.low_stock > 0 && (
        <div className="adm-alert adm-alert--error" role="status">
          <AlertTriangle size={16} />
          <span>{stats.alerts.low_stock} article{stats.alerts.low_stock > 1 ? 's' : ''} en rupture de stock — à réapprovisionner depuis l'onglet Stocks.</span>
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 14 }}>
        <KPICard icon={<TrendingUp size={17} />}  tone="gold"    label="Ventes ce mois"     value={`Ar ${fmt(stats.sales.month)}`} sub={`Cumul : Ar ${fmt(stats.sales.total)}`} />
        <KPICard icon={<Wallet size={17} />}      tone="warning" label="Ventes aujourd'hui" value={`Ar ${fmt(stats.sales.today)}`} />
        <KPICard icon={<ShoppingBag size={17} />} tone="info"    label="Commandes"          value={fmt(stats.orders.total)} sub={`${stats.orders.pending} en attente`} />
        <KPICard icon={<Users size={17} />}       tone="violet"  label="Nouveaux clients"   value={fmt(stats.users.month)} sub={`Ce mois · ${fmt(stats.users.total)} au total`} />
        <KPICard icon={<Eye size={17} />}         tone="success" label="Visiteurs ce mois"
          value={fmt(stats.visits.month_uniques ?? stats.visits.month)}
          sub={`Aujourd'hui : ${stats.visits.today_uniques ?? stats.visits.today} · ${fmt(stats.visits.month)} sessions`} />
      </div>

      {/* Pipeline des commandes */}
      <div className="adm-card adm-card--pad">
        <div className="adm-card__title">Suivi des commandes <small>{fmt(stats.orders.total)} au total</small></div>
        <div className="adm-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <StatusCard icon={<Clock size={16} />}       label="En attente" value={stats.orders.pending}   tone="warning" />
          <StatusCard icon={<CheckCircle size={16} />} label="Confirmées" value={stats.orders.confirmed} tone="success" />
          <StatusCard icon={<Package size={16} />}     label="Livrées"    value={stats.orders.delivered} tone="info" />
        </div>
      </div>

      {/* Graphiques */}
      <div className="adm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Ventes mensuelles" hint={`${new Date().getFullYear()} · Ar`}>
          <Bars data={stats.charts.monthly_sales} valueKey="total" tone="gold" nowMonth={nowMonth}
            label={v => `Ar ${fmt(v)}`} />
        </Card>
        <Card title="Nouveaux clients" hint="par mois">
          <Bars data={stats.charts.monthly_users} valueKey="count" tone="violet" nowMonth={nowMonth}
            label={v => `${v} client${v > 1 ? 's' : ''}`} />
        </Card>
      </div>

      {/* Visiteurs par pays */}
      <Card title="Visiteurs par pays" hint="ce mois">
        {(!stats.countries || stats.countries.length === 0) ? (
          <p style={{ fontSize: 13, color: 'var(--color-subtle)' }}>
            Aucune donnée de localisation pour l'instant — elle se remplit au fil des visites.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(() => {
              const maxC = Math.max(...stats.countries.map(c => Number(c.count)), 1)
              return stats.countries.map(c => (
                <div key={c.country_code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, width: 24, flexShrink: 0 }} aria-hidden="true">{flagEmoji(c.country_code)}</span>
                  <span style={{ fontSize: 13, width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.country || c.country_code}
                  </span>
                  <div className="adm-meter"><span style={{ width: `${Math.round((c.count / maxC) * 100)}%` }} /></div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 44, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(c.count)}</span>
                </div>
              ))
            })()}
          </div>
        )}
      </Card>
    </div>
  )
}

const TONES = {
  gold:    ['var(--color-gold)',    'var(--color-gold-soft)'],
  warning: ['var(--color-warning)', 'var(--color-warning-soft)'],
  info:    ['var(--color-info)',    'var(--color-info-soft)'],
  violet:  ['var(--color-violet)',  'var(--color-violet-soft)'],
  success: ['var(--color-success)', 'var(--color-success-soft)'],
}

function Bars({ data, valueKey, tone, nowMonth, label }) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1)
  return (
    <div className="adm-bars" role="img" aria-label="Graphique mensuel">
      {MONTHS.map((m, i) => {
        const d = data.find(s => s.month === i + 1)
        const v = d ? Number(d[valueKey]) : 0
        const h = Math.round((v / max) * 100)
        return (
          <div key={i} className={`adm-bars__col${i + 1 === nowMonth ? ' adm-bars__col--now' : ''}`} title={`${m} : ${label(v)}`}>
            <div className="adm-bars__track">
              <div className={`adm-bars__bar${v > 0 ? ` adm-bars__bar--${tone}` : ''}`} style={{ height: `${Math.max(h, 2)}%` }} />
            </div>
            <span className="adm-bars__lbl">{m}</span>
          </div>
        )
      })}
    </div>
  )
}

/* Code pays ISO-2 → emoji drapeau (paire de regional indicator symbols) */
function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return '🌐'
  const base = 0x1F1E6
  return String.fromCodePoint(
    base + cc.toUpperCase().charCodeAt(0) - 65,
    base + cc.toUpperCase().charCodeAt(1) - 65
  )
}

function KPICard({ icon, label, value, sub, tone }) {
  const [c, bg] = TONES[tone]
  return (
    <div className="adm-card adm-kpi">
      <div className="adm-kpi__head">
        <span className="adm-kpi__icon" style={{ color: c, background: bg }}>{icon}</span>
        {label}
      </div>
      <div className="adm-kpi__value">{value}</div>
      {sub && <div className="adm-kpi__sub">{sub}</div>}
    </div>
  )
}

function StatusCard({ icon, label, value, tone }) {
  const [c, bg] = TONES[tone]
  return (
    <div style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <span className="adm-kpi__icon" style={{ color: c, background: bg, width: 38, height: 38, borderRadius: 10 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

function Card({ title, hint, children }) {
  return (
    <div className="adm-card adm-card--pad">
      <div className="adm-card__title">{title}{hint && <small>{hint}</small>}</div>
      {children}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} aria-busy="true">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 14 }}>
        {[...Array(5)].map((_, i) => <div key={i} className="vs-skeleton" style={{ height: 118, borderRadius: 16 }} />)}
      </div>
      <div className="vs-skeleton" style={{ height: 120, borderRadius: 16 }} />
      <div className="adm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="vs-skeleton" style={{ height: 230, borderRadius: 16 }} />
        <div className="vs-skeleton" style={{ height: 230, borderRadius: 16 }} />
      </div>
    </div>
  )
}
