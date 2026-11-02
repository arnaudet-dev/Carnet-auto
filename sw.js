/* Carnet auto : hors ligne et partage. Changer VERSION à chaque mise à jour. */
const VERSION = 'carnet-auto-0.7';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'fra-traineddata.b64.txt', 'tesseract.min.js', 'worker.min.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js', 'pdf.min.js', 'pdf.worker.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'carnet-auto-fonts' && k !== 'carnet-auto-share').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; const u = new URL(r.url);
  /* Partage depuis une autre application : les fichiers attendent dans un cache que la page les reprenne */
  if (r.method === 'POST' && u.origin === location.origin && u.pathname.endsWith('/partage')) {
    e.respondWith((async () => {
      let n = 0;
      try { const fd = await r.formData(); const c = await caches.open('carnet-auto-share'); for (const f of fd.getAll('files')) { if (!f || typeof f === 'string') continue; await c.put(new Request('./partage/' + Date.now() + '-' + (n++)), new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-Name': encodeURIComponent(f.name || 'document') } })); } } catch (err) { /* rien à reprendre */ }
      return Response.redirect('./?partage=' + n, 303);
    })());
    return;
  }
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    /* La page : réseau d'abord (mises à jour), cache si hors ligne. Le reste : cache d'abord. */
    if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html'))); return; }
    e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(r, cp)); } return res; })));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open('carnet-auto-fonts').then(c => c.match(r).then(hit => { const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => hit); return hit || net; })));
  }
});
