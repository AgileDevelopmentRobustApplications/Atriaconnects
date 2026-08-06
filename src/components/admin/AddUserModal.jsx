import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase.js'
import Modal from '../common/Modal.jsx'

const ROLE_LABELS = {
  management: 'Management',
  intern: 'Intern',
  floor_incharge: 'Floor In-Charge',
  faculty: 'Faculty',
  itdept: 'IT Dept',
  principal: 'Principal',
}
const ALL_ROLES = Object.keys(ROLE_LABELS)

// Invite a new user. The account is provisioned with a temporary password
// (Welcome@123) and flagged must_reset_password=true, so they're routed to
// /welcome on first sign-in. Only superadmins can assign elevated roles.
export default function AddUserModal({ onCreated, onClose }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [semester, setSemester] = useState('')
  const [department, setDepartment] = useState('')
  const [initialRole, setInitialRole] = useState('student') // 'student' means no role tag
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const temp = createClient(
      import.meta.env.VITE_SUPABASE_URL ?? 'https://zgwckrpeveoemmwtriee.supabase.co',
      import.meta.env.VITE_SUPABASE_KEY ??
        'sb_publishable_J7ezco2M177uP-eUvVZjXQ_AAFOk84V',
      { auth: { storageKey: 'sb-admin-adduser', persistSession: false } }
    )
    const tempPassword = 'Welcome@123'
    const { data, error: signUpErr } = await temp.auth.signUp({
      email: email.trim(),
      password: tempPassword,
      options: { data: { full_name: fullName.trim() } },
    })
    if (signUpErr) {
      setError(signUpErr.message)
      setBusy(false)
      return
    }
    const newId = data.user?.id
    if (!newId) {
      setError('Account created but no user id returned — check Supabase dashboard.')
      setBusy(false)
      return
    }

    // Update the profile: department, semester, must_reset_password.
    const profileUpdates = { must_reset_password: true }
    if (department.trim()) profileUpdates.department = department.trim()
    if (semester) profileUpdates.semester = Number(semester)
    const { error: profErr } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', newId)
    if (profErr) {
      setError(`Profile update failed: ${profErr.message}`)
      setBusy(false)
      return
    }

    // Assign role if requested (only staff-style roles are valid for new users).
    if (initialRole !== 'student') {
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: newId, role: initialRole, department: department.trim() })
      if (roleErr) {
        setError(`Role assignment failed: ${roleErr.message}. Profile was created.`)
        setBusy(false)
        return
      }
    }

    onCreated()
    onClose()
  }

  return (
    <Modal title="Invite user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <p className="side-note">
          Accounts are pre-defined by admins. Users log in with the email + a
          temporary password (Welcome@123) and are prompted to choose a new one.
        </p>
        <input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoFocus
        />
        <input
          type="email"
          placeholder="Email (must be unique)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="edit-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label>
            Semester
            <input
              type="number"
              min="1"
              max="12"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </label>
          <label>
            Department
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. CSE"
            />
          </label>
        </div>
        <label>
          Initial role
          <select value={initialRole} onChange={(e) => setInitialRole(e.target.value)}>
            <option value="student">Student (no role tag)</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Inviting…' : 'Send invite'}
        </button>
      </form>
    </Modal>
  )
}