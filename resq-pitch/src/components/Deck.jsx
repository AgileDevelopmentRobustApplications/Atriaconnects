import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { SLIDES } from '../data/content'
import { useDeck } from '../lib/useDeck'
import { useMotion } from '../lib/motion'
import { STAGE_W, STAGE_H } from '../lib/stage'
import slideComponents from '../slides'
import Controls from './Controls'
import Overview from './Overview'
import Notes from './Notes'

const INTERACTIVE = 'input, textarea, select, [contenteditable="true"]'

export default function Deck() {
  const deck = useDeck()
  const { slide, step, dir } = deck
  const { reduced, toggle: toggleMotion } = useMotion()

  const [overview, setOverview] = useState(false)
  const [notes, setNotes] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [idle, setIdle] = useState(false)
  const [scale, setScale] = useState(1)

  const viewportRef = useRef(null)
  const layers = useRef([])
  const firstPaint = useRef(true)

  // ── fit the 1920×1080 stage to any window (letter-boxed, never cropped) ────
  useLayoutEffect(() => {
    const el = viewportRef.current
    const fit = () => setScale(Math.min(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── cinematic slide-to-slide transition (retargets cleanly if interrupted) ─
  useLayoutEffect(() => {
    layers.current.forEach((el, i) => {
      if (!el) return
      const on = i === slide
      if (firstPaint.current) {
        gsap.set(el, { autoAlpha: on ? 1 : 0, scale: 1, zIndex: on ? 2 : 1 })
        return
      }
      gsap.killTweensOf(el)
      if (reduced) {
        gsap.to(el, { autoAlpha: on ? 1 : 0, duration: 0.25, zIndex: on ? 2 : 1, overwrite: true })
      } else if (on) {
        // incoming: if it is fully hidden, start slightly pushed away, then settle
        if (gsap.getProperty(el, 'autoAlpha') < 0.05) gsap.set(el, { scale: dir > 0 ? 0.94 : 1.06 })
        gsap.set(el, { zIndex: 2 })
        gsap.to(el, { autoAlpha: 1, scale: 1, duration: 1.1, ease: 'power3.out', overwrite: true })
      } else {
        // outgoing: drift past the camera while fading
        gsap.set(el, { zIndex: 1 })
        gsap.to(el, { autoAlpha: 0, scale: dir > 0 ? 1.08 : 0.93, duration: 0.7, ease: 'power2.in', overwrite: true })
      }
    })
    firstPaint.current = false
  }, [slide, dir, reduced])

  // ── fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])
  useEffect(() => {
    const on = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  // ── pick from overview ─────────────────────────────────────────────────────
  const pick = useCallback((i) => { deck.goTo(i); setOverview(false) }, [deck])

  // ── keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return
      const k = e.key

      if (k === 'Escape') {
        if (overview) setOverview(false)
        else if (notes) setNotes(false)
        return
      }
      if (overview) return // the overview owns the arrow keys while open

      const go = (fn) => { e.preventDefault(); if (!e.repeat) fn() }
      switch (k) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
          if (e.shiftKey && k === 'ArrowRight') go(deck.nextSlide)
          else go(deck.next)
          break
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
          if (e.shiftKey && k === 'ArrowLeft') go(deck.prevSlide)
          else go(deck.prev)
          break
        case 'Home': go(deck.first); break
        case 'End': go(deck.last); break
        case 'o': case 'O': case 'Tab': go(() => setOverview(true)); break
        case 'n': case 'N': go(() => setNotes((v) => !v)); break
        case 'm': case 'M': go(toggleMotion); break
        case 'f': case 'F': go(toggleFullscreen); break
        default:
          if (/^[1-7]$/.test(k)) go(() => deck.goTo(parseInt(k, 10) - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck, overview, notes, toggleMotion, toggleFullscreen])

  // ── fade the chrome (and cursor) when the presenter is idle ────────────────
  useEffect(() => {
    let t
    const wake = () => {
      setIdle(false)
      clearTimeout(t)
      t = setTimeout(() => setIdle(true), 2600)
    }
    wake()
    window.addEventListener('mousemove', wake)
    window.addEventListener('keydown', wake)
    window.addEventListener('touchstart', wake, { passive: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', wake)
      window.removeEventListener('touchstart', wake)
    }
  }, [])

  return (
    <div ref={viewportRef} className={`viewport ${idle && !overview ? 'is-idle' : ''} ${reduced ? 'is-reduced' : ''}`}>
      <div
        className="stage"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {SLIDES.map((meta, i) => {
          const Component = slideComponents[i]
          return (
            <section
              key={meta.id}
              ref={(el) => { layers.current[i] = el }}
              className="layer"
              aria-hidden={i !== slide}
              inert={i !== slide}
              aria-label={`Slide ${meta.no}: ${meta.label}`}
            >
              <Component index={i} active={i === slide} step={step} reduced={reduced} />
            </section>
          )
        })}
      </div>

      <Notes open={notes} slide={slide} step={step} />
      <Controls
        slide={slide} step={step} onGoTo={deck.goTo}
        onOverview={() => setOverview(true)} onNotes={() => setNotes((v) => !v)} notesOpen={notes}
        onMotion={toggleMotion} reduced={reduced}
        onFullscreen={toggleFullscreen} fullscreen={fullscreen}
        idle={idle && !overview}
      />
      <Overview open={overview} current={slide} onPick={pick} onClose={() => setOverview(false)} />
      <p className="sr-only" aria-live="polite">{`Slide ${slide + 1} of ${SLIDES.length}: ${SLIDES[slide].label}`}</p>
    </div>
  )
}
