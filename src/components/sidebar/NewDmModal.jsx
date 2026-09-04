import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { usePresence } from '../../context/PresenceContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Modal from '../common/Modal.jsx'
import Icon from '../common/Icon.jsx'

export default function NewDmModal({ onClose }) {
  const { user } = useAuth()
  const { refreshChats, openConversation } = useChat()
  const { onlineIds } = usePresence()
  const { showToast } = useToast()
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_color')
      .neq('id', user.id)
      .order('full_name')
      .then(({ data }) => setPeople(data ?? []))
  }, [user.id])

  const filtered = people.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  )

  async function startDm(personId) {
    if (busy) return
    setBusy(true)
    try {
      const { data: convId, error } = await supabase.rpc('get_or_create_dm', { _other: personId })
      if (error) throw error
      await refreshChats()
      openConversation(convId)
      onClose()
    } catch (err) {
      showToast(err.message, 'error')
      setBusy(false)
    }
  }

  const openModal = (type) => {
    window.dispatchEvent(new CustomEvent('open-modal', { detail: type }))
    onClose()
  }

  return (
    <Modal title="New message or community" onClose={onClose}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => openModal('browse')}
        >
          <Icon name="compass" size={16} /> Browse Clubs
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => openModal('club')}
        >
          <Icon name="plus" size={16} /> Create Community
        </button>
      </div>

      <input
        className="modal-search"
        placeholder="Search people for direct message"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div className="picker-list">
        {filtered.length === 0 && <div className="side-note">No one found</div>}
        {filtered.map((p) => (
          <div key={p.id} className="picker-item" onClick={() => startDm(p.id)}>
            <Avatar name={p.full_name} color={p.avatar_color} size={40} online={onlineIds.has(p.id)} />
            <div>
              <div className="picker-name">{p.full_name}</div>
              <div className="picker-sub">{p.email}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
