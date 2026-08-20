import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatEventTime, formatChatTime } from '../../lib/format.js'
import { statusById } from '../../lib/status.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import AttendanceModal from './AttendanceModal.jsx'
import UserEditModal from './UserEditModal.jsx'
import AddUserModal from './AddUserModal.jsx'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'requests', label: 'Requests' },
  { id: 'clubs', label: 'Communities' },
  { id: 'events', label: 'Events' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'groups', label: 'Academics'},
  { id: 'canteen', label: 'Canteen' },
]

export default function AdminPage() {
  const { profile, employee, isHod, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({
    profiles: [],
    employees: [],
    memberships: [],
    clubs: [],
    events: [],
    requests: [],
    userRoles: [],
    academicGroups: [],
    academicMemberships: [],
    canteenShops: [],
  })
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [
      profilesRes,
      employeesRes,
      membershipsRes,
      clubsRes,
      eventsRes,
      requestsRes,
      userRolesRes,
      academicGroupsRes,
      academicMembershipsRes,
      canteenShopsRes
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('employees').select('*, profile:profiles(id, full_name, email)').order('created_at'),
      supabase.from('memberships').select('club_id, user_id, role'),
      supabase.from('clubs').select('*').order('name'),
      supabase
        .from('events')
        .select(
          '*, club:clubs(name), rsvps:event_rsvps(user_id, status, profile:profiles(full_name)), attendance:event_attendance(user_id, present)'
        )
        .order('starts_at', { ascending: false }),
      supabase
        .from('join_requests')
        .select('id, requested_at, club:clubs(id, name), profile:profiles(id, full_name, email)')
        .eq('status', 'pending')
        .order('requested_at'),
      supabase.from('user_roles').select('*'),
      supabase.from('academic_groups').select('*').order('name'),
      supabase.from('academic_group_memberships').select('*'),
      supabase.from('canteen_shops').select('*').order('name'),
    ])

    setData({
      profiles: profilesRes.data ?? [],
      employees: employeesRes.data ?? [],
      memberships: membershipsRes.data ?? [],
      clubs: clubsRes.data ?? [],
      events: eventsRes.data ?? [],
      requests: requestsRes.data ?? [],
      userRoles: userRolesRes.data ?? [],
      academicGroups: academicGroupsRes.data ?? [],
      academicMemberships: academicMembershipsRes.data ?? [],
      canteenShops: canteenShopsRes.data ?? [],
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const employeeById = useMemo(
    () => new Map(data.employees.map((e) => [e.user_id, e])),
    [data.employees]
  )

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="icon-btn" title="Back to chats" onClick={() => navigate('/')}>
          <Icon name="back" />
        </button>
        <Icon name="shield" size={20} />
        <span className="admin-title">Admin Panel</span>
        <span className="admin-me">
          {profile?.full_name} · {employee?.role === 'hod' ? 'HOD' : 'Teacher'}
          {employee?.department ? ` · ${employee.department}` : ''}
        </span>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`club-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'requests' && data.requests.length > 0 && (
              <span className="tab-badge">{data.requests.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="admin-body">
        {loading ? (
          <div className="side-note center">Loading…</div>
        ) : (
          <>
            {tab === 'overview' && <OverviewTab data={data} employeeById={employeeById} />}
            {tab === 'users' && (
              <UsersTab data={data} employeeById={employeeById} isSuperAdmin={isSuperAdmin} reload={loadAll} />
            )}
            {tab === 'requests' && <RequestsAdminTab requests={data.requests} reload={loadAll} />}
            {tab === 'clubs' && <ClubsTab data={data} isHod={isHod} reload={loadAll} />}
            {tab === 'events' && <EventsAdminTab events={data.events} reload={loadAll} />}
            {tab === 'faculty' && <FacultyTab data={data} isHod={isHod} reload={loadAll} />}
            {tab === 'groups' && <GroupsTab data={data} isHod={isHod} reload={loadAll} />}
            {tab === 'canteen' && <CanteenAdminTab data={data} isHod={isHod} reload={loadAll} />}
          </>
        )}
      </div>
    </div>
  )
}

/* ===== Overview ===== */
function OverviewTab({ data, employeeById }) {
  const now = new Date()
  const guests = data.profiles.filter((p) => p.user_type === 'guest' && !employeeById.has(p.id))
  const members = data.profiles.filter((p) => p.user_type === 'member' && !employeeById.has(p.id))
  const stats = [
    { label: 'Students', value: members.length },
    { label: 'Guests', value: guests.length },
    { label: 'Faculty', value: data.employees.length },
    { label: 'Communities', value: data.clubs.length },
    { label: 'Pending requests', value: data.requests.length },
    { label: 'Upcoming events', value: data.events.filter((e) => new Date(e.starts_at) >= now).length },
  ]
  return (
    <div className="stat-grid">
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

/* ===== Users (all users, filter + search by name/email/uuid, edit) ===== */
function UsersTab({ data, employeeById, isSuperAdmin, reload }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | guest | member | faculty
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [clickedNames, setClickedNames] = useState(new Set())

  const toggleClickedName = (id) => {
    setClickedNames((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tierOf = (p) =>
    employeeById.has(p.id) ? 'faculty' : p.user_type === 'guest' ? 'guest' : 'member'

  const q = search.trim().toLowerCase()
  const filtered = data.profiles.filter((p) => {
    if (filter !== 'all' && tierOf(p) !== filter) return false
    if (!q) return true
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    )
  })

  const FILTERS = [
    { id: 'all', label: `All (${data.profiles.length})` },
    { id: 'member', label: 'Students' },
    { id: 'guest', label: 'Guests' },
    { id: 'faculty', label: 'Faculty' },
  ]

  return (
    <div>
      <div className="users-toolbar">
        <input
          className="modal-search"
          placeholder="Search by name, email or UUID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-small" onClick={() => setAdding(true)}>
          + Add user
        </button>
      </div>
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`filter-chip${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div className="side-note">No users found</div>}
      <div className="picker-list">
        {filtered.map((p) => {
          const tier = tierOf(p)
          const st = statusById(p.status)
          return (
            <div key={p.id} className="picker-item no-click">
              <Avatar name={p.full_name} url={p.avatar_url} size={40} online status={p.status} />
              <div className="picker-grow" style={{ cursor: 'pointer' }} onClick={() => toggleClickedName(p.id)}>
                <div className={`picker-name${clickedNames.has(p.id) ? ' clicked' : ''}`}>{p.full_name}</div>
                <div className="picker-sub">
                  {p.email} · <span style={{ color: st.color }}>{st.label}</span>
                  {p.department ? ` · ${p.department}` : ''}
                </div>
              </div>
              <span className={`tier-tag tier-${tier}`}>
                {tier === 'faculty' ? 'Faculty' : tier === 'guest' ? 'Guest' : 'Student'}
              </span>
              <button className="btn-small" onClick={() => setEditing(p)}>
                Edit
              </button>
            </div>
          )
        })}
      </div>

      {editing && (
        <UserEditModal
          user={editing}
          userRoles={data.userRoles.filter((ur) => ur.user_id === editing.id)}
          membership={data.memberships.filter((m) => m.user_id === editing.id)}
          clubs={data.clubs}
          isSuperAdmin={isSuperAdmin}
          onSaved={reload}
          onClose={() => setEditing(null)}
        />
      )}
      {adding && <AddUserModal onCreated={reload} onClose={() => setAdding(false)} />}
    </div>
  )
}

/* ===== Join requests across all communities ===== */
function RequestsAdminTab({ requests, reload }) {
  const { showToast } = useToast()
  const [busyId, setBusyId] = useState(null)

  async function decide(id, approve) {
    setBusyId(id)
    const { error } = await supabase.rpc('decide_join_request', { _request: id, _approve: approve })
    setBusyId(null)
    if (error) showToast(error.message, 'error')
    else {
      showToast(approve ? 'Request approved!' : 'Request rejected', approve ? 'success' : 'info')
      reload()
    }
  }

  if (requests.length === 0) {
    return <div className="side-note center">No pending join requests.</div>
  }
  return (
    <div className="picker-list">
      {requests.map((r) => (
        <div key={r.id} className="picker-item no-click">
          <Avatar name={r.profile.full_name} size={40} />
          <div className="picker-grow">
            <div className="picker-name">{r.profile.full_name}</div>
            <div className="picker-sub">
              wants to join <strong>{r.club.name}</strong> · {formatChatTime(r.requested_at)}
            </div>
          </div>
          <button className="btn-small" disabled={busyId === r.id} onClick={() => decide(r.id, true)}>
            Approve
          </button>
          <button
            className="btn-small danger"
            disabled={busyId === r.id}
            onClick={() => decide(r.id, false)}
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  )
}

/* ===== Communities ===== */
function ClubsTab({ data, isHod, reload }) {
  const { showToast } = useToast()
  const [openClub, setOpenClub] = useState(null)
  const profileOf = (id) => data.profiles.find((p) => p.id === id)

  async function removeMember(club, userId) {
    const p = profileOf(userId)
    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('club_id', club.id)
      .eq('user_id', userId)
    if (error) showToast(error.message, 'error')
    else {
      showToast('Member removed', 'info')
      reload()
    }
  }

  async function setClubRole(club, userId, role) {
    const { error } = await supabase
      .from('memberships')
      .update({ role })
      .eq('club_id', club.id)
      .eq('user_id', userId)
    if (error) showToast(error.message, 'error')
    else {
      showToast('Club role updated', 'success')
      reload()
    }
  }

  async function deleteClub(club) {
    const { error } = await supabase.from('clubs').delete().eq('id', club.id)
    if (error) showToast(error.message, 'error')
    else {
      showToast(`Deleted ${club.name}`, 'info')
      reload()
    }
  }

  return (
    <div className="picker-list">
      {data.clubs.map((club) => {
        const members = data.memberships.filter((m) => m.club_id === club.id)
        const open = openClub === club.id
        return (
          <div key={club.id} className="admin-club-card">
            <div className="picker-item" onClick={() => setOpenClub(open ? null : club.id)}>
              <Avatar
                name={club.name}
                size={40}
                icon={club.is_admission ? <Icon name="users" size={17} /> : undefined}
              />
              <div className="picker-grow">
                <div className="picker-name">
                  {club.name}
                  {club.is_admission ? ' · Admissions' : ''}
                </div>
                <div className="picker-sub">
                  {members.length} member{members.length === 1 ? '' : 's'}
                  {club.description ? ` · ${club.description}` : ''}
                </div>
              </div>
              {isHod && !club.is_admission && (
                <button
                  className="btn-small danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteClub(club)
                  }}
                >
                  Delete
                </button>
              )}
            </div>
            {open && (
              <div className="admin-club-members">
                {members.length === 0 && <div className="side-note">No members yet</div>}
                {members.map((m) => {
                  const p = profileOf(m.user_id)
                  return (
                    <div key={m.user_id} className="picker-item no-click">
                      <Avatar name={p?.full_name} size={32} />
                      <span className="picker-grow">
                        <span className="picker-name">{p?.full_name}</span>
                        <span className="picker-sub">{p?.email}</span>
                      </span>
                      {m.role === 'admin' && <span className="admin-tag">Admin</span>}
                      <button
                        className="btn-small"
                        title="Toggle club admin"
                        onClick={() => setClubRole(club, m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                      >
                        {m.role === 'admin' ? 'Demote' : 'Make admin'}
                      </button>
                      <button
                        className="icon-btn"
                        title="Remove from community"
                        onClick={() => removeMember(club, m.user_id)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ===== Events + attendance ===== */
function EventsAdminTab({ events, reload }) {
  const [marking, setMarking] = useState(null)

  return (
    <div>
      {events.length === 0 && <div className="side-note">No events scheduled yet</div>}
      <div className="picker-list">
        {events.map((e) => {
          const going = e.rsvps.filter((r) => r.status === 'going')
          const present = e.attendance.filter((a) => a.present).length
          return (
            <div key={e.id} className="event-card admin-event">
              <div className="event-title">{e.title}</div>
              <div className="event-when">
                <Icon name="calendar" size={13} /> {formatEventTime(e.starts_at)} · {e.club?.name}
                {e.location ? ` · ${e.location}` : ''}
              </div>
              <div className="event-attendees">
                <span className="event-attendees-label">
                  <Icon name="users" size={12} /> Will be present ({going.length}):
                </span>{' '}
                {going.length
                  ? going
                      .map((r) => r.profile?.full_name)
                      .filter(Boolean)
                      .join(', ')
                  : 'no RSVPs yet'}
              </div>
              {e.attendance.length > 0 && (
                <div className="event-attendance-summary">
                  <Icon name="check" size={12} /> Attendance: {present} of {e.attendance.length}{' '}
                  present
                </div>
              )}
              <div className="event-rsvps">
                <button className="btn-small" onClick={() => setMarking(e)}>
                  {e.attendance.length > 0 ? 'Edit attendance' : 'Mark attendance'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {marking && (
        <AttendanceModal event={marking} onSaved={reload} onClose={() => setMarking(null)} />
      )}
    </div>
  )
}

/* ===== Faculty (HOD adds/removes teachers) ===== */
function FacultyTab({ data, isHod, reload }) {
  const { showToast } = useToast()
  const [pickId, setPickId] = useState('')
  const [pickRole, setPickRole] = useState('teacher')
  const [pickDept, setPickDept] = useState('')

  const nonFaculty = data.profiles.filter(
    (p) => !data.employees.some((e) => e.user_id === p.id)
  )

  async function addEmployee() {
    if (!pickId) return
    const { error } = await supabase
      .from('employees')
      .insert({ user_id: pickId, role: pickRole, department: pickDept.trim() })
    if (error) showToast(error.message, 'error')
    else {
      showToast('Faculty member added successfully!', 'success')
      setPickId('')
      setPickDept('')
      reload()
    }
  }

  async function setRole(emp, role) {
    const { error } = await supabase.from('employees').update({ role }).eq('user_id', emp.user_id)
    if (error) showToast(error.message, 'error')
    else {
      showToast('Faculty role updated', 'success')
      reload()
    }
  }

  async function removeEmployee(emp) {
    const { error } = await supabase.from('employees').delete().eq('user_id', emp.user_id)
    if (error) showToast(error.message, 'error')
    else {
      showToast('Faculty member removed', 'info')
      reload()
    }
  }

  return (
    <div>
      {isHod && (
        <div className="faculty-add">
          <select value={pickId} onChange={(e) => setPickId(e.target.value)}>
            <option value="">Add existing user as faculty…</option>
            {nonFaculty.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.email})
              </option>
            ))}
          </select>
          <select value={pickRole} onChange={(e) => setPickRole(e.target.value)}>
            <option value="teacher">Teacher</option>
            <option value="hod">HOD</option>
          </select>
          <input
            placeholder="Department"
            value={pickDept}
            onChange={(e) => setPickDept(e.target.value)}
          />
          <button className="btn-small" onClick={addEmployee} disabled={!pickId}>
            Add
          </button>
        </div>
      )}
      <div className="picker-list">
        {data.employees.map((emp) => (
          <div key={emp.user_id} className="picker-item no-click">
            <Avatar name={emp.profile?.full_name} size={40} />
            <div className="picker-grow">
              <div className="picker-name">{emp.profile?.full_name}</div>
              <div className="picker-sub">
                {emp.profile?.email}
                {emp.department ? ` · ${emp.department}` : ''}
              </div>
            </div>
            <span className="admin-tag">{emp.role === 'hod' ? 'HOD' : 'Teacher'}</span>
            {isHod && (
              <>
                <button
                  className="btn-small"
                  onClick={() => setRole(emp, emp.role === 'hod' ? 'teacher' : 'hod')}
                >
                  Make {emp.role === 'hod' ? 'teacher' : 'HOD'}
                </button>
                <button
                  className="icon-btn"
                  title="Remove from faculty"
                  onClick={() => removeEmployee(emp)}
                >
                  <Icon name="trash" size={15} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===== Academic Groups (Academics Tab) ===== */
function GroupsTab({ data, isHod, reload }) {
  const [openGroup, setOpenGroup] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [addingUser, setAddingUser] = useState({}) // group_id -> user_id
  const [creating, setCreating] = useState(false)

  const profileOf = (id) => data.profiles.find((p) => p.id === id)

  async function createGroup(e) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const { data: gid, error } = await supabase.rpc('create_academic_group', {
      _name: name.trim(),
      _description: description.trim(),
      _parent: parentId === '' ? null : parentId
    })
    setCreating(false)
    if (error) alert(error.message)
    else {
      setName('')
      setDescription('')
      setParentId('')
      alert('Academic group created!')
      reload()
    }
  }

  async function deleteGroup(groupId) {
    if (!confirm('Delete this academic group permanently? This will remove its chats and memberships.')) return
    const { error } = await supabase.from('academic_groups').delete().eq('id', groupId)
    if (error) alert(error.message)
    else reload()
  }

  async function addMember(groupId) {
    const userId = addingUser[groupId]
    if (!userId) return
    const { error } = await supabase
      .from('academic_group_memberships')
      .insert({ group_id: groupId, user_id: userId })
    if (error) alert(error.message)
    else {
      setAddingUser(prev => ({ ...prev, [groupId]: '' }))
      reload()
    }
  }

  async function removeMember(groupId, userId) {
    const p = profileOf(userId)
    if (!confirm(`Remove ${p?.full_name} from this academic group?`)) return
    const { error } = await supabase
      .from('academic_group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    if (error) alert(error.message)
    else reload()
  }

  async function setGroupRole(groupId, userId, role) {
    const { error } = await supabase
      .from('academic_group_memberships')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId)
    if (error) alert(error.message)
    else reload()
  }

  return (
    <div>
      {/* Create Group Form */}
      <div className="faculty-add" style={{ marginBottom: 20 }}>
        <form onSubmit={createGroup} style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap' }}>
          <input
            placeholder="Academic group name (e.g. Class of CSE-A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ flex: 2, minWidth: 200 }}
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ flex: 2, minWidth: 200 }}
          />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          >
            <option value="">No parent group (Top-level)</option>
            {data.academicGroups.filter(g => !g.parent_id).map(g => (
              <option key={g.id} value={g.id}>Under {g.name}</option>
            ))}
          </select>
          <button className="btn-small" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create Group'}
          </button>
        </form>
      </div>

      {/* List of Groups */}
      <div className="picker-list">
        {data.academicGroups.length === 0 && <div className="side-note">No academic groups created yet.</div>}
        {data.academicGroups.map((group) => {
          const members = data.academicMemberships.filter((m) => m.group_id === group.id)
          const open = openGroup === group.id
          
          // Profiles not already in this group
          const nonMembers = data.profiles.filter(p => !members.some(m => m.user_id === p.id))

          return (
            <div key={group.id} className="admin-club-card">
              <div className="picker-item" onClick={() => setOpenGroup(open ? null : group.id)}>
                <Avatar name={group.name} size={40} />
                <div className="picker-grow">
                  <div className="picker-name">{group.name}</div>
                  <div className="picker-sub">
                    {members.length} member{members.length === 1 ? '' : 's'}
                    {group.description ? ` · ${group.description}` : ''}
                    {group.parent_id ? ' (Sub-group)' : ''}
                  </div>
                </div>
                {isHod && (
                  <button
                    className="btn-small danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteGroup(group.id)
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>

              {open && (
                <div className="admin-club-members">
                  {/* Add Member inline form */}
                  <div className="faculty-add" style={{ padding: '8px 12px', background: 'var(--cream-2)', borderBottom: '1px solid var(--cream-3)' }}>
                    <select
                      value={addingUser[group.id] || ''}
                      onChange={(e) => setAddingUser(prev => ({ ...prev, [group.id]: e.target.value }))}
                      style={{ flex: 1 }}
                    >
                      <option value="">Add student/staff to group…</option>
                      {nonMembers.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                      ))}
                    </select>
                    <button
                      className="btn-small"
                      disabled={!addingUser[group.id]}
                      onClick={() => addMember(group.id)}
                    >
                      Add
                    </button>
                  </div>

                  {members.length === 0 && <div className="side-note">No members in this group yet</div>}
                  {members.map((m) => {
                    const p = profileOf(m.user_id)
                    return (
                      <div key={m.user_id} className="picker-item no-click">
                        <Avatar name={p?.full_name} url={p?.avatar_url} size={32} />
                        <span className="picker-grow">
                          <span className="picker-name">{p?.full_name}</span>
                          <span className="picker-sub">{p?.email}</span>
                        </span>
                        {m.role === 'admin' && <span className="admin-tag">Admin</span>}
                        <button
                          className="btn-small"
                          title="Toggle admin role"
                          onClick={() => setGroupRole(group.id, m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                        >
                          {m.role === 'admin' ? 'Demote' : 'Make admin'}
                        </button>
                        <button
                          className="icon-btn"
                          title="Remove from group"
                          onClick={() => removeMember(group.id, m.user_id)}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ===== Canteen Shop Management (Canteen Tab) ===== */
function CanteenAdminTab({ data, isHod, reload }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [shopkeeperId, setShopkeeperId] = useState('')
  const [creating, setCreating] = useState(false)
  
  // Edit states
  const [editingShop, setEditingShop] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editKeeper, setEditKeeper] = useState('')
  const [editOpen, setEditOpen] = useState(true)
  const [saving, setSaving] = useState(false)

  const profileOf = (id) => data.profiles.find((p) => p.id === id)

  async function handleCreateShop(e) {
    e.preventDefault()
    if (!name.trim() || !shopkeeperId) return
    setCreating(true)
    const { error } = await supabase.from('canteen_shops').insert({
      name: name.trim(),
      description: description.trim(),
      shopkeeper_id: shopkeeperId,
      is_open: true
    })
    setCreating(false)
    if (error) {
      alert(error.message)
    } else {
      setName('')
      setDescription('')
      setShopkeeperId('')
      alert('Canteen shop created successfully!')
      reload()
    }
  }

  async function handleDeleteShop(shopId, shopName) {
    if (!confirm(`Delete ${shopName} permanently? This will delete all its menu items, announcements, and order history.`)) return
    const { error } = await supabase.from('canteen_shops').delete().eq('id', shopId)
    if (error) alert(error.message)
    else reload()
  }

  function startEdit(shop) {
    setEditingShop(shop)
    setEditName(shop.name)
    setEditDesc(shop.description || '')
    setEditKeeper(shop.shopkeeper_id)
    setEditOpen(shop.is_open)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editName.trim() || !editKeeper || !editingShop) return
    setSaving(true)
    const { error } = await supabase
      .from('canteen_shops')
      .update({
        name: editName.trim(),
        description: editDesc.trim(),
        shopkeeper_id: editKeeper,
        is_open: editOpen
      })
      .eq('id', editingShop.id)
    setSaving(false)
    if (error) {
      alert(error.message)
    } else {
      setEditingShop(null)
      alert('Canteen shop updated!')
      reload()
    }
  }

  return (
    <div>
      {/* Create Shop Form */}
      {isHod && (
        <div className="faculty-add" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreateShop} style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap' }}>
            <input
              placeholder="Shop name (e.g. Campus Bites)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ flex: 2, minWidth: 200 }}
            />
            <input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ flex: 2, minWidth: 200 }}
            />
            <select
              value={shopkeeperId}
              onChange={(e) => setShopkeeperId(e.target.value)}
              required
              style={{ flex: 1.5, minWidth: 200 }}
            >
              <option value="">Assign shopkeeper…</option>
              {data.profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
              ))}
            </select>
            <button className="btn-small" type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create Shop'}
            </button>
          </form>
        </div>
      )}

      {/* Edit Shop Section */}
      {editingShop && (
        <div className="faculty-add" style={{ marginBottom: 20, padding: 16, border: '1px solid var(--line)', background: 'var(--cream-2)' }}>
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <h4 style={{ margin: 0, color: 'var(--green)' }}>Edit Shop: {editingShop.name}</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Shop name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                style={{ flex: 2, minWidth: 180 }}
              />
              <input
                placeholder="Description"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                style={{ flex: 2, minWidth: 180 }}
              />
              <select
                value={editKeeper}
                onChange={(e) => setEditKeeper(e.target.value)}
                required
                style={{ flex: 1.5, minWidth: 180 }}
              >
                {data.profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                ))}
              </select>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={editOpen}
                  onChange={(e) => setEditOpen(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                Shop is open
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-small danger" type="button" onClick={() => setEditingShop(null)}>
                Cancel
              </button>
              <button className="btn-small" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of Shops */}
      <div className="picker-list">
        {data.canteenShops.length === 0 && <div className="side-note">No canteen shops created yet.</div>}
        {data.canteenShops.map((shop) => {
          const keeper = profileOf(shop.shopkeeper_id)
          return (
            <div key={shop.id} className="picker-item no-click">
              <Avatar name={shop.name} size={40} icon={<Icon name="coffee" />} />
              <div className="picker-grow">
                <div className="picker-name">{shop.name}</div>
                <div className="picker-sub">
                  {shop.description || 'No description'} ·{' '}
                  <span className={shop.is_open ? 'status-active-text' : 'status-dnd-text'}>
                    {shop.is_open ? 'Open' : 'Closed'}
                  </span>
                  {keeper && ` · Keeper: ${keeper.full_name} (${keeper.email})`}
                </div>
              </div>
              {isHod && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-small" onClick={() => startEdit(shop)}>
                    Edit
                  </button>
                  <button
                    className="btn-small danger"
                    onClick={() => handleDeleteShop(shop.id, shop.name)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

