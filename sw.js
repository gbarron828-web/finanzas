// Guarda la app en el teléfono para que abra rápido y sin internet
const CACHE = 'finanzas-v9';
const LOCAL = ['./', './index.html', './icon.png', './logo.svg'];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];
const WAIT_MS = 3500; // si la red tarda más que esto, se usa lo guardado

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL).then(() =>
    Promise.all(LIBS.map(u => fetch(u, {mode: 'cors'}).then(r => r.ok && c.put(u, r)).catch(() => {}))))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

function fromNet(req) {
  return fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  });
}

// Red primero (para tener la última versión), pero si tarda o falla, lo guardado
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;
  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => caches.match(e.request, {ignoreVary: true}).then(finish), WAIT_MS);
    fromNet(e.request).then(r => { clearTimeout(t); finish(r); })
      .catch(() => caches.match(e.request, {ignoreVary: true})
        .then(c => c || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
        .then(r => { clearTimeout(t); finish(r); }));
  }));
});
