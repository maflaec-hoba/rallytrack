# RallyTrack — Constitution

Non-negotiable principles and constraints. Every spec decision, plan, task and
code change must comply with these. If a task conflicts with this file, the
task is wrong.

## C1 — Offline-first, always

RallyTrack is used in cars, often without network coverage. **Every feature
must be fully usable without an internet connection at the moment of use.**
Network is only ever an enhancement (sync, later map tiles), never a
requirement. A feature that silently degrades or blocks when offline is a bug.

## C2 — Local data is the source of truth

GPS points, tours, trip counters, calibrations, car profiles and itineraries
are written to on-device storage first (IndexedDB). Server sync (when it
exists) is opportunistic replication of local data, never the primary store.
Losing network must never lose data.

## C3 — Mobile-first PWA

The app targets a phone mounted in a car. It must be installable to the home
screen, run standalone/fullscreen, and keep the screen awake while tracking.
Desktop is a debugging convenience, not a design target.

## C4 — Frozen stack, minimal dependencies

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Vitest, as wired in
this repo. No new libraries, patterns or abstractions unless the task truly
needs them; every new dependency must be justified in `plan.md` before it is
added. One implementation ⇒ no interface. Before any Next.js work, read the
version-matched docs in `node_modules/next/dist/docs/`.

## C5 — Glanceable and safe while driving

Screens used in motion (tracking dashboard, trip counter, navigator view)
must be readable at arm's length in sunlight: large numerals, high contrast,
touch targets ≥ 48×48 px, no interaction required beyond deliberate,
oversized buttons. Anything visual follows `DESIGN-GUIDELINE.md`.

## C6 — Deterministic, testable domain logic

All measurement math — distance from GPS points, speeds, calibration factor,
trip corrections, stopwatch timing — lives in pure TypeScript functions under
`src/lib/`, separated from React and browser APIs. Every Given/When/Then
scenario in `given-when-then.md` must be expressible as an automated test.
`npm run typecheck && npm run lint && npm run test` must be green before any
task is declared done.

## C7 — Metric units, fixed formats

Distances in kilometres (three decimals where precision matters: `12.345 km`),
speeds in km/h, elapsed time as `hh:mm:ss`, stopwatch with 1/100 s precision
(`mm:ss.cc`). Numeric readouts use tabular (monospaced) figures so digits
don't jump while counting.

## C8 — The user owns the data

Closed tours are exportable (GPX, CSV, PDF) without any account or server.
Location data never leaves the device unless the user explicitly triggers
sync. No analytics or tracking of the user.

## C9 — Language

Code, comments, commit messages and spec documents are English. UI copy is
Hungarian (the target users are Hungarian veteran-car rally crews).

## C10 — Spec before code

Implementation follows the approved spec package in `docs/spec/`. Scope
changes go through `spec.md` first, then `tasks.md`, then code. Recurring
agent corrections are recorded as rules in `AGENTS.md`.
