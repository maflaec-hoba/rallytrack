# Handoff — INS-7: T2 — Adatréteg: IndexedDB repository + domain típusok

- Issue: https://linear.app/insiron/issue/INS-7
- Branch / worktree: `maflaec/ins-7-t2-adatreteg-indexeddb-repository-domain-tipusok` (worktree `ins-7`)
- Commit(s): 052e20d (tests, red), 1158284 (implementation, green)
- Maker: Claude (maker agent) · Date: 2026-07-14

## Scope / files changed
- `src/lib/types.ts` — new: serializable domain types (`Tour`, `TrackPoint`,
  `TripEvent`, `CarProfile`, `Itinerary`, `Settings`, `StorageUsage`, …).
  Convention enforced in types + docs: distances in meters, times in epoch ms;
  km / `hh:mm:ss` formatting only at the UI edge (C7, GWT-26).
- `src/services/db.ts` — new: `rallytrack` IndexedDB (via `idb`) with the six
  stores from plan.md → Storage (`tours` keyed by `id`, `points` and
  `tripEvents` keyed by `[tourId, seq]`, `profiles` and `itineraries` keyed by
  `id`, `settings` with out-of-line typed keys); CRUD helpers; cascading
  `deleteTour` (points + trip events + attached itinerary in one transaction);
  `getStorageUsage` over `navigator.storage.estimate` with graceful
  degradation; `createPointBatcher` write-behind buffer (flush at 20 points or
  5 s, injectable scheduler, failed batches re-queued).
- `src/services/db.test.ts` — new: component-level repository tests over
  `fake-indexeddb` (19 tests, written first / red before implementation).
- `package.json`, `package-lock.json` — `idb` (runtime) and `fake-indexeddb`
  (dev) added; both pre-justified in `docs/spec/plan.md` (Storage, Testing
  strategy). No other dependency added.

## Acceptance criteria — per-AC status
| AC | Status | Evidence (test / command / manual) |
|----|--------|------------------------------------|
| `idb` dependency added (plan-justified) | PASS | `package.json` dependencies: `idb ^8.0.3`; justification in plan.md → Storage |
| `src/lib/types.ts` domain types | PASS | typecheck exit 0; types consumed by db.ts + tests |
| `src/services/db.ts` with six object stores | PASS | `db.test.ts` CRUD suites for tours / points / tripEvents / profiles / itineraries / settings — all green |
| Batched point writes (20 points / 5 s, NFR-1) | PASS | "batched point writes" suite: size-trigger, timer-trigger (injected scheduler, no real sleeps), manual flush, failure re-queue |
| Storage-usage query | PASS | "storage usage query" suite: estimate mapping + zero-degradation when API missing (NFR-3) |
| Meters / epoch ms domain convention | PASS | documented and typed in `types.ts`; no formatting anywhere in the data layer |
| Repository CRUD covered with `fake-indexeddb` | PASS | `npm run test` → 20 passed, 37 todo (scaffolds untouched) |
| GWT-13 storage side green | PASS | "deleting a tour (GWT-13 storage side)" — tour + points + trip events + itinerary blobs removed, sibling tour untouched |

## Gate results
- typecheck: exit 0 · lint: exit 0 · test: exit 0 (20 passed, 37 todo) · build: exit 0

## FR / GWT traceability
- FR-8.3 (local persistence in IndexedDB) → six-store schema + CRUD tests
  (`db.test.ts`, all suites).
- NFR-1 (batched point storage for 6 h / ~50k-point tours) →
  `createPointBatcher`, "batched point writes (NFR-1: 20 points / 5 s)" suite.
- GWT-13 storage side → `deleteTour` cascade, "deleting a tour (GWT-13
  storage side)" suite. The component-level GWT-13 scaffold (delete UI with
  confirmation) stays as `it.todo` in `src/components/scenarios.test.ts` —
  it belongs to T6 / INS-13.
- FR-8.4 (storage usage in settings) → `getStorageUsage` (UI wiring is a
  later task).
- C2 (never lose data) → failed batch writes re-queue points instead of
  dropping them.

## Decisions / assumptions
- ID generation is not part of the repository: callers provide ids (plan.md
  names ulid; no ulid dependency is justified in plan.md yet, so the
  generating task — tour lifecycle T5 — owns that choice). Keys are plain
  strings at the storage level.
- `points`/`tripEvents` need no secondary indexes: the `[tourId, seq]`
  primary key already yields per-tour range reads in seq order; history
  ordering (GWT-12) sorts the small `tours` list in memory.
- `settings` uses out-of-line keys typed via the `Settings` interface
  (extend the interface when new flags appear) instead of a keyed record
  wrapper — simplest thing that stays type-safe.
- Batcher timer/scheduler is injectable with real `setTimeout` defaults;
  tests use a manual scheduler, no real sleeps.
- `deleteTour` does not touch `settings.activeTourId`: per FR-1.6 only
  closed tours are deletable, so no dangling active reference can occur.

## Known risks / follow-ups
- A batch that fails repeatedly stays in memory until a later flush succeeds;
  surfacing persistent write failures to the user is out of scope here
  (belongs to the tour dashboard task).
- `Itinerary.blobs` round-trips through fake-indexeddb's structured clone in
  tests; real-device blob persistence is exercised by the manual GWT-32 check
  in T11.

## How to verify
- `cd <worktree> && npm install`
- `npm run typecheck && npm run lint && npm run test && npm run build`
- Focused suite: `npx vitest run src/services/db.test.ts`
