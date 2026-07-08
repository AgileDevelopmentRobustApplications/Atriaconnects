import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase.js'
import Modal from '../common/Modal.jsx'

// Admin creates an account on someone's behalf. Uses a throwaway auth client so
// the admin's own session is untouched; emails are auto-confirmed by the DB trigger.
export default function AddUserModal({ onCreated, onClose }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState('member')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setBusy(true)
    const temp = createClient(
      import.meta.env.VITE_SUPABASE_URL ?? 'https://zgwckrpeveoemmwtriee.supabase.co',
      import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_J7ezco2M177uP-eUvVZjXQ_AAFOk84V',
      { auth: { storageKey: 'sb-admin-adduser', persistSession: false } }
    )
    const { data, error: signUpErr } = await temp.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    if (signUpErr) {
      setError(signUpErr.message)
      setBusy(false)
      return
    }
    // email signups default to member; flip to guest if requested
    if (userType === 'guest' && data.user) {
      await supabase.rpc('set_user_type', { _user: data.user.id, _type: 'guest' })
    }
    onCreated()
    onClose()
  }

  return (
    <Modal title="Add user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoFocus
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Temporary password (share with the user)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select value={userType} onChange={(e) => setUserType(e.target.value)}>
          <option value="member">Adra member</option>
          <option value="guest">Guest</option>
        </select>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="side-note">
          Requires email sign-ups to be enabled in Supabase Auth. The user logs in with this email
          and password and can change details later.
        </p>
      </form>
    </Modal>
  )
}
