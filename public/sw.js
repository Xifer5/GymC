/* Service worker de Gym Manager.
 * Objetivo v1: que la app ABRA sin conexión (shell + recursos ya visitados).
 * NO guarda datos de negocio ni permite escribir sin red: cobros y anulaciones siempre requieren conexión.
 * Solo toca peticiones GET del mismo origen; el API (Supabase, otro origen) nunca pasa por la caché. */
const CACHE = 'gym-manager-v1'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png']
const MAX_ASSETS = 80
// Los módulos ES se piden con `Origin` y lo guardado al instalar no: sin `ignoreVary` el servidor (`Vary: Origin`) haría fallar el emparejamiento.
const MATCH = { ignoreVary: true }

/** Guarda el shell y los JS/CSS con hash que referencia el HTML, para que abra sin red desde la primera visita. */
async function precache() {
  const cache = await caches.open(CACHE)
  await cache.addAll(SHELL)
  const html = await (await fetch('/', { cache: 'reload' })).text()
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
  await cache.addAll(assets)
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cache) {
  const keys = await cache.keys()
  if (keys.length > MAX_ASSETS) await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map((k) => cache.delete(k)))
}

async function put(request, response) {
  if (!response || !response.ok || response.type !== 'basic') return response
  const cache = await caches.open(CACHE)
  await cache.put(request, response.clone())
  await trim(cache)
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Páginas: red primero (siempre la versión nueva); sin red, el shell guardado.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((r) => put(new Request('/'), r))
        .catch(async () => (await caches.match('/', MATCH)) || Response.error()),
    )
    return
  }

  // Archivos con hash en el nombre: inmutables, caché primero.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request, MATCH).then((hit) => hit || fetch(request).then((r) => put(request, r))))
    return
  }

  // Íconos, manifest: devuelve lo guardado y actualiza en segundo plano.
  event.respondWith(
    caches.match(request, MATCH).then((hit) => {
      const fresh = fetch(request).then((r) => put(request, r)).catch(() => hit)
      return hit || fresh
    }),
  )
})
