import { useRef } from 'react'
import { SLIDES } from '../data/content'
import { useStepReveal } from '../lib/useStepReveal'
import Logo from './Logo'

/**
 * Shared frame for every slide: header (logo + position), reveal engine, theme.
 * Children use data-step / data-fx attributes (see lib/useStepReveal.js).
 */
export default function SlideShell({ index, active, step, reduced, className = '', children }) {
  const ref = useRef(null)
  const meta = SLIDES[index]
  useStepReveal(ref, { active, step, reduced })

  return (
    <div ref={ref} className={`slide slide--${meta.id} theme-${meta.theme} ${className}`}>
      <header className="slide__head">
        <Logo chip={meta.theme === 'dark'} />
        <p className="slide__eyebrow">
          <span className="slide__no">{String(meta.no).padStart(2, '0')}</span>
          <span className="slide__of">/ {String(SLIDES.length).padStart(2, '0')}</span>
          <span className="slide__label">{meta.label}</span>
        </p>
      </header>
      {children}
    </div>
  )
}
