import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useEvents(clubId) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!clubId) return
    const { data } = await supabase
      .from('events')
      .select(
        '*, rsvps:event_rsvps(user_id, status, profile:profiles(full_name)), attendance:event_attendance(user_id, present)'
      )
      .eq('club_id', clubId)
      .order('starts_at')
    setEvents(data ?? [])
    setLoading(false)
  }, [clubId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createEvent = useCallback(
    async ({ title, description, location, starts_at }) => {
      const { error } = await supabase
        .from('events')
        .insert({ club_id: clubId, title, description, location, starts_at, created_by: user.id })
      if (error) throw error
      await refresh()
    },
    [clubId, user, refresh]
  )

  // RSVPs are permanent: one insert per member per event, no updates (DB-enforced)
  const rsvp = useCallback(
    async (eventId, status) => {
      const { error } = await supabase
        .from('event_rsvps')
        .insert({ event_id: eventId, user_id: user.id, status })
      if (error) {
        throw new Error(
          error.code === '23505'
            ? 'Your RSVP is already recorded — RSVPs are final and cannot be changed.'
            : error.message
        )
      }
      await refresh()
    },
    [user, refresh]
  )

  return { events, loading, refresh, createEvent, rsvp }
}
