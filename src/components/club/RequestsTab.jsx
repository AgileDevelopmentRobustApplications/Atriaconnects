import { useState } from 'react'
import { formatChatTime } from '../../lib/format.js'
import Avatar from '../common/Avatar.jsx'
import Icon from '../common/Icon.jsx'
import { useJoinRequests } from '../../context/JoinRequestsContext.jsx'

// Pending join requests for one club or academic group — visible to its
// admins and to staff. Data comes from JoinRequestsContext so every badge in
// the app stays in sync after a decision.
export default function RequestsTab({ clubId, groupId, onDecided }) {
  const { pending, decide } = useJoinRequests()
  const [busyId, setBusyId] = useState(null)

  const requests = pending.filter((r) =>
    clubId ? r.club_id === clubId : r.academic_group_id === groupId
  )

  async function handleDecide(id, approve) {
    setBusyId(id)
    const ok = await decide(id, approve)
    setBusyId(null)
    if (ok) onDecided?.()
  }

  if (requests.length === 0) {
    return (
      <div className="empty-box">
        <div className="empty-box-icon">
          <Icon name="check" size={22} />
        </div>
        <p className="empty-box-text">You’re all caught up</p>
        <p className="empty-box-sub">New join requests will appear here for approval.</p>
      </div>
    )
  }

  return (
    <div className="picker-list">
      {requests.map((r) => (
        <div key={r.id} className="picker-item no-click request-row">
          <Avatar name={r.profile?.full_name} size={40} />
          <div className="picker-grow">
            <div className="picker-name">{r.profile?.full_name ?? 'Unknown user'}</div>
            <div className="picker-sub">
              {r.profile?.email} · requested {formatChatTime(r.requested_at)}
            </div>
          </div>
          <div className="picker-actions">
            <button
              className="btn-small"
              disabled={busyId === r.id}
              onClick={() => handleDecide(r.id, true)}
            >
              <Icon name="check" size={14} /> Approve
            </button>
            <button
              className="btn-small danger"
              disabled={busyId === r.id}
              onClick={() => handleDecide(r.id, false)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
