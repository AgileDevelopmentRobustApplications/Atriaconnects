// Teams-style user statuses mapped to system CSS variable tokens
export const STATUSES = [
  { id: 'active', label: 'Active', color: 'var(--success)' },
  { id: 'idle', label: 'Idle', color: 'var(--warning)' },
  { id: 'dnd', label: 'Do not disturb', color: 'var(--error)' },
  { id: 'in_meeting', label: 'In a meeting', color: 'var(--info)' },
  { id: 'out_of_office', label: 'Out of office', color: 'var(--text-muted)' },
]

export const statusById = (id) => STATUSES.find((s) => s.id === id) ?? STATUSES[0]

// A stored status only means something while the person is connected. Anyone
// not present on the site counts as out of office, whatever was last saved.
export const effectiveStatus = (storedId, isOnline) => (isOnline ? storedId : 'out_of_office')
