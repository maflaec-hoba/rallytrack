"use client";

import { useEffect } from "react";

// T1 / INS-6 — PWA shell wiring (FR-8.2, FR-8.3):
//   1. register the hand-written service worker in public/sw.js,
//   2. request persistent storage to reduce IndexedDB eviction risk,
//   3. warm the runtime cache with the assets of the already-loaded page —
//      those were fetched before the worker took control, so without this a
//      single visit would not be enough for an offline cold start (GWT-34).
//
// The logic lives in `setupPwa` with its browser dependencies injected, so
// src/lib/pwa.test.ts can execute it against hand-rolled stubs; the
// component is only the mount hook.

// Must match CACHE_NAME in public/sw.js (a public/ script cannot import
// from src/). Guarded against drift by src/lib/pwa.test.ts.
const CACHE_NAME = "rallytrack-shell-v1";

export type PwaEnv = {
  navigator: {
    serviceWorker?: {
      register: (
        url: string,
        options: { scope: string; updateViaCache: "none" },
      ) => Promise<unknown>;
    };
    storage?: { persist?: () => Promise<boolean> };
  };
  caches?: {
    open: (name: string) => Promise<{
      match: (url: string) => Promise<unknown>;
      add: (url: string) => Promise<unknown>;
    }>;
  };
  performance: { getEntriesByType: (type: string) => Array<{ name: string }> };
  origin: string;
};

async function warmRuntimeCache(env: PwaEnv): Promise<void> {
  if (!env.caches) return;
  const assetUrls = env.performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return (
          parsed.origin === env.origin &&
          parsed.pathname.startsWith("/_next/static/")
        );
      } catch {
        return false;
      }
    });
  const cache = await env.caches.open(CACHE_NAME);
  await Promise.all(
    assetUrls.map(async (url) => {
      if (!(await cache.match(url))) await cache.add(url);
    }),
  );
}

export async function setupPwa(env: PwaEnv): Promise<void> {
  if (env.navigator.storage?.persist) {
    try {
      // Best-effort: browsers may deny silently; data still lives in
      // IndexedDB either way (FR-8.3).
      await env.navigator.storage.persist();
    } catch {
      // Ignore — persistence stays "best effort".
    }
  }
  if (!env.navigator.serviceWorker) return;
  try {
    await env.navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await warmRuntimeCache(env);
  } catch {
    // Registration failure (e.g. unsupported browser) degrades to a plain
    // online-only web app — never a crash (NFR-3).
  }
}

export function PwaRegister() {
  useEffect(() => {
    void setupPwa({
      navigator: window.navigator,
      caches: "caches" in window ? window.caches : undefined,
      performance: window.performance,
      origin: window.location.origin,
    });
  }, []);

  return null;
}
