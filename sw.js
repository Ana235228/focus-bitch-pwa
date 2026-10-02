const CACHE = 'focus-bitch-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/words-en.js',
  '/words-en2.js',
  '/words-hy.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isCode = /\.(html|css|js)$/.test(url.pathname) || url.pathname === '/';

  if (isCode) {
    // NETWORK-FIRST: свежее из сети, кэш как fallback
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // CACHE-FIRST для картинок (они не меняются)
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});