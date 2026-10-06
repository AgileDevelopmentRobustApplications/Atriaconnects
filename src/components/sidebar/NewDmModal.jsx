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
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_color')
      .neq('id', user.id)
      .order('full_name')
      .then(({ data }) => {
        setPeople(data ?? [])
        setLoaded(true)
      })
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
    <Modal title="New message" onClose={onClose}>
      <input
        className="modal-search"
        placeholder="Search people for direct message"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div className="picker-list">
        {filtered.length === 0 && (
          <div className="side-note">{!loaded ? 'Loading people…' : search ? `No one matches “${search}”.` : 'No one else here yet.'}</div>
        )}
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            className="picker-item picker-button"
            disabled={busy}
            onClick={() => startDm(p.id)}
          >
            <Avatar name={p.full_name} color={p.avatar_color} size={40} online={onlineIds.has(p.id)} />
            <div className="picker-grow">
              <div className="picker-name">{p.full_name}</div>
              <div className="picker-sub">{p.email}</div>
            </div>
            <Icon name="arrow-right" size={16} className="action-arrow" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
