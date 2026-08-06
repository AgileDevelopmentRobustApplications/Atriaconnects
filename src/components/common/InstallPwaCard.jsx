import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

const STORAGE_KEY = 'pwa-install-dismissed'

// In-app install prompt. Captures the browser's beforeinstallprompt event once
// mounted, then renders a small card on the empty state. Dismissals are
// remembered for the session (sessionStorage) only — the prompt returns on
// the next visit.
export default function InstallPwaCard() {
  const [evt, setEvt] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') setDismissed(true)
    // Already running in installed mode.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    const handler = (e) => {
      e.preventDefault()
      setEvt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  if (installed || dismissed || !evt) return null

  async function handleInstall() {
    try {
      evt.prompt()
      const choice = await evt.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
      } else {
        sessionStorage.setItem(STORAGE_KEY, '1')
        setDismissed(true)
      }
    } catch (err) {
      console.error('install prompt failed', err)
    }
  }

  function handleLater() {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="pwa-install-card">
      <Icon name="smartphone" size={20} />
      <div className="pwa-install-text">
        <strong>Install AdraConnects</strong>
        <span>Add to your home screen for quick access.</span>
      </div>
      <button className="btn-small" onClick={handleInstall}>
        Install
      </button>
      <button className="icon-btn" title="Later" onClick={handleLater}>
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}