import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

let _injected = false
function injectAnim() {
  if (_injected || typeof document === 'undefined') return
  const s = document.createElement('style')
  s.textContent = '@keyframes _dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}'
  document.head.appendChild(s)
  _injected = true
}

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

  useEffect(injectAnim, [])

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

  /* ── Trigger ─────────────────────────────────────────────── */
  const triggerSt = compact ? {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8,
    border:     `1px solid ${selected?.border ?? 'rgba(255,255,255,0.12)'}`,
    background: selected?.bg    ?? 'rgba(255,255,255,0.05)',
    color:      selected?.color ?? '#f0f0f5',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    outline: 'none', whiteSpace: 'nowrap',
  } : {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${open ? 'rgba(255,153,0,0.4)' : 'rgba(255,255,255,0.09)'}`,
    borderRadius: 10, padding: '10px 12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: value !== '' && value != null ? '#f0f0f5' : 'rgba(240,240,245,0.3)',
    fontSize: 13, fontFamily: 'inherit', transition: 'border-color 0.15s',
    opacity: disabled ? 0.5 : 1, outline: 'none',
  }

  /* ── Panel (portal à document.body) ─────────────────────── */
  const panel = open && pos ? createPortal(
    <div ref={panelRef} style={{
      position: 'fixed',
      top:    pos.top,
      bottom: pos.bottom,
      left:  pos.left,
      right: pos.right,
      width: pos.width,
      minWidth: compact ? 150 : undefined,
      maxHeight: pos.maxHeight,
      zIndex: 9999,
      backgroundColor: '#13131f',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      animation: '_dropIn 0.15s ease',
    }}>
      {/* Liste défilable — le footer (ex: "Nouvelle catégorie") reste visible */}
      <div style={{ overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        {options.map((opt, i) =>
          opt.separator
            ? <hr key={i} style={{ margin: '4px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)' }} />
            : <DropOption key={i} opt={opt} active={opt.value === value} compact={compact} onPick={e => pick(e, opt)} />
        )}
      </div>
      {footer && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
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
        <span style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'rgba(240,240,245,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
      )}

      <button ref={triggerRef} type="button" disabled={disabled} onClick={toggle} style={triggerSt}>
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown size={compact ? 11 : 14} style={{
          flexShrink: 0, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none',
          color: compact ? 'currentColor' : 'rgba(240,240,245,0.4)',
        }} />
      </button>

      {panel}
    </div>
  )
}

function DropOption({ opt, active, compact, onPick }) {
  const [hover, setHover] = useState(false)
  const hasColor = !!opt.color
  return (
    <button type="button" onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: compact ? '8px 12px' : '9px 12px',
        background: active
          ? (hasColor ? opt.bg : 'rgba(255,153,0,0.1)')
          : hover ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: 'none', outline: 'none', cursor: 'pointer',
        fontSize: compact ? 12 : 13, textAlign: 'left', transition: 'background 0.1s',
        color: active
          ? (hasColor ? opt.color : '#FF9900')
          : hasColor ? opt.color
          : opt.dim ? 'rgba(240,240,245,0.3)' : '#f0f0f5',
        fontWeight: active ? 700 : compact ? 500 : 400,
        fontFamily: 'system-ui, sans-serif',
      }}>
      {opt.label}
      {active && <Check size={compact ? 11 : 13} />}
    </button>
  )
}
