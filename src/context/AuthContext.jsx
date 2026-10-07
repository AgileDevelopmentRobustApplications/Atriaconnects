import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { supabase } from '../lib/supabase'
import { readStoredAccent } from '../lib/accents'

const AuthContext = createContext(null)

// All role tag values (mirrors CHECK constraint on user_roles.role).
export const ROLE_TAGS = [
  { id: 'management', label: 'Management' },
  { id: 'intern', label: 'Intern' },
  { id: 'floor_incharge', label: 'Floor In-Charge' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'itdept', label: 'IT Dept' },
  { id: 'principal', label: 'Principal' },
]
const SUPERADMIN_ROLES = ['itdept', 'principal']

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [roles, setRoles] = useState([]) // [{ role, department }, ...]
  const [loading, setLoading] = useState(true)
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  const [accent, setAccentState] = useState(readStoredAccent)
  const accentTimer = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-accent', accent)
    try {
      localStorage.setItem('theme', theme)
      localStorage.setItem('accent', accent)
    } catch {
      /* storage unavailable — preference lasts for this session only */
    }
    // Browser/OS chrome matches the sidebar brand bar of the active theme.
    const chrome = getComputedStyle(root).getPropertyValue('--sidebar-brand-bg').trim()
    if (chrome) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', chrome)
  }, [theme, accent])

  // Switch the accent colour; colours cross-fade briefly instead of snapping.
  const setAccent = (id) => {
    if (id === accent) return
    const root = document.documentElement
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!reduceMotion) {
      root.classList.add('accent-switching')
      clearTimeout(accentTimer.current)
      accentTimer.current = setTimeout(() => root.classList.remove('accent-switching'), 450)
    }
    setAccentState(id)
  }

  // Optional `origin` ({ x, y } in viewport px) animates the switch as a
  // circular reveal from that point, where the View Transitions API exists.
  const toggleTheme = (newTheme, origin) => {
    if (newTheme === theme) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!origin || !document.startViewTransition || reduceMotion) {
      setThemeState(newTheme)
      return
    }
    const transition = document.startViewTransition(() => {
      flushSync(() => setThemeState(newTheme))
      document.documentElement.setAttribute('data-theme', newTheme)
    })
    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    )
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          {
            duration: 520,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        )
      })
      .catch(() => {})
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function refreshProfile(uid) {
    if (!uid) return
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data)
  }

  async function refreshRoles(uid) {
    if (!uid) {
      setRoles([])
      return
    }
    const { data } = await supabase
      .from('user_roles')
      .select('role, department')
      .eq('user_id', uid)
    setRoles(data ?? [])
  }

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      setRoles([])
      return
    }
    refreshProfile(uid)
    refreshRoles(uid)
  }, [session?.user?.id])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateStatus(status) {
    if (!session?.user) return
    setProfile((p) => (p ? { ...p, status } : p))
    await supabase.from('profiles').update({ status }).eq('id', session.user.id)
  }

  async function updateProfile(fields) {
    if (!session?.user) return
    setProfile((p) => (p ? { ...p, ...fields } : p))
    const { error } = await supabase.from('profiles').update(fields).eq('id', session.user.id)
    if (error) throw error
  }

  // Derived flags.
  const roleIds = roles.map((r) => r.role)
  const isGuest = profile?.user_type === 'guest' && roleIds.length === 0
  const isEmployee = roleIds.some((r) => r === 'faculty' || SUPERADMIN_ROLES.includes(r))
  const isSuperAdmin = roleIds.some((r) => SUPERADMIN_ROLES.includes(r))
  const isFaculty = roleIds.includes('faculty')

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    roles,
    roleIds,
    isEmployee,
    isFaculty,
    isSuperAdmin,
    isGuest,
    refreshRoles: () => refreshRoles(session?.user?.id),
    refreshProfile: () => refreshProfile(session?.user?.id),
    loading,
    signIn,
    signOut,
    updateStatus,
    updateProfile,
    theme,
    toggleTheme,
    accent,
    setAccent,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)