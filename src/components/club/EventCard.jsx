import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatEventTime } from '../../lib/format.js'
import Icon from '../common/Icon.jsx'

const OPTIONS = [
  { id: 'going', label: 'Going' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'not_going', label: "Can't go" },
]

export default function EventCard({ event, onRsvp, past = false }) {
  const { user } = useAuth()
  const rsvps = event.rsvps ?? []
  const attendance = event.attendance ?? []
  const mine = rsvps.find((r) => r.user_id === user.id)?.status ?? null
  const count = (status) => rsvps.filter((r) => r.status === status).length

  const goingNames = rsvps
    .filter((r) => r.status === 'going')
    .map((r) => r.profile?.full_name)
    .filter(Boolean)
  const presentCount = attendance.filter((a) => a.present).length

  return (
    <div className={`event-card${past ? ' past' : ''}`}>
      <div className="event-head">
        <div className="date-tile" aria-hidden="true">
          <span className="date-tile-month">{format(new Date(event.starts_at), 'MMM')}</span>
          <span className="date-tile-day">{format(new Date(event.starts_at), 'd')}</span>
        </div>
        <div className="event-head-text">
          <div className="event-title">{event.title}</div>
          <div className="event-when">
            <Icon name="clock" size={12} /> {formatEventTime(event.starts_at)}
          </div>
          {event.location && (
            <div className="event-where">
              <Icon name="pin" size={12} /> {event.location}
            </div>
          )}
        </div>
      </div>
      {event.description && <div className="event-desc">{event.description}</div>}

      {goingNames.length > 0 && (
        <div className="event-attendees">
          <span className="event-attendees-label">
            <Icon name="users" size={12} /> Will be present:
          </span>{' '}
          {goingNames.slice(0, 6).join(', ')}
          {goingNames.length > 6 ? ` +${goingNames.length - 6} more` : ''}
        </div>
      )}

      {attendance.length > 0 && (
        <div className="event-attendance-summary">
          <Icon name="check" size={12} /> Attendance: {presentCount} of {attendance.length} marked
          present
        </div>
      )}

      <div className="event-rsvps">
        <div className="rsvp-group" role="group" aria-label="Your RSVP">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              className={`rsvp-btn${mine === o.id ? ' selected' : ''}`}
              aria-pressed={mine === o.id}
              disabled={past || mine !== null}
              onClick={() => onRsvp(event.id, o.id)}
            >
              {mine === o.id && <Icon name="check" size={13} strokeWidth={2.6} />}
              {o.label}
              <span className="rsvp-count">{count(o.id)}</span>
            </button>
          ))}
        </div>
      </div>
      {mine !== null && !past && (
        <div className="rsvp-locked">
          <Icon name="lock" size={11} /> Your RSVP is final and cannot be changed
        </div>
      )}
    </div>
  )
}
