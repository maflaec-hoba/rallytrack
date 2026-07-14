"use client";

import { useEffect } from "react";

// T1 / INS-6 — PWA shell wiring (FR-8.2, FR-8.3):
//   1. register the hand-written service worker in public/sw.js,
//   2. request persistent storage to reduce IndexedDB eviction risk,
//   3. warm the runtime cache with the assets of the already-loaded page —
//      those were fetched before the worker took control, so without this a
//      single visit would not be enough for an offline cold start (GWT-34).
//
// Must match CACHE_NAME in public/sw.js.
const CACHE_NAME = "rallytrack-shell-v1";

async function warmRuntimeCache() {
  if (!("caches" in window)) return;
  const assetUrls = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return (
          parsed.origin === window.location.origin &&
          parsed.pathname.startsWith("/_next/static/")
        );
      } catch {
        return false;
      }
    });
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    assetUrls.map(async (url) => {
      if (!(await cache.match(url))) await cache.add(url);
    }),
  );
}

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => warmRuntimeCache())
        .catch(() => {
          // Registration failure (e.g. unsupported browser) degrades to a
          // plain online-only web app — never a crash (NFR-3).
        });
    }
    if (navigator.storage?.persist) {
      // Best-effort: browsers may deny silently; data still lives in
      // IndexedDB either way (FR-8.3).
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  return null;
}
