import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { statusById } from '../../lib/status.js'
import Modal from '../common/Modal.jsx'
import Icon from '../common/Icon.jsx'

const ROLE_LABELS = {
  management: 'Management',
  intern: 'Intern',
  floor_incharge: 'Floor In-Charge',
  faculty: 'Faculty',
  itdept: 'IT Dept',
  principal: 'Principal',
}
const ALL_ROLES = Object.keys(ROLE_LABELS)

// Edit any user's information (superadmin or staff).
// Superadmin-only actions: changing user_roles, user_type flips, password reset flag.
export default function UserEditModal({
  user,
  userRoles = [],
  membership,
  clubs,
  isSuperAdmin,
  onSaved,
  onClose,
}) {
  const [form, setForm] = useState({
    full_name: user.full_name ?? '',
    phone: user.phone ?? '',
    department: user.department ?? '',
    branch: user.branch ?? '',
    year: user.year ?? '',
    semester: user.semester ?? '',
    admission_code: user.admission_code ?? '',
    dob: user.dob ?? '',
  })
  const [userType, setUserType] = useState(user.user_type)
  const [roleAssignments, setRoleAssignments] = useState(userRoles)
  const [newRole, setNewRole] = useState(ALL_ROLES[0] || 'management')
  const [newDept, setNewDept] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const clubName = (id) => clubs.find((c) => c.id === id)?.name ?? 'Unknown'

  async function save() {
    setError('')
    setBusy(true)
    const updates = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      department: form.department.trim(),
      branch: form.branch.trim(),
      year: form.year === '' ? null : Number(form.year),
      semester: form.semester === '' ? null : Number(form.semester),
      admission_code: form.admission_code.trim(),
      dob: form.dob === '' ? null : form.dob,
    }
    const { error: upErr } = await supabase.from('profiles').update(updates).eq('id', user.id)
    if (upErr) {
      setError(upErr.message)
      setBusy(false)
      return
    }
    if (isSuperAdmin && userType !== user.user_type) {
      const { error: typeErr } = await supabase.rpc('set_user_type', {
        _user: user.id,
        _type: userType,
      })
      if (typeErr) {
        setError(typeErr.message)
        setBusy(false)
        return
      }
    }
    onSaved()
    onClose()
  }

  async function removeFromClub(clubId) {
    if (!confirm(`Remove ${user.full_name} from ${clubName(clubId)}?`)) return
    const { error: err } = await supabase
      .from('memberships')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', user.id)
    if (err) alert(err.message)
    else onSaved()
  }

  async function addRoleAssignment() {
    if (roleAssignments.some((r) => r.role === newRole)) {
      alert(`${ROLE_LABELS[newRole]} already assigned.`)
      return
    }
    const { data, error: err } = await supabase
      .from('user_roles')
      .insert({ user_id: user.id, role: newRole, department: newDept.trim() })
      .select()
      .single()
    if (err) {
      alert(err.message)
      return
    }
    setRoleAssignments((rs) => [...rs, { ...data, profile: user }])
    setNewDept('')
    onSaved()
  }

  async function removeRoleAssignment(role) {
    if (
      !confirm(
        `Remove role "${ROLE_LABELS[role] || role}" from ${user.full_name}?`
      )
    )
      return
    const { error: err } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)
      .eq('role', role)
    if (err) alert(err.message)
    else {
      setRoleAssignments((rs) => rs.filter((r) => r.role !== role))
      onSaved()
    }
  }

  async function requirePasswordReset() {
    if (!confirm(`Force ${user.full_name} to reset their password on next sign-in?`)) return
    const { error: err } = await supabase
      .from('profiles')
      .update({ must_reset_password: true })
      .eq('id', user.id)
    if (err) alert(err.message)
    else {
      alert('Done — they will be redirected to /welcome next time.')
      onSaved()
    }
  }

  return (
    <Modal title="Edit user" onClose={onClose} wide>
      <div className="uuid-row">
        <span className="picker-sub">UUID</span>
        <code className="uuid-value">{user.id}</code>
        <button
          className="icon-btn"
          title="Copy UUID"
          onClick={() => navigator.clipboard?.writeText(user.id)}
        >
          <Icon name="file" size={14} />
        </button>
      </div>
      <p className="picker-sub" style={{ marginBottom: 12 }}>
        {user.email} · currently {statusById(user.status).label.toLowerCase()}
      </p>

      <div className="edit-grid">
        <label>
          Full name
          <input value={form.full_name} onChange={set('full_name')} />
        </label>
        <label>
          Phone number
          <input value={form.phone} onChange={set('phone')} placeholder="+91…" />
        </label>
        <label>
          Department
          <input value={form.department} onChange={set('department')} placeholder="e.g. CSE" />
        </label>
        <label>
          Branch
          <input value={form.branch} onChange={set('branch')} placeholder="e.g. AI & ML" />
        </label>
        <label>
          Year
          <input type="number" min="1" max="6" value={form.year} onChange={set('year')} />
        </label>
        <label>
          Semester
          <input
            type="number"
            min="1"
            max="12"
            value={form.semester}
            onChange={set('semester')}
          />
        </label>
        <label>
          Admission code
          <input value={form.admission_code} onChange={set('admission_code')} />
        </label>
        <label>
          Date of birth
          <input type="date" value={form.dob} onChange={set('dob')} />
        </label>
        <label>
          Account type
          <select
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            disabled={!isSuperAdmin}
          >
            <option value="member">Student</option>
            <option value="guest">Guest</option>
          </select>
        </label>
      </div>

      {isSuperAdmin && (
        <>
          <div className="edit-section">Roles</div>
          <div className="chip-row">
            {roleAssignments.length === 0 && (
              <span className="picker-sub">No roles assigned</span>
            )}
            {roleAssignments.map((r) => (
              <span key={r.role} className="role-chip">
                {ROLE_LABELS[r.role] || r.role}
                {r.department ? ` · ${r.department}` : ''}
                <button
                  className="chip-remove"
                  title="Remove role"
                  onClick={() => removeRoleAssignment(r.role)}
                >
                  <Icon name="x" size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="faculty-add" style={{ marginTop: 8 }}>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <input
              placeholder="Department (optional)"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
            />
            <button className="btn-small" onClick={addRoleAssignment}>
              Assign
            </button>
          </div>
        </>
      )}

      <div className="edit-section">Community memberships</div>
      <div className="chip-row">
        {membership.length === 0 && <span className="picker-sub">None</span>}
        {membership.map((m) => (
          <span key={m.club_id} className="club-chip">
            {clubName(m.club_id)}
            {m.role === 'admin' ? ' (admin)' : ''}
            <button
              className="chip-remove"
              title="Remove"
              onClick={() => removeFromClub(m.club_id)}
            >
              <Icon name="x" size={11} />
            </button>
          </span>
        ))}
      </div>

      {isSuperAdmin && (
        <>
          <div className="edit-section">Security</div>
          <div className="chip-row">
            <button className="btn-small" onClick={requirePasswordReset}>
              Force password reset
            </button>
          </div>
        </>
      )}

      {error && <div className="auth-error">{error}</div>}
      <button
        className="btn-primary btn-block"
        style={{ marginTop: 14 }}
        onClick={save}
        disabled={busy}
      >
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </Modal>
  )
}