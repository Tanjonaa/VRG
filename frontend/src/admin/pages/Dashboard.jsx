import React, { useState, useEffect } from 'react'
import { TrendingUp, ShoppingBag, Users, Eye, Clock, CheckCircle, Package, AlertTriangle } from 'lucide-react'

function adminFetch(path) {
  return fetch(`/api${path}`, { headers: { Authorization: `Bearer ${localStorage.getItem('vrg_token')}` } }).then(r => r.json())
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => { adminFetch('/admin/stats').then(setStats).catch(() => {}) }, [])

  if (!stats) return <Skeleton />

  const maxSales = Math.max(...(stats.charts.monthly_sales.map(s => s.total)), 1)
  const maxUsers = Math.max(...(stats.charts.monthly_users.map(s => s.count)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Alert */}
      {stats.alerts.low_stock > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '13px 16px', color: '#f87171', fontSize: 13, fontWeight: 600 }}>
          <AlertTriangle size={16} />
          {stats.alerts.low_stock} article{stats.alerts.low_stock > 1 ? 's' : ''} en rupture de stock — vérifier l'onglet Stocks
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KPICard icon={<TrendingUp size={18} />} label="Ventes ce mois" value={`Ar ${stats.sales.month.toLocaleString('fr-FR')}`} sub={`Total : Ar ${stats.sales.total.toLocaleString('fr-FR')}`} color="#FF9900" />
        <KPICard icon={<TrendingUp size={18} />} label="Ventes aujourd'hui" value={`Ar ${stats.sales.today.toLocaleString('fr-FR')}`} color="#fbbf24" />
        <KPICard icon={<ShoppingBag size={18} />} label="Commandes total" value={stats.orders.total} sub={`${stats.orders.pending} en attente`} color="#60a5fa" />
        <KPICard icon={<Users size={18} />} label="Clients ce mois" value={stats.users.month} sub={`Total : ${stats.users.total}`} color="#a78bfa" />
        <KPICard icon={<Eye size={18} />} label="Visiteurs ce mois"
          value={Number(stats.visits.month_uniques ?? stats.visits.month).toLocaleString('fr-FR')}
          sub={`Aujourd'hui : ${stats.visits.today_uniques ?? stats.visits.today} · ${Number(stats.visits.month).toLocaleString('fr-FR')} sessions`}
          color="#34d399" />
      </div>

      {/* Order status */}
      <div className="adm-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <StatusCard icon={<Clock size={15} />} label="En attente" value={stats.orders.pending} color="#f59e0b" />
        <StatusCard icon={<CheckCircle size={15} />} label="Confirmées" value={stats.orders.confirmed} color="#22c55e" />
        <StatusCard icon={<Package size={15} />} label="Livrées" value={stats.orders.delivered} color="#60a5fa" />
      </div>

      {/* Charts */}
      <div className="adm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Sales chart */}
        <Card title="Ventes mensuelles (Ar)">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 8 }}>
            {MONTHS.map((m, i) => {
              const d = stats.charts.monthly_sales.find(s => s.month === i + 1)
              const h = d ? Math.round((d.total / maxSales) * 100) : 0
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div title={d ? `Ar ${d.total.toLocaleString('fr-FR')}` : '0'}
                    style={{ width: '100%', height: `${Math.max(h, 2)}%`, background: h > 0 ? 'linear-gradient(180deg, #FF9900, #CC5500)' : 'rgba(255,255,255,0.06)', borderRadius: '3px 3px 0 0', minHeight: 3, transition: 'height 0.4s ease', cursor: 'pointer' }} />
                  <span style={{ fontSize: 9, color: 'rgba(240,240,245,0.3)' }}>{m}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Users chart */}
        <Card title="Nouveaux clients / mois">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 8 }}>
            {MONTHS.map((m, i) => {
              const d = stats.charts.monthly_users.find(s => s.month === i + 1)
              const h = d ? Math.round((d.count / maxUsers) * 100) : 0
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div title={d ? `${d.count} clients` : '0'}
                    style={{ width: '100%', height: `${Math.max(h, 2)}%`, background: h > 0 ? 'linear-gradient(180deg, #a78bfa, #7c3aed)' : 'rgba(255,255,255,0.06)', borderRadius: '3px 3px 0 0', minHeight: 3, transition: 'height 0.4s ease', cursor: 'pointer' }} />
                  <span style={{ fontSize: 9, color: 'rgba(240,240,245,0.3)' }}>{m}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(240,240,245,0.4)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f5', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function StatusCard({ icon, label, value, color }) {
  return (
    <div style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color }}>{icon}</span>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(240,240,245,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ height: 90, background: 'rgba(255,255,255,0.03)', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}
