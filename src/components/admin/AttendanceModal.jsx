import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Avatar from '../common/Avatar.jsx'
import Modal from '../common/Modal.jsx'
import { formatEventTime } from '../../lib/format.js'

// Mark who was actually present at an event. Lists all club members,
// pre-checks previously saved attendance, and shows each member's RSVP.
export default function AttendanceModal({ event, onSaved, onClose }) {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [present, setPresent] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [membersRes, attendanceRes] = await Promise.all([
        supabase
          .from('memberships')
          .select('profile:profiles(id, full_name, email)')
          .eq('club_id', event.club_id)
          .order('joined_at'),
        supabase.from('event_attendance').select('user_id, present').eq('event_id', event.id),
      ])
      setMembers(membersRes.data ?? [])
      setPresent(
        new Set((attendanceRes.data ?? []).filter((a) => a.present).map((a) => a.user_id))
      )
      setLoading(false)
    })()
  }, [event.id, event.club_id])

  const rsvpOf = (uid) => (event.rsvps ?? []).find((r) => r.user_id === uid)?.status ?? null

  function toggle(uid) {
    setPresent((p) => {
      const next = new Set(p)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  async function save() {
    setBusy(true)
    const rows = members.map((m) => ({
      event_id: event.id,
      user_id: m.profile.id,
      present: present.has(m.profile.id),
      marked_by: user.id,
      marked_at: new Date().toISOString(),
    }))
    const { error } = await supabase
      .from('event_attendance')
      .upsert(rows, { onConflict: 'event_id,user_id' })
    setBusy(false)
    if (error) {
      alert(error.message)
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <Modal title="Mark attendance" onClose={onClose} wide>
      <p className="attendance-event-info">
        {event.title} — {formatEventTime(event.starts_at)}
      </p>
      {loading && <div className="side-note">Loading members…</div>}
      <div className="picker-list">
        {members.map((m) => {
          const rsvp = rsvpOf(m.profile.id)
          const isPresent = present.has(m.profile.id)
          return (
            <label key={m.profile.id} className="picker-item attendance-row">
              <input
                type="checkbox"
                checked={isPresent}
                onChange={() => toggle(m.profile.id)}
              />
              <Avatar name={m.profile.full_name} size={36} />
              <span className="picker-grow">
                <span className="picker-name">{m.profile.full_name}</span>
                <span className="picker-sub">
                  RSVP: {rsvp ? rsvp.replace('_', ' ') : 'no response'}
                </span>
              </span>
              <span className={`present-tag${isPresent ? ' yes' : ''}`}>
                {isPresent ? 'Present' : 'Absent'}
              </span>
            </label>
          )
        })}
      </div>
      {!loading && (
        <button className="btn-primary btn-block attendance-save" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : `Save attendance (${present.size} of ${members.length} present)`}
        </button>
      )}
    </Modal>
  )
}
