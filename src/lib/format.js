import { format, isToday, isYesterday, isThisYear } from 'date-fns'

// Muted, earthy avatar palette (overrides the bright colors stored in the DB)
const AVATAR_COLORS = [
  '#BF3B1B', // rust
  '#26332E', // dark green
  '#6B705C', // olive
  '#A98467', // tan
  '#7D8CA3', // slate
  '#8C5E58', // clay
  '#5F7161', // sage
  '#B08968', // camel
]

export function colorFor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

// Bubble timestamp: 10:42 pm
export function formatTime(iso) {
  return format(new Date(iso), 'h:mm a')
}

// Sidebar timestamp: time if today, "Yesterday", else date
export function formatChatTime(iso) {
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'dd/MM/yyyy')
}

// Date separator label
export function formatDayLabel(iso) {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, isThisYear(d) ? 'd MMMM' : 'd MMMM yyyy')
}

// Event date: Fri, 4 Jul · 5:30 pm
export function formatEventTime(iso) {
  return format(new Date(iso), 'EEE, d MMM · h:mm a')
}

export function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function sameDay(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return da.toDateString() === db.toDateString()
}
