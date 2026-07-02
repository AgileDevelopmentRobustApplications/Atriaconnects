import { supabase } from '../../lib/supabase.js'
import { formatTime, formatFileSize, colorFor } from '../../lib/format.js'
import Icon from '../common/Icon.jsx'

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

export default function MessageBubble({ msg, own, showSender, peerReadAt }) {
  return (
    <div className={`bubble-row${own ? ' own' : ''}`}>
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
    </div>
  )
}
