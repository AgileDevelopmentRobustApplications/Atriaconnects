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

  const rsvp = useCallback(
    async (eventId, status) => {
      await supabase.from('event_rsvps').upsert(
        { event_id: eventId, user_id: user.id, status, updated_at: new Date().toISOString() },
        { onConflict: 'event_id,user_id' }
      )
      await refresh()
    },
    [user, refresh]
  )

  return { events, loading, refresh, createEvent, rsvp }
}
