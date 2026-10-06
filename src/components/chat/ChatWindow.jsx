import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { usePresence } from '../../context/PresenceContext.jsx'
import { useMessages, usePeerRead, useReactions } from '../../hooks/useMessages.js'
import { useTyping } from '../../hooks/useTyping.js'
import { useClub } from '../../hooks/useClub.js'
import { statusById } from '../../lib/status.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import MessageList from './MessageList.jsx'
import MessageInput from './MessageInput.jsx'

export default function ChatWindow({ openPanel }) {
  const { isGuest, isEmployee } = useAuth()
  const { activeChat, chats, openConversation, closeConversation, statuses, ensureStatus } =
    useChat()
  const { onlineIds } = usePresence()

  const conversationId = activeChat.conversation_id
  const isDm = activeChat.type === 'dm'
  const isAnnouncements = activeChat.type === 'club_announcements'
  const isAdmission = activeChat.type === 'admission'
  // Faculty viewing a student's admission thread (owner shown as other_user_id)
  const adminOfAdmission = isAdmission && Boolean(activeChat.other_user_id)

  const { messages, loading, sendMessage } = useMessages(conversationId)
  const { reactions, toggleReaction } = useReactions(conversationId, messages)
  const { typingNames, sendTyping } = useTyping(conversationId)
  const peerReadAt = usePeerRead(isDm ? conversationId : null, activeChat.other_user_id)
  const { members, myRole } = useClub(activeChat.club_id)

  useEffect(() => {
    if (activeChat.other_user_id) ensureStatus(activeChat.other_user_id)
  }, [activeChat.other_user_id, ensureStatus])

  // The other conversation of the same club (chat <-> announcements toggle)
  const sibling = activeChat.club_id
    ? chats.find(
        (c) => c.club_id === activeChat.club_id && c.conversation_id !== conversationId
      )
    : null

  const online = (isDm || adminOfAdmission) && onlineIds.has(activeChat.other_user_id)
  const peerStatus = statusById(statuses[activeChat.other_user_id])

  let subtitle
  if (typingNames.length > 0) {
    subtitle = (
      <span className="typing-text">
        <span className="typing-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {typingNames.slice(0, 2).join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing
      </span>
    )
  } else if (isDm || adminOfAdmission) {
    subtitle = online ? (
      <span style={{ color: peerStatus.color, fontWeight: 600 }}>{peerStatus.label}</span>
    ) : (
      'Offline'
    )
  } else if (isAnnouncements) {
    subtitle = 'Announcements — only admins can post'
  } else if (isAdmission) {
    subtitle = 'Private — only you and the admissions staff can see this'
  } else {
    subtitle = `${members.length} member${members.length === 1 ? '' : 's'}`
  }

  // Admission threads: the owner (student/guest) and any staff member may post.
  const canPost = isAdmission
    ? true
    : isGuest
    ? false
    : !isAnnouncements || myRole === 'admin' || isEmployee

  const lockMessage = isGuest
    ? 'Guests can only message the Admissions Office'
    : 'Only club admins can post announcements'

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="icon-btn mobile-back" aria-label="Back to chats" onClick={closeConversation}>
          <Icon name="back" />
        </button>
        <Avatar
          name={activeChat.title}
          url={activeChat.avatar_url}
          size={40}
          online={online}
          status={statuses[activeChat.other_user_id]}
          icon={
            isAnnouncements ? (
              <Icon name="megaphone" size={17} />
            ) : isAdmission && !adminOfAdmission ? (
              <Icon name="users" size={17} />
            ) : undefined
          }
        />
        {activeChat.club_id && !isGuest ? (
          <button
            className="chat-header-text is-clickable"
            aria-label={`${activeChat.title} — view club info`}
            onClick={() => openPanel(activeChat.club_id, 'members')}
          >
            <span className="chat-header-title">
              {isAnnouncements ? `${activeChat.title} — Announcements` : activeChat.title}
            </span>
            <span className="chat-header-sub">{subtitle}</span>
          </button>
        ) : (
          <div className="chat-header-text">
            <span className="chat-header-title">{activeChat.title}</span>
            <span className="chat-header-sub">{subtitle}</span>
          </div>
        )}
        {activeChat.club_id && !isGuest && (
          <div className="chat-header-actions">
            {sibling && (
              <button
                className="icon-btn"
                aria-label={isAnnouncements ? 'Back to club chat' : 'Announcements'}
                data-tip={isAnnouncements ? 'Club chat' : 'Announcements'}
                onClick={() => openConversation(sibling.conversation_id)}
              >
                <Icon name={isAnnouncements ? 'chat' : 'megaphone'} />
              </button>
            )}
            <button
              className="icon-btn"
              aria-label="Events"
              data-tip="Events"
              onClick={() => openPanel(activeChat.club_id, 'events')}
            >
              <Icon name="calendar" />
            </button>
            <button
              className="icon-btn"
              aria-label="Club info"
              data-tip="Club info"
              onClick={() => openPanel(activeChat.club_id, 'members')}
            >
              <Icon name="info" />
            </button>
          </div>
        )}
      </div>

      <MessageList
        messages={messages}
        loading={loading}
        isGroup={!isDm}
        peerReadAt={isDm ? peerReadAt : null}
        reactions={reactions}
        onReact={toggleReaction}
      />

      {canPost ? (
        <MessageInput
          conversationId={conversationId}
          onSend={sendMessage}
          onTyping={sendTyping}
        />
      ) : (
        <div className="input-locked">
          <Icon name="lock" size={14} /> {lockMessage}
        </div>
      )}
    </div>
  )
}

