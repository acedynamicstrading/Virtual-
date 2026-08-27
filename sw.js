// Minimal app-shell cache. Deliberately does NOT try to cache the
// three.js/MediaPipe CDN scripts — those are large, version-pinned, and
// better left to the browser's normal HTTP cache. This just makes the
// local shell (icon, manifest, index.html) load instantly from the
// home-screen icon, even on a flaky connection.

const CACHE_NAME = "ar-pinch-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin shell files. Everything else (CDN scripts,
  // MediaPipe model downloads, XR-related requests) passes straight through
  // to the network untouched.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
