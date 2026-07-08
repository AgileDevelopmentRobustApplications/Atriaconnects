import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { formatChatTime } from '../../lib/format.js'
import Avatar from '../common/Avatar.jsx'

// Pending join requests for one club — visible to club admins and faculty
export default function RequestsTab({ clubId, onDecided }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('join_requests')
      .select('id, requested_at, profile:profiles(id, full_name, email, user_type)')
      .eq('club_id', clubId)
      .eq('status', 'pending')
      .order('requested_at')
    setRequests(data ?? [])
    setLoading(false)
  }, [clubId])

  useEffect(() => {
    load()
  }, [load])

  async function decide(id, approve) {
    setBusyId(id)
    const { error } = await supabase.rpc('decide_join_request', { _request: id, _approve: approve })
    setBusyId(null)
    if (error) {
      alert(error.message)
      return
    }
    await load()
    onDecided?.()
  }

  if (loading) return <div className="side-note">Loading requests…</div>
  if (requests.length === 0) {
    return <div className="side-note center">No pending join requests.</div>
  }

  return (
    <div className="picker-list">
      {requests.map((r) => (
        <div key={r.id} className="picker-item no-click">
          <Avatar name={r.profile.full_name} size={40} />
          <div className="picker-grow">
            <div className="picker-name">{r.profile.full_name}</div>
            <div className="picker-sub">
              {r.profile.email} · requested {formatChatTime(r.requested_at)}
            </div>
          </div>
          <button
            className="btn-small"
            disabled={busyId === r.id}
            onClick={() => decide(r.id, true)}
          >
            Approve
          </button>
          <button
            className="btn-small danger"
            disabled={busyId === r.id}
            onClick={() => decide(r.id, false)}
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  )
}
