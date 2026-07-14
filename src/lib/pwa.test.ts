import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import { setupPwa, type PwaEnv } from "@/components/pwa-register";

// T1 / INS-6 — PWA shell (FR-8.1, FR-8.2, FR-8.3). GWT-33 (installability)
// and GWT-34 (offline cold start) are manual device scenarios; these tests
// pin down the machine-checkable parts they depend on by EXECUTING the
// shipped service worker handlers and the registration logic against
// hand-rolled stubs (node environment, no extra test libraries — C4).

const ORIGIN = "https://rallytrack.example";

const swSource = readFileSync(
  path.resolve(__dirname, "../../public/sw.js"),
  "utf8",
);

// --- hand-rolled stubs -------------------------------------------------------

class StubRequest {
  url: string;
  init?: { cache?: string };
  constructor(url: string, init?: { cache?: string }) {
    this.url = url;
    this.init = init;
  }
}

class StubResponse {
  ok: boolean;
  body: string;
  constructor(body = "", ok = true) {
    this.body = body;
    this.ok = ok;
  }
  clone() {
    return new StubResponse(this.body, this.ok);
  }
  static error() {
    return new StubResponse("", false);
  }
}

type CacheKeySource = string | { url: string };

function keyOf(request: CacheKeySource): string {
  return typeof request === "string" ? request : request.url;
}

/** In-memory CacheStorage. `log` records every write for skip-assertions. */
function createCachesStub() {
  const stores = new Map<string, Map<string, unknown>>();
  const log: Array<{ op: "add" | "addAll" | "put"; cache: string; key: string }> = [];
  const openStore = (name: string) => {
    let store = stores.get(name);
    if (!store) {
      store = new Map();
      stores.set(name, store);
    }
    return store;
  };
  const makeCache = (name: string) => {
    const store = openStore(name);
    return {
      addAll: async (requests: CacheKeySource[]) => {
        for (const request of requests) {
          log.push({ op: "addAll", cache: name, key: keyOf(request) });
          store.set(keyOf(request), request);
        }
      },
      add: async (request: CacheKeySource) => {
        log.push({ op: "add", cache: name, key: keyOf(request) });
        store.set(keyOf(request), { runtimeCached: keyOf(request) });
      },
      put: async (request: CacheKeySource, response: unknown) => {
        log.push({ op: "put", cache: name, key: keyOf(request) });
        store.set(keyOf(request), response);
      },
      match: async (request: CacheKeySource) => store.get(keyOf(request)),
    };
  };
  return {
    stores,
    log,
    open: async (name: string) => makeCache(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (request: CacheKeySource) => {
      for (const store of stores.values()) {
        const hit = store.get(keyOf(request));
        if (hit !== undefined) return hit;
      }
      return undefined;
    },
  };
}

type SwRequestLike = { method: string; url: string; mode: string };

type SwTestApi = {
  CACHE_NAME: string;
  APP_SHELL: string[];
  strategyFor: (
    request: SwRequestLike,
    scopeOrigin: string,
  ) => "network" | "network-first" | "cache-first";
};

type FetchStub = ReturnType<typeof vi.fn<(request: unknown) => Promise<StubResponse>>>;

/** Evaluate the real shipped worker source against stubbed SW globals. */
function loadServiceWorker(options: { fetch?: FetchStub } = {}) {
  const listeners = new Map<string, (event: unknown) => void>();
  const cachesStub = createCachesStub();
  const fetchStub: FetchStub =
    options.fetch ?? vi.fn(async () => new StubResponse("from-network"));
  const swSelf = {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners.set(type, handler);
    },
    location: { origin: ORIGIN },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    __SW_TEST__: undefined as unknown,
  };
  new Function("self", "caches", "fetch", "Request", "Response", swSource)(
    swSelf,
    cachesStub,
    fetchStub,
    StubRequest,
    StubResponse,
  );
  return { api: swSelf.__SW_TEST__ as SwTestApi, listeners, cachesStub, fetchStub, swSelf };
}

