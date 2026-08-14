import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'

const SENDER_JOIN = '*, sender:profiles!sender_id(id, full_name, avatar_color)'

export function useMessages(conversationId) {
  const { user } = useAuth()
  const { onNewMessage, getProfile } = useChat()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    setLoading(true)
    setMessages([])
    supabase
      .from('messages')
      .select(SENDER_JOIN)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (cancelled) return
        setMessages((data ?? []).reverse())
        setLoading(false)
      })

    const unsubscribe = onNewMessage(async (msg) => {
      if (msg.conversation_id !== conversationId) return
      const sender = await getProfile(msg.sender_id)
      setMessages((ms) => (ms.some((m) => m.id === msg.id) ? ms : [...ms, { ...msg, sender }]))
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [conversationId, onNewMessage, getProfile])

  const sendMessage = useCallback(
    async ({ content = '', attachment = null }) => {
      const row = {
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        ...(attachment ?? {}),
      }
      const { data, error } = await supabase.from('messages').insert(row).select(SENDER_JOIN).single()
      if (error) throw error
      setMessages((ms) => (ms.some((m) => m.id === data.id) ? ms : [...ms, data]))
    },
    [conversationId, user]
  )

  return { messages, loading, sendMessage }
}

// Peer's last_read_at in a DM — drives the blue double ticks
export function usePeerRead(conversationId, peerId) {
  const { onReadChange } = useChat()
  const [peerReadAt, setPeerReadAt] = useState(null)

  useEffect(() => {
    if (!conversationId || !peerId) return
    setPeerReadAt(null)
    supabase
      .from('conversation_reads')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', peerId)
      .maybeSingle()
      .then(({ data }) => setPeerReadAt(data?.last_read_at ?? null))

    const unsubscribe = onReadChange((row) => {
      if (row.conversation_id === conversationId && row.user_id === peerId) {
        setPeerReadAt(row.last_read_at)
      }
    })
    return unsubscribe
  }, [conversationId, peerId, onReadChange])

  return peerReadAt
}
