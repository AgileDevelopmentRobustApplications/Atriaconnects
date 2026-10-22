import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { inr } from './format'

/**
 * Step-driven reveals.
 *
 * Mark up any element inside a slide with data attributes:
 *   data-step="n"     first step at which it is visible (0 = on slide entry)
 *   data-until="m"    optional: hidden again from step m on (swap-outs)
 *   data-fx="…"       up | down | left | right | zoom | pop | fade | wipe | grow-x | grow-y | draw
 *   data-delay="s"    extra delay in seconds
 *   data-count="n"    count a number up (with data-prefix / data-suffix / data-group="inr")
 *
 * The hook is *declarative*: every change just retargets tweens (overwrite: true),
 * so hammering the arrow keys can never leave a slide half-built, and Back always
 * returns to the exact earlier state.
 */

const FX = {
  up: { y: 44 },
  down: { y: -44 },
  left: { x: -80 },
  right: { x: 80 },
  zoom: { scale: 0.9 },
  pop: { scale: 0.55, ease: 'back.out(1.7)' },
  fade: {},
  'grow-x': { scaleX: 0, origin: '0% 50%' },
  'grow-y': { scaleY: 0, origin: '50% 100%' },
  wipe: { clip: 'inset(0 100% 0 0)' },
  draw: {},
}
const EXIT = { y: -28 }
const BASE = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1 }

const range = (el) => ({
  from: parseInt(el.dataset.step ?? '0', 10),
  until: el.dataset.until != null ? parseInt(el.dataset.until, 10) : Infinity,
})
const visibleAt = (el, s) => {
  const { from, until } = range(el)
  return s >= from && s < until
}

function setCount(el, v) {
  const { prefix = '', suffix = '', group } = el.dataset
  el.textContent = prefix + (group === 'inr' ? inr(v) : Math.round(v)) + suffix
}

function pathLength(el) {
  if (el.__len == null && el.getTotalLength) {
    try { el.__len = el.getTotalLength() } catch { el.__len = 0 }
  }
  return el.__len || 0
}

function paint(el, show, { instant, reduced, delay = 0, exit = false }) {
  const fx = el.dataset.fx || 'up'
  const cfg = FX[fx] ?? FX.up
  const extra = parseFloat(el.dataset.delay || '0')
  const dur = instant ? 0 : reduced ? 0.25 : fx === 'wipe' ? 1.1 : 0.8
  const d = instant ? 0 : delay + (reduced ? 0 : extra)
  const ease = cfg.ease || 'power3.out'

  gsap.killTweensOf(el)

  // numeric counters
  if (el.dataset.count != null) {
    const target = parseFloat(el.dataset.count)
    const obj = { v: parseFloat(el.__cv ?? 0) }
    el.__ctw?.kill()
    el.__ctw = gsap.to(obj, {
      v: show ? target : 0,
      duration: instant || reduced ? 0 : show ? 1.5 : 0.01,
      delay: show ? d + 0.15 : 0,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => { el.__cv = obj.v; setCount(el, obj.v) },
      onComplete: () => { el.__cv = show ? target : 0; setCount(el, el.__cv) },
    })
    if (instant || reduced) { el.__cv = show ? target : 0; setCount(el, el.__cv) }
  }

  // stroke-drawn SVG
  if (fx === 'draw') {
    const len = pathLength(el)
    el.style.strokeDasharray = len
    gsap.to(el, {
      strokeDashoffset: show ? 0 : len,
      duration: instant ? 0 : reduced ? 0.01 : 1.1,
      delay: d,
      ease: 'power2.inOut',
      overwrite: true,
    })
    gsap.to(el, { autoAlpha: show ? 1 : 0, duration: instant ? 0 : 0.2, delay: d })
    return
  }

  const hidden = exit ? { ...EXIT } : { ...cfg }
  const clipHidden = hidden.clip
  const vars = { autoAlpha: show ? 1 : 0, duration: dur, delay: d, ease, overwrite: true }

  if (reduced) {
    // opacity only — no travel, no scale, no clip
    if (clipHidden) vars.clipPath = 'inset(0 0% 0 0)'
  } else if (show) {
    Object.assign(vars, BASE)
    if (clipHidden || fx === 'wipe') vars.clipPath = 'inset(0 0% 0 0)'
  } else {
    for (const k of ['x', 'y', 'scale', 'scaleX', 'scaleY']) if (hidden[k] != null) vars[k] = hidden[k]
    if (clipHidden) vars.clipPath = clipHidden
  }
  if (cfg.origin) vars.transformOrigin = cfg.origin
  if (!show) vars.ease = 'power2.inOut'
  gsap.to(el, vars)
}

export function useStepReveal(ref, { active, step, reduced }) {
  const mem = useRef({ active: false, step: -1, reduced })

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const els = Array.from(root.querySelectorAll('[data-step]'))
    const m = mem.current

    const settle = () => els.forEach((el) => paint(el, visibleAt(el, step), { instant: true, reduced }))
    const hideAll = () => els.forEach((el) => paint(el, false, { instant: true, reduced }))

    if (!active) {
      // first mount of an inactive slide: start fully hidden, ready to build in
      if (m.step === -1 || m.active) hideAll()
      m.active = false
      m.step = step
      m.reduced = reduced
      return
    }

    if (!m.active || m.step === -1) {
      // slide just became current
      if (step === 0) {
        hideAll()
        let i = 0
        els.forEach((el) => {
          if (visibleAt(el, 0)) paint(el, true, { reduced, delay: (reduced ? 0 : 0.55) + Math.min(i++ * 0.08, 0.9) })
        })
      } else {
        settle() // arrived from the right (Back / End): show the finished state
      }
    } else if (m.reduced !== reduced) {
      settle()
    } else if (m.step !== step) {
      const forward = step > m.step
      let i = 0
      els.forEach((el) => {
        const was = visibleAt(el, m.step)
        const now = visibleAt(el, step)
        if (was === now) return
        const exiting = forward && !now && was
        paint(el, now, { reduced, delay: now ? Math.min(i++ * 0.08, 0.9) : 0, exit: exiting })
      })
    }

    m.active = true
    m.step = step
    m.reduced = reduced
  }, [ref, active, step, reduced])
}
