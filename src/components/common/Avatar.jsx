import { initials, colorFor, isThemedAvatarColor } from '../../lib/format.js'
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
          className="avatar avatar-img"
          style={{ width: size, height: size, objectFit: 'cover' }}
          onError={(e) => {
            e.target.style.display = 'none'
            if (e.target.nextSibling) {
              e.target.nextSibling.style.display = 'flex'
            }
          }}
        />
      ) : null}
      <div
        className="avatar"
        style={{
          width: size,
          height: size,
          // Only theme-token colours are honoured; legacy hex values (DB
          // defaults, old picker) fall back to the themed palette.
          background: isThemedAvatarColor(color) ? color : colorFor(name),
          fontSize: size * 0.36,
          display: url ? 'none' : 'flex',
        }}
      >
        {icon ?? initials(name)}
      </div>
      {online && <span className="online-dot" style={{ background: statusById(status).color }} />}
    </div>
  )
}
