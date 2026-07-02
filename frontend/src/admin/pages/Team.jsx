import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Upload, Image } from 'lucide-react'

const BASE  = '/api'
const h     = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })
const hAuth = () => ({ Authorization: `Bearer ${localStorage.getItem('vrg_token')}` })

const ANIM_STYLE = `
@keyframes rowIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`
const empty        = { name: '', role: '', description: '', photo: '', order_index: 0 }
const settingsDefs = { team_badge: 'Notre équipe', team_title: 'Les personnes derrière', team_subtitle: 'Une équipe passionnée au service de vos commandes à Madagascar.' }

export default function TeamAdmin() {
  const [members,  setMembers]  = useState([])
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(empty)
  const [busy,     setBusy]     = useState(false)
  const [msg,      setMsg]      = useState(null)
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading,    setUploading]    = useState(false)
  const [dragOver,     setDragOver]     = useState(false)
  const fileInputRef = useRef(null)

  const [sec,    setSec]    = useState(settingsDefs)
  const [secBusy, setSecBusy] = useState(false)
  const [secMsg,  setSecMsg]  = useState(null)

  const load = () =>
    fetch(`${BASE}/admin/team`, { headers: h() })
      .then(r => r.json()).then(setMembers).catch(() => {})

  const loadSettings = () =>
    fetch(`${BASE}/admin/settings`, { headers: h() })
      .then(r => r.json())
      .then(data => setSec({
        team_badge:    data.team_badge    ?? settingsDefs.team_badge,
        team_title:    data.team_title    ?? settingsDefs.team_title,
        team_subtitle: data.team_subtitle ?? settingsDefs.team_subtitle,
      }))
      .catch(() => {})

  useEffect(() => { load(); loadSettings() }, [])

  const saveSection = async (e) => {
    e.preventDefault(); setSecBusy(true); setSecMsg(null)
    try {
      const res = await fetch(`${BASE}/admin/settings`, {
        method: 'PUT', headers: h(),
        body: JSON.stringify({ settings: Object.entries(sec).map(([key, value]) => ({ key, value })) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSecMsg({ type: 'ok', text: 'Enregistré !' })
      setTimeout(() => setSecMsg(null), 2500)
    } catch (err) {
      setSecMsg({ type: 'err', text: err.message })
    } finally { setSecBusy(false) }
  }

  const openAdd = () => {
    setForm(empty); setModal('add'); setMsg(null)
    setImageFile(null); setImagePreview(null)
  }

  const openEdit = (m) => {
    setForm({ ...m })
    setModal(m); setMsg(null)
    setImageFile(null)
    setImagePreview(m.photo || null)
  }

  const closeModal = () => {
    setModal(null)
    if (imagePreview && imageFile) URL.revokeObjectURL(imagePreview)
    setImageFile(null); setImagePreview(null); setMsg(null)
  }

  const selectFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (imageFile) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [imageFile, imagePreview])

  const onFileInput = e => selectFile(e.target.files[0])
  const onDrop = e => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files[0]) }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      let photo = form.photo || null
      if (imageFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('image', imageFile)
        const up     = await fetch(`${BASE}/admin/upload`, { method: 'POST', headers: hAuth(), body: fd })
        const upData = await up.json()
        setUploading(false)
        if (!up.ok) throw new Error(upData.error || 'Erreur upload')
        photo = upData.src
      }
      const body   = { ...form, order_index: Number(form.order_index) || 0, photo }
      const url    = modal === 'add' ? `${BASE}/admin/team` : `${BASE}/admin/team/${modal.id}`
      const method = modal === 'add' ? 'POST' : 'PUT'
      const res  = await fetch(url, { method, headers: h(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ type: 'ok', text: modal === 'add' ? 'Membre ajouté !' : 'Membre mis à jour !' })
      await load()
      setTimeout(closeModal, 1200)
    } catch (err) {
      setUploading(false)
      setMsg({ type: 'err', text: err.message })
    } finally { setBusy(false) }
  }

  const archive = async (id) => {
    if (!confirm('Archiver ce membre ?')) return
    await fetch(`${BASE}/admin/team/${id}`, { method: 'DELETE', headers: h() })
    load()
  }

  const active   = members.filter(m => m.active)
  const archived = members.filter(m => !m.active)

  return (
    <div>
      <style>{ANIM_STYLE}</style>

      {/* Section heading editor */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f5', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 3, height: 14, background: '#FF9900', borderRadius: 99, display: 'inline-block' }} />
          Contenu de la section
        </div>
        <form onSubmit={saveSection}>
          <div className="adm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Badge</label>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 12px' }}>
                <input value={sec.team_badge} onChange={e => setSec(s => ({ ...s, team_badge: e.target.value }))}
                  style={inp} placeholder="Notre équipe" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Titre <span style={{ color: 'rgba(240,240,245,0.3)', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>+ "VaRyGasy" en orange</span></label>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 12px' }}>
                <input value={sec.team_title} onChange={e => setSec(s => ({ ...s, team_title: e.target.value }))}
                  style={inp} placeholder="Les personnes derrière" />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Sous-titre</label>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 12px' }}>
              <input value={sec.team_subtitle} onChange={e => setSec(s => ({ ...s, team_subtitle: e.target.value }))}
                style={inp} placeholder="Une équipe passionnée…" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" disabled={secBusy}
              style={{ ...btnPrimary, opacity: secBusy ? 0.7 : 1, padding: '8px 16px', fontSize: 12 }}>
              {secBusy ? '…' : 'Enregistrer'}
            </button>
            {secMsg && (
              <span style={{ fontSize: 12, fontWeight: 600, color: secMsg.type === 'ok' ? '#22c55e' : '#f87171', display: 'flex', alignItems: 'center', gap: 5 }}>
                {secMsg.type === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {secMsg.text}
              </span>
            )}
            {/* Live preview */}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(240,240,245,0.25)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sec.team_title} <span style={{ color: '#FF9900' }}>VaRyGasy</span>
            </span>
          </div>
        </form>
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.4)' }}>
          {active.length} actif{active.length !== 1 ? 's' : ''} · {archived.length} archivé{archived.length !== 1 ? 's' : ''}
        </div>
        <button onClick={openAdd} style={btnPrimary}>
          <Plus size={15} /> Ajouter un membre
        </button>
      </div>

      {/* Table */}
      <div className="adm-table-scroll" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['Photo', 'Nom', 'Rôle', 'Ordre', 'Statut', 'Actions'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{col}</th>
              ))}
            </tr>
          </thead>
        </table>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id}
                  style={{ borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: m.active ? 1 : 0.4, animation: 'rowIn 0.3s ease both', animationDelay: `${Math.min(i * 30, 300)}ms`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', width: 56 }}>
                    <ThumbImg photo={m.photo} name={m.name} />
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f0f0f5' }}>{m.name}</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(240,240,245,0.5)' }}>{m.role || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(240,240,245,0.35)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{m.order_index}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: m.active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: m.active ? '#22c55e' : 'rgba(240,240,245,0.3)', border: `1px solid ${m.active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                      {m.active ? 'Actif' : 'Archivé'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(m)} style={btnIcon} title="Modifier"><Pencil size={13} /></button>
                      {m.active && <button onClick={() => archive(m.id)} style={{ ...btnIcon, color: '#f87171' }} title="Archiver"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <div style={{ padding: '56px', textAlign: 'center', color: 'rgba(240,240,245,0.3)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>👤</div>
              <div>Aucun membre — clique sur "Ajouter un membre"</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: '#0f0f1f', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'rowIn 0.2s ease' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f5' }}>
                {modal === 'add' ? 'Nouveau membre' : `Modifier · ${modal.name}`}
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,245,0.4)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Photo */}
              <div>
                <label style={labelStyle}>Photo</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileInput} style={{ display: 'none' }} />
                {imagePreview ? (
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', aspectRatio: '4/3', background: '#0a0a18' }}>
                    <img src={imagePreview} alt="aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)'; e.currentTarget.style.opacity = 1 }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = 0 }}>
                      <button type="button" onClick={() => fileInputRef.current.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'rgba(255,153,0,0.9)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        <Upload size={13} /> Changer
                      </button>
                      <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setForm(f => ({ ...f, photo: '' })) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        <X size={13} /> Supprimer
                      </button>
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: imageFile ? 'rgba(255,153,0,0.85)' : 'rgba(255,255,255,0.15)', color: '#fff' }}>
                      {imageFile ? 'Nouveau fichier' : 'Image actuelle'}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    style={{ border: `2px dashed ${dragOver ? 'rgba(255,153,0,0.6)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(255,153,0,0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={18} color="#FF9900" />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f5' }}>Glisser ou <span style={{ color: '#FF9900' }}>parcourir</span></div>
                      <div style={{ fontSize: 11, color: 'rgba(240,240,245,0.35)' }}>JPG, PNG, WebP · max 5 Mo</div>
                    </div>
                  </div>
                )}
              </div>

              <FRow label="Nom *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inp} placeholder="ex: Jean Rakoto" />
              </FRow>
              <FRow label="Rôle / Poste">
                <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inp} placeholder="ex: Fondateur & CEO" />
              </FRow>
              <FRow label="Description">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Courte présentation du membre…" />
              </FRow>
              <FRow label="Ordre d'affichage">
                <input value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: e.target.value }))} type="number" min="0" style={inp} placeholder="0 = en premier" />
              </FRow>

              {msg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: msg.type === 'ok' ? '#22c55e' : '#f87171', background: msg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 9, padding: '8px 12px' }}>
                  {msg.type === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {msg.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={closeModal}
                  style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(240,240,245,0.5)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Annuler
                </button>
                <button type="submit" disabled={busy}
                  style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
                  {uploading ? 'Upload…' : busy ? '…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ThumbImg({ photo, name }) {
  const [err, setErr] = useState(false)
  if (!photo || err) {
    return (
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#FF9900', flexShrink: 0 }}>
        {name?.[0]?.toUpperCase()}
      </div>
    )
  }
  return (
    <img src={photo} alt={name} onError={() => setErr(true)}
      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,153,0,0.2)', flexShrink: 0 }} />
  )
}

function FRow({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 12px' }}>{children}</div>
    </div>
  )
}

const labelStyle = { fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }
const inp        = { width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#f0f0f5', fontFamily: 'inherit', boxSizing: 'border-box' }
const btnPrimary = { display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg, #FF9900, #CC5500)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }
const btnIcon    = { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '6px', cursor: 'pointer', color: 'rgba(240,240,245,0.6)', transition: 'all 0.15s' }