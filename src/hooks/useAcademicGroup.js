import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Hook for managing one academic group: members list + my role.
export function useAcademicGroup(groupId) {
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState(null)

  const load = useCallback(async () => {
    if (!groupId) {
      setGroup(null)
      setMembers([])
      setMyRole(null)
      setLoading(false)
      return
    }
    const [gRes, mRes] = await Promise.all([
      supabase.from('academic_groups').select('*').eq('id', groupId).single(),
      supabase
        .from('academic_group_memberships')
        .select('user_id, role, joined_at, profile:profiles(id, full_name, email)')
        .eq('group_id', groupId),
    ])
    setGroup(gRes.data ?? null)
    setMembers(mRes.data ?? [])
    const { data: { user } } = await supabase.auth.getUser()
    const me = (mRes.data ?? []).find((m) => m.user_id === user?.id)
    setMyRole(me?.role ?? null)
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  return { group, members, loading, myRole, reload: load }
}

export function useMyGroups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setGroups([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('academic_group_memberships')
      .select('group:academic_groups(id, name, description, avatar_color, parent_id)')
      .eq('user_id', user.id)
    setGroups((data ?? []).map((r) => r.group).filter(Boolean))
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return { groups, loading, reload: load }
}