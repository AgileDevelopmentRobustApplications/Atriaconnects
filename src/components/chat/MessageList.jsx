import { useEffect, useRef, useState } from 'react'
import { formatDayLabel, sameDay } from '../../lib/format.js'
import MessageBubble from './MessageBubble.jsx'
import Icon from '../common/Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function MessageList({ messages, loading, isGroup, peerReadAt, reactions = {}, onReact }) {
  const { user } = useAuth()
  const bottomRef = useRef(null)
  // Ids present when history finished loading; anything after that animates in.
  const [initialIds, setInitialIds] = useState(null)
  if (!loading && initialIds === null) {
    setInitialIds(new Set(messages.map((m) => m.id)))
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length, loading])

  return (
    <div className="message-list" role="log" aria-live="polite" aria-busy={loading}>
      {loading && (
        <div className="message-skeleton" aria-label="Loading messages">
          {['42%', '30%', '55%', '24%', '38%'].map((w, i) => (
            <span key={i} className="skeleton" style={{ width: w }} />
          ))}
        </div>
      )}
      {!loading && messages.length === 0 && (
        <div className="chat-empty">
          <div className="empty-box-icon">
            <Icon name="chat" size={22} />
          </div>
          <strong>No messages yet</strong>
          <span>Say hello — your first message starts the conversation.</span>
        </div>
      )}
      {messages.map((msg, i) => {
        const prev = messages[i - 1]
        const showDay = !prev || !sameDay(prev.created_at, msg.created_at)
        const own = msg.sender_id === user.id
        const showSender = isGroup && !own && (!prev || prev.sender_id !== msg.sender_id || showDay)
        const isNew = initialIds !== null && !initialIds.has(msg.id)
        return (
          <div key={msg.id}>
            {showDay && <div className="date-separator"><span>{formatDayLabel(msg.created_at)}</span></div>}
            <MessageBubble
              msg={msg}
              own={own}
              isNew={isNew}
              showSender={showSender}
              peerReadAt={peerReadAt}
              reactions={reactions[msg.id] ?? []}
              onReact={onReact}
            />
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
