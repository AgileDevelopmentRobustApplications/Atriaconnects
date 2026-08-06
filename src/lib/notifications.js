// Browser Notifications helper using HTML5 Notification API

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission !== 'denied') {
    const status = await Notification.requestPermission()
    return status === 'granted'
  }
  return false
}

export function showNotification(title, body, tag, icon) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  // Don't show notifications if the document is currently focused and active
  if (document.hasFocus()) return

  try {
    const options = {
      body,
      tag: tag || 'adraconnects-msg',
      renotify: true,
      icon: icon || '/icons/icon-192.png'
    }
    new Notification(title, options)
  } catch (err) {
    console.error('Failed to show notification', err)
  }
}
