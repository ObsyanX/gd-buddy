const CACHE_NAME = "gd-buddy-v2";
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json", "/favicon.ico"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Never cache Vite/dev internals or source modules (prevents stale chunk/runtime mismatches)
  if (
    url.pathname.startsWith("/@vite") ||
    url.pathname.startsWith("/node_modules/.vite") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.endsWith(".tsx") ||
    url.pathname.endsWith(".ts")
  ) {
    return;
  }

  // Navigation: network-first with offline fallback
  if (request.mode === "navigate") {
    e.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  // Only cache safe static assets on same-origin
  if (
    isSameOrigin &&
    (url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".jpeg") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".woff") ||
      url.pathname.endsWith(".woff2") ||
      url.pathname.endsWith(".ico") ||
      url.pathname.endsWith(".json"))
  ) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
