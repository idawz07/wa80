const CACHE_PREFIX = 'wa80-guide-';
const CACHE_VERSION = 'wa80-guide-v9';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './jszip.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
const OFFLINE_URL = new URL('./index.html', self.location).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(event.request, preload.clone());
      return preload;
    }

    const response = await fetch(event.request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(event.request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    return caches.match(OFFLINE_URL);
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'manifest'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request))
  );
});
