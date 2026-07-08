import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [employee, setEmployee] = useState(null) // { role: 'teacher'|'hod', department } or null
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

  async function refreshEmployee(uid) {
    if (!uid) {
      setEmployee(null)
      return
    }
    const { data } = await supabase
      .from('employees')
      .select('role, department')
      .eq('user_id', uid)
      .maybeSingle()
    setEmployee(data ?? null)
  }

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      setEmployee(null)
      return
    }
    refreshProfile(uid)
    refreshEmployee(uid)
  }, [session?.user?.id])

  // Google sign-in creates guest accounts (admissions access only)
  async function signInWithGoogle(returnTo = '/') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${returnTo}` },
    })
    if (error) throw error
  }

  // Email accounts are full "adra" members
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(fullName, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateStatus(status) {
    if (!session?.user) return
    setProfile((p) => (p ? { ...p, status } : p))
    await supabase.from('profiles').update({ status }).eq('id', session.user.id)
  }

  const isGuest = profile?.user_type === 'guest' && !employee

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    employee,
    isEmployee: !!employee,
    isHod: employee?.role === 'hod',
    isGuest,
    refreshEmployee: () => refreshEmployee(session?.user?.id),
    refreshProfile: () => refreshProfile(session?.user?.id),
    loading,
    signInWithGoogle,
    signIn,
    signUp,
    signOut,
    updateStatus,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
