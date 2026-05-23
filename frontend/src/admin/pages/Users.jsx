import React, { useState, useEffect } from 'react'
import { Shield, User, Search } from 'lucide-react'
import AdminDropdown from '../components/AdminDropdown.jsx'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const ROLE_STYLE = {
  admin:     { color: '#FF9900', bg: 'rgba(255,153,0,0.1)',    border: 'rgba(255,153,0,0.25)' },
  moderator: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)' },
  client:    { color: 'rgba(240,240,245,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
}

const ROLE_OPTIONS = ['client', 'moderator', 'admin'].map(r => ({ value: r, label: r, ...ROLE_STYLE[r] }))

export default function UsersPage({ user: adminUser }) {
  const [users, setUsers]   = useState([])
  const [tab, setTab]       = useState('clients')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState(null)

  const load = () => fetch(`${BASE}/admin/users`, { headers: h() }).then(r => r.json()).then(setUsers)
  useEffect(() => { load() }, [])

  const changeRole = async (id, role) => {
    setUpdating(id)
    await fetch(`${BASE}/admin/users/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ role }) })
    await load()
    setUpdating(null)
  }

  const staff   = users.filter(u => ['admin', 'moderator'].includes(u.role))
  const clients = users.filter(u => u.role === 'client')
  const list    = (tab === 'staff' ? staff : clients).filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  )

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'clients', label: `Clients (${clients.length})`, icon: <User size={13} /> },
          { id: 'staff',   label: `Admin & Modérateurs (${staff.length})`, icon: <Shield size={13} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.id ? 'rgba(255,153,0,0.1)' : 'rgba(255,255,255,0.03)',
              borderColor: tab === t.id ? 'rgba(255,153,0,0.3)' : 'rgba(255,255,255,0.08)',
              color: tab === t.id ? '#FF9900' : 'rgba(240,240,245,0.45)' }}>
            {t.icon} {t.label}
          </button>
        ))}

        {/* Search */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 12px' }}>
          <Search size={13} color="rgba(240,240,245,0.3)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', width: 160, fontFamily: 'inherit' }} />
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Nom', 'Téléphone', 'Rôle', 'Commandes', 'Total dépensé', 'Inscrit le', ...(adminUser?.role === 'admin' ? ['Action'] : [])].map(c => (
                <th key={c} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((u, i) => {
              const rs = ROLE_STYLE[u.role] || ROLE_STYLE.client
              return (
                <tr key={u.id} style={{ borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#FF9900', flexShrink: 0 }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: '#f0f0f5' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: 'rgba(240,240,245,0.5)' }}>{u.phone}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', color: 'rgba(240,240,245,0.5)', textAlign: 'center' }}>{u.order_count}</td>
                  <td style={{ padding: '13px 16px', color: '#fbbf24', fontWeight: 600 }}>Ar {Number(u.total_spent).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: '13px 16px', color: 'rgba(240,240,245,0.4)', fontSize: 12 }}>{u.date}</td>
                  {adminUser?.role === 'admin' && (
                    <td style={{ padding: '13px 16px' }}>
                      {u.id !== adminUser.id && (
                        <AdminDropdown
                          value={u.role}
                          options={ROLE_OPTIONS}
                          onChange={role => changeRole(u.id, role)}
                          disabled={updating === u.id}
                          compact
                        />
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
            Aucun résultat
          </div>
        )}
      </div>
    </div>
  )
}
