import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useChat } from './ChatContext'
import { useToast } from './ToastContext'

// Routes join requests to the people who can act on them.
//
// `pending` holds other users' pending requests that the signed-in user may
// review. RLS (migration 031) already scopes the rows: club admins see their
// clubs' requests, group admins their groups', staff see all. Requesters are
// also told when one of their own requests is approved or rejected.
//
// Updates arrive over realtime (migration 032 adds the tables to the
// publication) and, as a fallback, by polling and on window focus.

const JoinRequestsContext = createContext({
  pending: [],
  countFor: () => 0,
  refresh: async () => {},
  decide: async () => false,
})

const POLL_MS = 30 * 1000

export function JoinRequestsProvider({ children }) {
  const { user } = useAuth()
  const { refreshChats } = useChat()
  const { showToast } = useToast()
  const [pending, setPending] = useState([])
  const knownIds = useRef(null) // pending ids already seen; null until first load
  const myDecided = useRef(new Set())

  const refresh = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('join_requests')
      .select(
        'id, user_id, club_id, academic_group_id, requested_at, profile:profiles!join_requests_user_id_fkey(id, full_name, email), club:clubs(id, name), group:academic_groups(id, name)'
      )
      .eq('status', 'pending')
      .neq('user_id', user.id)
      .order('requested_at')
    if (error) {
      // Surface it: a failing query here means admins silently see no requests.
      console.error('Failed to load join requests:', error)
      return
    }
    const rows = data ?? []

    // Announce requests that arrived since the last refresh.
    if (knownIds.current) {
      const fresh = rows.filter((r) => !knownIds.current.has(r.id))
      for (const r of fresh) {
        const who = r.profile?.full_name ?? 'Someone'
        const where = r.club?.name ?? r.group?.name ?? 'your community'
        showToast(`${who} wants to join ${where}`, 'info', 6000)
        import('../lib/notifications.js').then(({ showNotification }) =>
          showNotification('New join request', `${who} wants to join ${where}`, `join-${r.id}`)
        )
      }
    }
    knownIds.current = new Set(rows.map((r) => r.id))
    setPending(rows)
  }, [user, showToast])

  // My own requests being decided by an admin.
  const handleOwnDecision = useCallback(
    async (row) => {
      if (!row || row.user_id !== user?.id || row.status === 'pending') return
      if (myDecided.current.has(row.id)) return
      myDecided.current.add(row.id)
      const target = row.club_id
        ? (await supabase.from('clubs').select('name').eq('id', row.club_id).single()).data?.name
        : (await supabase.from('academic_groups').select('name').eq('id', row.academic_group_id).single())
            .data?.name
      if (row.status === 'approved') {
        showToast(`You're in! Your request to join ${target ?? 'the community'} was approved`, 'success', 6000)
        refreshChats()
      } else if (row.status === 'rejected') {
        showToast(`Your request to join ${target ?? 'the community'} was declined`, 'info', 6000)
      }
    },
    [user, showToast, refreshChats]
  )

  useEffect(() => {
    if (!user) return
    refresh()

    const channel = supabase
      .channel(`join-requests:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests' }, (payload) => {
        if (payload.new?.user_id === user.id) handleOwnDecision(payload.new)
        else refresh()
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'memberships', filter: `user_id=eq.${user.id}` },
        () => refreshChats()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'academic_group_memberships',
          filter: `user_id=eq.${user.id}`,
        },
        () => refreshChats()
      )
      .subscribe()

    const interval = setInterval(refresh, POLL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, refresh, handleOwnDecision, refreshChats])

  const decide = useCallback(
    async (id, approve) => {
      const { error } = await supabase.rpc('decide_membership_request', {
        _request: id,
        _approve: approve,
      })
      if (error) {
        showToast(error.message, 'error')
        return false
      }
      showToast(approve ? 'Request approved — they’re now a member' : 'Request declined', approve ? 'success' : 'info')
      setPending((rows) => rows.filter((r) => r.id !== id))
      knownIds.current?.delete(id)
      refresh()
      return true
    },
    [showToast, refresh]
  )

  const countFor = useCallback(
    ({ clubId, groupId }) =>
      pending.filter((r) => (clubId && r.club_id === clubId) || (groupId && r.academic_group_id === groupId))
        .length,
    [pending]
  )

  const value = useMemo(() => ({ pending, countFor, refresh, decide }), [pending, countFor, refresh, decide])
  return <JoinRequestsContext.Provider value={value}>{children}</JoinRequestsContext.Provider>
}

export const useJoinRequests = () => useContext(JoinRequestsContext)
