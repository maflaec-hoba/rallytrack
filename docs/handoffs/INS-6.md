# Handoff — INS-6: T1 — PWA shell: manifest, service worker, offline indulás

- Issue: https://linear.app/insiron/issue/INS-6
- Branch / worktree: `maflaec/ins-6-t1-pwa-shell-manifest-service-worker-offline-indulas`
- Commit(s): see PR (single implementation commit)
- Maker: Claude (maker agent) · Date: 2026-07-14

## Scope / files changed

- `src/app/manifest.ts` — web app manifest via App Router file convention
  (served at `/manifest.webmanifest`): name RallyTrack, standalone display,
  orange-500 theme (`#f97316`), zinc-50 background (`#fafafa`), 192/512 PNG
  icons + maskable icon (FR-8.1).
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` —
  orange "RT" placeholder icons per DESIGN-GUIDELINE tokens (generated with
  `sharp` from node_modules as a one-off dev script; no dependency added).
- `src/app/apple-icon.png` — 180×180 iOS home-screen icon via the App Router
  `apple-icon` file convention (auto-linked, zero layout diff).
- `public/sw.js` — hand-written service worker (no workbox, C4):
  versioned cache `rallytrack-shell-v1`, app-shell precache on install
  (`/`, manifest, icons), cache-first for `/_next/static/*` + icons,
  network-first with cache/shell fallback for navigations, stale-cache
  cleanup + `clients.claim()` on activate (FR-8.2). The routing decision
  (`strategyFor`) is a pure function exposed via a `__SW_TEST__` hook so the
  shipped source itself is unit-tested.
- `src/components/pwa-register.tsx` — client component: registers `/sw.js`
  (`updateViaCache: "none"`), requests `navigator.storage.persist()`
  (FR-8.3), and warms the runtime cache with the already-loaded page's
  `/_next/static/*` assets so a SINGLE visit suffices for an offline cold
  start (those assets were fetched before the SW took control).
- `src/app/layout.tsx` — minimal diff: import + render `<PwaRegister />`
  (parallel task also edits this file).
- `src/lib/pwa.test.ts` — 9 unit tests (see below).

## Acceptance criteria — per-AC status

| AC | Status | Evidence (test / command / manual) |
|----|--------|------------------------------------|
| Web manifest (`app/manifest.ts`) with name, icons, standalone, theme color (FR-8.1) | PASS | `src/lib/pwa.test.ts` "web manifest (FR-8.1)" (3 tests); `curl /manifest.webmanifest` on `next start` returns the full manifest |
| Icons | PASS | 192/512/maskable PNG in `public/icons/`, `apple-icon.png`; referenced from the manifest and precached by the SW |
| Hand-written SW with app-shell precache + runtime cache (FR-8.2) | PASS | `src/lib/pwa.test.ts` "service worker shell (FR-8.2)" (6 tests: handlers registered, versioned cache name, shell precache list covers manifest icons, routing strategies) |
| SW registration component | PASS | `src/components/pwa-register.tsx` wired into root layout; degrades silently where unsupported (NFR-3) |
| `navigator.storage.persist()` request (FR-8.3) | PASS | called in `pwa-register.tsx` on mount, best-effort with catch |
| GWT-33 — installability on device (manual) | MANUAL — NOT RUN | run Lighthouse installability on the Vercel preview of `milestone/m1-alapok` after merge; manifest + SW + icons verified locally on the prod build |
| GWT-34 — offline cold start on device (manual) | MANUAL — NOT RUN | device: load once → airplane mode → relaunch; home screen must render. Cache warm-up in `pwa-register.tsx` exists specifically to make the single-load precondition hold |
| Lighthouse installability green (NFR-4) | PENDING (manual, needs deployed HTTPS build) | to be run on the milestone preview URL |

## Gate results

- typecheck: exit 0 · lint: exit 0 · test: exit 0 (10 passed, 37 todo) · build: exit 0
- Runtime smoke on `next start`: `/manifest.webmanifest` 200 (correct JSON),
  `/sw.js` 200 `application/javascript`, `/icons/icon-192.png` 200, `/` 200.

## Decisions / assumptions

- `navigator.storage.persist()` is requested at app start (in the register
  component), not "on first tour start" as plan.md sketches — tours don't
  exist yet (T5); the call is idempotent and harmless. Revisit in T5 if the
  product wants the browser permission heuristics tied to a user gesture.
- `CACHE_NAME` is duplicated between `public/sw.js` and
  `src/components/pwa-register.tsx` (a `public/` script can't import from
  `src/`). Drift risk accepted and documented at both sites; the unit test
  pins the SW-side name format.
- Runtime cache warm-up from the window client (`performance` resource
  entries → `caches.open`) chosen over a SW `postMessage` protocol — fewer
  moving parts, same-origin CacheStorage is shared.
- Non-shell same-origin GETs (future `/api/*`) are deliberately NOT
  intercepted by the SW — offline behavior for data is IndexedDB's job (T2).
- `__SW_TEST__` hook on `self` in `sw.js`: inert in production, lets Vitest
  evaluate the real shipped worker source instead of a duplicated copy.

## Known risks / follow-ups

- GWT-33/GWT-34/NFR-4 need a real device + deployed HTTPS build — manual
  checklist owner should run them on the milestone preview URL.
- When new precache-worthy assets appear (e.g. pdf.js worker in T11), bump
  the version suffix in `CACHE_NAME` and extend `APP_SHELL`.
- Root layout was touched (2-line diff) — trivial merge conflict possible
  with the parallel layout-editing task.

## Fix round 1

- **Finding (MAJOR, reviewer):** `src/lib/pwa.test.ts` never executed the
  service worker's install/fetch/activate behavior or the registration
  component — `precacheAppShell()` could be a no-op, `networkFirst()` could
  always return `Response.error()`, and `<PwaRegister />` could stop
  registering / requesting persistence with all tests still green.
- **Decision: ACCEPTED.** The original suite only pinned static shape
  (constants, listener registration, the pure routing function).
- **What changed (TDD — strengthened tests written red-first):**
  - `src/lib/pwa.test.ts` rewritten: hand-rolled stubs (in-memory
    CacheStorage with write log, StubRequest/StubResponse, fetch spy) are
    injected into the shipped `public/sw.js` source via
    `new Function("self","caches","fetch","Request","Response", src)`. The
    tests now DISPATCH events against the real handlers: install → APP_SHELL
    precached into the versioned cache with `cache: "reload"` requests +
    `skipWaiting`; activate → stale `rallytrack-*` caches deleted, current
    and foreign kept, `clients.claim` called; fetch → cache-first hit
    (network untouched) and miss (fetched + stored), navigation online
    (network + cached), offline fallback to the cached page and to the
    precached shell root (GWT-34 plausibility), non-GET/cross-origin/API
    requests not intercepted. 20 tests in the file (9 before).
  - `src/components/pwa-register.tsx` refactored: the effect logic is now an
    exported `setupPwa(env: PwaEnv)` with injected
    `navigator/caches/performance/origin` (component stays a thin mount
    hook — runtime behavior unchanged). Tests execute it: registers
    `/sw.js` with `{scope:"/", updateViaCache:"none"}`, requests
    `navigator.storage.persist()`, warms the SW cache with same-origin
    `/_next/static/*` resources only, skips already-cached assets, degrades
    without throwing when SW is unsupported or registration rejects. The
    warm-up cache name is asserted equal to the `CACHE_NAME` extracted from
    `sw.js` (drift guard).
  - **Mutation spot-checks** (each mutation applied, suite run, reverted):
    precache no-op → 2 tests fail; `networkFirst` → `Response.error()` →
    3 fail; registration call removed → 1 fails; `persist()` call removed →
    2 fail. Restored code: 20/20 green.
- **Gates after fix:** typecheck exit 0 · lint exit 0 · test exit 0
  (21 passed, 37 todo) · build exit 0.

## How to verify

- `npm run typecheck && npm run lint && npm run test && npm run build`
- `npm run build && npm run start` → open http://localhost:3000, DevTools →
  Application: manifest parsed, SW activated, cache `rallytrack-shell-v1`
  contains `/`, manifest, icons and the page's `/_next/static/*` chunks;
  then DevTools → Network → Offline → reload: page renders from cache.
- Device (GWT-33/34): open the milestone preview URL, install to home
  screen, airplane mode, relaunch → home screen renders.
