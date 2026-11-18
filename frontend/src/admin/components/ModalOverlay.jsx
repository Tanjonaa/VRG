import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/* Fond de fenêtre modale de l'admin.
   - Rendu dans <body> (portal) : la fenêtre est toujours placée par rapport à l'écran,
     jamais décalée par un conteneur parent (défilement, zoom, animation) — c'est ce
     qui la faisait sortir de l'écran sur mobile.
   - Défile si la fenêtre est plus haute que l'écran (petits téléphones, clavier ouvert).
   - Clic sur le fond ou Échap = fermer ; la page derrière ne défile pas pendant l'ouverture. */
export default function ModalOverlay({ onClose, children }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onCloseRef.current?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div className="adm-overlay" onClick={e => e.target === e.currentTarget && onCloseRef.current?.()}>
      {children}
    </div>,
    document.body,
  )
}
