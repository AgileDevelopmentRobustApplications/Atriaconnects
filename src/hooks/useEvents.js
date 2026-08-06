import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Hook for events. Either clubId or groupId must be set; the other is null.
export function useEvents({ clubId, groupId } = {}) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!clubId && !groupId) {
      setEvents([])
      setLoading(false)
      return
    }
    let q = supabase
      .from('events')
      .select(
        '*, rsvps:event_rsvps(user_id, status, profile:profiles(full_name)), attendance:event_attendance(user_id, present)'
      )
      .order('starts_at')
    if (clubId) q = q.eq('club_id', clubId)
    if (groupId) q = q.eq('academic_group_id', groupId)
    const { data } = await q
    setEvents(data ?? [])
    setLoading(false)
  }, [clubId, groupId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createEvent = useCallback(
    async ({ title, description, location, starts_at, targetClubId = null }) => {
      const insert = {
        title,
        description,
        location,
        starts_at,
        created_by: user.id,
        club_id: targetClubId ?? clubId ?? null,
        academic_group_id: groupId ?? null,
      }
      const { error } = await supabase.from('events').insert(insert)
      if (error) throw error
      await refresh()
    },
    [clubId, groupId, user, refresh]
  )

  const rsvp = useCallback(
    async (eventId, status) => {
      const { error } = await supabase
        .from('event_rsvps')
        .insert({ event_id: eventId, user_id: user.id, status })
      if (error) {
        alert(
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