import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useChat } from '../../context/ChatContext.jsx'
import Modal from '../common/Modal.jsx'

// Create a top-level community. Pass parentId prop to create a sub-club under
// an existing community (the parent must allow members; sub-clubs inherit
// access via their own memberships table — they don't auto-share members).
export default function NewClubModal({ onClose, parentId = null, parentName = '' }) {
  const { refreshChats, openConversation } = useChat()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      let clubId
      if (parentId) {
        const { data, error: rpcError } = await supabase.rpc('create_subclub', {
          _parent: parentId,
          _name: name.trim(),
          _description: description.trim(),
        })
        if (rpcError) throw rpcError
        clubId = data
      } else {
        const { data, error: rpcError } = await supabase.rpc('create_club', {
          _name: name.trim(),
          _description: description.trim(),
        })
        if (rpcError) throw rpcError
        clubId = data
      }
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('club_id', clubId)
        .eq('type', 'club_chat')
        .single()
      await refreshChats()
      if (conv) openConversation(conv.id)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title={parentId ? `New sub-group in ${parentName}` : 'Create a club'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <input
          placeholder={parentId ? 'Sub-group name' : 'Club name (e.g. Robotics Club)'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          autoFocus
        />
        <textarea
          placeholder="What is this community about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : parentId ? 'Create sub-group' : 'Create club'}
        </button>
        <p className="side-note">
          You'll be the admin — you can post announcements and schedule events.
        </p>
      </form>
    </Modal>
  )
}