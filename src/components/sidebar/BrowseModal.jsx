import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Modal from '../common/Modal.jsx'

const TABS = [
  { id: 'communities', label: 'Communities' },
  { id: 'groups', label: 'Academic groups' },
]

// Browse communities AND academic groups with tabs. Each tab lists top-level
// items (parent_id null) with their subgroups nested underneath.
// Communities: members request to join (admin-approved). Guests view only.
// Groups: staff add members (memberships are auto-created on creation).
export default function BrowseModal({ onClose }) {
  const { user, isGuest } = useAuth()
  const [tab, setTab] = useState('communities')

  return (
    <Modal title="Browse" onClose={onClose} wide>
      <div className="club-tabs" style={{ marginBottom: 12 }}>
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
      {tab === 'communities' && <CommunitiesList isGuest={isGuest} userId={user?.id} />}
      {tab === 'groups' && <GroupsList isGuest={isGuest} userId={user?.id} />}
    </Modal>
  )
}

function CommunitiesList({ isGuest, userId }) {
  const [clubs, setClubs] = useState([])
  const [subByParent, setSubByParent] = useState({})
  const [myClubIds, setMyClubIds] = useState(new Set())
  const [pendingIds, setPendingIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const [clubsRes, mineRes, reqRes] = await Promise.all([
        supabase
          .from('clubs')
          .select('*, memberships(count)')
          .eq('is_admission', false)
          .order('created_at'),
        supabase.from('memberships').select('club_id').eq('user_id', userId),
        supabase
          .from('join_requests')
          .select('club_id')
          .eq('user_id', userId)
          .eq('status', 'pending'),
      ])
      const all = clubsRes.data ?? []
      const parents = all.filter((c) => !c.parent_id)
      const subs = all.filter((c) => c.parent_id)
      const grouped = {}
      for (const s of subs) {
        const list = grouped[s.parent_id] ?? []
        list.push(s)
        grouped[s.parent_id] = list
      }
      setClubs(parents)
      setSubByParent(grouped)
      setMyClubIds(new Set((mineRes.data ?? []).map((m) => m.club_id)))
      setPendingIds(new Set((reqRes.data ?? []).map((r) => r.club_id)))
    })()
  }, [userId])

  const filtered = clubs.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  async function requestJoin(club) {
    setBusyId(club.id)
    const { error } = await supabase
      .from('join_requests')
      .insert({ club_id: club.id, user_id: userId })
    setBusyId(null)
    if (error) {
      alert(error.message)
      return
    }
    setPendingIds((p) => new Set([...p, club.id]))
  }

  function row(club, indent = false) {
    const memberCount = club.memberships?.[0]?.count ?? 0
    const joined = myClubIds.has(club.id)
    const pending = pendingIds.has(club.id)
    const subs = subByParent[club.id] ?? []
    return (
      <div key={club.id}>
        <div className="picker-item no-click" style={indent ? { paddingLeft: 32 } : undefined}>
          <Avatar name={club.name} size={indent ? 32 : 44} />
          <div className="picker-grow">
            <div className="picker-name">{club.name}</div>
            <div className="picker-sub">
              {memberCount} member{memberCount === 1 ? '' : 's'}
              {club.description ? ` · ${club.description}` : ''}
              {subs.length > 0 ? ` · ${subs.length} sub-group${subs.length === 1 ? '' : 's'}` : ''}
            </div>
          </div>
          {joined ? (
            <span className="joined-tag">Joined</span>
          ) : pending ? (
            <span className="pending-tag">Pending</span>
          ) : isGuest ? (
            <span className="picker-sub">View only</span>
          ) : (
            <button
              className="btn-small"
              disabled={busyId === club.id}
              onClick={() => requestJoin(club)}
            >
              {busyId === club.id ? 'Requesting…' : 'Request to join'}
            </button>
          )}
        </div>
        {subs.map((s) => row(s, true))}
      </div>
    )
  }

  return (
    <div>
      {isGuest && (
        <p className="side-note">
          You're a guest — browse only. Ask the Admissions Office about becoming a member.
        </p>
      )}
      <input
        className="modal-search"
        placeholder="Search communities"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div className="picker-list">
        {filtered.length === 0 && (
          <div className="side-note">No communities yet — create the first one.</div>
        )}
        {filtered.map((c) => row(c))}
      </div>
    </div>
  )
}

function GroupsList({ isGuest, userId }) {
  const [groups, setGroups] = useState([])
  const [subByParent, setSubByParent] = useState({})
  const [myGroupIds, setMyGroupIds] = useState(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const [groupsRes, mineRes] = await Promise.all([
        supabase.from('academic_groups').select('*').order('created_at'),
        supabase.from('academic_group_memberships').select('group_id').eq('user_id', userId),
      ])
      const all = groupsRes.data ?? []
      const parents = all.filter((g) => !g.parent_id)
      const subs = all.filter((g) => g.parent_id)
      const grouped = {}
      for (const s of subs) {
        const list = grouped[s.parent_id] ?? []
        list.push(s)
        grouped[s.parent_id] = list
      }
      setGroups(parents)
      setSubByParent(grouped)
      setMyGroupIds(new Set((mineRes.data ?? []).map((m) => m.group_id)))
    })()
  }, [userId])

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))

  function row(group, indent = false) {
    const subs = subByParent[group.id] ?? []
    return (
      <div key={group.id}>
        <div className="picker-item no-click" style={indent ? { paddingLeft: 32 } : undefined}>
          <Avatar name={group.name} size={indent ? 32 : 44} />
          <div className="picker-grow">
            <div className="picker-name">{group.name}</div>
            <div className="picker-sub">
              {group.description || 'Academic group'}
              {subs.length > 0 ? ` · ${subs.length} sub-group${subs.length === 1 ? '' : 's'}` : ''}
            </div>
          </div>
          {myGroupIds.has(group.id) ? (
            <span className="joined-tag">In this group</span>
          ) : (
            <span className="picker-sub">Staff-managed</span>
          )}
        </div>
        {subs.map((s) => row(s, true))}
      </div>
    )
  }

  return (
    <div>
      {isGuest && (
        <p className="side-note">
          Academic groups are created by staff. Guests can browse but not join.
        </p>
      )}
      <input
        className="modal-search"
        placeholder="Search academic groups"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div className="picker-list">
        {filtered.length === 0 && (
          <div className="side-note">No academic groups yet — staff can create them.</div>
        )}
        {filtered.map((g) => row(g))}
      </div>
    </div>
  )
}