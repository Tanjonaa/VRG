import React, { useState, useEffect, useRef } from 'react'
import { Radio, Layout, Star, Image, Package, Megaphone, Truck, Phone, Save, Check, Plus, Trash2, GripVertical, Upload, Clock, FileText } from 'lucide-react'

const BASE = '/api'
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })
const hAuth = () => ({ Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const SECTIONS = [
  { id: 'comingsoon',   label: 'Coming Soon', icon: Clock,     desc: 'Mode maintenance' },
  { id: 'ticker',       label: 'Ticker',      icon: Radio,     desc: 'Messages défilants' },
  { id: 'hero',         label: 'Héro',        icon: Layout,    desc: 'Section principale' },
  { id: 'features',     label: 'Avantages',   icon: Star,      desc: '3 cartes produits' },
  { id: 'gallery',      label: 'Galerie',     icon: Image,     desc: 'Titres galerie' },
  { id: 'pricing',      label: 'Packs',       icon: Package,   desc: 'Offres & tarifs' },
  { id: 'cta',          label: 'CTA',         icon: Megaphone, desc: 'Appel à l\'action' },
  { id: 'delivery',     label: 'Livraison',   icon: Truck,     desc: 'Frais de livraison' },
  { id: 'contact',      label: 'Contact',     icon: Phone,     desc: 'WhatsApp & horaires' },
  { id: 'billing',      label: 'Facturation', icon: FileText,  desc: 'Mentions légales factures' },
]

/* ── Defaults ── */
const DEF = {
  delivery_fee_tana: '3000', delivery_fee_peripherique: '5000',
  reassurance_text: 'La livraison sera disponible dans tous les lieux - Antananarivo · Paiement à la livraison · Retour sous 7 jours',
  whatsapp: '', business_hours: '', facebook: '', instagram: '',
  coming_soon: '0', coming_soon_date: '',
  coming_soon_message: 'Nous préparons quelque chose d\'exceptionnel. La boutique ouvre bientôt !',
  pricing_hidden: '0',
  company_legal_name: 'VaRyGasy', company_nif: '', company_stat: '',
  company_address: 'Antananarivo, Madagascar', company_phone: '', company_email: '',
  invoice_tva_percent: '0',
  invoice_footer: 'Merci de votre confiance. VaRyGasy — accessoires mobile & gaming à Madagascar.',
}
const DEF_TICKER = [
  { text: 'Finger Sleeves Gaming dispo maintenant' },
  { text: 'Livraison 24h sur Antananarivo' },
  { text: '+1 200 gamers équipés à Madagascar' },
  { text: 'Ventilateurs Turbo — stock limité' },
  { text: 'Garantie 6 mois sur tous les produits' },
  { text: 'Support WhatsApp 7j/7 — réponse en 5 min' },
]
const DEF_HERO = { badge: '🔥 Livraison gratuite ce weekend — Antananarivo', title_1: 'Domine le jeu mobile.', title_2: 'Équipe-toi maintenant.', subtitle: 'Finger sleeves anti-transpiration, ventilateurs de refroidissement et accessoires gaming pour dominer sur PUBG Mobile, Free Fire et MLBB — livrés chez toi à Madagascar.', btn_primary: 'Commander via WhatsApp', btn_secondary: 'Voir les produits', social_proof: '+1 200 gamers équipés à Madagascar' }
const DEF_FEATURES = { badge: 'Pourquoi VaRyGasy ?', title_1: 'Tout ce qu\'il faut pour', title_2: 'dominer sur mobile', subtitle: 'Des accessoires pensés pour les gamers mobiles malgaches — qualité pro, prix accessibles.', cards: [{ title: 'Finger Sleeves Pro', description: 'Ultra-fins 0.4mm en nylon argenté anti-transpiration. Précision maximale sur écran tactile pour PUBG Mobile, Free Fire et MLBB. Plus de glissement, plus de contrôle.', points: ['Anti-transpiration', 'Sensibilité 100%', 'Taille universelle', 'Lavables & durables'], metrics: [{ value: '0.4', label: 'mm épaisseur' }, { value: '360', label: '° sensibilité' }] }, { title: 'Ventilateur de Refroidissement', description: 'Élimine la surchauffe pendant les longues sessions de jeu. Clip universel compatible tous smartphones. Silencieux ≤25dB, ne gêne pas ta concentration.', points: ['−15°C en 2 min', 'Compatible USB-C & Jack', '≤25dB silencieux', 'Autonomie illimitée'], metrics: [{ value: '15', label: '°C de moins' }, { value: '25', label: 'dB max' }] }, { title: 'Livraison Rapide & Sûre', description: 'Commande le matin, reçois le soir. Livraison 24h sur Antananarivo, 3-5 jours dans toute l\'île. Paiement à la livraison disponible — aucun risque pour toi.', points: ['24h Antananarivo', '3-5j toute l\'île', 'Paiement à la livraison', 'Retour sous 7 jours'], metrics: [{ value: '24', label: 'h livraison Tana' }, { value: '7', label: 'j retour garanti' }] }] }
const DEF_GALLERY = { badge: 'Nos produits', title_1: 'Accessoires', title_2: 'mobile gaming', subtitle: 'Cliquer sur un produit pour commander via WhatsApp' }
const DEF_PRICING = { badge: 'Nos packs', title_1: 'Choisis ton pack,', title_2: 'commande en 1 clic', subtitle: 'Paiement unique à la livraison — pas d\'abonnement, pas de surprise.', plans: [{ name: 'Pack Essentiel', price: 25000, description: 'L\'essentiel pour bien démarrer avec les accessoires gaming.', features: ['1 paire de finger sleeves', '1 ventilateur pour téléphone', 'Livraison gratuite Antananarivo', 'Garantie 3 mois', 'Support WhatsApp'] }, { name: 'Pack Gamer', price: 55000, description: 'Le pack complet pour les vrais gamers mobiles.', badge: 'Le plus populaire', features: ['3 paires de finger sleeves', '1 ventilateur turbo refroidissement', '1 support téléphone réglable', '1 câble fast-charge 100W', 'Livraison 24h Antananarivo', 'Garantie 6 mois', 'Support prioritaire'] }, { name: 'Pack Premium', price: 95000, description: 'L\'équipement ultime pour dominer sur mobile.', features: ['Tout le Pack Gamer', '5 paires de finger sleeves premium', '1 ventilateur semi-conducteur', '1 powerbank 20 000mAh', '1 écouteur gaming Bluetooth', 'Livraison express toute l\'île', 'Garantie 1 an', 'Support dédié 24/7'] }] }
const DEF_CTA = { title_1: 'Prêt à passer au niveau', title_2: 'supérieur ?', subtitle: 'Envoie-nous un message WhatsApp — on te répond en moins de 5 minutes et on gère ta livraison dans la journée.', btn_whatsapp: 'Commander sur WhatsApp', btn_products: 'Voir tous les produits', guarantees: [{ label: 'Livraison 24h', sub: 'Antananarivo' }, { label: 'Garantie 6 mois', sub: 'Sur tous les produits' }, { label: 'Retour 7 jours', sub: 'Sans question' }, { label: 'Support WhatsApp', sub: '7j/7 disponible' }] }

const parse = (json, def) => { try { if (!json) return def; return { ...def, ...JSON.parse(json) } } catch { return def } }

/* ── Shared input components ── */
const inp = (val, onChange, type = 'text', placeholder = '') => (
  <input type={type} value={val ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)}
    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
)
const ta = (val, onChange, placeholder = '', rows = 2) => (
  <textarea value={val ?? ''} placeholder={placeholder} rows={rows} onChange={e => onChange(e.target.value)}
    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
)
const lbl = (text, sub) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(240,240,245,0.7)' }}>{text}</div>
    {sub && <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', marginTop: 1 }}>{sub}</div>}
  </div>
)
const field = (label, subtext, children) => (
  <div>
    {lbl(label, subtext)}
    {children}
  </div>
)
const card = children => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
    {children}
  </div>
)
const sectionTitle = text => <div style={{ fontSize: 13, fontWeight: 700, color: '#FF9900', marginBottom: 4 }}>{text}</div>

