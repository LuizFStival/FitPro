// Hevy responses and keys never enter CacheStorage. Version is stamped at build time.
const CACHE = 'fitpro-pulse-__BUILD__'
const FILES = __ASSETS__
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))))
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fitpro-pulse-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())))
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/fitpro/') || url.pathname.startsWith('/fitpro/api/') || url.pathname === '/fitpro/source.tar.gz') return
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(CACHE)
    return (await cache.match(event.request)) || (event.request.mode === 'navigate' ? (await cache.match('/fitpro/index.html')) || Response.error() : Response.error())
  }))
})
