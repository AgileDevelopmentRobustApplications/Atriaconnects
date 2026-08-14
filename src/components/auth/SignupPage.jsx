import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../common/Icon.jsx'

// Email signup = full "adra" member account (can request to join communities)
export default function SignupPage() {
  const { signUp, theme, toggleTheme } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    try {
      await signUp(fullName.trim(), email.trim(), password)
    } catch (err) {
      setError(err.message ?? 'Sign up failed')
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-mark">
            <Icon name="chat" size={26} strokeWidth={2.2} />
          </span>
          AdraConnects
        </div>
        <p className="auth-tagline">Create your member account</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />
          <input
            type="email"
            placeholder="College email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="auth-note">
          Member accounts can request to join communities and chat across the organization.
        </p>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>

        <div className="auth-theme-switch-wrap">
          <button
            type="button"
            className="theme-toggle-pill"
            onClick={() => toggleTheme(theme === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            <span className={`toggle-thumb ${theme}`}>
              <Icon name={theme === 'light' ? 'sun' : 'moon'} size={14} />
            </span>
            <span className="toggle-label">
              {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
