import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatEventTime, formatChatTime } from '../../lib/format.js'
import { effectiveStatus, statusById } from '../../lib/status.js'
import { usePresence } from '../../context/PresenceContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import AttendanceModal from './AttendanceModal.jsx'
import UserEditModal from './UserEditModal.jsx'
import AddUserModal from './AddUserModal.jsx'
import AnnouncementsAdminTab from './AnnouncementsAdminTab.jsx'

const NAV = [
  {
    heading: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview', icon: 'compass' },
      { id: 'announcements', label: 'Announcements', icon: 'megaphone' },
      { id: 'requests', label: 'Requests', icon: 'user' },
    ],
  },
  {
    heading: 'Manage',
    items: [
      { id: 'users', label: 'Users', icon: 'users' },
      { id: 'clubs', label: 'Communities', icon: 'chat' },
      { id: 'groups', label: 'Academics', icon: 'book' },
      { id: 'events', label: 'Events', icon: 'calendar' },
      { id: 'faculty', label: 'Faculty', icon: 'shield' },
    ],
  },
]
const TAB_IDS = NAV.flatMap((g) => g.items.map((i) => i.id))
const tabFromHash = () => {
  const id = window.location.hash.slice(1)
  return TAB_IDS.includes(id) ? id : 'overview'
}

