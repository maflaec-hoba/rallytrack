import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

// T1 / INS-6 — PWA shell (FR-8.1, FR-8.2). GWT-33 (installability) and
// GWT-34 (offline cold start) are manual device scenarios; these unit tests
// pin down the machine-checkable parts they depend on: a valid manifest and
// the service worker's cache naming / routing strategy.

const ORIGIN = "https://rallytrack.example";

const swSource = readFileSync(
  path.resolve(__dirname, "../../public/sw.js"),
  "utf8",
);

type SwRequestLike = { method: string; url: string; mode: string };

type SwTestApi = {
  CACHE_NAME: string;
  APP_SHELL: string[];
  strategyFor: (
    request: SwRequestLike,
    scopeOrigin: string,
  ) => "network" | "network-first" | "cache-first";
};

function loadServiceWorker() {
  const listeners = new Map<string, unknown>();
  const swSelf: Record<string, unknown> = {
    addEventListener: (type: string, handler: unknown) => {
      listeners.set(type, handler);
    },
    location: { origin: ORIGIN },
  };
  // Evaluate the real shipped worker source against a stub `self`.
  new Function("self", swSource)(swSelf);
  return { api: swSelf.__SW_TEST__ as SwTestApi, listeners };
}

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

describe("service worker shell (FR-8.2)", () => {
  it("registers install, activate and fetch handlers", () => {
    const { listeners } = loadServiceWorker();
    expect(listeners.has("install")).toBe(true);
    expect(listeners.has("activate")).toBe(true);
    expect(listeners.has("fetch")).toBe(true);
  });

  it("uses a versioned, app-prefixed cache name", () => {
    const { api } = loadServiceWorker();
    expect(api.CACHE_NAME).toMatch(/^rallytrack-shell-v\d+$/);
  });

  it("precaches the app shell: root, manifest and every manifest icon", () => {
    const { api } = loadServiceWorker();
    expect(api.APP_SHELL).toContain("/");
    expect(api.APP_SHELL).toContain("/manifest.webmanifest");
    for (const icon of manifest().icons ?? []) {
      expect(api.APP_SHELL).toContain(icon.src);
    }
  });

  describe("routing strategy", () => {
    const { api } = loadServiceWorker();
    const get = (url: string, mode = "no-cors"): SwRequestLike => ({
      method: "GET",
      url,
      mode,
    });

    it("serves navigations network-first (offline falls back to cache)", () => {
      expect(api.strategyFor(get(`${ORIGIN}/`, "navigate"), ORIGIN)).toBe("network-first");
      expect(api.strategyFor(get(`${ORIGIN}/tours`, "navigate"), ORIGIN)).toBe("network-first");
    });

    it("serves hashed static assets and icons cache-first", () => {
      expect(
        api.strategyFor(get(`${ORIGIN}/_next/static/chunks/main-abc123.js`), ORIGIN),
      ).toBe("cache-first");
      expect(api.strategyFor(get(`${ORIGIN}/icons/icon-192.png`), ORIGIN)).toBe("cache-first");
    });

    it("passes through non-GET, cross-origin and other same-origin requests", () => {
      expect(
        api.strategyFor({ method: "POST", url: `${ORIGIN}/api/tours`, mode: "cors" }, ORIGIN),
      ).toBe("network");
      expect(api.strategyFor(get("https://other.example/lib.js"), ORIGIN)).toBe("network");
      expect(api.strategyFor(get(`${ORIGIN}/api/tours`, "cors"), ORIGIN)).toBe("network");
    });
  });
});
