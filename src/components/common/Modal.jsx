import { useEffect, useId, useRef } from 'react'
import Icon from './Icon.jsx'

export default function Modal({ title, onClose, children, wide = false, className = '' }) {
  const titleId = useId()
  const cardRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  // Captured during the first render, before any child autoFocus moves focus.
  const openerRef = useRef(document.activeElement)

  // Escape closes; focus moves into the dialog and returns to the opener on close.
  useEffect(() => {
    const opener = openerRef.current
    const card = cardRef.current
    if (card && !card.contains(document.activeElement)) card.focus({ preventScroll: true })
    function onKey(e) {
      if (e.key !== 'Escape') return
      // Only the top-most dialog reacts when modals are stacked.
      const dialogs = document.querySelectorAll('.modal-card')
      if (dialogs[dialogs.length - 1] !== card) return
      e.stopPropagation()
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-card${wide ? ' modal-wide' : ''}${className ? ` ${className}` : ''}`}
      >
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close" title="Close (Esc)">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
