/* RESQ pitch — offline cache.
   Strategy: cache-first with background refresh for same-origin GETs.
   Anything the deck loads once keeps working with no network. */
const CACHE = 'resq-pitch-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const cacheable = (request, response) => {
  if (!response || !response.ok || response.type === 'opaque') return false
  // A dev/preview server may answer a missing image with index.html (200). Never cache that as an image.
  if (request.destination === 'image') return (response.headers.get('content-type') || '').startsWith('image/')
  return true
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS') return
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        event.data.urls.map((url) =>
          fetch(url).then((res) => {
            const req = new Request(url)
            const looksLikeImage = /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url)
            if (res.ok && (!looksLikeImage || (res.headers.get('content-type') || '').startsWith('image/'))) return cache.put(req, res)
          }).catch(() => {}),
        ),
      ),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: false })
      const network = fetch(request)
        .then((res) => { if (cacheable(request, res)) cache.put(request, res.clone()); return res })
        .catch(() => null)
      if (cached) { event.waitUntil(network); return cached }
      const res = await network
      if (res) return res
      if (request.mode === 'navigate') {
        const shell = (await cache.match(self.registration.scope)) || (await cache.match(`${self.registration.scope}index.html`))
        if (shell) return shell
      }
      return Response.error()
    }),
  )
})
