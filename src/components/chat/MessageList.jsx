import { useEffect, useRef } from 'react'
import { formatDayLabel, sameDay } from '../../lib/format.js'
import MessageBubble from './MessageBubble.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function MessageList({ messages, loading, isGroup, peerReadAt }) {
  const { user } = useAuth()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length, loading])

  return (
    <div className="message-list">
      {loading && <div className="side-note center">Loading messages…</div>}
      {!loading && messages.length === 0 && (
        <div className="side-note center">No messages yet — start the conversation.</div>
      )}
      {messages.map((msg, i) => {
        const prev = messages[i - 1]
        const showDay = !prev || !sameDay(prev.created_at, msg.created_at)
        const own = msg.sender_id === user.id
        const showSender = isGroup && !own && (!prev || prev.sender_id !== msg.sender_id || showDay)
        return (
          <div key={msg.id}>
            {showDay && <div className="date-separator"><span>{formatDayLabel(msg.created_at)}</span></div>}
            <MessageBubble msg={msg} own={own} showSender={showSender} peerReadAt={peerReadAt} />
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
