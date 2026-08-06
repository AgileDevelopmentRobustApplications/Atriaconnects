import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../common/Icon.jsx'

// Welcome page — used both for first-time invite setup and password reset.
// Without a session, the user enters their email; we send a Supabase reset
// link via the email template. With a session, the user is asked to set a
// fresh password and we clear profiles.must_reset_password.
export default function WelcomePage() {
  const { session, profile, refreshProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function handleRequestReset(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const { supabase } = await import('../../lib/supabase.js')
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/welcome`,
      })
      if (err) throw err
      setMessage('Check your email for a reset link.')
    } catch (err) {
      setError(err.message ?? 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      const { supabase } = await import('../../lib/supabase.js')
      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) throw err
      if (profile?.must_reset_password) {
        await supabase
          .from('profiles')
          .update({ must_reset_password: false })
          .eq('id', session.user.id)
        await refreshProfile()
      }
      navigate('/')
    } catch (err) {
      setError(err.message ?? 'Could not set password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-mark">
            <Icon name="key" size={26} strokeWidth={2.2} />
          </span>
          Set up your account
        </div>
        <p className="auth-tagline">AdraConnects</p>

        {session ? (
          <form onSubmit={handleSetPassword}>
            <p className="auth-note">
              {profile?.must_reset_password
                ? 'You need to set a new password before continuing.'
                : 'Set a new password for your account.'}
            </p>
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save and continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset}>
            <p className="auth-note">
              Enter the email your account was set up with. We'll send a setup link.
            </p>
            <input
              type="email"
              placeholder="College email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-note auth-note-success">{message}</div>}
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send setup link'}
            </button>
            <p className="auth-switch">
              <a href="/login">Back to log in</a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}