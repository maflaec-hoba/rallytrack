# RallyTrack — Task breakdown & execution order

Tasks are sized to be one focused PR each, ordered so every task lands on a
working app. Milestones M1–M5 map to the Linear project milestones; each
task's "Done when" points at the binding GWT scenarios (see
`given-when-then.md`) on top of the global Definition of Done in `plan.md`.

Linear mapping (project [rallytrack](https://linear.app/insiron/project/rallytrack-b66207541f2b)):
T1=INS-6, T2=INS-7, T3=INS-8, T4=INS-9, T5=INS-12, T6=INS-13, T7=INS-14,
T8=INS-15, T9=INS-10, T10=INS-16, T11=INS-11, T12=INS-17, T13=INS-18.
Spec approval anchor: INS-5 (blocks T1–T3).

Dependency graph:

```
T1 ──► T4 ──► T5 ──► T6 ──► T12
T2 ──►    ├─► T7 ──► T8
T3 ──►    │     └─► T10
          ├─► T9
          └─► T11 (needs T2)
T13 after T6 (stretch)
```

## M1 — Foundation

### T1 — PWA shell: manifest, service worker, offline start
Manifest (`app/manifest.ts`), icons, SW in `public/sw.js` with app-shell
precache + runtime caching, SW registration component, persistent-storage
request hook.
**Spec:** FR-8.1, FR-8.2, FR-8.3 (persist request) · **Done when:** GWT-33,
GWT-34 pass on a device; Lighthouse installability green (NFR-4).
**Depends on:** — 

### T2 — Data layer: IndexedDB repository + domain types
`idb` dependency, `src/lib/types.ts`, `src/services/db.ts` with the six
object stores, batched point writes, storage-usage query.
**Spec:** FR-8.3, NFR-1 · **Done when:** repository CRUD covered by
component-level tests with `fake-indexeddb`; GWT-13 storage side.
**Depends on:** —

### T3 — App shell UI: navigation + home screen
Root layout with bottom navigation, home screen (start/continue tour,
links to history/profiles/settings), empty screens routed per the plan's
route map. First application of `DESIGN-GUIDELINE.md` tokens.
**Spec:** FR-1.1 (entry point), C5 · **Done when:** all routes render;
GWT-8's UI entry exists; typecheck/lint/test green.
**Depends on:** —

## M2 — Tour tracking

### T4 — Tracking domain: filtering, distance, speeds (+ tests)
`src/lib/tracking.ts` pure functions: haversine, point filter (accuracy,
jump), distance accumulation, current/average speed, formatting helpers in
`src/lib/format.ts`.
**Spec:** FR-2.2, FR-2.3, FR-2.5, C7 · **Done when:** GWT-1–7 and GWT-26
green as unit tests.
**Depends on:** T2

### T5 — Tour lifecycle + live dashboard
Tour provider (start/close/restore), geolocation + wake-lock services,
`/tour` dashboard with live distance / elapsed / current & average speed.
**Spec:** FR-1.1–FR-1.3, FR-2.1, FR-2.4, FR-2.6, FR-2.7, NFR-2, NFR-3 ·
**Done when:** GWT-8–11 green; GWT-35 manual check done.
**Depends on:** T1, T3, T4

### T6 — Tour history: list, detail, route line, delete
`/tours` list, `/tours/[id]` detail with summary + SVG route line
(`route-line.tsx`), delete with confirmation.
**Spec:** FR-1.4–FR-1.6 · **Done when:** GWT-12, GWT-13 green.
**Depends on:** T5

## M3 — Rally instruments

### T7 — Trip counter
`src/lib/trip.ts` + trip counter panel on `/tour`: trip distance/time/avg,
GPS + calibrated display, reset, ±10/±100 m corrections, event log.
**Spec:** FR-3.1–FR-3.4 · **Done when:** GWT-14–18 green.
**Depends on:** T5

### T8 — Odometer calibration & car profiles
`src/lib/calibration.ts`, `/profiles` screen: calibration wizard (GPS vs
odometer input → factor), named profiles CRUD, active profile selection,
dual distance display wiring.
**Spec:** FR-4.1–FR-4.5 · **Done when:** GWT-19–22 green.
**Depends on:** T7

### T9 — Stopwatch (1/100 s, laps)
`src/lib/stopwatch.ts` state machine + global provider + stopwatch panel:
start/stop/reset/lap, `mm:ss.cc` display via rAF.
**Spec:** FR-6.1–FR-6.4, NFR-2 · **Done when:** GWT-23–25 green.
**Depends on:** T3 (panel), domain part independent

### T10 — Navigator view
`/tour/navigator`: high-contrast large-type view (trip, calibrated, elapsed,
avg, current) + oversized reset/correction controls.
**Spec:** FR-7.1–FR-7.3, C5 · **Done when:** GWT-36 green; contrast checked
against DESIGN-GUIDELINE.
**Depends on:** T7

## M4 — Itinerary & export

### T11 — Itinerary: attach, view, offline
Attach PDF (pdfjs-dist, dynamic import, self-hosted worker) or photos;
pager UI; 50 MB limit; blob storage; itinerary on closed tours.
**Spec:** FR-5.1–FR-5.5 · **Done when:** GWT-30, GWT-31 green; GWT-32
manual check done.
**Depends on:** T2, T3 (T5 for attach-to-active-tour flow)

### T12 — Export: GPX, CSV, PDF (print)
`src/lib/export/gpx.ts`, `csv.ts`, share/download plumbing, print-styled
summary on tour detail.
**Spec:** FR-9.1–FR-9.4 · **Done when:** GWT-27, GWT-28 green; GWT-29
manual check done.
**Depends on:** T6

## M5 — Sync (stretch)

### T13 — Sync closed tours to Neon
API routes (`app/api/tours/`), `@neondatabase/serverless`, upsert by ulid,
manual "sync now" action in settings, shared-secret guard.
**Spec:** FR-10.1, FR-10.2, C2 · **Done when:** re-sync produces no
duplicates (integration test against a Neon branch); local data untouched
on failure.
**Depends on:** T6 · **Start only after F1–F9 are done.**
