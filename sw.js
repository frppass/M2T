// sw.js - Service Worker for M3U Converter
const CACHE_NAME = 'm3u-converter-v2';
const APP_VERSION = '2.0.0';

// Files to cache
const urlsToCache = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache files
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME + '-v' + APP_VERSION)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME + '-v' + APP_VERSION) {
          console.log('[ServiceWorker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache first
self.addEventListener('fetch', event => {
  // Skip non-GET requests and chrome-extension
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip Pyodide packages (let them be cached by Pyodide itself)
  if (event.request.url.includes('pyodide') || 
      event.request.url.includes('cdn.jsdelivr.net')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the new response
          caches.open(CACHE_NAME + '-v' + APP_VERSION)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Message event - for updating
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});