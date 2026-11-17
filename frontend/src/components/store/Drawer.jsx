import React, { useEffect, useId, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/* Tiroir latéral partagé (panier, compte, connexion) :
   - Échap et clic sur le fond ferment
   - défilement de la page bloqué derrière
   - focus placé sur le bouton fermer à l'ouverture, rendu à l'élément d'origine à la fermeture */
export default function Drawer({ isOpen, onClose, title, icon, actions, footer, maxWidth = 460, children }) {
  const titleId = useId()
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return
    const prevFocus = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current()
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('vs-drawer-open')
    const t = setTimeout(() => closeRef.current?.focus(), 50)
    return () => {
      clearTimeout(t)
      document.body.classList.remove('vs-drawer-open')
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="backdrop" onClick={onClose} aria-hidden="true"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
          <motion.div key="panel" role="dialog" aria-modal="true" aria-labelledby={titleId}
            className="vs-drawer" style={{ maxWidth }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
            <div className="vs-drawer__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {icon}
                <h2 id={titleId} className="vs-drawer__title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {actions}
                <button ref={closeRef} type="button" className="vs-icon-btn" onClick={onClose} aria-label="Fermer">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="vs-drawer__body">{children}</div>
            {footer && <div className="vs-drawer__foot">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
