import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import Modal from '../common/Modal.jsx'
import { GroupsList } from './BrowseModal.jsx'

const BROWSE_TABS = [
  { id: 'communities', label: 'Communities' },
  { id: 'groups', label: 'Academic groups' },
]

// Browse communities and academic groups. Members can request to join; guests view only.
export default function BrowseClubsModal({ onClose, onCreateClub }) {
  const { user, isGuest } = useAuth()
  const { chats } = useChat()
  const { showToast } = useToast()
  const [clubs, setClubs] = useState([])
  const [pendingIds, setPendingIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('communities')
  const [busyId, setBusyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function load() {
    try {
      const [clubsRes, reqRes] = await Promise.all([
        supabase.from('clubs').select('*').order('created_at'),
        user
          ? supabase
              .from('join_requests')
              .select('club_id')
              .eq('user_id', user.id)
              .eq('status', 'pending')
          : { data: [] },
      ])
      if (clubsRes.error) throw clubsRes.error
      setClubs(clubsRes.data ?? [])
      setPendingIds(new Set((reqRes.data ?? []).map((request) => request.club_id)))
    } catch (error) {
      setLoadError(error.message || 'Unable to load communities.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const myClubIds = new Set(chats.filter((chat) => chat.is_club).map((chat) => chat.club_id))
  const filtered = clubs.filter((club) =>
    club.name.toLowerCase().includes(search.toLowerCase())
  )

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
    setPendingIds((current) => new Set([...current, club.id]))
  }

  return (
    <Modal title="Clubs & Communities" onClose={onClose} wide>
      <div className="club-tabs" style={{ marginBottom: 12 }}>
        {BROWSE_TABS.map((browseTab) => (
          <button
            key={browseTab.id}
            className={`club-tab${tab === browseTab.id ? ' active' : ''}`}
            onClick={() => setTab(browseTab.id)}
          >
            {browseTab.label}
          </button>
        ))}
      </div>

      {tab === 'groups' ? (
        <GroupsList isGuest={isGuest} userId={user?.id} />
      ) : (
        <>
          {isGuest && (
            <p className="side-note">
              You&apos;re a guest — you can browse communities, but only members can request to join.
              Ask the Admissions Office about becoming a member.
            </p>
          )}
          <div className="browse-header-row">
            <input
              className="modal-search"
              placeholder="Search communities..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
            {!loading && loadError && (
              <div className="side-note">Could not load communities: {loadError}</div>
            )}
            {!loading && !loadError && filtered.length === 0 && (
              <div className="side-note">No communities yet — create the first one.</div>
            )}
            {!loading &&
              !loadError &&
              filtered.map((club) => {
                const joined = myClubIds.has(club.id)
                const pending = pendingIds.has(club.id)
                return (
                  <div key={club.id} className="picker-item no-click">
                    <Avatar name={club.name} size={44} />
                    <div className="picker-grow">
                      <div className="picker-name">{club.name}</div>
                      <div className="picker-sub">{club.description || 'Community'}</div>
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
        </>
      )}
    </Modal>
  )
}