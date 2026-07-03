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
    supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
      .then(({ data }) => setProfile(data))
    refreshEmployee(uid)
  }, [session?.user?.id])

  async function signUp(fullName, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    // Emails are auto-confirmed by a DB trigger; if signUp didn't return a
    // session (confirmation flow enabled), log straight in.
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
    }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    employee,
    isEmployee: !!employee,
    isHod: employee?.role === 'hod',
    refreshEmployee: () => refreshEmployee(session?.user?.id),
    loading,
    signUp,
    signIn,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
