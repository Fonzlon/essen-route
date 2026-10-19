/* Works with no signal at all: the whole route, including every floor plan, is inlined
   in index.html, so caching that one file is enough. The page itself is network-first
   (with a short timeout, so weak hall wifi falls back to the cache fast) - cache-first
   kept serving the old route after every update. Everything else stays cache-first. */
const CACHE = 'essen26-20261019-1358';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function fresh(req) {
  // by URL: a navigate-mode Request can't be re-fetched with options
  const net = fetch(req.url, { cache: 'no-store' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
    return res;
  });
  const slow = new Promise((_, rej) => setTimeout(rej, 3000));
  return Promise.race([net, slow]).catch(() => caches.match('./index.html').then(hit => hit || net));
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(e.request.url).pathname)) {
    e.respondWith(fresh(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
  );
});
