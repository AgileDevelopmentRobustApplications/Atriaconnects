import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../common/Icon.jsx'
import LamaMouseGlow from '../common/LamaMouseGlow.jsx'

// Gateway for registering new teachers/HODs: sign in with Google, then
// unlock the faculty role with a staff access code.
export default function FacultyGateway() {
  const { session, profile, employee, signInWithGoogle, refreshEmployee } = useAuth()
  const navigate = useNavigate()
  const [staffCode, setStaffCode] = useState('')
  const [department, setDepartment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle('/faculty')
    } catch (err) {
      setError(err.message ?? 'Sign in failed')
      setBusy(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('register_employee', {
      _code: staffCode.trim(),
      _department: department.trim(),
    })
    if (rpcError) {
      setError(rpcError.message)
      setBusy(false)
      return
    }
    await refreshEmployee()
    navigate('/admin')
  }

  return (
    <div className="auth-page">
      <LamaMouseGlow />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-mark">
            <Icon name="shield" size={26} strokeWidth={2.2} />
          </span>
          Faculty Gateway
        </div>
        <p className="auth-tagline">Teacher &amp; HOD access — AdraConnects</p>

        {!session ? (
          <>
            <button className="btn-google" onClick={handleGoogle} disabled={busy}>
              <Icon name="google" size={18} />
              {busy ? 'Redirecting to Google…' : 'Sign in with Google to continue'}
            </button>
            {error && <div className="auth-error auth-error-center">{error}</div>}
          </>
        ) : employee ? (
          <div className="gateway-status">
            <p>
              {profile?.full_name} is registered as{' '}
              <strong>{employee.role === 'hod' ? 'HOD' : 'Teacher'}</strong>
              {employee.department ? ` — ${employee.department}` : ''}.
            </p>
            <button className="btn-primary btn-block" onClick={() => navigate('/admin')}>
              Open admin panel
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="modal-form">
            <p className="auth-note gateway-signed-in">
              Signed in as {profile?.full_name}. Enter your staff access code to unlock faculty
              access.
            </p>
            <input
              type="password"
              placeholder="Staff access code"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value)}
              required
              autoFocus
            />
            <input
              type="text"
              placeholder="Department (e.g. Computer Science)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn-primary" disabled={busy || !staffCode.trim()}>
              {busy ? 'Verifying…' : 'Register as faculty'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/">Back to AdraConnects</Link>
        </p>
      </div>
    </div>
  )
}
