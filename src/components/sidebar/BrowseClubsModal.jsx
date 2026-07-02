import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Modal from '../common/Modal.jsx'

export default function BrowseClubsModal({ onClose }) {
  const { user } = useAuth()
  const { refreshChats, openConversation } = useChat()
  const [clubs, setClubs] = useState([])
  const [myClubIds, setMyClubIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    const [clubsRes, mineRes] = await Promise.all([
      supabase.from('clubs').select('*, memberships(count)').order('created_at'),
      supabase.from('memberships').select('club_id').eq('user_id', user.id),
    ])
    setClubs(clubsRes.data ?? [])
    setMyClubIds(new Set((mineRes.data ?? []).map((m) => m.club_id)))
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = clubs.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  async function joinClub(club) {
    setBusyId(club.id)
    try {
      const { error } = await supabase
        .from('memberships')
        .insert({ club_id: club.id, user_id: user.id, role: 'member' })
      if (error) throw error
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('club_id', club.id)
        .eq('type', 'club_chat')
        .single()
      await refreshChats()
      if (conv) openConversation(conv.id)
      onClose()
    } catch (err) {
      alert(err.message)
      setBusyId(null)
    }
  }

  return (
    <Modal title="Browse clubs" onClose={onClose} wide>
      <input
        className="modal-search"
        placeholder="Search clubs"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div className="picker-list">
        {filtered.length === 0 && (
          <div className="side-note">No clubs yet — create the first one.</div>
        )}
        {filtered.map((club) => {
          const memberCount = club.memberships?.[0]?.count ?? 0
          const joined = myClubIds.has(club.id)
          return (
            <div key={club.id} className="picker-item no-click">
              <Avatar name={club.name} color={club.avatar_color} size={44} />
              <div className="picker-grow">
                <div className="picker-name">{club.name}</div>
                <div className="picker-sub">
                  {memberCount} member{memberCount === 1 ? '' : 's'}
                  {club.description ? ` · ${club.description}` : ''}
                </div>
              </div>
              {joined ? (
                <span className="joined-tag">Joined</span>
              ) : (
                <button
                  className="btn-small"
                  disabled={busyId === club.id}
                  onClick={() => joinClub(club)}
                >
                  {busyId === club.id ? 'Joining…' : 'Join'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
