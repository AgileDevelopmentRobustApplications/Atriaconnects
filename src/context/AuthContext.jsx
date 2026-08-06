import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

  // Derived flags. legacy 'employee' kept as a non-superadmin staff member.
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
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)