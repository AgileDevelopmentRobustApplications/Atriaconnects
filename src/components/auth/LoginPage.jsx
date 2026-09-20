import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../common/Icon.jsx'
import GuestNameModal from './GuestNameModal.jsx'
import LamaMouseGlow from '../common/LamaMouseGlow.jsx'
import ThemeToggleSwitch from '../common/ThemeToggleSwitch.jsx'
import { authLimiter } from '../../lib/rate-limit.js'
import { sanitizeEmail } from '../../lib/sanitize.js'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [guestOpen, setGuestOpen] = useState(false)

  async function handleEmailLogin(e) {
    e.preventDefault()
    setError('')

    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) {
      setError('Please enter a valid email address.')
      return
    }

    // Rate-limit login attempts (defense-in-depth; Supabase GoTrue also limits server-side)
    const rateLimitKey = `login:${cleanEmail}`
    if (!authLimiter.check(rateLimitKey)) {
      const wait = authLimiter.remainingCooldown(rateLimitKey)
      setError(`Too many login attempts. Please wait ${wait}s before trying again.`)
      return
    }

    setBusy(true)
    authLimiter.record(rateLimitKey)
    try {
      await signIn(cleanEmail, password)
      authLimiter.reset(rateLimitKey) // clear on success
    } catch (err) {
      setError(err.message ?? 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <LamaMouseGlow />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-mark">
            <Icon name="chat" size={26} strokeWidth={2.2} />
          </span>
          AdraConnects
        </div>
        <p className="auth-tagline">Agile Development · Robust Automations</p>

        <form onSubmit={handleEmailLogin}>
          <input
            type="email"
            placeholder="College email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="btn-link-guest"
          onClick={() => setGuestOpen(true)}
          disabled={busy}
        >
          Continue as guest
        </button>
        <p className="auth-note">
          Guest accounts can browse communities and message the Admissions Office.
        </p>

        <p className="auth-switch">
          New here? <Link to="/welcome">Set up your account</Link>
          <br />
          <Link to="/welcome">Forgot password?</Link>
        </p>

        <div className="auth-theme-switch-wrap">
          <ThemeToggleSwitch />
        </div>
      </div>

      {guestOpen && <GuestNameModal onClose={() => setGuestOpen(false)} />}
    </div>
  )
}
