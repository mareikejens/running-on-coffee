// Classic (non-module) service worker — cache-first app shell for a fully
// static, fully offline app. There are zero external requests at runtime.
//
// DISCIPLINE: bump CACHE_VERSION in EVERY commit that touches any file below.
// The browser refetches sw.js on each navigation, so a bump reliably triggers
// install → activate → old cache deleted.
const CACHE_VERSION = 5;
const CACHE_NAME = `coffeewall-shell-v${CACHE_VERSION}`;

// Every file individually — ES module imports are separate fetches, each
// needing its own cache entry. Relative URLs keep this host/subpath-agnostic.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/reset.css',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './css/forms.css',
  './css/main-screen.css',
  './css/history.css',
  './css/idle-screen.css',
  './js/main.js',
  './js/constants.js',
  './js/db/db.js',
  './js/db/meta.js',
  './js/db/users.js',
  './js/db/beans.js',
  './js/db/grindSettings.js',
  './js/db/ratings.js',
  './js/db/comments.js',
  './js/db/backup.js',
  './js/pwa/persistStorage.js',
  './js/pwa/swRegister.js',
  './js/pwa/wakeLock.js',
  './js/utils/dom.js',
  './js/utils/format.js',
  './js/utils/uuid.js',
  './js/views/router.js',
  './js/views/mainView.js',
  './js/views/beanListView.js',
  './js/views/addBeanView.js',
  './js/views/settingsView.js',
  './js/views/historyView.js',
  './js/views/commentChipsView.js',
  './js/views/idleView.js',
  './js/views/statsView.js',
  './js/idle/idleController.js',
  './js/components/toast.js',
  './js/components/stepper.js',
  './js/components/starRating.js',
  './js/components/userSwitcher.js',
  './js/components/speechInput.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: 'no-cache' bypasses the browser HTTP cache (revalidates with
      // the server) — otherwise a new SW can install with stale files, since
      // hosts like GitHub Pages serve with max-age=600.
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      // Navigations always resolve to the shell (single-page app).
      if (request.mode === 'navigate') {
        return caches.match('./index.html').then((shell) => shell || fetchAndCache(request));
      }
      return fetchAndCache(request);
    }),
  );
});

// Cache-miss fallback: fetch and opportunistically cache same-origin GETs so a
// file added without a version bump still gets picked up while online.
function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  });
}
