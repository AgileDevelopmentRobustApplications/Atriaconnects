import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import Modal from '../common/Modal.jsx'

// Browse all communities. Members request to join (admin-approved); guests view only.
export default function BrowseClubsModal({ onClose, onCreateClub }) {
  const { user, isGuest } = useAuth()
  const { chats } = useChat()
  const { showToast } = useToast()
  const [clubs, setClubs] = useState([])
  const [pendingIds, setPendingIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function load() {
    try {
      const [clubsRes, reqRes] = await Promise.all([
        supabase.from('clubs').select('*').order('created_at'),
        user ? supabase.from('join_requests').select('club_id').eq('user_id', user.id).eq('status', 'pending') : { data: [] },
      ])
      if (clubsRes.error) throw clubsRes.error
      setClubs(clubsRes.data ?? [])
      setPendingIds(new Set((reqRes.data ?? []).map((r) => r.club_id)))
    } catch (error) {
      setLoadError(error.message || 'Unable to load communities.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const myClubIds = new Set(chats.filter((c) => c.is_club).map((c) => c.club_id))
  const filtered = clubs.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  async function requestJoin(club) {
    setBusyId(club.id)
    const { error } = await supabase
      .from('join_requests')
      .insert({ club_id: club.id, user_id: user.id })
    setBusyId(null)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast(`Join request submitted for ${club.name}`, 'success')
    setPendingIds((p) => new Set([...p, club.id]))
  }

  return (
    <Modal title="Clubs & Communities" onClose={onClose} wide>
      {isGuest && (
        <p className="side-note">
          You&apos;re a guest — you can browse communities, but only members can request to join. Ask
          the Admissions Office about becoming a member.
        </p>
      )}
      <div className="browse-header-row">
        <input
          className="modal-search"
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {!isGuest && onCreateClub && (
          <button
            className="btn-small create-club-trigger-btn"
            onClick={() => {
              onClose()
              onCreateClub()
            }}
          >
            <Icon name="plus" size={14} />
            <span>Create Club</span>
          </button>
        )}
      </div>
      <div className="picker-list">
        {loading && <div className="side-note">Loading communities...</div>}
        {!loading && loadError && <div className="side-note">Could not load communities: {loadError}</div>}
        {!loading && !loadError && filtered.length === 0 && (
          <div className="side-note">No communities yet — create the first one.</div>
        )}
        {!loading && !loadError && filtered.map((club) => {
          const joined = myClubIds.has(club.id)
          const pending = pendingIds.has(club.id)
          return (
            <div key={club.id} className="picker-item no-click">
              <Avatar name={club.name} size={44} />
              <div className="picker-grow">
                <div className="picker-name">{club.name}</div>
                <div className="picker-sub">
                  {club.description || 'Community'}
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
