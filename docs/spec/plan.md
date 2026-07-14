# RallyTrack — Technical plan (HOW)

How the requirements in `spec.md` are implemented in this repo's stack
(Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui, Vitest), under the
constraints of `constitution.md`.

Before implementing any task, read the version-matched Next.js docs in
`node_modules/next/dist/docs/` — most relevant here:
`01-app/02-guides/progressive-web-apps.md`,
`01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`,
`01-app/02-guides/testing/vitest.md`.

## Architecture overview

RallyTrack is a **client-side application** delivered by Next.js. All
tracking, storage and export logic runs in the browser (C1/C2); the server
side is only static delivery — until the stretch sync feature (F10) adds API
routes backed by Neon Postgres.

Three layers, strictly separated:

1. **Domain (`src/lib/`)** — pure TypeScript, no React, no browser APIs.
   Distance/speed math, filtering, trip/calibration/stopwatch logic,
   formatting, GPX/CSV generation. This is where every unit-level GWT
   scenario is tested.
2. **Services (`src/services/`)** — thin adapters over browser APIs:
   IndexedDB repository, Geolocation watcher, Wake Lock, file/share access.
   Injected into the app layer so components never touch browser APIs
   directly (mockable in component tests).
3. **App (`src/app/`, `src/components/`)** — App Router pages and client
   components built from shadcn/ui primitives per `DESIGN-GUIDELINE.md`.

### Route map (App Router)

| Route | Screen |
|---|---|
| `/` | Home: start tour / continue active tour, quick links |
| `/tour` | Active tour dashboard (F2) with tabs: Trip counter (F3), Itinerary (F5), Stopwatch (F6) |
| `/tour/navigator` | Navigator view (F7) |
| `/tours` | History list (F1) |
| `/tours/[id]` | Closed tour detail: summary, route line, itinerary, export (F1, F9) |
| `/profiles` | Car profiles & calibration (F4) |
| `/settings` | Storage usage, persistence, app info (F8) |
| `/install` | Install-by-link page: QR + link + platform install flow (FR-8.5) |

All screens are client components (`'use client'`); no server data fetching
in v1.

## Key decisions

### PWA & service worker

- Manifest via the App Router `app/manifest.ts` file convention.
- A hand-written service worker in `public/sw.js` (registered from a small
  client component in the root layout), following the installed Next.js PWA
  guide. Strategy: precache the app shell on install, cache-first for static
  assets (`/_next/static/*`, icons), network-falling-back-to-cache for
  navigations. No workbox/serwist — the caching needs are simple (C4).
- `navigator.storage.persist()` requested on first tour start (FR-8.3).

### Storage (IndexedDB)

One database `rallytrack`, accessed through the **`idb`** package
(~1 kB promise wrapper over IndexedDB).
*Justified new dependency:* raw IndexedDB's event-based API is verbose and
error-prone; `idb` adds no abstraction beyond promisification (C4).

Object stores:

| Store | Key | Content |
|---|---|---|
| `tours` | `id` (ulid) | status (`active`/`closed`), name, startedAt, endedAt, totals (gpsMeters, calibratedMeters, durationMs, avgKmh), calibration snapshot, itineraryId? |
| `points` | `[tourId, seq]` | timestamp, lat, lon, ele?, accuracy — written in batches of 20 or every 5 s (NFR-1) |
| `tripEvents` | `[tourId, seq]` | `reset` \| `correction` events with timestamp and deltaMeters (FR-3.4) |
| `profiles` | `id` | name, factor, note, createdAt |
| `itineraries` | `id` | kind (`pdf`/`photos`), Blob(s), pageCount, byteSize |
| `settings` | key | activeProfileId, activeTourId, misc flags |

Repository functions in `src/services/db.ts`; domain objects are plain
serializable types in `src/lib/types.ts`. Distances are stored/computed in
**metres**, times in **epoch ms**; formatting to km / `hh:mm:ss` happens
only at the UI edge (GWT-26).

### Tracking engine

- `src/services/geolocation.ts` wraps `navigator.geolocation.watchPosition`
  (`enableHighAccuracy: true`).
- `src/lib/tracking.ts` (pure): `filterPoint(prev, next)` implements the
  50 m accuracy / 250 km/h jump rules (FR-2.2), `haversineMeters(a, b)`,
  `accumulateDistance`, `currentSpeed` (GPS speed → fallback derived →
  0 when stale > 5 s), `averageKmh`.
- Active-tour state lives in a React context + reducer
  (`src/components/tour-provider.tsx`); each kept point dispatches to state
  and appends to the write-behind batch. Elapsed time always derives from
  `startedAt` vs now, never from an accumulating timer (FR-2.7, GWT-10).
- Wake Lock lives in its own service with reference counting: any running
  measurement (active tour OR running stopwatch) holds it; released when the
  last one stops (FR-2.6, FR-6.5, GWT-39). Reacquired on `visibilitychange`;
  missing API (older iOS) → visible notice, no crash (NFR-3).
- Swipe-away resilience (FR-2.8): tour state + point batch flushed on
  `pagehide`/`visibilitychange: hidden`; on app start, a persisted active
  tour auto-resumes the geolocation watcher with no confirmation
  (GWT-37/38/41). QR code for `/install` is generated locally (tiny
  dependency-free QR routine or inline SVG generator — no network, C1).

### Trip counter & calibration

Pure functions in `src/lib/trip.ts` / `src/lib/calibration.ts`:
trip distance = tour distance − distance at last reset + Σ corrections,
clamped at 0 (GWT-14–16); factor = odometer / GPS, valid 0.5–2.0 (GWT-19–20);
calibrated = corrected GPS × factor (GWT-17, GWT-22).

