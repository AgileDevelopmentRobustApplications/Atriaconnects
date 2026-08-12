import { supabase } from '../../lib/supabase.js'
import { formatTime, formatFileSize, colorFor } from '../../lib/format.js'
import Icon from '../common/Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

function Ticks({ msg, peerReadAt }) {
  if (peerReadAt === undefined || peerReadAt === null) {
    // group chat or peer never opened: delivered (gray)
    return <span className="ticks">✓✓</span>
  }
  const read = new Date(peerReadAt) >= new Date(msg.created_at)
  return <span className={`ticks${read ? ' read' : ''}`}>✓✓</span>
}

function Attachment({ msg }) {
  const { data } = supabase.storage.from('attachments').getPublicUrl(msg.attachment_path)
  const url = data.publicUrl
  const isImage = msg.attachment_type?.startsWith('image/')

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img className="msg-image" src={url} alt={msg.attachment_name} loading="lazy" />
      </a>
    )
  }
  return (
    <a className="file-card" href={url} target="_blank" rel="noreferrer" download={msg.attachment_name}>
      <span className="file-icon">
        <Icon name="file" size={24} strokeWidth={1.6} />
      </span>
      <span className="file-meta">
        <span className="file-name">{msg.attachment_name}</span>
        <span className="file-size">{formatFileSize(msg.attachment_size)}</span>
      </span>
      <span className="file-download">
        <Icon name="download" size={16} />
      </span>
    </a>
  )
}

export default function MessageBubble({ msg, own, showSender, peerReadAt, reactions = [], onReact }) {
  const { user } = useAuth()

  // Group reactions by emoji type
  const reactionGroups = reactions.reduce((acc, r) => {
    if (!acc[r.reaction]) acc[r.reaction] = []
    acc[r.reaction].push(r)
    return acc
  }, {})

  return (
    <div className={`bubble-row${own ? ' own' : ''}`}>
      <div className={`bubble-container${own ? ' own' : ''}`}>
        {/* Hover Reactions Picker */}
        {onReact && user && (
          <div className="bubble-actions-overlay">
            {['👍', '❤️', '😂', '🎉', '😢'].map((emoji) => {
              const userHasReacted = reactionGroups[emoji]?.some(r => r.user_id === user.id)
              return (
                <button
                  key={emoji}
                  className={`bubble-action-btn${userHasReacted ? ' active' : ''}`}
                  onClick={() => onReact(msg.id, emoji)}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        )}

        <div className={`bubble${own ? ' bubble-out' : ' bubble-in'}`}>
          {showSender && msg.sender && (
            <div className="bubble-sender" style={{ color: colorFor(msg.sender.full_name) }}>
              {msg.sender.full_name}
            </div>
          )}
          {msg.attachment_path && <Attachment msg={msg} />}
          {msg.content && <span className="bubble-text">{msg.content}</span>}
          <span className="bubble-meta">
            {formatTime(msg.created_at)}
            {own && <Ticks msg={msg} peerReadAt={peerReadAt} />}
          </span>
        </div>

        {/* Reaction badges below bubble */}
        {reactions.length > 0 && (
          <div className="bubble-reactions-row">
            {Object.entries(reactionGroups).map(([emoji, list]) => {
              const userReacted = list.some(r => r.user_id === user?.id)
              const names = list.map(r => r.profile?.full_name).join(', ')
              return (
                <button
                  key={emoji}
                  className={`reaction-badge${userReacted ? ' active' : ''}`}
                  title={names}
                  onClick={() => onReact && onReact(msg.id, emoji)}
                >
                  <span className="reaction-emoji">{emoji}</span>
                  <span className="reaction-count">{list.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
