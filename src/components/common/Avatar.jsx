import { initials, colorFor } from '../../lib/format.js'

export default function Avatar({ name, size = 40, online = false, icon = null }) {
  return (
    <div className="avatar-wrap" style={{ width: size, height: size }}>
      <div
        className="avatar"
        style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.36 }}
      >
        {icon ?? initials(name)}
      </div>
      {online && <span className="online-dot" />}
    </div>
  )
}
