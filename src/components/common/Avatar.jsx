import { initials, colorFor } from '../../lib/format.js'
import { statusById } from '../../lib/status.js'

export default function Avatar({
  name,
  size = 40,
  online = false,
  status = 'active',
  icon = null,
  url = null,
  color = null,
}) {
  return (
    <div className="avatar-wrap" style={{ width: size, height: size }}>
      {url ? (
        <img
          src={url}
          alt={name || 'Avatar'}
          className="avatar-img"
          style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover' }}
        />
      ) : (
        <div
          className="avatar"
          style={{ width: size, height: size, background: color || colorFor(name), fontSize: size * 0.36 }}
        >
          {icon ?? initials(name)}
        </div>
      )}
      {online && <span className="online-dot" style={{ background: statusById(status).color }} />}
    </div>
  )
}
