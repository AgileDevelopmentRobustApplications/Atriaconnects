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

export function useReactions(conversationId, messages) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState({}) // message_id -> [{ user_id, reaction, profile: { full_name } }]

  const loadReactions = useCallback(async () => {
    if (!messages || messages.length === 0) return
    const messageIds = messages.map(m => m.id)
    const { data } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, reaction, profile:profiles(full_name)')
      .in('message_id', messageIds)

    const groups = {}
    for (const r of (data ?? [])) {
      if (!groups[r.message_id]) groups[r.message_id] = []
      groups[r.message_id].push(r)
    }
    setReactions(groups)
  }, [messages])

  useEffect(() => {
    loadReactions()
  }, [messages, loadReactions])

  useEffect(() => {
    if (!conversationId) return
    
    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          loadReactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, loadReactions])

  const toggleReaction = async (messageId, emoji) => {
    const existing = reactions[messageId]?.find(
      r => r.user_id === user.id && r.reaction === emoji
    )

    try {
      if (existing) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('reaction', emoji)
      } else {
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            reaction: emoji
          })
      }
      loadReactions()
    } catch (err) {
      console.error("Failed to toggle reaction:", err)
    }
  }

  return { reactions, toggleReaction }
}

