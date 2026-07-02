import { useChat } from '../../context/ChatContext.jsx'
import { usePresence } from '../../context/PresenceContext.jsx'
import { useMessages, usePeerRead } from '../../hooks/useMessages.js'
import { useTyping } from '../../hooks/useTyping.js'
import { useClub } from '../../hooks/useClub.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import MessageList from './MessageList.jsx'
import MessageInput from './MessageInput.jsx'

export default function ChatWindow({ openPanel }) {
  const { activeChat, chats, openConversation } = useChat()
  const { onlineIds } = usePresence()

  const conversationId = activeChat.conversation_id
  const isDm = activeChat.type === 'dm'
  const isAnnouncements = activeChat.type === 'club_announcements'

  const { messages, loading, sendMessage } = useMessages(conversationId)
  const { typingNames, sendTyping } = useTyping(conversationId)
  const peerReadAt = usePeerRead(isDm ? conversationId : null, activeChat.other_user_id)
  const { members, myRole } = useClub(activeChat.club_id)

  // The other conversation of the same club (chat <-> announcements toggle)
  const sibling = activeChat.club_id
    ? chats.find(
        (c) =>
          c.club_id === activeChat.club_id && c.conversation_id !== conversationId
      )
    : null

  const online = isDm && onlineIds.has(activeChat.other_user_id)

  let subtitle
  if (typingNames.length > 0) {
    subtitle = (
      <span className="typing-text">
        {typingNames.slice(0, 2).join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
      </span>
    )
  } else if (isDm) {
    subtitle = online ? <span className="online-text">online</span> : 'offline'
  } else if (isAnnouncements) {
    subtitle = 'Announcements — only admins can post'
  } else {
    subtitle = `${members.length} member${members.length === 1 ? '' : 's'}`
  }

  const canPost = !isAnnouncements || myRole === 'admin'

  return (
    <div className="chat-window">
      <div className="chat-header">
        <Avatar
          name={activeChat.title}
          size={40}
          online={online}
          icon={isAnnouncements ? <Icon name="megaphone" size={17} /> : undefined}
        />
        <div
          className="chat-header-text"
          onClick={() => activeChat.club_id && openPanel(activeChat.club_id, 'members')}
          style={{ cursor: activeChat.club_id ? 'pointer' : 'default' }}
        >
          <div className="chat-header-title">
            {isAnnouncements ? `${activeChat.title} — Announcements` : activeChat.title}
          </div>
          <div className="chat-header-sub">{subtitle}</div>
        </div>
        {activeChat.club_id && (
          <div className="chat-header-actions">
            {sibling && (
              <button
                className="icon-btn"
                title={isAnnouncements ? 'Back to club chat' : 'Announcements'}
                onClick={() => openConversation(sibling.conversation_id)}
              >
                <Icon name={isAnnouncements ? 'chat' : 'megaphone'} />
              </button>
            )}
            <button
              className="icon-btn"
              title="Events"
              onClick={() => openPanel(activeChat.club_id, 'events')}
            >
              <Icon name="calendar" />
            </button>
            <button
              className="icon-btn"
              title="Club info"
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
      />

      {canPost ? (
        <MessageInput
          conversationId={conversationId}
          onSend={sendMessage}
          onTyping={sendTyping}
        />
      ) : (
        <div className="input-locked">
          <Icon name="lock" size={14} /> Only club admins can post announcements
        </div>
      )}
    </div>
  )
}
