import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

/**
 * AdminDropdown — dropdown sombre réutilisable.
 *
 * Rendu via React portal (document.body) pour échapper à tout
 * overflow:hidden/auto parent et toujours s'afficher correctement.
 *
 * options: {
 *   value, label,
 *   color?, bg?, border?,  // couleurs (compact trigger + option active)
 *   dim?,                  // texte grisé
 *   separator?,            // ligne de séparation
 * }[]
 *
 * footer: JSX | (close) => JSX
 * compact: trigger coloré compact (statuts, rôles)
 * stopProp: stoppe la propagation du trigger (ex: dans un accordéon)
 * onOpen: callback à l'ouverture
 */
export default function AdminDropdown({
  value,
  options = [],
  onChange,
  placeholder = '— Choisir —',
  footer,
  disabled  = false,
  compact   = false,
  label,
  stopProp  = false,
  onOpen,
}) {
  const [open, setOpen]   = useState(false)
  const [pos,  setPos]    = useState(null)
  const triggerRef        = useRef(null)
  const panelRef          = useRef(null)

  /* Fermer sur clic extérieur */
  useEffect(() => {
    if (!open) return
    const fn = e => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !panelRef.current?.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const selected = options.find(o => !o.separator && o.value === value)
  const close    = () => setOpen(false)

  const toggle = e => {
    if (stopProp) e.stopPropagation()
    if (disabled) return
    if (!open) {
      const r = triggerRef.current.getBoundingClientRect()
      /* Espace sous/au-dessus du trigger : ouvre vers le haut si peu de place
         en bas (dropdown en bas d'écran), et borne la hauteur pour défiler. */
      const spaceBelow = window.innerHeight - r.bottom
      const spaceAbove = r.top
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
      setPos({
        top:    openUp ? undefined : r.bottom + 6,
        bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
        left:  compact ? undefined : r.left,
        right: compact ? window.innerWidth - r.right : undefined,
        width: compact ? undefined : r.width,
        maxHeight: Math.max(160, (openUp ? spaceAbove : spaceBelow) - 16),
      })
      onOpen?.()
    }
    setOpen(o => !o)
  }

  const pick = (e, opt) => {
    if (stopProp) e.stopPropagation()
    onChange(opt.value)
    close()
  }

  /* ── Trigger : compact = puce colorée (statuts, rôles) ── */
  const compactSt = compact ? {
    borderColor: selected?.border,
    background:  selected?.bg,
    color:       selected?.color,
  } : undefined

  /* ── Panel (portal à document.body) ─────────────────────── */
  const panel = open && pos ? createPortal(
    <div ref={panelRef} className="adm-drop-panel" role="listbox" style={{
      top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, width: pos.width,
      minWidth: compact ? 170 : undefined, maxHeight: pos.maxHeight,
    }}>
      {/* Liste défilable — le footer (ex: "Nouvelle catégorie") reste visible */}
      <div className="adm-drop-panel__list">
        {options.map((opt, i) =>
          opt.separator
            ? <hr key={i} style={{ margin: '4px 6px', border: 'none', borderTop: '1px solid var(--color-border)' }} />
            : <DropOption key={i} opt={opt} active={opt.value === value} onPick={e => pick(e, opt)} />
        )}
      </div>
      {footer && (
        <div style={{ borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          {typeof footer === 'function' ? footer(close) : footer}
        </div>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div style={{ position: 'relative' }}
      onClick={stopProp ? e => e.stopPropagation() : undefined}>

      {label && (
        <span className="adm-label">{label}</span>
      )}

      <button ref={triggerRef} type="button" disabled={disabled} onClick={toggle} style={compactSt}
        aria-haspopup="listbox" aria-expanded={open}
        className={compact ? 'adm-drop-chip' : `adm-drop-trigger${value !== '' && value != null ? '' : ' adm-drop-trigger--empty'}`}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={compact ? 13 : 16} style={{
          flexShrink: 0, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none',
          color: compact ? 'currentColor' : 'var(--color-subtle)',
        }} />
      </button>

      {panel}
    </div>
  )
}

function DropOption({ opt, active, onPick }) {
  return (
    <button type="button" role="option" aria-selected={active} onClick={onPick}
      className={`adm-drop-opt${active ? ' adm-drop-opt--active' : ''}${opt.dim ? ' adm-drop-opt--dim' : ''}`}
      style={{
        color: opt.color || (active ? 'var(--color-gold)' : undefined),
        background: active ? (opt.bg || 'var(--color-gold-soft)') : undefined,
      }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {opt.color && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />}
        {opt.label}
      </span>
      {active && <Check size={15} style={{ flexShrink: 0 }} />}
    </button>
  )
}
