// Accent colour themes. The palettes themselves live in index.css
// ("1b. Accent palettes" + "1c. Theme-tinted neutrals"); this list only
// drives the Settings picker, whose swatches must show every theme's own
// colours regardless of which one is active. To add a theme: add its palette
// and neutral blocks (both modes) in index.css and an entry here with the same
// id, plus the id in index.html's pre-paint list.
export const ACCENTS = [
  { id: 'green', label: 'Green', base: '#3b5442', signal: '#c7f58a' },
  { id: 'maroon', label: 'Maroon', base: '#7a2e3a', signal: '#ffc9b8' },
  { id: 'navy', label: 'Navy blue', base: '#23406e', signal: '#a8d4ff' },
  { id: 'magenta', label: 'Magenta', base: '#8e2a6e', signal: '#ffc2ea' },
  { id: 'brown', label: 'Brown', base: '#6b4a2e', signal: '#f6d38f' },
]

export const DEFAULT_ACCENT = 'green'

export const accentById = (id) => ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]

export function readStoredAccent() {
  try {
    const id = localStorage.getItem('accent')
    return ACCENTS.some((a) => a.id === id) ? id : DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}
