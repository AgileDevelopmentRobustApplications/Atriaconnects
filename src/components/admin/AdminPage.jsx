import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatEventTime } from '../../lib/format.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import AttendanceModal from './AttendanceModal.jsx'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'students', label: 'Students' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'events', label: 'Events' },
  { id: 'faculty', label: 'Faculty' },
]

export default function AdminPage() {
  const { profile, employee, isHod } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({ profiles: [], employees: [], memberships: [], clubs: [], events: [] })
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [profilesRes, employeesRes, membershipsRes, clubsRes, eventsRes] = await Promise.all([
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
    ])
    setData({
      profiles: profilesRes.data ?? [],
      employees: employeesRes.data ?? [],
      memberships: membershipsRes.data ?? [],
      clubs: clubsRes.data ?? [],
      events: eventsRes.data ?? [],
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const employeeIds = useMemo(() => new Set(data.employees.map((e) => e.user_id)), [data.employees])
  const students = useMemo(
    () => data.profiles.filter((p) => !employeeIds.has(p.id)),
    [data.profiles, employeeIds]
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
          </button>
        ))}
      </div>

      <div className="admin-body">
        {loading ? (
          <div className="side-note center">Loading…</div>
        ) : (
          <>
            {tab === 'overview' && <OverviewTab data={data} students={students} />}
            {tab === 'students' && <StudentsTab data={data} students={students} reload={loadAll} />}
            {tab === 'clubs' && <ClubsTab data={data} isHod={isHod} reload={loadAll} />}
            {tab === 'events' && <EventsAdminTab events={data.events} reload={loadAll} />}
            {tab === 'faculty' && (
              <FacultyTab data={data} students={students} isHod={isHod} reload={loadAll} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ===== Overview ===== */
function OverviewTab({ data, students }) {
  const now = new Date()
  const upcoming = data.events.filter((e) => new Date(e.starts_at) >= now).length
  const stats = [
    { label: 'Students', value: students.length },
    { label: 'Faculty', value: data.employees.length },
    { label: 'Clubs', value: data.clubs.length },
    { label: 'Events', value: data.events.length },
    { label: 'Upcoming events', value: upcoming },
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

/* ===== Students ===== */
function StudentsTab({ data, students, reload }) {
  const [search, setSearch] = useState('')
  const clubName = (id) => data.clubs.find((c) => c.id === id)?.name ?? 'Unknown club'
  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  )

  async function removeFromClub(student, membership) {
    if (!confirm(`Remove ${student.full_name} from ${clubName(membership.club_id)}?`)) return
    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('club_id', membership.club_id)
      .eq('user_id', student.id)
    if (error) alert(error.message)
    else reload()
  }

  return (
    <div>
      <input
        className="modal-search"
        placeholder="Search students by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filtered.length === 0 && <div className="side-note">No students found</div>}
      <div className="picker-list">
        {filtered.map((s) => {
          const clubs = data.memberships.filter((m) => m.user_id === s.id)
          return (
            <div key={s.id} className="picker-item no-click admin-row">
              <Avatar name={s.full_name} size={40} />
              <div className="picker-grow">
                <div className="picker-name">{s.full_name}</div>
                <div className="picker-sub">{s.email}</div>
                <div className="chip-row">
                  {clubs.length === 0 && <span className="picker-sub">No club memberships</span>}
                  {clubs.map((m) => (
                    <span key={m.club_id} className="club-chip">
                      {clubName(m.club_id)}
                      {m.role === 'admin' ? ' (admin)' : ''}
                      <button
                        className="chip-remove"
                        title="Remove from club"
                        onClick={() => removeFromClub(s, m)}
                      >
                        <Icon name="x" size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ===== Clubs ===== */
function ClubsTab({ data, isHod, reload }) {
  const [openClub, setOpenClub] = useState(null)
  const profileOf = (id) => data.profiles.find((p) => p.id === id)

  async function removeMember(club, userId) {
    const p = profileOf(userId)
    if (!confirm(`Remove ${p?.full_name} from ${club.name}?`)) return
    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('club_id', club.id)
      .eq('user_id', userId)
    if (error) alert(error.message)
    else reload()
  }

  async function deleteClub(club) {
    if (!confirm(`Delete ${club.name}? This removes its chats, events and attendance permanently.`))
      return
    const { error } = await supabase.from('clubs').delete().eq('id', club.id)
    if (error) alert(error.message)
    else reload()
  }

  return (
    <div className="picker-list">
      {data.clubs.map((club) => {
        const members = data.memberships.filter((m) => m.club_id === club.id)
        const open = openClub === club.id
        return (
          <div key={club.id} className="admin-club-card">
            <div className="picker-item" onClick={() => setOpenClub(open ? null : club.id)}>
              <Avatar name={club.name} size={40} />
              <div className="picker-grow">
                <div className="picker-name">{club.name}</div>
                <div className="picker-sub">
                  {members.length} member{members.length === 1 ? '' : 's'}
                  {club.description ? ` · ${club.description}` : ''}
                </div>
              </div>
              {isHod && (
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
                        className="icon-btn"
                        title="Remove from club"
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

/* ===== Faculty ===== */
function FacultyTab({ data, students, isHod, reload }) {
  const [pickId, setPickId] = useState('')
  const [pickRole, setPickRole] = useState('teacher')
  const [pickDept, setPickDept] = useState('')

  async function addEmployee() {
    if (!pickId) return
    const { error } = await supabase
      .from('employees')
      .insert({ user_id: pickId, role: pickRole, department: pickDept.trim() })
    if (error) alert(error.message)
    else {
      setPickId('')
      setPickDept('')
      reload()
    }
  }

  async function setRole(emp, role) {
    const { error } = await supabase.from('employees').update({ role }).eq('user_id', emp.user_id)
    if (error) alert(error.message)
    else reload()
  }

  async function removeEmployee(emp) {
    if (!confirm(`Remove ${emp.profile?.full_name} from faculty?`)) return
    const { error } = await supabase.from('employees').delete().eq('user_id', emp.user_id)
    if (error) alert(error.message)
    else reload()
  }

  return (
    <div>
      {isHod && (
        <div className="faculty-add">
          <select value={pickId} onChange={(e) => setPickId(e.target.value)}>
            <option value="">Add existing user as faculty…</option>
            {students.map((s) => (
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
