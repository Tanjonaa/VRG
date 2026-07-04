import React, { useState, useEffect } from 'react'
import { Shield, User, Search, Users, Gift, ShoppingBag, TrendingUp, ChevronDown, ChevronUp, Plus, X, Eye, EyeOff, Trash2, UserX, Lock } from 'lucide-react'
import AdminDropdown from '../components/AdminDropdown.jsx'
import PasswordModal from '../components/PasswordModal.jsx'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const ROLE_STYLE = {
  admin:     { color: '#FF9900',               bg: 'rgba(255,153,0,0.1)',    border: 'rgba(255,153,0,0.25)' },
  moderator: { color: '#60a5fa',               bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)' },
  livreur:   { color: '#34d399',               bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)' },
  client:    { color: 'rgba(240,240,245,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
}
const ROLE_OPTIONS = ['client', 'moderator', 'admin', 'livreur'].map(r => ({ value: r, label: r, ...ROLE_STYLE[r] }))

const TIERS = [
  { label: 'Bronze',  min: 0,    color: '#cd7f32', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.25)' },
  { label: 'Argent',  min: 200,  color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)' },
  { label: 'Or',      min: 500,  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)' },
  { label: 'Platine', min: 1000, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
]

/* 1 pt / 2 000 Ar — sur les commandes livrées uniquement */
function loyaltyBadge(deliveredTotal) {
  const points = Math.floor(Number(deliveredTotal) / 2000)
  const tier = [...TIERS].reverse().find(t => points >= t.min) || TIERS[0]
  return { ...tier, points }
}

/* section='clients' → page Clients (liste clients uniquement)
   section='staff'   → page Staff (onglets Admin & Modérateurs / Livreurs) */
export default function UsersPage({ user: adminUser, section = 'clients' }) {
  const [users, setUsers]           = useState([])
  const [tab, setTab]               = useState(section === 'staff' ? 'staff' : 'clients')
  const [search, setSearch]         = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [referrals, setReferrals]   = useState({})
  const [loadingRef, setLoadingRef] = useState(null)
  const [updating, setUpdating]     = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [newForm, setNewForm]       = useState({ name: '', phone: '', password: '', role: 'moderator' })
  const [newError, setNewError]     = useState('')
  const [newBusy, setNewBusy]       = useState(false)
  const [showPwd, setShowPwd]       = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)

  const loadReferrals = async (uid) => {
    if (referrals[uid]) return
    setLoadingRef(uid)
    const data = await fetch(`${BASE}/admin/users/${uid}/referrals`, { headers: h() }).then(r => r.json()).catch(() => [])
    setReferrals(s => ({ ...s, [uid]: data }))
    setLoadingRef(null)
  }

  const load = () => fetch(`${BASE}/admin/users`, { headers: h() }).then(r => r.json()).then(setUsers)
  useEffect(() => { load() }, [])

  /* Présence (page Staff) : staff en ligne, rafraîchi toutes les 15 s */
  const [onlineIds, setOnlineIds] = useState([])
  useEffect(() => {
    if (section !== 'staff') return
    const poll = () => fetch(`${BASE}/admin/online`, { headers: h() })
      .then(r => r.json()).then(rows => setOnlineIds(rows.map(r => r.id))).catch(() => {})
    poll()
    const t = setInterval(poll, 30000)
    return () => clearInterval(t)
  }, [section])

  const changeRole = async (id, role) => {
    setUpdating(id)
    await fetch(`${BASE}/admin/users/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ role }) })
    await load()
    setUpdating(null)
  }

  const deleteUser = async (u) => {
    const roleLabel = u.role === 'client' ? 'le client' : u.role === 'livreur' ? 'le livreur' : u.role === 'moderator' ? 'le modérateur' : "l'admin"
    if (!confirm(`Supprimer définitivement ${roleLabel} « ${u.name} » ?\nCette action est irréversible (commandes incluses).`)) return
    setUpdating(u.id)
    const res = await fetch(`${BASE}/admin/users/${u.id}`, { method: 'DELETE', headers: h() })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'Erreur'); setUpdating(null); return }
    setExpanded(null)
    await load()
    setUpdating(null)
  }

  const purgeInactive = async () => {
    const inactive = clients.filter(u => u.order_count === 0).length
    if (inactive === 0) { alert('Aucun client inactif à supprimer.'); return }
    if (!confirm(`Supprimer les ${inactive} client(s) sans aucune commande ?\nCette action est irréversible.`)) return
    setUpdating('purge')
    const res = await fetch(`${BASE}/admin/users/purge-inactive`, { method: 'POST', headers: h() })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { alert(d.error || 'Erreur'); setUpdating(null); return }
    await load()
    setUpdating(null)
    alert(`${d.deleted} client(s) inactif(s) supprimé(s).`)
  }

  const openModal = () => { setNewForm({ name: '', phone: '', password: '', role: tab === 'livreurs' ? 'livreur' : 'moderator' }); setNewError(''); setShowModal(true) }
  const closeModal = () => setShowModal(false)

  const createAdmin = async (e) => {
    e.preventDefault()
    setNewError('')
    if (!newForm.name.trim() || !newForm.phone.trim() || !newForm.password) { setNewError('Remplis tous les champs'); return }
    if (newForm.password.length < 8) { setNewError('Le mot de passe doit faire au moins 8 caractères'); return }
    setNewBusy(true)
    try {
      const res = await fetch(`${BASE}/admin/users`, { method: 'POST', headers: h(), body: JSON.stringify(newForm) })
      const data = await res.json()
      if (!res.ok) { setNewError(data.error || 'Erreur'); setNewBusy(false); return }
      await load()
      closeModal()
    } catch (err) { setNewError(err.message) }
    setNewBusy(false)
  }

  const staff    = users.filter(u => ['admin', 'moderator'].includes(u.role))
  const clients  = users.filter(u => u.role === 'client')
  const livreurs = users.filter(u => u.role === 'livreur')
  const base     = tab === 'staff' ? staff : tab === 'livreurs' ? livreurs : clients
  const list     = base.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  )

  const totalRevenue    = clients.reduce((s, u) => s + Number(u.total_spent), 0)
  const totalReferrals  = clients.reduce((s, u) => s + Number(u.referral_count), 0)
  const activeClients   = clients.filter(u => u.order_count > 0).length
  const inactiveClients = clients.filter(u => u.order_count === 0).length
  const isAdmin         = adminUser?.role === 'admin'

  /* Colonnes par onglet — le staff n'a ni fidélité, ni parrainage, ni dépenses */
  const isStaffView = tab === 'staff' || tab === 'livreurs'
  const columns = isStaffView
    ? ['Membre',
       ...(tab === 'staff' ? ['Ventes effectuées'] : []),
       'Inscrit le',
       ...(tab === 'staff' && isAdmin ? ['Accès'] : []),
       ...(isAdmin ? ['Actions'] : [])]
    : ['Client', 'Fidélité', 'Commandes', 'Total dépensé', 'Parrainages', 'Code parrain', 'Inscrit le',
       ...(isAdmin ? ['Actions'] : [])]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      {section === 'clients' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { icon: <Users size={15} />,      label: 'Total clients',    value: clients.length,                                   color: '#60a5fa' },
            { icon: <ShoppingBag size={15} />, label: 'Clients actifs',  value: activeClients,                                    color: '#22c55e' },
            { icon: <UserX size={15} />,       label: 'Clients inactifs', value: inactiveClients,                                  color: '#f87171' },
            { icon: <TrendingUp size={15} />,  label: 'Revenu total',    value: `Ar ${totalRevenue.toLocaleString('fr-FR')}`,     color: '#fbbf24' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f5' }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="adm-toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {(section === 'staff' ? [
          { id: 'staff',    label: `Admin & Modérateurs (${staff.length})`,    icon: <Shield size={13} /> },
          { id: 'livreurs', label: `Livreurs (${livreurs.length})`,            icon: <span style={{ fontSize: 13 }}>🛵</span> },
        ] : []).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.id ? 'rgba(255,153,0,0.1)' : 'rgba(255,255,255,0.03)',
              borderColor: tab === t.id ? 'rgba(255,153,0,0.3)' : 'rgba(255,255,255,0.08)',
              color: tab === t.id ? '#FF9900' : 'rgba(240,240,245,0.45)' }}>
            {t.icon} {t.label}
          </button>
        ))}
        {(tab === 'staff' || tab === 'livreurs') && adminUser?.role === 'admin' && (
          <button onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(255,153,0,0.3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'rgba(255,153,0,0.1)', color: '#FF9900' }}>
            <Plus size={14} /> {tab === 'livreurs' ? 'Ajouter un livreur' : 'Ajouter un admin'}
          </button>
        )}
        {tab === 'clients' && isAdmin && inactiveClients > 0 && (
          <button onClick={purgeInactive} disabled={updating === 'purge'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(248,113,113,0.3)', cursor: updating === 'purge' ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, background: 'rgba(248,113,113,0.1)', color: '#f87171', opacity: updating === 'purge' ? 0.6 : 1 }}>
            <UserX size={14} /> {updating === 'purge' ? 'Suppression…' : `Purger inactifs (${inactiveClients})`}
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 12px' }}>
          <Search size={13} color="rgba(240,240,245,0.3)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', width: 160, fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* Table */}
      <div className="adm-table-scroll" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {columns.map(c => (
                <th key={c} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((u, i) => {
              const loy = loyaltyBadge(Number(u.delivered_total ?? u.total_spent))
              const isOpen = expanded === u.id
              return (
                <React.Fragment key={u.id}>
                <tr onClick={() => setExpanded(isOpen ? null : u.id)}
                  style={{ borderBottom: isOpen ? 'none' : (i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'), cursor: 'pointer', background: isOpen ? 'rgba(255,255,255,0.02)' : 'none' }}>

                  {/* Client */}
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 9, background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#FF9900', flexShrink: 0 }}>
                        {u.name?.[0]?.toUpperCase()}
                        {tab === 'staff' && onlineIds.includes(u.id) && (
                          <span title="En ligne" style={{ position: 'absolute', bottom: -3, right: -3, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid #0c0c1a' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f0f0f5', fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', marginTop: 1 }}>{u.phone}</div>
                      </div>
                    </div>
                  </td>

                  {/* Ventes effectuées (staff) */}
                  {tab === 'staff' && (
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: u.order_count > 0 ? 700 : 400, color: u.order_count > 0 ? '#22c55e' : 'rgba(240,240,245,0.3)' }}>
                        {u.order_count > 0 ? `${u.order_count} vente${u.order_count > 1 ? 's' : ''}` : '—'}
                      </span>
                    </td>
                  )}

                  {/* Colonnes clients uniquement */}
                  {!isStaffView && (
                    <>
                      {/* Fidélité */}
                      <td style={{ padding: '13px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: loy.bg, color: loy.color, border: `1px solid ${loy.border}`, whiteSpace: 'nowrap' }}>
                          {loy.label}
                        </span>
                      </td>

                      {/* Commandes */}
                      <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: u.order_count > 0 ? 700 : 400, color: u.order_count > 0 ? '#f0f0f5' : 'rgba(240,240,245,0.3)' }}>
                          {u.order_count}
                        </span>
                      </td>

                      {/* Total dépensé */}
                      <td style={{ padding: '13px 14px', color: u.total_spent > 0 ? '#fbbf24' : 'rgba(240,240,245,0.25)', fontWeight: 600 }}>
                        Ar {Number(u.total_spent).toLocaleString('fr-FR')}
                      </td>

                      {/* Parrainages */}
                      <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                        {u.referral_count > 0 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
                            <Gift size={11} /> {u.referral_count}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(240,240,245,0.2)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Code parrain */}
                      <td style={{ padding: '13px 14px' }}>
                        {u.referral_code ? (
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(240,240,245,0.5)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
                            {u.referral_code}
                          </span>
                        ) : <span style={{ color: 'rgba(240,240,245,0.2)', fontSize: 12 }}>—</span>}
                      </td>
                    </>
                  )}

                  {/* Inscrit le */}
                  <td style={{ padding: '13px 14px', color: 'rgba(240,240,245,0.4)', fontSize: 12, whiteSpace: 'nowrap' }}>{u.date}</td>

                  {/* Accès (staff tab, admin only) */}
                  {tab === 'staff' && isAdmin && (
                    <td style={{ padding: '13px 14px' }} onClick={e => e.stopPropagation()}>
                      {u.id !== adminUser.id ? (
                        <AdminDropdown
                          value={u.role}
                          options={ROLE_OPTIONS}
                          onChange={role => changeRole(u.id, role)}
                          disabled={updating === u.id}
                          compact
                        />
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: ROLE_STYLE[u.role]?.bg, color: ROLE_STYLE[u.role]?.color, border: `1px solid ${ROLE_STYLE[u.role]?.border}` }}>
                          {u.role}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Actions — suppression (admin only) */}
                  {isAdmin && (
                    <td style={{ padding: '13px 14px' }} onClick={e => e.stopPropagation()}>
                      {u.id !== adminUser?.id ? (
                        <button onClick={() => deleteUser(u)} disabled={updating === u.id}
                          title="Supprimer le compte"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(248,113,113,0.25)', cursor: updating === u.id ? 'default' : 'pointer', background: 'rgba(248,113,113,0.08)', color: '#f87171', opacity: updating === u.id ? 0.5 : 1 }}>
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(240,240,245,0.2)' }}>—</span>
                      )}
                    </td>
                  )}

                </tr>

                {/* Expanded detail */}
                {isOpen && (
                  <tr style={{ borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td colSpan={columns.length} style={{ padding: '0 14px 14px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>

                        <InfoBlock label="Nom complet" value={u.name} />
                        <InfoBlock label="Téléphone" value={u.phone} mono />
                        <InfoBlock label="Inscrit le" value={u.date} />
                        {tab === 'staff' && <InfoBlock label="Ventes effectuées" value={u.order_count} />}
                        {tab === 'staff' && u.id === adminUser?.id && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Sécurité</div>
                            <button onClick={e => { e.stopPropagation(); setShowPwdModal(true) }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(255,153,0,0.3)', cursor: 'pointer', background: 'rgba(255,153,0,0.1)', color: '#FF9900', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                              <Lock size={12} /> Changer mot de passe
                            </button>
                          </div>
                        )}
                        {!isStaffView && (
                          <>
                            <LoyaltyScale current={loy.label} points={loy.points} />
                            <InfoBlock label="Commandes passées" value={u.order_count} />
                            <InfoBlock label="Total dépensé" value={`Ar ${Number(u.total_spent).toLocaleString('fr-FR')}`} highlight />
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Personnes invitées</div>
                              {u.referral_count > 0 ? (
                                <div>
                                  <button onClick={e => { e.stopPropagation(); loadReferrals(u.id) }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', marginBottom: 6 }}>
                                    <Gift size={11} /> {u.referral_count} invitation{u.referral_count > 1 ? 's' : ''}
                                  </button>
                                  {loadingRef === u.id && <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)' }}>Chargement…</div>}
                                  {referrals[u.id] && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {referrals[u.id].map(r => (
                                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                                          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#a78bfa', flexShrink: 0 }}>
                                            {r.name?.[0]?.toUpperCase()}
                                          </div>
                                          <span style={{ color: '#f0f0f5', fontWeight: 600 }}>{r.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : <span style={{ fontSize: 13, color: 'rgba(240,240,245,0.3)' }}>—</span>}
                            </div>
                            <InfoBlock label="Code parrain" value={
                              u.referral_code
                                ? <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#FF9900', fontWeight: 700 }}>{u.referral_code}</span>
                                : '—'
                            } />
                          </>
                        )}

                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
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

      {/* Password modal (own account) */}
      {showPwdModal && (
        <PasswordModal onClose={() => setShowPwdModal(false)} onDone={() => setShowPwdModal(false)} />
      )}

      {/* New admin modal */}
      {showModal && (
        <>
          <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, width: '100%', maxWidth: 420, background: 'rgba(12,12,22,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '28px 28px 24px', boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f0f5' }}>Nouveau membre admin</div>
                <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)', marginTop: 3 }}>Crée un compte admin ou modérateur</div>
              </div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'flex', color: 'rgba(240,240,245,0.5)' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={createAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ModalField placeholder="Nom complet" value={newForm.name} onChange={v => setNewForm(f => ({ ...f, name: v }))} />
              <ModalField placeholder="Numéro de téléphone" type="tel" value={newForm.phone} onChange={v => setNewForm(f => ({ ...f, phone: v.replace(/[^\d\s+]/g, '') }))} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  value={newForm.password}
                  onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#f0f0f5', fontFamily: 'inherit' }}
                />
                <button type="button" onClick={() => setShowPwd(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.35)', display: 'flex', padding: 0 }}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Role selector */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(tab === 'livreurs'
                  ? [{ value: 'livreur', label: 'Livreur', color: '#34d399' }]
                  : [{ value: 'moderator', label: 'Modérateur', color: '#60a5fa' }, { value: 'admin', label: 'Admin', color: '#FF9900' }]
                ).map(opt => (
                  <button key={opt.value} type="button" onClick={() => setNewForm(f => ({ ...f, role: opt.value }))}
                    style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
                      background: newForm.role === opt.value ? `${opt.color}18` : 'rgba(255,255,255,0.03)',
                      borderColor: newForm.role === opt.value ? `${opt.color}55` : 'rgba(255,255,255,0.08)',
                      color: newForm.role === opt.value ? opt.color : 'rgba(240,240,245,0.4)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {newError && (
                <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '9px 13px' }}>
                  {newError}
                </div>
              )}

              <button type="submit" disabled={newBusy}
                style={{ marginTop: 4, padding: '14px', borderRadius: 11, border: 'none', cursor: newBusy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                  background: newBusy ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #ca8a04, #d97706)', color: newBusy ? 'rgba(240,240,245,0.3)' : '#fff' }}>
                {newBusy ? '…' : 'Créer le compte'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

function LoyaltyScale({ current, points }) {
  const currentIdx = TIERS.findIndex(t => t.label === current)
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Fidélité · {points} pts</div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {TIERS.map((step, i) => {
          const active = i === currentIdx
          const passed = i < currentIdx
          return (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: active || passed ? step.color : 'rgba(255,255,255,0.1)', border: active ? `2px solid ${step.color}` : 'none', boxShadow: active ? `0 0 8px ${step.color}99` : 'none' }} />
                <span style={{ fontSize: 9, fontWeight: active ? 800 : 500, color: active ? step.color : passed ? 'rgba(240,240,245,0.35)' : 'rgba(240,240,245,0.2)', whiteSpace: 'nowrap' }}>
                  {step.label}
                </span>
              </div>
              {i < TIERS.length - 1 && (
                <div style={{ width: 28, height: 1, background: i < currentIdx ? TIERS[i].color : 'rgba(255,255,255,0.1)', marginBottom: 14 }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ModalField({ onChange, ...props }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
      <input {...props} onChange={e => onChange(e.target.value)} inputMode={props.type === 'tel' ? 'tel' : undefined}
        style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#f0f0f5', fontFamily: 'inherit' }} />
    </div>
  )
}

function InfoBlock({ label, value, mono, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,240,245,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: highlight ? '#fbbf24' : '#f0f0f5', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}
