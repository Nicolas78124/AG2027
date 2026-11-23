// AG 2027 — mode hors connexion
const VERSION = 'ag2027-v8';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'logo.png', 'logo-sm.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'favicon.png',
  'nico.jpg', 'vic.jpg', 'jc.jpg', 'jef.jpg', 'sam.jpg',
  'data/voyage.json', 'data/golf.json', 'data/change.json', 'data/secret.json', 'docs/tableau-des-scores.pdf', 'docs/tableau-des-scores.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheKey(req) {
  const u = new URL(req.url);
  // Les fichiers du site et les JSON sont demandés avec ?v=… : on les range sans paramètre
  if (u.origin === self.location.origin) { u.search = ''; return u.toString(); }
  return req.url;
}

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(cacheKey(req), res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(cacheKey(req));
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match(new URL('index.html', self.location).toString());
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(cacheKey(req));
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(cacheKey(req), res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);

  // Vérification de nouvelle version : toujours le réseau, jamais le cache
  if (u.origin === self.location.origin && /index\.html$/.test(u.pathname) && u.searchParams.has('v')) return;

  // Photos (stockage Supabase), polices, script HEIC : on garde la copie locale
  if (u.pathname.includes('/storage/v1/object/public/') || u.hostname.endsWith('gstatic.com') || u.hostname === 'fonts.googleapis.com' || u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(cacheFirst(req));
    return;
  }

  // Site, données, dépenses, météo, taux : réseau d'abord, copie locale si hors connexion
  e.respondWith(networkFirst(req));
});
