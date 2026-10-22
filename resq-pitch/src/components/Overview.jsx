import { useEffect, useRef, useState } from 'react'
import { SLIDES } from '../data/content'
import { openItemsBySlide } from '../lib/flags'
import { CloseIcon } from './Icons'
import Logo from './Logo'

/** Presenter overview: jump to any slide. Arrow keys move, Enter selects, Esc closes. */
export default function Overview({ open, current, onPick, onClose }) {
  const [sel, setSel] = useState(current)
  const ref = useRef(null)

  useEffect(() => { if (open) setSel(current) }, [open, current])
  useEffect(() => { if (open) ref.current?.focus() }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      const n = SLIDES.length
      const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[e.key]
      if (move) { e.preventDefault(); e.stopPropagation(); setSel((s) => Math.min(n - 1, Math.max(0, s + move))) }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPick(sel) }
      else if (/^[1-7]$/.test(e.key)) { e.stopPropagation(); onPick(parseInt(e.key, 10) - 1) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, sel, onPick])

  return (
    <div className={`overview ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open} role="dialog" aria-label="Slide overview">
      <div className="overview__top">
        <Logo chip />
        <h2>Overview</h2>
        <p className="overview__hint">← → ↑ ↓ move · Enter select · 1–7 jump · Esc close</p>
        <button type="button" className="tool" onClick={onClose} aria-label="Close overview"><CloseIcon /></button>
      </div>
      <ol className="overview__grid" ref={ref} tabIndex={-1}>
        {SLIDES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={`ocard theme-${s.theme} ${i === sel ? 'is-sel' : ''} ${i === current ? 'is-current' : ''}`}
              onClick={() => onPick(i)}
              onMouseEnter={() => setSel(i)}
            >
              <span className="ocard__no">{String(s.no).padStart(2, '0')}</span>
              <span className="ocard__label">{s.label}</span>
              <span className="ocard__job">{s.job}</span>
              <span className="ocard__meta">
                <span>{s.steps} builds</span>
                {openItemsBySlide[i] > 0 && <span className="ocard__open">{openItemsBySlide[i]} open items</span>}
                {i === current && <span className="ocard__here">Now</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
