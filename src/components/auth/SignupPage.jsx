import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../common/Icon.jsx'

export default function SignupPage() {
  const { signUp, refreshEmployee } = useAuth()
  const [accountType, setAccountType] = useState('student') // 'student' | 'faculty'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [staffCode, setStaffCode] = useState('')
  const [department, setDepartment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (accountType === 'faculty' && !staffCode.trim()) {
      setError('Staff access code is required for faculty accounts')
      return
    }
    setBusy(true)
    try {
      await signUp(fullName.trim(), email.trim(), password)
      if (accountType === 'faculty') {
        const { error: rpcError } = await supabase.rpc('register_employee', {
          _code: staffCode.trim(),
          _department: department.trim(),
        })
        if (rpcError) {
          setError(
            `Account created, but faculty registration failed: ${rpcError.message}. You are signed in as a student — contact your HOD.`
          )
          setBusy(false)
          return
        }
        await refreshEmployee()
      }
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
        <p className="auth-tagline">Agile Development · Robust Automations</p>

        <div className="account-toggle">
          <button
            type="button"
            className={accountType === 'student' ? 'active' : ''}
            onClick={() => setAccountType('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={accountType === 'faculty' ? 'active' : ''}
            onClick={() => setAccountType('faculty')}
          >
            Faculty
          </button>
        </div>

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
          {accountType === 'faculty' && (
            <>
              <input
                type="password"
                placeholder="Staff access code"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Department (e.g. Computer Science)"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating account…' : `Sign up as ${accountType}`}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
