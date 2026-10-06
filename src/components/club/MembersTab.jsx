import { useAuth } from '../../context/AuthContext.jsx'
import { usePresence } from '../../context/PresenceContext.jsx'
import Avatar from '../common/Avatar.jsx'

export default function MembersTab({ clubState }) {
  const { user } = useAuth()
  const { onlineIds } = usePresence()
  const { members, myRole, removeMember } = clubState

  return (
    <div className="picker-list">
      {members.map((m) => (
        <div key={m.profile.id} className="picker-item no-click">
          <Avatar
            name={m.profile.full_name}
            color={m.profile.avatar_color}
            size={40}
            online={onlineIds.has(m.profile.id)}
          />
          <div className="picker-grow">
            <div className="picker-name">
              {m.profile.full_name}
              {m.profile.id === user.id && <span className="picker-you"> · you</span>}
            </div>
            <div className="picker-sub">{m.profile.email}</div>
          </div>
          {m.role === 'admin' && <span className="admin-tag">Admin</span>}
          {myRole === 'admin' && m.role !== 'admin' && m.profile.id !== user.id && (
            <button
              className="btn-small danger"
              onClick={() => confirm(`Remove ${m.profile.full_name}?`) && removeMember(m.profile.id)}
            >
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
