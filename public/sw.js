// Bump version to force clients to pick up new strategy
const CACHE_NAME = 'pasr-v2';
const STATIC_ASSETS = [
    '/css/style.css',
    '/css/home.css',
    '/css/profile.css',
    '/css/insidecate.css',
    '/js/script.js',
    '/js/pwa-install.js',
    '/images/icon.jpeg',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css'
];

// Install: pre-cache all static assets
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activate immediately on update
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim()) // Take control of all open pages immediately
    );
});

// Fetch: Cache-First for static assets, Network-First for HTML pages
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Cache-first strategy: CSS, JS, images, fonts (static assets never change w/o URL change)
    const isStaticAsset =
        url.pathname.startsWith('/css/') ||
        url.pathname.startsWith('/js/') ||
        url.pathname.startsWith('/images/') ||
        url.hostname === 'cdn.jsdelivr.net' ||
        url.hostname === 'cdnjs.cloudflare.com' ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com';

    if (isStaticAsset) {
        // Cache-First: serve from cache instantly, update in background
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Network-First for HTML pages (always fresh content)
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
