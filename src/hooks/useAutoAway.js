import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/supabase.js'

// Automatically switches the signed-in user's status to "Out of office" when
// they stop using AdraConnects, and restores their previous status when they
// come back.
//
// "Not using" means either:
//   • no keyboard / mouse / touch / scroll activity in ANY open tab for
//     IDLE_MS (a hidden tab produces no activity, so it ages out too), or
//   • the last open AdraConnects tab is closed.
//
// Only statuses this hook set are ever restored: the status that was replaced
// is remembered under PREV_KEY, so a user who picked "Out of office" by hand
// keeps it.

export const IDLE_MS = 5 * 60 * 1000
const AWAY = 'out_of_office'
const CHECK_MS = 30 * 1000
const HEARTBEAT_STALE_MS = 75 * 1000
const ACTIVITY_WRITE_MS = 15 * 1000

const PREV_KEY = 'ac:auto-away-prev' // status to restore, present only while auto-away
const ACTIVE_KEY = 'ac:last-active' // shared last-activity timestamp across tabs
const TABS_KEY = 'ac:open-tabs' // { [tabId]: heartbeatTs }

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable (private mode) — degrade to per-tab behaviour */
  }
}

function readTabs() {
  try {
    return JSON.parse(read(TABS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function useAutoAway() {
  const { user, session, profile, updateStatus } = useAuth()
  const uid = user?.id
  const status = profile?.status
  const loaded = Boolean(profile)

  // Latest values for event handlers without re-binding listeners.
  const statusRef = useRef(status)
  const tokenRef = useRef(session?.access_token)
  const updateRef = useRef(updateStatus)
  useEffect(() => {
    statusRef.current = status
    tokenRef.current = session?.access_token
    updateRef.current = updateStatus
  })

  // If the user changes status themselves while auto-away is recorded (e.g.
  // from another device), stop treating it as ours.
  useEffect(() => {
    if (status && status !== AWAY && read(PREV_KEY)) write(PREV_KEY, null)
  }, [status])

  useEffect(() => {
    if (!uid || !loaded) return
    const tabId = crypto.randomUUID()
    let lastLocalActivity = Date.now()
    let lastActivityWrite = 0

    const goAway = () => {
      const current = statusRef.current
      if (!current || current === AWAY || read(PREV_KEY)) return
      write(PREV_KEY, current)
      updateRef.current(AWAY)
    }

    const comeBack = () => {
      const prev = read(PREV_KEY)
      if (!prev) return
      write(PREV_KEY, null)
      if (statusRef.current === AWAY) updateRef.current(prev)
    }

    const heartbeat = () => {
      const tabs = readTabs()
      const now = Date.now()
      tabs[tabId] = now
      for (const [id, ts] of Object.entries(tabs)) {
        if (now - ts > HEARTBEAT_STALE_MS) delete tabs[id]
      }
      write(TABS_KEY, JSON.stringify(tabs))
    }

    const onActivity = () => {
      const now = Date.now()
      lastLocalActivity = now
      if (now - lastActivityWrite > ACTIVITY_WRITE_MS) {
        lastActivityWrite = now
        write(ACTIVE_KEY, String(now))
      }
      if (read(PREV_KEY)) comeBack()
    }

    const check = () => {
      heartbeat()
      const shared = Number(read(ACTIVE_KEY)) || 0
      if (Date.now() - Math.max(lastLocalActivity, shared) >= IDLE_MS) goAway()
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') onActivity()
    }

    // Tab closing: if no other AdraConnects tab is still open, mark away now.
    // Uses a keepalive fetch because async client calls are cut off on unload.
    const onPageHide = () => {
      const tabs = readTabs()
      delete tabs[tabId]
      write(TABS_KEY, JSON.stringify(tabs))
      const now = Date.now()
      const othersOpen = Object.values(tabs).some((ts) => now - ts < HEARTBEAT_STALE_MS)
      const current = statusRef.current
      const token = tokenRef.current
      if (othersOpen || !current || current === AWAY || read(PREV_KEY) || !token) return
      write(PREV_KEY, current)
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: AWAY }),
      }).catch(() => {})
    }

    // Reopening the app after being auto-away (e.g. tab was closed) restores.
    onActivity()
    heartbeat()

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true, capture: true })
    )
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onPageHide)
    const interval = setInterval(check, CHECK_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity, { capture: true }))
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onPageHide)
      clearInterval(interval)
      const tabs = readTabs()
      delete tabs[tabId]
      write(TABS_KEY, JSON.stringify(tabs))
    }
  }, [uid, loaded])
}
