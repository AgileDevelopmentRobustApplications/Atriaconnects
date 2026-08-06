import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Modal from '../common/Modal.jsx'

// "Continue as guest" — user picks a display name and a one-time guest account
// is provisioned in the background. The guest can browse and message the
// Admissions Office; faculty can promote them to a full member.
export default function GuestNameModal({ onClose }) {
  const { profile, session, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a display name')
      return
    }
    setBusy(true)
    try {
      // If we're already signed in (rare — coming back to the page), just update.
      if (session?.user) {
        const { error: upErr } = await import('../../lib/supabase.js').then(({ supabase }) =>
          supabase.from('profiles').update({ full_name: trimmed }).eq('id', session.user.id)
        )
        if (upErr) throw upErr
        await refreshProfile(session.user.id)
      } else {
        // Use a throwaway client to provision a guest account. The Supabase
        // email provider must allow new signups (default). The account gets a
        // randomly-generated email and password; we then immediately sign the
        // user in via the throwaway client and update their profile name.
        const { createClient } = await import('@supabase/supabase-js')
        const guestEmail = `guest-${crypto.randomUUID()}@adraconnects.local`
        const guestPassword = crypto.randomUUID() + crypto.randomUUID()
        const temp = createClient(
          import.meta.env.VITE_SUPABASE_URL ?? 'https://zgwckrpeveoemmwtriee.supabase.co',
          import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_J7ezco2M177uP-eUvVZjXQ_AAFOk84V',
          { auth: { storageKey: 'sb-guest', persistSession: true } }
        )
        const { error: signUpErr } = await temp.auth.signUp({
          email: guestEmail,
          password: guestPassword,
          options: { data: { full_name: trimmed } },
        })
        if (signUpErr) throw signUpErr
        // Promote to guest tier (email signup defaults to 'member').
        const { supabase } = await import('../../lib/supabase.js')
        const { data: sess } = await temp.auth.getSession()
        if (sess?.session?.user?.id) {
          await supabase.rpc('set_user_type', { _user: sess.session.user.id, _type: 'guest' })
        }
        // Reload the page so the main app picks up the new session.
        window.location.reload()
        return
      }
      navigate('/')
    } catch (err) {
      setError(err.message ?? 'Could not start guest session')
      setBusy(false)
    }
  }

  return (
    <Modal title="Continue as guest" onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <p className="side-note">
          Pick a display name. Guest accounts can browse communities and message
          the Admissions Office. Faculty can promote you to a full member.
        </p>
        <input
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Setting up…' : 'Continue'}
        </button>
      </form>
    </Modal>
  )
}