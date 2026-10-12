import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Icon from '../common/Icon.jsx'

// Chat room for a directory club (Communities → club page). Each directory
// club is a community row linked by clubs.directory_id (migration 035):
// members jump into its chat, others request to join like any community.
export default function ClubChatButton({ directoryId, clubName }) {
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const { chats, openConversation } = useChat()
  const { showToast } = useToast()
  const [club, setClub] = useState(undefined) // undefined = loading, null = not set up
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id')
        .eq('directory_id', directoryId)
        .maybeSingle()
      if (!active) return
      if (error) console.error('Club chat: lookup failed', error)
      setClub(data ?? null)
      if (data && user) {
        const { data: req } = await supabase
          .from('join_requests')
          .select('id')
          .eq('club_id', data.id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .limit(1)
        if (active) setPending((req ?? []).length > 0)
      }
    })()
    return () => {
      active = false
    }
  }, [directoryId, user])

  // Membership comes from the live chat list, so approval flips this button.
  const chat = club ? chats.find((c) => c.club_id === club.id && c.type === 'club_chat') : null

  async function requestJoin() {
    setBusy(true)
    const { error } = await supabase.from('join_requests').insert({ club_id: club.id, user_id: user.id })
    setBusy(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setPending(true)
    showToast(`Request sent — you'll get access to the ${clubName} chat once it's approved`, 'success')
  }

  if (chat) {
    return (
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          openConversation(chat.conversation_id)
          navigate('/')
        }}
      >
        <Icon name="chat" size={16} /> Open club chat
      </button>
    )
  }

  let label = 'Join club chat'
  let hint = ''
  let disabled = busy
  if (club === undefined) {
    label = 'Club chat'
    disabled = true
  } else if (club === null) {
    label = 'Chat room coming soon'
    hint = 'This club’s chat room hasn’t been set up yet.'
    disabled = true
  } else if (isGuest) {
    label = 'Members only'
    hint = 'Guest accounts can’t join club chats.'
    disabled = true
  } else if (pending) {
    label = 'Request pending'
    hint = 'A club admin or staff member will review your request.'
    disabled = true
  } else if (busy) {
    label = 'Sending request…'
  }

  return (
    <button type="button" className="btn-primary" disabled={disabled} title={hint || undefined} onClick={requestJoin}>
      <Icon name={pending ? 'clock' : 'chat'} size={16} /> {label}
    </button>
  )
}