### Stopwatch

`src/lib/stopwatch.ts`: state machine over monotonic timestamps
(`performance.now()` injected as a clock parameter for testability) —
GWT-23–25. Display ticks via `requestAnimationFrame` (NFR-2); the stopwatch
lives in a global provider so it keeps running across in-app navigation
(FR-6.4).

### Itinerary

- Photos: `<input type="file" accept="image/*" capture="environment" multiple>`,
  stored as Blobs, rendered via object URLs.
- PDF: stored as a Blob; rendered page-by-page with **`pdfjs-dist`**.
  *Justified new dependency:* browsers cannot reliably render PDF blobs
  inline on mobile (iOS `<embed>`/`<iframe>` limitations), and offline
  page-by-page viewing (FR-5.2/5.3) requires canvas rendering. The worker
  file is self-hosted so it works offline.
- 50 MB per-itinerary limit enforced before write (FR-5.5).

### Route display (no map tiles)

`src/components/route-line.tsx` renders the tour's points as an SVG polyline
scaled to its bounding box (equirectangular projection is sufficient at tour
scale). No map/tile dependency in v1 (out of scope).

### Export

- `src/lib/export/gpx.ts` and `csv.ts`: pure string builders (GWT-27–28),
  delivered via Blob + `navigator.share`/download anchor (FR-9.4).
- PDF export = dedicated print-styled summary section on `/tours/[id]` +
  `window.print()` (browser print-to-PDF). No PDF-generation library (C4).

### Sync (F10, stretch — build last)

Next.js route handlers under `app/api/tours/` using
`@neondatabase/serverless` against the provisioned Neon Postgres
(eu-central-1, PG 18). Client pushes closed tours (tour row + points as
JSONB); idempotency via client-generated ulid primary keys and upsert
(FR-10.2). No auth in v1 — the endpoint is guarded by a shared secret env
var until accounts are ever in scope. Dependency added only when this task
starts.

## Branching & delivery

`main` is protected (PR + green CI `checks` required) and auto-deploys to
production. Milestones are integrated and tested in isolation on their own
branches, each with a stable Vercel preview URL:

| Milestone | Branch | Preview URL |
|---|---|---|
| M1 | `milestone/m1-alapok` | `rallytrack-git-milestone-m1-alapok-insiron.vercel.app` |
| M2 | `milestone/m2-turakovetes` | `rallytrack-git-milestone-m2-turakovetes-insiron.vercel.app` |
| M3 | `milestone/m3-rally-muszerek` | `rallytrack-git-milestone-m3-rally-muszerek-insiron.vercel.app` |
| M4 | `milestone/m4-itiner-export` | `rallytrack-git-milestone-m4-itiner-export-insiron.vercel.app` |
| M5 | `milestone/m5-szinkron` | `rallytrack-git-milestone-m5-szinkron-insiron.vercel.app` |

Flow: milestone branch is cut from `main` when the milestone starts (after
the previous one merged) → task branches (Linear-suggested names) PR into
the milestone branch (CI + independent review) → when the milestone is
complete and human-approved, milestone → `main` PR ships it to production.

## Testing strategy

TDD, anchored to the spec: every unit/component GWT scenario is scaffolded
as an `it.todo` entry colocated with its future module (`src/lib/*.test.ts`,
component scenarios temporarily pooled in `src/components/scenarios.test.ts`).
Starting a task means turning its todos into failing tests first (red), then
implementing until green (AGENTS.md rule 6). `vitest run` lists the todos, so
remaining spec coverage is always visible in the test output.

- **Unit (Vitest, `src/lib/**/*.test.ts`)** — every unit-tagged GWT
  scenario; clock and randomness injected as parameters.
- **Component (Vitest + @testing-library/react, jsdom)** — the
  component-tagged scenarios (tour lifecycle, profiles, itinerary paging,
  navigator content) with `fake-indexeddb` and mocked services.
  *Justified dev-dependencies:* `@testing-library/react`, `jsdom`,
  `fake-indexeddb` (test-only, per Next.js Vitest guide).
- **Manual device checklist** — the manual-tagged scenarios (install,
  airplane-mode cold start, GPS tour, offline itinerary/export), executed
  on a real phone before closing the relevant task.
- Gate for every task: `npm run typecheck && npm run lint && npm run test`
  (C6).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| iOS suspends GPS/JS when screen locks or app backgrounds | Wake Lock keeps screen on while tracking (the in-car use case); elapsed time derives from timestamps so suspension never corrupts data (FR-2.7); document the "keep app foregrounded" expectation in UI |
| IndexedDB eviction wipes tours | `navigator.storage.persist()` + storage meter + user-driven cleanup (FR-8.3/8.4) |
| GPS noise inflates distance | Accuracy + jump filters (FR-2.2); calibration feature itself compensates systematic error |
| pdf.js bundle size hurts first load | Dynamic `import()` only on itinerary viewer; worker precached by SW |
| Print-to-PDF layout varies per browser | Keep the summary to a single defensive print stylesheet; GPX/CSV are the data-fidelity exports |

## Definition of Done (every task)

1. Referenced GWT scenarios implemented as tests and green.
2. `npm run typecheck && npm run lint && npm run test` green.
3. Visual work complies with `DESIGN-GUIDELINE.md`.
4. No new dependency beyond those justified in this plan.
5. Linear issue updated (status, notes on deviations — and deviations also
   land back in this spec package).
