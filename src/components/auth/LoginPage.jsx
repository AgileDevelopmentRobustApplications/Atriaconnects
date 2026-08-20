import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../common/Icon.jsx'
import LamaMouseGlow from '../common/LamaMouseGlow.jsx'
import ThemeToggleSwitch from '../common/ThemeToggleSwitch.jsx'

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleEmailLogin(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err.message ?? 'Login failed')
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle('/')
    } catch (err) {
      setError(err.message ?? 'Sign in failed')
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

        <button className="btn-google" onClick={handleGoogle} disabled={busy}>
          <Icon name="google" size={18} />
          Continue with Google — guest
        </button>
        <p className="auth-note">
          Guest access lets you browse communities and message the Admissions Office.
        </p>

        <p className="auth-switch">
          New student or staff? <Link to="/signup">Create an account</Link>
          <br />
          Teacher or HOD? <Link to="/faculty">Faculty gateway</Link>
        </p>

        <div className="auth-theme-switch-wrap">
          <ThemeToggleSwitch />
        </div>
      </div>
    </div>
  )
}
