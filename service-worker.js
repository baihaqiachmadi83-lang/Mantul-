const CACHE_NAME = 'emodul-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './unit1-vocabulary.html',
  './unit2-speaking.html',
  './unit3-reading.html',
  './final-test.html',
  './material.html',
  './student.html',
  './teacher.html',
  './admin.html',
  './design-system.css',
  './components.css',
  './animations.css',
  './feedback.css',
  './app.js',
  './quiz-store.js',
  './feedback.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Hanya intercept GET request
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).catch(() => {
        // Jika request gagal karena offline dan yang di-request adalah navigasi HTML
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