async function dispatchExtendable(
  listeners: Map<string, (event: unknown) => void>,
  type: "install" | "activate",
) {
  let pending: Promise<unknown> | undefined;
  listeners.get(type)!({
    waitUntil: (p: Promise<unknown>) => {
      pending = p;
    },
  });
  await pending;
}

async function dispatchFetch(
  listeners: Map<string, (event: unknown) => void>,
  request: SwRequestLike,
): Promise<unknown> {
  let responded: Promise<unknown> | undefined;
  listeners.get("fetch")!({
    request,
    respondWith: (p: Promise<unknown>) => {
      responded = p;
    },
  });
  return responded ? await responded : undefined;
}

// --- manifest (FR-8.1) -------------------------------------------------------

describe("web manifest (FR-8.1)", () => {
  const m = manifest();

  it("declares name, standalone display and start_url for installability", () => {
    expect(m.name).toBe("RallyTrack");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
  });

  it("uses the design-guideline tokens for theme and background", () => {
    expect(m.theme_color).toBe("#f97316"); // orange-500
    expect(m.background_color).toBe("#fafafa"); // zinc-50
  });

  it("provides 192px and 512px PNG icons plus a maskable icon", () => {
    const icons = m.icons ?? [];
    expect(icons.some((i) => i.sizes === "192x192" && i.type === "image/png")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.type === "image/png")).toBe(true);
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
  });
});

// --- service worker (FR-8.2) ---------------------------------------------------

