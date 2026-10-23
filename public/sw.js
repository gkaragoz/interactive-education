/* Bilim Atölyesi service worker.
 *
 * The build (see `serviceWorkerPlugin` in vite.config.ts) fills in the three placeholders below.
 * - install: precache the app shell (page, scripts, styles, fonts, transcoder).
 * - after the page's first idle moment it asks for `precache-extra`: model files, the low texture tier, micrographs.
 * - runtime: same-origin GET requests are answered from the cache first; whatever the network returns for
 *   models / textures / micrographs / assets is stored (this is how the medium and high texture tiers get cached).
 * - navigations go to the network first and fall back to the cached page, so the site still opens offline.
 * - updates are safe: a new version waits until old tabs are closed (no skipWaiting), then removes old caches.
 * Only this origin's files below this scope are ever cached.
 */
const VERSION = '__BUILD_ID__';
const SHELL = /* __SHELL__ */ [];
const EXTRA = /* __EXTRA__ */ [];
const CACHE = `bilim-${VERSION}`;
const SCOPE = self.registration.scope;
const RUNTIME_PATH = /\/(textures|models|micrographs|assets|basis)\//;

const absolute = (path) => new URL(path, SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL.map(absolute))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith('bilim-') && name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'precache-extra') event.waitUntil(precacheExtra());
});

async function precacheExtra() {
  const cache = await caches.open(CACHE);
  const queue = EXTRA.map(absolute);
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      if (await cache.match(url)) continue;
      try {
        await cache.add(url);
      } catch {
        // A single missing file must not stop the rest.
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== new URL(SCOPE).origin || !url.href.startsWith(SCOPE)) return;
  if (request.headers.has('range')) return;
  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request, url));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) || (await cache.match(absolute('index.html'))) || (await cache.match(SCOPE)) || Response.error();
  }
}

async function cacheFirst(request, url) {
  const cache = await caches.open(CACHE);
  // ignoreVary: files cached by `cache.add` carry no Origin header, module scripts and fonts ask with one.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.status === 200 && RUNTIME_PATH.test(url.pathname)) cache.put(request, response.clone());
  return response;
}
