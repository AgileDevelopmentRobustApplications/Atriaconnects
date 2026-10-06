import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

// `ready` turns true after the first presence sync, so callers can tell
// "nobody is online" apart from "we don't know yet".
const PresenceContext = createContext({ onlineIds: new Set(), ready: false })

export function PresenceProvider({ children }) {
  const { user } = useAuth()
  const [onlineIds, setOnlineIds] = useState(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('presence:lobby', {
      config: { presence: { key: user.id } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())))
        setReady(true)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ online_at: new Date().toISOString() })
        }
      })
    return () => {
      supabase.removeChannel(channel)
      setOnlineIds(new Set())
      setReady(false)
    }
  }, [user])

  return <PresenceContext.Provider value={{ onlineIds, ready }}>{children}</PresenceContext.Provider>
}

export const usePresence = () => useContext(PresenceContext)
