/**
 * Offline support: after the first load the service worker (public/sw.js) keeps
 * every file the deck has used — code, fonts, your photos — so it keeps working
 * with no network. Production builds only.
 */
export function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      const ready = await navigator.serviceWorker.ready
      const urls = performance
        .getEntriesByType('resource')
        .map((r) => r.name)
        .filter((u) => u.startsWith(location.origin))
      ready.active?.postMessage({ type: 'CACHE_URLS', urls: [location.href.split('#')[0], ...urls] })
      void reg
    } catch (err) {
      console.warn('[offline] service worker unavailable', err)
    }
  })
}
