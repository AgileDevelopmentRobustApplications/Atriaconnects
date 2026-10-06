import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { usePresence } from '../../context/PresenceContext.jsx'
import { useMessages, usePeerRead, useReactions } from '../../hooks/useMessages.js'
import { useTyping } from '../../hooks/useTyping.js'
import { useClub } from '../../hooks/useClub.js'
import { useAcademicGroup } from '../../hooks/useAcademicGroup.js'
import { useJoinRequests } from '../../context/JoinRequestsContext.jsx'
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
  const isAnnouncements =
    activeChat.type === 'club_announcements' || activeChat.type === 'group_announcements'
  const isAdmission = activeChat.type === 'admission'
  // Faculty viewing a student's admission thread (owner shown as other_user_id)
  const adminOfAdmission = isAdmission && Boolean(activeChat.other_user_id)

  const { messages, loading, sendMessage } = useMessages(conversationId)
  const { reactions, toggleReaction } = useReactions(conversationId, messages)
  const { typingNames, sendTyping } = useTyping(conversationId)
  const peerReadAt = usePeerRead(isDm ? conversationId : null, activeChat.other_user_id)
  const clubId = activeChat.club_id ?? null
  const groupId = activeChat.academic_group_id ?? null
  const clubState = useClub(clubId)
  const groupState = useAcademicGroup(groupId)
  const members = clubId ? clubState.members : groupState.members
  const myRole = clubId ? clubState.myRole : groupState.myRole
  const isCommunity = Boolean(clubId || groupId)
  const target = { clubId, groupId }
  const { countFor } = useJoinRequests()
  const canReview = isCommunity && (myRole === 'admin' || isEmployee)
  const requestCount = canReview ? countFor(target) : 0

  useEffect(() => {
    if (activeChat.other_user_id) ensureStatus(activeChat.other_user_id)
  }, [activeChat.other_user_id, ensureStatus])

  // The other conversation of the same club/group (chat <-> announcements toggle)
  const sibling = isCommunity
    ? chats.find(
        (c) =>
          c.conversation_id !== conversationId &&
          ((clubId && c.club_id === clubId) || (groupId && c.academic_group_id === groupId))
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
    : `Only ${clubId ? 'club' : 'group'} admins can post announcements`

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
        {isCommunity && !isGuest ? (
          <button
            className="chat-header-text is-clickable"
            aria-label={`${activeChat.title} — view ${clubId ? 'club' : 'group'} info`}
            onClick={() => openPanel(target, 'members')}
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
        {isCommunity && !isGuest && (
          <div className="chat-header-actions">
            {canReview && (
              <button
                className={`icon-btn${requestCount > 0 ? ' has-requests' : ''}`}
                aria-label={
                  requestCount > 0
                    ? `${requestCount} pending join request${requestCount === 1 ? '' : 's'}`
                    : 'Join requests'
                }
                data-tip={requestCount > 0 ? `${requestCount} join request${requestCount === 1 ? '' : 's'}` : 'Join requests'}
                onClick={() => openPanel(target, 'requests')}
              >
                <Icon name="user" />
                {requestCount > 0 && (
                  <span key={requestCount} className="icon-badge" aria-hidden="true">
                    {requestCount}
                  </span>
                )}
              </button>
            )}
            {sibling && (
              <button
                className="icon-btn"
                aria-label={isAnnouncements ? 'Back to chat' : 'Announcements'}
                data-tip={isAnnouncements ? 'Chat' : 'Announcements'}
                onClick={() => openConversation(sibling.conversation_id)}
              >
                <Icon name={isAnnouncements ? 'chat' : 'megaphone'} />
              </button>
            )}
            <button
              className="icon-btn"
              aria-label="Events"
              data-tip="Events"
              onClick={() => openPanel(target, 'events')}
            >
              <Icon name="calendar" />
            </button>
            <button
              className="icon-btn"
              aria-label={clubId ? 'Club info' : 'Group info'}
              data-tip={clubId ? 'Club info' : 'Group info'}
              onClick={() => openPanel(target, 'members')}
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

