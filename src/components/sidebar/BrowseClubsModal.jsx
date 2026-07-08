import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Modal from '../common/Modal.jsx'

// Browse all communities. Members request to join (admin-approved); guests view only.
export default function BrowseClubsModal({ onClose }) {
  const { user, isGuest } = useAuth()
  const [clubs, setClubs] = useState([])
  const [myClubIds, setMyClubIds] = useState(new Set())
  const [pendingIds, setPendingIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    const [clubsRes, mineRes, reqRes] = await Promise.all([
      supabase.from('clubs').select('*, memberships(count)').eq('is_admission', false).order('created_at'),
      supabase.from('memberships').select('club_id').eq('user_id', user.id),
      supabase.from('join_requests').select('club_id').eq('user_id', user.id).eq('status', 'pending'),
    ])
    setClubs(clubsRes.data ?? [])
    setMyClubIds(new Set((mineRes.data ?? []).map((m) => m.club_id)))
    setPendingIds(new Set((reqRes.data ?? []).map((r) => r.club_id)))
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = clubs.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  async function requestJoin(club) {
    setBusyId(club.id)
    const { error } = await supabase
      .from('join_requests')
      .insert({ club_id: club.id, user_id: user.id })
    setBusyId(null)
    if (error) {
      alert(error.message)
      return
    }
    setPendingIds((p) => new Set([...p, club.id]))
  }

  return (
    <Modal title="Browse communities" onClose={onClose} wide>
      {isGuest && (
        <p className="side-note">
          You're a guest — you can browse communities, but only members can request to join. Ask
          the Admissions Office about becoming a member.
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
        {filtered.map((club) => {
          const memberCount = club.memberships?.[0]?.count ?? 0
          const joined = myClubIds.has(club.id)
          const pending = pendingIds.has(club.id)
          return (
            <div key={club.id} className="picker-item no-click">
              <Avatar name={club.name} size={44} />
              <div className="picker-grow">
                <div className="picker-name">{club.name}</div>
                <div className="picker-sub">
                  {memberCount} member{memberCount === 1 ? '' : 's'}
                  {club.description ? ` · ${club.description}` : ''}
                </div>
              </div>
              {joined ? (
                <span className="joined-tag">Joined</span>
              ) : pending ? (
                <span className="pending-tag">Pending approval</span>
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
          )
        })}
      </div>
    </Modal>
  )
}
