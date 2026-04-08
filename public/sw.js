/**
 * Renshuu Service Worker
 *
 * Caching strategy:
 *  - HTML navigation  → network-first (always get latest index.html without manual cache bumps)
 *  - /assets/*        → cache-first (Vite content-hashes these; hash change = new URL = safe)
 *  - Everything else  → network-first with cache fallback
 *
 * Update flow:
 *  - New SW installs and activates immediately (skipWaiting)
 *  - Activated SW posts APP_UPDATED to all open clients
 *  - App shows a "new version" banner so the user can reload
 */

const ASSETS_CACHE = "renshuu-assets";
const SHELL_CACHE = "renshuu-shell";

const STATIC_SHELL = ["/manifest.webmanifest", "/favicon.svg", "/icons.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(STATIC_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((clients) =>
        clients.forEach((client) =>
          client.postMessage({ type: "APP_UPDATED" }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(
          () =>
            caches.match(request) ??
            caches.match("/index.html") ??
            new Response("App unavailable offline", { status: 503 }),
        ),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(ASSETS_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