describe("service worker shell (FR-8.2)", () => {
  it("uses a versioned, app-prefixed cache name", () => {
    const { api } = loadServiceWorker();
    expect(api.CACHE_NAME).toMatch(/^rallytrack-shell-v\d+$/);
  });

  it("declares an app shell of root, manifest and every manifest icon", () => {
    const { api } = loadServiceWorker();
    expect(api.APP_SHELL).toContain("/");
    expect(api.APP_SHELL).toContain("/manifest.webmanifest");
    for (const icon of manifest().icons ?? []) {
      expect(api.APP_SHELL).toContain(icon.src);
    }
  });

  it("install: precaches every APP_SHELL entry into the versioned cache, bypassing the HTTP cache", async () => {
    const { api, listeners, cachesStub, swSelf } = loadServiceWorker();
    await dispatchExtendable(listeners, "install");
    const store = cachesStub.stores.get(api.CACHE_NAME);
    expect(store).toBeDefined();
    expect([...store!.keys()].sort()).toEqual([...api.APP_SHELL].sort());
    for (const entry of store!.values()) {
      expect(entry).toBeInstanceOf(StubRequest);
      expect((entry as StubRequest).init?.cache).toBe("reload");
    }
    expect(swSelf.skipWaiting).toHaveBeenCalled();
  });

  it("activate: deletes stale rallytrack caches, keeps the current and foreign ones, claims clients", async () => {
    const { api, listeners, cachesStub, swSelf } = loadServiceWorker();
    cachesStub.stores.set("rallytrack-shell-v0", new Map());
    cachesStub.stores.set(api.CACHE_NAME, new Map());
    cachesStub.stores.set("unrelated-cache", new Map());
    await dispatchExtendable(listeners, "activate");
    expect([...cachesStub.stores.keys()].sort()).toEqual(
      [api.CACHE_NAME, "unrelated-cache"].sort(),
    );
    expect(swSelf.clients.claim).toHaveBeenCalled();
  });

  it("fetch: serves cached static assets without hitting the network (cache-first)", async () => {
    const { api, listeners, cachesStub, fetchStub } = loadServiceWorker();
    const url = `${ORIGIN}/_next/static/chunks/app-abc123.js`;
    const cached = new StubResponse("cached-chunk");
    await (await cachesStub.open(api.CACHE_NAME)).put(new StubRequest(url), cached);
    const response = await dispatchFetch(listeners, { method: "GET", url, mode: "no-cors" });
    expect(response).toBe(cached);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("fetch: on a static-asset cache miss, fetches from the network and stores a copy", async () => {
    const { api, listeners, cachesStub, fetchStub } = loadServiceWorker();
    const url = `${ORIGIN}/_next/static/chunks/app-def456.js`;
    const response = (await dispatchFetch(listeners, {
      method: "GET",
      url,
      mode: "no-cors",
    })) as StubResponse;
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(response.body).toBe("from-network");
    expect(cachesStub.stores.get(api.CACHE_NAME)?.has(url)).toBe(true);
  });

  it("fetch: serves navigations from the network when online and caches the page", async () => {
    const { api, listeners, cachesStub } = loadServiceWorker();
    const url = `${ORIGIN}/tours`;
    const response = (await dispatchFetch(listeners, {
      method: "GET",
      url,
      mode: "navigate",
    })) as StubResponse;
    expect(response.body).toBe("from-network");
    expect(cachesStub.stores.get(api.CACHE_NAME)?.has(url)).toBe(true);
  });

  it("fetch: offline navigation falls back to the cached page (GWT-34)", async () => {
    const offlineFetch: FetchStub = vi.fn(async () => {
      throw new TypeError("offline");
    });
    const { api, listeners, cachesStub } = loadServiceWorker({ fetch: offlineFetch });
    const url = `${ORIGIN}/tours`;
    const cachedPage = new StubResponse("cached-page");
    await (await cachesStub.open(api.CACHE_NAME)).put(new StubRequest(url), cachedPage);
    const response = await dispatchFetch(listeners, { method: "GET", url, mode: "navigate" });
    expect(response).toBe(cachedPage);
  });

  it("fetch: offline navigation to an uncached page falls back to the precached shell root (GWT-34)", async () => {
    const offlineFetch: FetchStub = vi.fn(async () => {
      throw new TypeError("offline");
    });
    const { api, listeners, cachesStub } = loadServiceWorker({ fetch: offlineFetch });
    await dispatchExtendable(listeners, "install"); // precache the shell
    const response = await dispatchFetch(listeners, {
      method: "GET",
      url: `${ORIGIN}/never-visited`,
      mode: "navigate",
    });
    expect(response).toBe(cachesStub.stores.get(api.CACHE_NAME)!.get("/"));
  });

  it("fetch: does not intercept non-GET, cross-origin or other same-origin requests", async () => {
    const { listeners, fetchStub } = loadServiceWorker();
    const cases: SwRequestLike[] = [
      { method: "POST", url: `${ORIGIN}/api/tours`, mode: "cors" },
      { method: "GET", url: "https://other.example/lib.js", mode: "no-cors" },
      { method: "GET", url: `${ORIGIN}/api/tours`, mode: "cors" },
    ];
    for (const request of cases) {
      expect(await dispatchFetch(listeners, request)).toBeUndefined();
    }
    expect(fetchStub).not.toHaveBeenCalled();
  });

  describe("routing decision (pure)", () => {
    const { api } = loadServiceWorker();
    const get = (url: string, mode = "no-cors"): SwRequestLike => ({ method: "GET", url, mode });

    it("classifies navigations network-first and static assets cache-first", () => {
      expect(api.strategyFor(get(`${ORIGIN}/`, "navigate"), ORIGIN)).toBe("network-first");
      expect(
        api.strategyFor(get(`${ORIGIN}/_next/static/chunks/main-abc123.js`), ORIGIN),
      ).toBe("cache-first");
      expect(api.strategyFor(get(`${ORIGIN}/icons/icon-192.png`), ORIGIN)).toBe("cache-first");
      expect(api.strategyFor(get(`${ORIGIN}/api/tours`, "cors"), ORIGIN)).toBe("network");
    });
  });
});

// --- registration + persistent storage (FR-8.2, FR-8.3) -----------------------

describe("PwaRegister setup (FR-8.2, FR-8.3)", () => {
  function createEnv(overrides: Partial<PwaEnv> = {}) {
    const cachesStub = createCachesStub();
    const register = vi.fn(async () => ({}));
    const persist = vi.fn(async () => true);
    const env: PwaEnv = {
      navigator: { serviceWorker: { register }, storage: { persist } },
      caches: cachesStub,
      performance: { getEntriesByType: () => [] },
      origin: ORIGIN,
      ...overrides,
    };
    return { env, cachesStub, register, persist };
  }

  it("registers /sw.js at scope / with updateViaCache 'none'", async () => {
    const { env, register } = createEnv();
    await setupPwa(env);
    expect(register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  });

  it("requests persistent storage (FR-8.3)", async () => {
    const { env, persist } = createEnv();
    await setupPwa(env);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("warms the SW cache with the loaded page's same-origin static assets only", async () => {
    const { env, cachesStub } = createEnv();
    env.performance = {
      getEntriesByType: () => [
        { name: `${ORIGIN}/_next/static/chunks/page-abc.js` },
        { name: `${ORIGIN}/_next/static/css/styles-def.css` },
        { name: "https://other.example/analytics.js" }, // cross-origin: skipped
        { name: `${ORIGIN}/api/tours` }, // not a static asset: skipped
      ],
    };
    await setupPwa(env);
    const swCacheName = loadServiceWorker().api.CACHE_NAME; // drift guard
    const store = cachesStub.stores.get(swCacheName);
    expect(store).toBeDefined();
    expect([...store!.keys()].sort()).toEqual([
      `${ORIGIN}/_next/static/chunks/page-abc.js`,
      `${ORIGIN}/_next/static/css/styles-def.css`,
    ]);
  });

  it("does not re-add assets that are already cached", async () => {
    const { env, cachesStub } = createEnv();
    const url = `${ORIGIN}/_next/static/chunks/page-abc.js`;
    const swCacheName = loadServiceWorker().api.CACHE_NAME;
    await (await cachesStub.open(swCacheName)).put(url, new StubResponse("already"));
    env.performance = { getEntriesByType: () => [{ name: url }] };
    await setupPwa(env);
    expect(cachesStub.log.filter((entry) => entry.op === "add")).toEqual([]);
  });

  it("registers the SW and warms the cache even when persist() never settles", async () => {
    // Registration and the best-effort persistence request must be
    // independent: a hanging browser promise must not block offline setup.
    const { env, cachesStub, register } = createEnv();
    env.navigator.storage = { persist: () => new Promise<boolean>(() => {}) };
    const asset = `${ORIGIN}/_next/static/chunks/page-abc.js`;
    env.performance = { getEntriesByType: () => [{ name: asset }] };
    await setupPwa(env);
    expect(register).toHaveBeenCalledTimes(1);
    const store = cachesStub.stores.get(loadServiceWorker().api.CACHE_NAME);
    expect(store?.has(asset)).toBe(true);
  }, 1000);

  it("still registers the SW when persist() rejects", async () => {
    const { env, register } = createEnv();
    env.navigator.storage = {
      persist: vi.fn(async () => {
        throw new Error("denied");
      }),
    };
    await expect(setupPwa(env)).resolves.toBeUndefined();
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("degrades without throwing when service workers are unsupported, still requesting persistence (NFR-3)", async () => {
    const { env, persist } = createEnv();
    env.navigator = { storage: { persist } };
    await expect(setupPwa(env)).resolves.toBeUndefined();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("swallows registration failures (NFR-3)", async () => {
    const { env, register } = createEnv();
    register.mockRejectedValueOnce(new Error("sw blocked"));
    await expect(setupPwa(env)).resolves.toBeUndefined();
  });
});