export default function Settings() {
  const [section, setSection]   = useState('ticker')
  const [flat,    setFlat]      = useState(DEF)
  const [ticker,  setTicker]    = useState(DEF_TICKER)
  const [hero,    setHero]      = useState(DEF_HERO)
  const [feat,    setFeat]      = useState(DEF_FEATURES)
  const [gallery, setGallery]   = useState(DEF_GALLERY)
  const [pricing, setPricing]   = useState(DEF_PRICING)
  const [cta,     setCta]       = useState(DEF_CTA)
  const [newItem,      setNewItem]      = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState(null)
  const [uploadingCard, setUploadingCard] = useState(null) // index de la carte en cours d'upload
  const fileRefs = [useRef(null), useRef(null), useRef(null)]

  const uploadCardImage = async (ci, file) => {
    if (!file) return
    setUploadingCard(ci)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`${BASE}/admin/upload`, { method: 'POST', headers: hAuth(), body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur upload')
      setFeat(s => ({ ...s, cards: s.cards.map((c, i) => i === ci ? { ...c, img: data.src } : c) }))
    } catch (e) { setError(e.message) }
    finally { setUploadingCard(null) }
  }

  useEffect(() => {
    fetch(`${BASE}/admin/settings`, { headers: h() })
      .then(r => r.json())
      .then(data => {
        setFlat(v => ({ ...v, ...data }))
        if (data.marquee_items)  { try { const p = JSON.parse(data.marquee_items); if (Array.isArray(p) && p.length) setTicker(p) } catch {} }
        if (data.hero_content)     setHero(parse(data.hero_content, DEF_HERO))
        if (data.features_content) setFeat(parse(data.features_content, DEF_FEATURES))
        if (data.gallery_content)  setGallery(parse(data.gallery_content, DEF_GALLERY))
        if (data.pricing_content)  setPricing(parse(data.pricing_content, DEF_PRICING))
        if (data.cta_content)      setCta(parse(data.cta_content, DEF_CTA))
      })
      .catch(() => {})
  }, [])

  const setF = key => val => setFlat(v => ({ ...v, [key]: val }))
  const setH = key => val => setHero(v => ({ ...v, [key]: val }))
  const setFt = key => val => setFeat(v => ({ ...v, [key]: val }))
  const setG = key => val => setGallery(v => ({ ...v, [key]: val }))
  const setP = key => val => setPricing(v => ({ ...v, [key]: val }))
  const setC = key => val => setCta(v => ({ ...v, [key]: val }))

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const settings = [
        ...Object.entries(flat).map(([key, value]) => ({ key, value })),
        { key: 'marquee_items',   value: JSON.stringify(ticker) },
        { key: 'hero_content',    value: JSON.stringify(hero) },
        { key: 'features_content',value: JSON.stringify(feat) },
        { key: 'gallery_content', value: JSON.stringify(gallery) },
        { key: 'pricing_content', value: JSON.stringify(pricing) },
        { key: 'cta_content',     value: JSON.stringify(cta) },
      ]
      const res = await fetch(`${BASE}/admin/settings`, { method: 'PUT', headers: h(), body: JSON.stringify({ settings }) })
      if (!res.ok) throw new Error()
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { setError('Erreur lors de la sauvegarde') }
    finally { setSaving(false) }
  }

  return (
    <div className="adm-stack" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 900 }}>

      {/* Sidebar */}
      <div className="adm-settings-nav" style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {SECTIONS.map(({ id, label, icon: Icon, desc }) => {
          const active = section === id
          return (
            <button key={id} onClick={() => setSection(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: active ? 'rgba(255,153,0,0.12)' : 'none', color: active ? '#FF9900' : 'rgba(240,240,245,0.5)' }}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{label}</div>
                <div style={{ fontSize: 10, color: active ? 'rgba(255,153,0,0.6)' : 'rgba(240,240,245,0.3)', marginTop: 1 }}>{desc}</div>
              </div>
            </button>
          )
        })}

        {/* Save button in sidebar */}
        <div style={{ marginTop: 16 }}>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: `1px solid ${saved ? 'rgba(34,197,94,0.3)' : 'rgba(255,153,0,0.3)'}`, cursor: saving ? 'default' : 'pointer', background: saved ? 'rgba(34,197,94,0.15)' : 'rgba(255,153,0,0.15)', color: saved ? '#22c55e' : '#FF9900', fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1, width: '100%' }}>
            {saved ? <><Check size={14} /> Sauvegardé</> : <><Save size={14} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}</>}
          </button>
          {error && <div style={{ fontSize: 11, color: '#f87171', marginTop: 6, textAlign: 'center' }}>{error}</div>}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── COMING SOON ── */}
        {section === 'comingsoon' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Toggle principal */}
          {card(<>
            {sectionTitle('Activation')}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>Mode Coming Soon</div>
                <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', marginTop: 3 }}>
                  Remplace le site par la page d'attente avec compte à rebours
                </div>
              </div>
              <button
                onClick={() => setFlat(v => ({ ...v, coming_soon: v.coming_soon === '1' ? '0' : '1' }))}
                style={{
                  width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: flat.coming_soon === '1' ? '#FF9900' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                <span style={{
                  position: 'absolute', top: 3,
                  left: flat.coming_soon === '1' ? 26 : 3,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
            {flat.coming_soon === '1' && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.2)', fontSize: 12, color: '#FF9900', fontWeight: 600 }}>
                Le site est actuellement en mode Coming Soon — les visiteurs voient la page d'attente
              </div>
            )}
          </>)}

          {/* Date cible */}
          {card(<>
            {sectionTitle('Date et heure d\'ouverture')}
            {field('Date cible', 'Laisse vide pour afficher la page sans compte à rebours',
              <input
                type="datetime-local"
                value={flat.coming_soon_date || ''}
                onChange={e => setFlat(v => ({ ...v, coming_soon_date: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
              />
            )}
          </>)}

          {/* Message */}
          {card(<>
            {sectionTitle('Message affiché')}
            {field('Texte sous le titre', 'Visible sur la page d\'attente',
              ta(flat.coming_soon_message, v => setFlat(fv => ({ ...fv, coming_soon_message: v })), 'Nous préparons quelque chose…', 3)
            )}
          </>)}
        </div>}

        {/* ── TICKER ── */}
        {section === 'ticker' && card(<>
          {sectionTitle('Messages du ticker')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ticker.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GripVertical size={13} color="rgba(240,240,245,0.2)" style={{ flexShrink: 0 }} />
                {inp(item.text, v => setTicker(t => t.map((x, idx) => idx === i ? { text: v } : x)))}
                <button onClick={() => setTicker(t => t.filter((_, idx) => idx !== i))}
                  style={{ flexShrink: 0, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, cursor: 'pointer', padding: '7px 9px', color: '#f87171', display: 'flex' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Nouveau message…"
              onKeyDown={e => { if (e.key === 'Enter' && newItem.trim()) { setTicker(t => [...t, { text: newItem.trim() }]); setNewItem('') } }}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,153,0,0.25)', background: 'rgba(255,255,255,0.04)', color: '#f0f0f5', fontSize: 13, outline: 'none' }} />
            <button onClick={() => { if (newItem.trim()) { setTicker(t => [...t, { text: newItem.trim() }]); setNewItem('') } }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,153,0,0.3)', background: 'rgba(255,153,0,0.1)', color: '#FF9900', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={13} /> Ajouter
            </button>
          </div>
        </>)}

        {/* ── HERO ── */}
        {section === 'hero' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card(<>
            {sectionTitle('Badge urgence')}
            {field('Texte du badge (haut de page)', null, inp(hero.badge, setH('badge')))}
          </>)}
          {card(<>
            {sectionTitle('Titre principal')}
            {field('Ligne 1', null, inp(hero.title_1, setH('title_1')))}
            {field('Ligne 2 (orange)', null, inp(hero.title_2, setH('title_2')))}
          </>)}
          {card(<>
            {sectionTitle('Sous-titre')}
            {field(null, null, ta(hero.subtitle, setH('subtitle'), '', 3))}
          </>)}
          {card(<>
            {sectionTitle('Boutons')}
            {field('Bouton principal (WhatsApp)', null, inp(hero.btn_primary, setH('btn_primary')))}
            {field('Bouton secondaire', null, inp(hero.btn_secondary, setH('btn_secondary')))}
          </>)}
          {card(<>
            {sectionTitle('Social proof')}
            {field('Texte sous les boutons', 'Ex : +1 200 gamers équipés à Madagascar', inp(hero.social_proof, setH('social_proof')))}
          </>)}
        </div>}

        {/* ── FEATURES ── */}
        {section === 'features' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card(<>
            {sectionTitle('En-tête section')}
            {field('Badge', null, inp(feat.badge, setFt('badge')))}
            {field('Titre ligne 1', null, inp(feat.title_1, setFt('title_1')))}
            {field('Titre ligne 2 (orange)', null, inp(feat.title_2, setFt('title_2')))}
            {field('Sous-titre', null, ta(feat.subtitle, setFt('subtitle')))}
          </>)}
          {(feat.cards || []).map((card_data, ci) => (
            <div key={ci} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sectionTitle(`Carte ${ci + 1}`)}

              {/* Image upload */}
              <div>
                {lbl('Image', 'Affichée en haut de la carte')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {card_data.img ? (
                    <img src={card_data.img} alt="carte"
                      style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 80, height: 60, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Image size={20} color="rgba(240,240,245,0.2)" />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input ref={fileRefs[ci]} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => uploadCardImage(ci, e.target.files[0])} />
                    <button onClick={() => fileRefs[ci].current?.click()} disabled={uploadingCard === ci}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', fontSize: 12, fontWeight: 600, cursor: uploadingCard === ci ? 'default' : 'pointer', opacity: uploadingCard === ci ? 0.6 : 1 }}>
                      <Upload size={13} />
                      {uploadingCard === ci ? 'Upload…' : 'Changer l\'image'}
                    </button>
                    {card_data.img && (
                      <button onClick={() => setFeat(s => ({ ...s, cards: s.cards.map((c, i) => i === ci ? { ...c, img: undefined } : c) }))}
                        style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                        Remettre l'image par défaut
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {field('Titre', null, inp(card_data.title, v => setFeat(s => ({ ...s, cards: s.cards.map((c, i) => i === ci ? { ...c, title: v } : c) }))))}
              {field('Description', null, ta(card_data.description, v => setFeat(s => ({ ...s, cards: s.cards.map((c, i) => i === ci ? { ...c, description: v } : c) })), '', 3))}
              {field('Points (un par ligne)', null, ta((card_data.points || []).join('\n'), v => setFeat(s => ({ ...s, cards: s.cards.map((c, i) => i === ci ? { ...c, points: v.split('\n').filter(Boolean) } : c) })), '', 4))}
              <div>
                {lbl('Métriques', '2 chiffres affichés en bas de la carte')}
                <div className="adm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(card_data.metrics || []).map((m, mi) => (
                    <div key={mi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 10, color: 'rgba(240,240,245,0.3)', fontWeight: 600 }}>VALEUR {mi + 1}</div>
                      {inp(m.value, v => setFeat(s => ({ ...s, cards: s.cards.map((c, i) => i === ci ? { ...c, metrics: c.metrics.map((mx, mxi) => mxi === mi ? { ...mx, value: v } : mx) } : c) })))}
                      <div style={{ fontSize: 10, color: 'rgba(240,240,245,0.3)', fontWeight: 600 }}>LABEL {mi + 1}</div>
                      {inp(m.label, v => setFeat(s => ({ ...s, cards: s.cards.map((c, i) => i === ci ? { ...c, metrics: c.metrics.map((mx, mxi) => mxi === mi ? { ...mx, label: v } : mx) } : c) })))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>}

        {/* ── GALLERY ── */}
        {section === 'gallery' && card(<>
          {sectionTitle('En-tête galerie')}
          {field('Badge', null, inp(gallery.badge, setG('badge')))}
          {field('Titre ligne 1', null, inp(gallery.title_1, setG('title_1')))}
          {field('Titre ligne 2 (orange)', null, inp(gallery.title_2, setG('title_2')))}
          {field('Sous-titre', null, inp(gallery.subtitle, setG('subtitle')))}
        </>)}

        {/* ── PRICING ── */}
        {section === 'pricing' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card(<>
            {sectionTitle('Affichage')}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>Masquer la section Packs</div>
                <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)', marginTop: 3 }}>
                  Cache toute la section Packs sur le site public (les réglages ci-dessous sont conservés)
                </div>
              </div>
              <button
                onClick={() => setFlat(v => ({ ...v, pricing_hidden: v.pricing_hidden === '1' ? '0' : '1' }))}
                style={{
                  width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: flat.pricing_hidden === '1' ? '#FF9900' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                <span style={{
                  position: 'absolute', top: 3,
                  left: flat.pricing_hidden === '1' ? 26 : 3,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
            {flat.pricing_hidden === '1' && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.2)', fontSize: 12, color: '#FF9900', fontWeight: 600 }}>
                La section Packs est actuellement masquée sur le site.
              </div>
            )}
          </>)}
          {card(<>
            {sectionTitle('En-tête section packs')}
            {field('Badge', null, inp(pricing.badge, setP('badge')))}
            {field('Titre ligne 1', null, inp(pricing.title_1, setP('title_1')))}
            {field('Titre ligne 2 (orange)', null, inp(pricing.title_2, setP('title_2')))}
            {field('Sous-titre', null, ta(pricing.subtitle, setP('subtitle')))}
          </>)}
          {(pricing.plans || []).map((plan, pi) => (
            <div key={pi} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sectionTitle(`Pack ${pi + 1}`)}
              {field('Nom', null, inp(plan.name, v => setPricing(s => ({ ...s, plans: s.plans.map((p, i) => i === pi ? { ...p, name: v } : p) }))))}
              <div className="adm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {field('Prix (Ar)', null, inp(String(plan.price), v => setPricing(s => ({ ...s, plans: s.plans.map((p, i) => i === pi ? { ...p, price: Number(v) || 0 } : p) })), 'number'))}
                {field('Badge populaire (optionnel)', null, inp(plan.badge || '', v => setPricing(s => ({ ...s, plans: s.plans.map((p, i) => i === pi ? { ...p, badge: v || undefined } : p) })), 'text', 'Ex : Le plus populaire'))}
              </div>
              {field('Description courte', null, ta(plan.description, v => setPricing(s => ({ ...s, plans: s.plans.map((p, i) => i === pi ? { ...p, description: v } : p) }))))}
              {field('Inclus (un par ligne)', null, ta((plan.features || []).join('\n'), v => setPricing(s => ({ ...s, plans: s.plans.map((p, i) => i === pi ? { ...p, features: v.split('\n').filter(Boolean) } : p) })), '', 6))}
            </div>
          ))}
        </div>}

        {/* ── CTA ── */}
        {section === 'cta' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card(<>
            {sectionTitle('Titre et sous-titre')}
            {field('Titre ligne 1', null, inp(cta.title_1, setC('title_1')))}
            {field('Titre ligne 2 (orange)', null, inp(cta.title_2, setC('title_2')))}
            {field('Sous-titre', null, ta(cta.subtitle, setC('subtitle'), '', 3))}
          </>)}
          {card(<>
            {sectionTitle('Boutons')}
            {field('Bouton WhatsApp', null, inp(cta.btn_whatsapp, setC('btn_whatsapp')))}
            {field('Bouton secondaire', null, inp(cta.btn_products, setC('btn_products')))}
          </>)}
          {card(<>
            {sectionTitle('4 garanties (icônes fixes)')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(cta.guarantees || []).map((g, gi) => (
                <div key={gi} className="adm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {inp(g.label, v => setCta(s => ({ ...s, guarantees: s.guarantees.map((x, i) => i === gi ? { ...x, label: v } : x) })))}
                  {inp(g.sub, v => setCta(s => ({ ...s, guarantees: s.guarantees.map((x, i) => i === gi ? { ...x, sub: v } : x) })))}
                </div>
              ))}
            </div>
          </>)}
        </div>}

        {/* ── DELIVERY ── */}
        {section === 'delivery' && card(<>
          {sectionTitle('Frais de livraison')}
          {field('Zone Tananarive (Ar)', 'Frais dans Antananarivo',
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {inp(flat.delivery_fee_tana, setF('delivery_fee_tana'), 'number', '3000')}
              <span style={{ color: 'rgba(240,240,245,0.35)', fontSize: 12, whiteSpace: 'nowrap' }}>Ar</span>
            </div>
          )}
          {field('Zone Périphérique (Ar)', 'Frais hors Tana',
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {inp(flat.delivery_fee_peripherique, setF('delivery_fee_peripherique'), 'number', '5000')}
              <span style={{ color: 'rgba(240,240,245,0.35)', fontSize: 12, whiteSpace: 'nowrap' }}>Ar</span>
            </div>
          )}
          <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)', fontSize: 12, color: 'rgba(96,165,250,0.7)' }}>
            Les commandes existantes conservent les frais enregistrés à la création.
          </div>
          {sectionTitle('Bandeau de réassurance')}
          {field('Texte affiché sous les tarifs et le CTA', 'Séparez les arguments par « · ». Affiché sur la page d\'accueil.',
            ta(flat.reassurance_text, setF('reassurance_text'), 'La livraison sera disponible dans tous les lieux - Antananarivo · Paiement à la livraison · Retour sous 7 jours', 3))}
        </>)}

        {/* ── CONTACT ── */}
        {section === 'contact' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card(<>
            {sectionTitle('Contact & horaires')}
            {field('Numéro WhatsApp', 'Format international ex : +261341234567', inp(flat.whatsapp, setF('whatsapp'), 'tel', '+261...'))}
            {field('Horaires d\'ouverture', null, ta(flat.business_hours, setF('business_hours'), 'Ex : Lun–Sam 8h–18h\nDimanche fermé', 3))}
          </>)}
          {card(<>
            {sectionTitle('Réseaux sociaux (footer)')}
            {field('Facebook', 'URL de la page Facebook', inp(flat.facebook, setF('facebook'), 'url', 'https://facebook.com/...'))}
            {field('Instagram', 'URL du profil Instagram', inp(flat.instagram, setF('instagram'), 'url', 'https://instagram.com/...'))}
          </>)}
        </div>}

        {/* ── FACTURATION ── */}
        {section === 'billing' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card(<>
            {sectionTitle('Identité sur les factures')}
            <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.4)', marginBottom: 6 }}>
              Ces informations apparaissent en en-tête des factures PDF générées automatiquement à chaque livraison.
            </div>
            {field('Nom / raison sociale', null, inp(flat.company_legal_name, setF('company_legal_name'), 'text', 'VaRyGasy'))}
            {field('Adresse', null, inp(flat.company_address, setF('company_address'), 'text', 'Antananarivo, Madagascar'))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {field('Téléphone', null, inp(flat.company_phone, setF('company_phone'), 'tel', '+261...'))}
              {field('Email', null, inp(flat.company_email, setF('company_email'), 'email', 'contact@...'))}
            </div>
          </>)}
          {card(<>
            {sectionTitle('Mentions légales (optionnel)')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {field('NIF', 'Numéro d\'Identification Fiscale', inp(flat.company_nif, setF('company_nif'), 'text', ''))}
              {field('STAT', 'Numéro statistique', inp(flat.company_stat, setF('company_stat'), 'text', ''))}
            </div>
            {field('Taux de TVA (%)', '0 = pas de ligne TVA sur la facture', inp(flat.invoice_tva_percent, setF('invoice_tva_percent'), 'number', '0'))}
            {field('Message de pied de page', null, ta(flat.invoice_footer, setF('invoice_footer'), 'Merci de votre confiance…', 2))}
          </>)}
        </div>}
      </div>
    </div>
  )
}