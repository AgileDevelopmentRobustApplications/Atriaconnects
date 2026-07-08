import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { statusById } from '../../lib/status.js'
import Modal from '../common/Modal.jsx'
import Icon from '../common/Icon.jsx'

// Edit any user's information (faculty only; user_type changes go through an RPC)
export default function UserEditModal({ user, membership, clubs, employee, isHod, onSaved, onClose }) {
  const [form, setForm] = useState({
    full_name: user.full_name ?? '',
    phone: user.phone ?? '',
    department: user.department ?? '',
    branch: user.branch ?? '',
    year: user.year ?? '',
    admission_code: user.admission_code ?? '',
    dob: user.dob ?? '',
  })
  const [userType, setUserType] = useState(user.user_type)
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
      admission_code: form.admission_code.trim(),
      dob: form.dob === '' ? null : form.dob,
    }
    const { error: upErr } = await supabase.from('profiles').update(updates).eq('id', user.id)
    if (upErr) {
      setError(upErr.message)
      setBusy(false)
      return
    }
    if (userType !== user.user_type) {
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

  async function toggleFaculty() {
    if (employee) {
      if (!confirm(`Remove ${user.full_name} from faculty?`)) return
      const { error: err } = await supabase.from('employees').delete().eq('user_id', user.id)
      if (err) alert(err.message)
    } else {
      const { error: err } = await supabase
        .from('employees')
        .insert({ user_id: user.id, role: 'teacher', department: form.department.trim() })
      if (err) alert(err.message)
    }
    onSaved()
    onClose()
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
          Admission code
          <input value={form.admission_code} onChange={set('admission_code')} />
        </label>
        <label>
          Date of birth
          <input type="date" value={form.dob} onChange={set('dob')} />
        </label>
        <label>
          Account type
          <select value={userType} onChange={(e) => setUserType(e.target.value)} disabled={!!employee}>
            <option value="member">Adra member</option>
            <option value="guest">Guest</option>
          </select>
        </label>
      </div>

      <div className="edit-section">Community memberships</div>
      <div className="chip-row">
        {membership.length === 0 && <span className="picker-sub">None</span>}
        {membership.map((m) => (
          <span key={m.club_id} className="club-chip">
            {clubName(m.club_id)}
            {m.role === 'admin' ? ' (admin)' : ''}
            <button className="chip-remove" title="Remove" onClick={() => removeFromClub(m.club_id)}>
              <Icon name="x" size={11} />
            </button>
          </span>
        ))}
      </div>

      {isHod && (
        <>
          <div className="edit-section">Faculty</div>
          <div className="chip-row">
            {employee ? (
              <span className="picker-sub">
                {employee.role === 'hod' ? 'HOD' : 'Teacher'}
                {employee.department ? ` · ${employee.department}` : ''}
              </span>
            ) : (
              <span className="picker-sub">Not faculty</span>
            )}
            <button className="btn-small" onClick={toggleFaculty}>
              {employee ? 'Remove from faculty' : 'Make teacher'}
            </button>
          </div>
        </>
      )}

      {error && <div className="auth-error">{error}</div>}
      <button className="btn-primary btn-block" style={{ marginTop: 14 }} onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </Modal>
  )
}