export default function AdminPage() {
  const { profile, roleIds, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  // Selected section lives in the URL hash so a refresh or link keeps it.
  const [tab, setTabState] = useState(tabFromHash)
  const setTab = (id) => {
    setTabState(id)
    window.history.replaceState(null, '', `#${id}`)
  }
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
      academicMembershipsRes
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
        .select('id, requested_at, club:clubs(id, name), group:academic_groups(id, name), profile:profiles!join_requests_user_id_fkey(id, full_name, email)')
        .eq('status', 'pending')
        .order('requested_at'),
      supabase.from('user_roles').select('*'),
      supabase.from('academic_groups').select('*').order('name'),
      supabase.from('academic_group_memberships').select('*'),
    ])

    const failed = [
      ['profiles', profilesRes],
      ['employees', employeesRes],
      ['memberships', membershipsRes],
      ['clubs', clubsRes],
      ['events', eventsRes],
      ['join requests', requestsRes],
      ['roles', userRolesRes],
      ['academic groups', academicGroupsRes],
      ['academic memberships', academicMembershipsRes],
    ].filter(([, res]) => res.error)
    failed.forEach(([name, res]) => console.error(`Admin panel: failed to load ${name}:`, res.error))
    if (failed.length) {
      showToast(`Couldn't load ${failed.map(([name]) => name).join(', ')} — some data may be missing`, 'error', 8000)
    }

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
    })
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Keep statuses (and other profile edits) live while the panel is open.
  useEffect(() => {
    const channel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        setData((d) => ({
          ...d,
          profiles: d.profiles.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p)),
        }))
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const employeeById = useMemo(
    () => new Map(data.employees.map((e) => [e.user_id, e])),
    [data.employees]
  )
  // The signed-in staff member's HOD/teacher record (employees table).
  const employee = profile ? employeeById.get(profile.id) : null
  // HOD-level actions (delete communities, manage faculty) — also open to the
  // superadmin roles (Principal, IT Dept).
  const isHod = employee?.role === 'hod' || isSuperAdmin
  const ROLE_NAMES = { principal: 'Principal', itdept: 'IT Dept', faculty: 'Faculty' }
  const roleLabel =
    employee?.role === 'hod'
      ? 'HOD'
      : roleIds.map((r) => ROLE_NAMES[r]).filter(Boolean).join(', ') || 'Staff'
  const totalChannels =
    data.clubs.filter((c) => !c.is_admission).length + data.academicGroups.length

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="icon-btn" aria-label="Back to chats" data-tip="Back to chats" onClick={() => navigate('/')}>
          <Icon name="back" />
        </button>
        <Icon name="shield" size={20} />
        <span className="admin-title">Admin Panel</span>
        <span className="admin-me">
          {profile?.full_name} · {roleLabel}
          {employee?.department ? ` · ${employee.department}` : ''}
        </span>
      </div>

      <div className="admin-shell">
        <nav className="admin-nav" aria-label="Admin sections">
          {NAV.map((group) => (
            <div key={group.heading} className="admin-nav-group">
              <div className="admin-nav-heading">{group.heading}</div>
              {group.items.map((item) => {
                const count = item.id === 'requests' ? data.requests.length : 0
                return (
                  <button
                    key={item.id}
                    className={`admin-nav-item${tab === item.id ? ' active' : ''}`}
                    aria-current={tab === item.id ? 'page' : undefined}
                    onClick={() => setTab(item.id)}
                  >
                    <Icon name={item.icon} size={17} />
                    <span className="admin-nav-label">{item.label}</span>
                    {count > 0 && <span className="tab-badge">{count}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

      <main className="admin-body" key={tab}>
        {loading ? (
          <div className="side-note center">Loading…</div>
        ) : (
          <>
            {tab === 'overview' && <OverviewTab data={data} employeeById={employeeById} onOpen={setTab} />}
            {tab === 'users' && (
              <UsersTab data={data} employeeById={employeeById} isSuperAdmin={isSuperAdmin} reload={loadAll} />
            )}
            {tab === 'requests' && <RequestsAdminTab requests={data.requests} reload={loadAll} />}
            {tab === 'clubs' && <ClubsTab data={data} isHod={isHod} reload={loadAll} />}
            {tab === 'events' && <EventsAdminTab events={data.events} reload={loadAll} />}
            {tab === 'faculty' && <FacultyTab data={data} isHod={isHod} reload={loadAll} />}
            {tab === 'groups' && <GroupsTab data={data} isHod={isHod} reload={loadAll} />}
            {tab === 'announcements' && <AnnouncementsAdminTab totalChannels={totalChannels} />}
          </>
        )}
      </main>
      </div>
    </div>
  )
}

/* ===== Overview ===== */
function OverviewTab({ data, employeeById, onOpen }) {
  const now = new Date()
  const guests = data.profiles.filter((p) => p.user_type === 'guest' && !employeeById.has(p.id))
  const members = data.profiles.filter((p) => p.user_type === 'member' && !employeeById.has(p.id))
  const stats = [
    { label: 'Students', value: members.length, tab: 'users' },
    { label: 'Guests', value: guests.length, tab: 'users' },
    { label: 'Faculty', value: data.employees.length, tab: 'faculty' },
    { label: 'Communities', value: data.clubs.length, tab: 'clubs' },
    { label: 'Pending requests', value: data.requests.length, tab: 'requests', alert: data.requests.length > 0 },
    {
      label: 'Upcoming events',
      value: data.events.filter((e) => new Date(e.starts_at) >= now).length,
      tab: 'events',
    },
  ]
  return (
    <>
      <div className="admin-section-head">
        <div>
          <h2>Overview</h2>
          <p>Campus at a glance. Select a card to open that section.</p>
        </div>
      </div>
      <div className="stat-grid">
        {stats.map((s) => (
          <button
            key={s.label}
            className={`stat-card${s.alert ? ' is-alert' : ''}`}
            onClick={() => onOpen(s.tab)}
          >
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <Icon name="arrow-right" size={15} className="action-arrow" />
          </button>
        ))}
      </div>
    </>
  )
}

/* ===== Users (all users, filter + search by name/email/uuid, edit) ===== */
function UsersTab({ data, employeeById, isSuperAdmin, reload }) {
  const { profile, roleIds } = useAuth()
  const { showToast } = useToast()
  const { onlineIds, ready: presenceReady } = usePresence()
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

  const requestDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to request deletion for ${user.full_name}?`)) return;
    const { error } = await supabase.from('user_deletion_requests').insert({
      user_id: user.id,
      requested_by: profile.id,
      reason: 'Admin requested deletion',
      status: 'pending'
    });
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Deletion request submitted', 'success');
      reload();
    }
  };

  const tierOf = (p) =>
    employeeById.has(p.id) ? 'faculty' : p.user_type === 'guest' ? 'guest' : 'member'

  const q = search.trim().toLowerCase()
  const filtered = data.profiles.filter((p) => {
    if (filter !== 'all' && tierOf(p) !== filter) return false
    if (!q) return true
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
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
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {roleIds.some(r => ['faculty', 'itdept', 'principal'].includes(r)) && (
          <button className="btn-small" onClick={() => setAdding(true)}>
            + Add user
          </button>
        )}
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
          const isOnline = onlineIds.has(p.id)
          // Until presence has synced, fall back to the stored status.
          const st = statusById(presenceReady ? effectiveStatus(p.status, isOnline) : p.status)
          return (
            <div key={p.id} className="picker-item no-click">
              <Avatar
                name={p.full_name}
                url={p.avatar_url}
                size={40}
                online={presenceReady && isOnline}
                status={p.status}
              />
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-small" onClick={() => setEditing(p)}>
                  Edit
                </button>
                {roleIds.includes('itdept') && (
                  <button
                    className="btn-small danger"
                    title="Request user deletion"
                    onClick={() => requestDeleteUser(p)}
                  >
                    Delete
                  </button>
                )}
              </div>
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
    const { error } = await supabase.rpc('decide_membership_request', { _request: id, _approve: approve })
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
          <Avatar name={r.profile?.full_name} size={40} />
          <div className="picker-grow">
            <div className="picker-name">{r.profile?.full_name ?? 'Unknown user'}</div>
            <div className="picker-sub">
              wants to join <strong>{r.club?.name ?? r.group?.name}</strong> · {formatChatTime(r.requested_at)}
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
    if (!confirm(`Remove ${p?.full_name ?? 'this member'} from ${club.name}?`)) return
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
    if (!confirm(`Delete ${club.name} permanently? Its chats, events and memberships will be removed.`)) return
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
    if (!confirm(`Remove ${emp.profile?.full_name ?? 'this person'} from faculty?`)) return
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
    const { error } = await supabase.rpc('create_academic_group', {
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
            <option value="">No parent group</option>
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
                  <div className="admin-inline-add">
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

