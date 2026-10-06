import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import Modal from '../common/Modal.jsx'

export default function NewEventModal({ onCreate, onClose, clubId = null }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [subClubs, setSubClubs] = useState([])
  const [targetClubId, setTargetClubId] = useState(clubId)

  useEffect(() => {
    if (clubId) {
      setTargetClubId(clubId)
      supabase
        .from('clubs')
        .select('id, name')
        .eq('parent_id', clubId)
        .then(({ data }) => setSubClubs(data ?? []))
    }
  }, [clubId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        starts_at: new Date(startsAt).toISOString(),
        targetClubId: targetClubId,
      })
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="Schedule an event" onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        {subClubs.length > 0 && (
          <label>
            Host this event at
            <select
              value={targetClubId || ''}
              onChange={(e) => setTargetClubId(e.target.value || null)}
            >
              <option value={clubId}>This community (Main)</option>
              {subClubs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} (Sub-group)
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Title
          <input
            placeholder="e.g. Robotics workshop"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            autoFocus
          />
        </label>
        <label>
          Date &amp; time
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </label>
        <label>
          <span>
            Location <span className="field-optional">optional</span>
          </span>
          <input
            placeholder="e.g. Seminar Hall 2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label>
          <span>
            Details <span className="field-optional">optional</span>
          </span>
          <textarea
            placeholder="What should members know?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={busy || !title.trim() || !startsAt}>
          {busy ? 'Scheduling…' : 'Schedule event'}
        </button>
      </form>
    </Modal>
  )
}
