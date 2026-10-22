import { useCallback, useEffect, useRef, useState } from 'react'
import { SLIDES } from '../data/content'

const LAST = SLIDES.length - 1
const maxStep = (i) => SLIDES[i].steps - 1
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

function parseHash() {
  const m = window.location.hash.match(/^#\/?(\d+)(?:\/(\d+))?/)
  if (!m) return { slide: 0, step: 0 }
  const slide = clamp(parseInt(m[1], 10) - 1, 0, LAST)
  const step = clamp(parseInt(m[2] ?? '0', 10), 0, maxStep(slide))
  return { slide, step }
}

/**
 * Deck position = (slide, step). A "step" is one presenter-controlled build
 * inside a slide. Next/Back walk steps first, then cross slide boundaries.
 * `dir` (+1 / -1) tells the layer transition which way we travelled.
 */
export function useDeck() {
  const [pos, setPos] = useState(() => ({ ...parseHash(), dir: 1 }))
  const posRef = useRef(pos)
  posRef.current = pos

  const apply = useCallback((slide, step, dir) => {
    setPos((p) => (p.slide === slide && p.step === step ? p : { slide, step, dir }))
  }, [])

  const next = useCallback(() => {
    const { slide, step } = posRef.current
    if (step < maxStep(slide)) apply(slide, step + 1, 1)
    else if (slide < LAST) apply(slide + 1, 0, 1)
  }, [apply])

  const prev = useCallback(() => {
    const { slide, step } = posRef.current
    if (step > 0) apply(slide, step - 1, -1)
    else if (slide > 0) apply(slide - 1, maxStep(slide - 1), -1)
  }, [apply])

  const nextSlide = useCallback(() => {
    const { slide } = posRef.current
    if (slide < LAST) apply(slide + 1, 0, 1)
  }, [apply])

  const prevSlide = useCallback(() => {
    const { slide } = posRef.current
    if (slide > 0) apply(slide - 1, 0, -1)
  }, [apply])

  const goTo = useCallback(
    (i) => {
      const slide = clamp(i, 0, LAST)
      apply(slide, 0, slide >= posRef.current.slide ? 1 : -1)
    },
    [apply],
  )

  const first = useCallback(() => apply(0, 0, -1), [apply])
  const last = useCallback(() => apply(LAST, maxStep(LAST), 1), [apply])

  // keep the URL hash in sync (refresh-safe, shareable deep links)
  useEffect(() => {
    const h = `#/${pos.slide + 1}/${pos.step}`
    if (window.location.hash !== h) window.history.replaceState(null, '', h)
  }, [pos.slide, pos.step])

  useEffect(() => {
    const onHash = () => {
      const p = parseHash()
      const cur = posRef.current
      if (p.slide !== cur.slide || p.step !== cur.step) apply(p.slide, p.step, p.slide >= cur.slide ? 1 : -1)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [apply])

  return { ...pos, count: SLIDES.length, next, prev, nextSlide, prevSlide, goTo, first, last }
}
