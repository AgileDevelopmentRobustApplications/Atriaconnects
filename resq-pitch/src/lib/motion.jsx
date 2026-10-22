import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const MotionContext = createContext({ reduced: false, toggle: () => {}, mode: 'auto' })
const KEY = 'resq-pitch:motion'

function readStored() {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'reduced' || v === 'full' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/**
 * Motion preference: follows the OS "reduce motion" setting by default, and the
 * presenter can override it with the M key / the toolbar button.
 */
export function MotionProvider({ children }) {
  const [mode, setMode] = useState(readStored)
  const [system, setSystem] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = (e) => setSystem(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const reduced = mode === 'reduced' || (mode === 'auto' && system)

  const toggle = useCallback(() => {
    setMode(() => {
      const next = reduced ? 'full' : 'reduced'
      try { window.localStorage.setItem(KEY, next) } catch { /* private mode */ }
      return next
    })
  }, [reduced])

  const value = useMemo(() => ({ reduced, toggle, mode }), [reduced, toggle, mode])
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export const useMotion = () => useContext(MotionContext)
