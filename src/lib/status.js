// Teams-style user statuses
export const STATUSES = [
  { id: 'active', label: 'Active', color: '#2f9e44' },
  { id: 'idle', label: 'Idle', color: '#e8a03e' },
  { id: 'dnd', label: 'Do not disturb', color: '#bf3b1b' },
  { id: 'in_meeting', label: 'In a meeting', color: '#7d8ca3' },
  { id: 'out_of_office', label: 'Out of office', color: '#8a8271' },
]

export const statusById = (id) => STATUSES.find((s) => s.id === id) ?? STATUSES[0]
