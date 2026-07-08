import { useEffect } from 'react'
import { useChat } from '../../context/ChatContext.jsx'
import { usePresence } from '../../context/PresenceContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatChatTime } from '../../lib/format.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'

export default function ChatListItem({ chat }) {
  const { activeId, openConversation, statuses, ensureStatus } = useChat()
  const { onlineIds } = usePresence()
  const { user } = useAuth()

  const isDm = chat.type === 'dm'
  const isAnn = chat.type === 'club_announcements'
  const online = isDm && onlineIds.has(chat.other_user_id)

  useEffect(() => {
    if (isDm) ensureStatus(chat.other_user_id)
  }, [isDm, chat.other_user_id, ensureStatus])

  let previewText = ''
  if (chat.last_message_at) {
    const who = chat.last_sender_id === user.id ? 'You' : chat.last_sender_name?.split(' ')[0]
    const body = chat.last_message || (chat.last_has_attachment ? 'Attachment' : '')
    previewText = isDm && chat.last_sender_id !== user.id ? body : `${who}: ${body}`
  } else if (chat.is_admission) {
    previewText = isAnn ? 'Official announcements' : 'Ask questions or fix an appointment'
  } else {
    previewText = isAnn ? 'Club announcements' : isDm ? 'Start the conversation' : 'You joined this community'
  }

  return (
    <div
      className={`chat-item${activeId === chat.conversation_id ? ' active' : ''}`}
      onClick={() => openConversation(chat.conversation_id)}
    >
      <Avatar
        name={chat.title}
        size={44}
        online={online}
        status={statuses[chat.other_user_id]}
        icon={
          isAnn ? (
            <Icon name="megaphone" size={18} />
          ) : chat.is_admission ? (
            <Icon name="users" size={18} />
          ) : undefined
        }
      />
      <div className="chat-item-body">
        <div className="chat-item-top">
          <span className="chat-item-title">
            {isAnn ? `${chat.title} — Announcements` : chat.title}
          </span>
          {chat.last_message_at && (
            <span className={`chat-item-time${chat.unread_count > 0 ? ' unread' : ''}`}>
              {formatChatTime(chat.last_message_at)}
            </span>
          )}
        </div>
        <div className="chat-item-bottom">
          <span className="chat-item-preview">
            {chat.last_message_at && chat.last_has_attachment && (
              <Icon name="paperclip" size={12} className="preview-clip" />
            )}
            {previewText}
          </span>
          {chat.unread_count > 0 && <span className="unread-badge">{chat.unread_count}</span>}
        </div>
      </div>
    </div>
  )
}
