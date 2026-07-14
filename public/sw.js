/*
 * RallyTrack service worker (FR-8.2) — hand-written, no workbox (C4).
 *
 * Strategy (see docs/spec/plan.md → "PWA & service worker"):
 *   - install:  precache the app shell (root document, manifest, icons)
 *   - fetch:    navigations       → network-first, falling back to cache
 *               /_next/static/*   → cache-first (hashed, immutable)
 *               /icons/*, shell   → cache-first
 *               everything else   → untouched (browser default)
 *   - activate: drop caches from older worker versions, take control
 *
 * Bump CACHE_NAME's version suffix whenever the caching logic or the
 * precache list changes — activation then discards the stale cache.
 */

const CACHE_NAME = "rallytrack-shell-v1";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

/**
 * Pure routing decision — kept side-effect free so src/lib/pwa.test.ts can
 * exercise it directly against the shipped source.
 *
 * @param {{ method: string, url: string, mode: string }} request
 * @param {string} scopeOrigin
 * @returns {"network" | "network-first" | "cache-first"}
 */
function strategyFor(request, scopeOrigin) {
  if (request.method !== "GET") return "network";
  const url = new URL(request.url);
  if (url.origin !== scopeOrigin) return "network";
  if (request.mode === "navigate") return "network-first";
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    APP_SHELL.includes(url.pathname)
  ) {
    return "cache-first";
  }
  return "network";
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  // `cache: "reload"` bypasses the HTTP cache so the precache is fresh.
  await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })));
}

async function deleteStaleCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith("rallytrack-") && name !== CACHE_NAME)
      .map((name) => caches.delete(name)),
  );
}

async function cachePut(request, response) {
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await cachePut(request, await fetch(request));
  } catch {
    // Offline: serve the cached page, or the precached shell root so app
    // start never shows a browser error page (GWT-34).
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match("/");
    if (shell) return shell;
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return cachePut(request, await fetch(request));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteStaleCaches().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const strategy = strategyFor(event.request, self.location.origin);
  if (strategy === "network-first") {
    event.respondWith(networkFirst(event.request));
  } else if (strategy === "cache-first") {
    event.respondWith(cacheFirst(event.request));
  }
  // "network": don't intercept — the browser handles it.
});

// Test hook: lets the unit tests exercise the shipped source directly
// (evaluated with a stub `self`); inert inside a real service worker.
self.__SW_TEST__ = { CACHE_NAME, APP_SHELL, strategyFor };
