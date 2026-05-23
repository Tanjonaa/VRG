import React, { useState, useEffect } from 'react'
import { Megaphone, Truck, Phone, Save, Check, Radio, Plus, Trash2, GripVertical } from 'lucide-react'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const TABS = [
  { id: 'ticker',       label: 'Ticker',    icon: Radio },
  { id: 'announcement', label: 'Annonces',  icon: Megaphone },
  { id: 'delivery',     label: 'Livraison', icon: Truck },
  { id: 'contact',      label: 'Contact',   icon: Phone },
]

const DEFAULT_TICKER = [
  { text: 'Finger Sleeves Gaming dispo maintenant' },
  { text: 'Livraison 24h sur Antananarivo' },
  { text: '+1 200 gamers équipés à Madagascar' },
  { text: 'Ventilateurs Turbo — stock limité' },
  { text: 'Garantie 6 mois sur tous les produits' },
  { text: 'Support WhatsApp 7j/7 — réponse en 5 min' },
]

const DEFAULTS = {
  announcement_active:       '0',
  announcement_text:         '',
  announcement_color:        '#FF9900',
  reassurance_text:          'Livraison gratuite Antananarivo · Paiement à la livraison · Retour sous 7 jours',
  delivery_fee_tana:         '3000',
  delivery_fee_peripherique: '5000',
  whatsapp:                  '',
  business_hours:            '',
}

