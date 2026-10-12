import { supabase } from './supabase.js'

// Management circulars (migration 034). Who can read which circular is decided
// by RLS on the audience column, so callers just query.

export const CIRCULAR_AUDIENCES = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'students', label: 'Students' },
  { id: 'staff', label: 'Staff only' },
]

export const audienceLabel = (id) => CIRCULAR_AUDIENCES.find((a) => a.id === id)?.label ?? 'Everyone'

export const MAX_CIRCULAR_FILE_MB = 10

const SELECT =
  'id, title, body, audience, attachment_path, attachment_name, attachment_type, attachment_size, created_at, created_by, author:profiles!created_by(id, full_name, avatar_url, avatar_color)'

export async function fetchCirculars(limit = 50) {
  return supabase.from('circulars').select(SELECT).order('created_at', { ascending: false }).limit(limit)
}

export function circularFileUrl(path) {
  return supabase.storage.from('circulars').getPublicUrl(path).data.publicUrl
}

export async function uploadCircularFile(file, userId) {
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  const path = `${userId}/${crypto.randomUUID()}_${safeName}`
  const { error } = await supabase.storage.from('circulars').upload(path, file)
  if (error) throw error
  return {
    attachment_path: path,
    attachment_name: file.name,
    attachment_type: file.type || 'application/octet-stream',
    attachment_size: file.size,
  }
}
