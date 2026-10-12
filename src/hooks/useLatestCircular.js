import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Timestamp (ms) of the newest management circular this user can see — drives
// the Notifications bell dot. Live via realtime (migration 034), with a
// refresh on window focus as a fallback. 0 when there are none.
export function useLatestCircularAt(enabled = true) {
  const [latestAt, setLatestAt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    const refresh = async () => {
      const { data, error } = await supabase
        .from('circulars')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
      if (!active || error) return
      setLatestAt(data?.[0] ? new Date(data[0].created_at).getTime() : 0)
    }
    refresh()

    const channel = supabase
      .channel('circulars-latest')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'circulars' }, refresh)
      .subscribe()
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      supabase.removeChannel(channel)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled])

  return latestAt
}
