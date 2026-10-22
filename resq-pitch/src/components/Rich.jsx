import { Fragment } from 'react'

/** Visible development flag. Always rendered with brackets so it cannot pass as data. */
export function Flag({ children, className = '' }) {
  return (
    <span className={`flag ${className}`} role="note" title="Open item — not verified. Resolve before presenting.">
      [{children}]
    </span>
  )
}

/**
 * Renders the mini-markup used in src/data/content.js:
 *   *accent*   → orange emphasis
 *   [[FLAG]]   → <Flag>
 */
export function Rich({ text }) {
  if (text == null) return null
  const parts = String(text).split(/(\[\[.+?\]\]|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('[[')) return <Flag key={i}>{p.slice(2, -2)}</Flag>
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i} className="accent">{p.slice(1, -1)}</em>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}