export default function Settings() {
  const [tab,          setTab]          = useState('ticker')
  const [values,       setValues]       = useState(DEFAULTS)
  const [tickerItems,  setTickerItems]  = useState(DEFAULT_TICKER)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState(null)
  const [newItem,      setNewItem]      = useState('')

  useEffect(() => {
    fetch(`${BASE}/admin/settings`, { headers: h() })
      .then(r => r.json())
      .then(data => {
        setValues(v => ({ ...v, ...data }))
        if (data.marquee_items) {
          try {
            const parsed = JSON.parse(data.marquee_items)
            if (Array.isArray(parsed) && parsed.length > 0) setTickerItems(parsed)
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }))

  const addItem = () => {
    const t = newItem.trim()
    if (!t) return
    setTickerItems(items => [...items, { text: t }])
    setNewItem('')
  }

  const removeItem = (i) => setTickerItems(items => items.filter((_, idx) => idx !== i))

  const updateItem = (i, text) => setTickerItems(items => items.map((item, idx) => idx === i ? { text } : item))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const settings = [
        ...Object.entries(values).map(([key, value]) => ({ key, value })),
        { key: 'marquee_items', value: JSON.stringify(tickerItems) },
      ]
      const res = await fetch(`${BASE}/admin/settings`, {
        method: 'PUT',
        headers: h(),
        body: JSON.stringify({ settings }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const card = (children) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
      {children}
    </div>
  )

  const lbl = (text, sub) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>{text}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.4)', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  const inp = (key, type = 'text', placeholder = '') => (
    <input type={type} value={values[key]} placeholder={placeholder} onChange={e => set(key, e.target.value)}
      style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
  )

  const ta = (key, placeholder = '', rows = 3) => (
    <textarea value={values[key]} placeholder={placeholder} rows={rows} onChange={e => set(key, e.target.value)}
      style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
  )

  return (
    <div style={{ maxWidth: 700 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: active ? 'rgba(255,153,0,0.15)' : 'none', color: active ? '#FF9900' : 'rgba(240,240,245,0.45)', fontSize: 13, fontWeight: active ? 700 : 500 }}>
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Ticker ── */}
      {tab === 'ticker' && card(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5', marginBottom: 4 }}>Messages du ticker (bannière défilante)</div>

          {/* Liste */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tickerItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GripVertical size={14} color="rgba(240,240,245,0.2)" style={{ flexShrink: 0 }} />
                <input
                  value={item.text}
                  onChange={e => updateItem(i, e.target.value)}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', fontSize: 13, outline: 'none' }}
                />
                <button onClick={() => removeItem(i)}
                  style={{ flexShrink: 0, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer', padding: '7px 10px', color: '#f87171', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Ajouter */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="Nouveau message…"
              onKeyDown={e => e.key === 'Enter' && addItem()}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,153,0,0.25)', background: 'rgba(255,255,255,0.04)', color: '#f0f0f5', fontSize: 13, outline: 'none' }}
            />
            <button onClick={addItem}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(255,153,0,0.3)', background: 'rgba(255,153,0,0.1)', color: '#FF9900', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Ajouter
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.3)' }}>
            Les messages défilent en boucle en bas de la page. Entrée pour ajouter rapidement.
          </div>
        </div>
      )}

      {/* ── Annonces ── */}
      {tab === 'announcement' && card(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5', marginBottom: 4 }}>Bannière d'annonce</div>

          {values.announcement_text && (
            <div style={{ padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, textAlign: 'center', background: values.announcement_color + '22', border: `1px solid ${values.announcement_color}44`, color: values.announcement_color, opacity: values.announcement_active === '1' ? 1 : 0.4 }}>
              {values.announcement_active !== '1' && <span style={{ marginRight: 6, fontSize: 11 }}>(désactivé)</span>}
              {values.announcement_text}
            </div>
          )}

          <div>
            {lbl('Activée')}
            <div style={{ display: 'flex', gap: 8 }}>
              {[['1', 'Oui'], ['0', 'Non']].map(([val, label]) => (
                <button key={val} onClick={() => set('announcement_active', val)}
                  style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: values.announcement_active === val ? 'rgba(255,153,0,0.15)' : 'rgba(255,255,255,0.03)', borderColor: values.announcement_active === val ? 'rgba(255,153,0,0.4)' : 'rgba(255,255,255,0.1)', color: values.announcement_active === val ? '#FF9900' : 'rgba(240,240,245,0.4)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            {lbl('Texte de l\'annonce', 'Affiché en haut du site')}
            {ta('announcement_text', 'Ex : Livraison gratuite ce weekend !', 2)}
          </div>

          <div>
            {lbl('Couleur')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="color" value={values.announcement_color} onChange={e => set('announcement_color', e.target.value)}
                style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', cursor: 'pointer', padding: 2 }} />
              <span style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)', fontFamily: 'monospace' }}>{values.announcement_color}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#FF9900', '#22c55e', '#60a5fa', '#f87171', '#a78bfa'].map(c => (
                  <button key={c} onClick={() => set('announcement_color', c)}
                    style={{ width: 22, height: 22, borderRadius: 99, background: c, border: values.announcement_color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Livraison ── */}
      {tab === 'delivery' && card(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5', marginBottom: 4 }}>Frais de livraison</div>

          <div>
            {lbl('Zone Tananarive (Tana)', 'Frais appliqués dans Antananarivo')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {inp('delivery_fee_tana', 'number', '3000')}
              <span style={{ color: 'rgba(240,240,245,0.4)', fontSize: 13, whiteSpace: 'nowrap' }}>Ar</span>
            </div>
          </div>

          <div>
            {lbl('Zone Périphérique', 'Frais pour les zones hors Tana')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {inp('delivery_fee_peripherique', 'number', '5000')}
              <span style={{ color: 'rgba(240,240,245,0.4)', fontSize: 13, whiteSpace: 'nowrap' }}>Ar</span>
            </div>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)', fontSize: 12, color: 'rgba(96,165,250,0.8)' }}>
            Ces tarifs sont affichés au client lors de la commande. Les commandes existantes conservent les frais enregistrés à la création.
          </div>
        </div>
      )}

      {/* ── Contact ── */}
      {tab === 'contact' && card(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f5', marginBottom: 4 }}>Informations de contact</div>

          <div>
            {lbl('Numéro WhatsApp', 'Format international ex : +261341234567')}
            {inp('whatsapp', 'tel', '+261...')}
          </div>

          <div>
            {lbl('Horaires d\'ouverture', 'Affiché sur la page d\'accueil / checkout')}
            {ta('business_hours', 'Ex : Lun–Sam 8h–18h\nDimanche fermé', 3)}
          </div>
        </div>
      )}

      {/* Save bar */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, border: `1px solid ${saved ? 'rgba(34,197,94,0.3)' : 'rgba(255,153,0,0.3)'}`, cursor: saving ? 'default' : 'pointer', background: saved ? 'rgba(34,197,94,0.15)' : 'rgba(255,153,0,0.15)', color: saved ? '#22c55e' : '#FF9900', fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
          {saved ? <><Check size={15} /> Sauvegardé</> : <><Save size={15} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}</>}
        </button>
        {error && <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>}
      </div>
    </div>
  )
}