import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'

// Members list for academic groups. Staff (or group admins) can add/remove
// members directly — there are no join requests.
export default function GroupMembersTab({ groupState, isAdmin }) {
  const { members, reload } = groupState
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState([])
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  async function startAdd() {
    setAdding(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')
    const memberIds = new Set(members.map((m) => m.user_id))
    setCandidates((data ?? []).filter((p) => !memberIds.has(p.id)))
  }

  async function addUser(userId) {
    setBusy(true)
    const { error } = await supabase
      .from('academic_group_memberships')
      .insert({ group_id: groupState.group.id, user_id: userId, role: 'member' })
    setBusy(false)
    if (error) {
      alert(error.message)
      return
    }
    setCandidates((cs) => cs.filter((c) => c.id !== userId))
    await reload()
  }

  async function removeUser(userId) {
    const m = members.find((mm) => mm.user_id === userId)
    if (!confirm(`Remove ${m?.profile?.full_name} from this group?`)) return
    const { error } = await supabase
      .from('academic_group_memberships')
      .delete()
      .eq('group_id', groupState.group.id)
      .eq('user_id', userId)
    if (error) {
      alert(error.message)
      return
    }
    await reload()
  }

  async function toggleAdmin(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    const { error } = await supabase
      .from('academic_group_memberships')
      .update({ role: newRole })
      .eq('group_id', groupState.group.id)
      .eq('user_id', userId)
    if (error) alert(error.message)
    else await reload()
  }

  const filtered = members.filter((m) =>
    (m.profile?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="users-toolbar">
        <input
          className="modal-search"
          placeholder="Search members"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isAdmin && !adding && (
          <button className="btn-small" onClick={startAdd}>
            + Add
          </button>
        )}
      </div>

      {adding && (
        <div className="picker-list">
          {candidates.length === 0 && <div className="side-note">No candidates left.</div>}
          {candidates.slice(0, 30).map((p) => (
            <div key={p.id} className="picker-item no-click">
              <Avatar name={p.full_name} size={32} />
              <div className="picker-grow">
                <div className="picker-name">{p.full_name}</div>
                <div className="picker-sub">{p.email}</div>
              </div>
              <button className="btn-small" disabled={busy} onClick={() => addUser(p.id)}>
                Add
              </button>
            </div>
          ))}
          <button className="btn-link-guest" onClick={() => setAdding(false)}>
            Done
          </button>
        </div>
      )}

      {!adding && (
        <div className="picker-list">
          {filtered.length === 0 && <div className="side-note">No members yet.</div>}
          {filtered.map((m) => (
            <div key={m.user_id} className="picker-item no-click">
              <Avatar name={m.profile?.full_name} size={36} />
              <div className="picker-grow">
                <div className="picker-name">{m.profile?.full_name}</div>
                <div className="picker-sub">{m.profile?.email}</div>
              </div>
              {m.role === 'admin' && <span className="admin-tag">Admin</span>}
              {isAdmin && (
                <>
                  <button
                    className="btn-small"
                    title="Toggle admin"
                    onClick={() => toggleAdmin(m.user_id, m.role)}
                  >
                    {m.role === 'admin' ? 'Demote' : 'Make admin'}
                  </button>
                  <button
                    className="icon-btn"
                    title="Remove"
                    onClick={() => removeUser(m.user_id)}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}