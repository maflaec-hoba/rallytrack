# Handoff — INS-8: T3 — App shell UI: navigáció + kezdőképernyő

- Issue: https://linear.app/insiron/issue/INS-8
- Branch / worktree: `maflaec/ins-8-t3-app-shell-ui-navigacio-kezdokepernyo` (worktree `C:/Work/ai-workshop/worktrees/ins-8`)
- Commit(s): d2481510e6a91867a7b92afb6c1c2b835221d46f (implementation)
- Maker: Claude (Fable 5) · Date: 2026-07-14

## Scope / files changed
- `src/app/layout.tsx` — root layout: RallyTrack metadata, `lang="hu"`, light theme (`bg-zinc-50`), mobile-first `max-w-md` column, `pb-28` so content never hides behind the nav, `viewportFit: "cover"` for safe-area padding, renders `<BottomNav />`. Kept minimal so the T2/PWA task can add a service-worker registration component with a trivial rebase.
- `src/lib/navigation.ts` — new, pure nav model: `NAV_ITEMS` + `isNavItemActive(pathname, href)` (home exact-match; sections match subroutes with segment boundary so `/tour` never matches `/tours`).
- `src/lib/navigation.test.ts` — new, 6 unit tests for the nav model (written first, red → green, per TDD).
- `src/components/bottom-nav.tsx` — new client component: fixed bottom navigation (Kezdőlap / Túra / Túrák / Profilok / Beállítások), inline SVG icons (no icon library — C4), active tab `text-orange-600` via `usePathname`, `aria-current="page"`, min-h-14 (≥48 px) targets, `env(safe-area-inset-bottom)` padding.
- `src/components/placeholder-screen.tsx` — new shared placeholder (title + "Hamarosan" card) so all empty routes look consistent.
- `src/app/page.tsx` — home screen: FR-1.1 / GWT-8 UI entry point — primary pill button "Túra indítása" (h-14, `bg-orange-500`, links to `/tour`), "no active tour" card copy noting the active tour returns here to continue, quick links to `/tours`, `/profiles`, `/settings`.
- `src/app/{tour,tour/navigator,tours,tours/[id],profiles,settings,install}/page.tsx` — new placeholder screens per the plan.md route map, Hungarian copy.

## Acceptance criteria — per-AC status
| AC | Status | Evidence (test / command / manual) |
|----|--------|------------------------------------|
| All routes render (`/`, `/tour`, `/tour/navigator`, `/tours`, `/tours/[id]`, `/profiles`, `/settings`, `/install`) | PASS | `npm run build` → all 8 routes in the route table (exit 0); smoke test against `next start`: every route returned HTTP 200, incl. `/tours/abc123` |
| GWT-8's UI entry point exists | PASS | Home screen renders the "Túra indítása" primary button linking to `/tour` (verified in served HTML). UI entry only — tour persistence logic is T5/INS-12 |
| DESIGN-GUIDELINE tokens applied | PASS | zinc-50 background, white `rounded-2xl` cards with `border-zinc-200 shadow-sm`, orange-500 accent (primary button + active nav), pill primary action, ≥48 px touch targets, Hungarian friendly-imperative copy |
| typecheck / lint / test green | PASS | see Gate results |

## Gate results
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0
- `npm run test` → exit 0 (7 passed, 37 todo — todos are other tasks' scaffolds, untouched)
- `npm run build` → exit 0 (8 routes, static except `/tours/[id]` dynamic)

## Decisions / assumptions
- **GWT-8 stays `it.todo`.** The scaffold lives under "tour lifecycle (T5 / INS-12)" and asserts tour *persistence*, which is out of this task's scope (UI entry only). Additionally, converting component scenarios needs `@testing-library/react` + `jsdom` (vitest runs in `node` env today); plan.md assigns those dev-dependencies to the first owning component task. No test libraries added, no scaffold weakened.
- **Inline SVG icons** instead of an icon package — C4 (no new dependency for 5 small icons).
- **Placeholder pages are server components.** plan.md says v1 screens are client components, but these placeholders have no interactivity or browser API use; the owning tasks will add `'use client'` when real behavior lands.
- **Home shows the "no active tour" state only.** The continue-active-tour variant needs tour state (T5); the card copy signals where it will appear. Product behavior not invented.
- **`/install` is intentionally not in the bottom nav** (it is a share/onboarding page, T15); it is reachable by URL and will be linked from settings when T15 lands.
- **`viewport.viewportFit = "cover"`** added so `env(safe-area-inset-bottom)` actually takes effect on iOS standalone (C3).

## Known risks / follow-ups
- The root layout is intentionally small, but T2 (PWA/SW registration) touches the same file — expect a trivial merge/rebase there.
- Placeholder copy will be fully replaced by the owning tasks (T5, T6, T7/T8, T9, T10, T15); no route or nav change should be needed.
- Base shadcn Button defaults (h-8) are overridden per-use with className; if pill/h-12+ becomes the norm everywhere, consider a local size variant in `src/components/ui/button.tsx` (minor).

## How to verify
- `cd C:/Work/ai-workshop/worktrees/ins-8 && npm install`
- `npm run typecheck && npm run lint && npm run test && npm run build`
- `npx next start -p 3111` then open `http://localhost:3111/` on a phone-sized viewport: bottom nav on all screens, active tab orange, "Túra indítása" pill navigates to `/tour`; visit all 8 routes (e.g. `/tours/abc123`).

## Fix round 1

Reviewer verdict: REQUEST CHANGES (3 findings). All three accepted.

- **MAJOR-1 (accepted)** — home screen had no continue-active-tour entry.
  Fixed with a pure decision helper `getHomeEntry(activeTour: ActiveTourSummary | null)`
  in the new `src/lib/home.ts`: it returns the start variant ("Nincs aktív
  túra" / "Túra indítása") for `null` and the continue variant (tour name /
  "Aktív túra folytatása") for an active tour; both target `/tour`.
  `src/app/page.tsx` renders entirely from this model. The active-tour source
  is a currently-`null` placeholder with an explicit `TODO(T5/INS-12)` wiring
  point — no persistence invented (per fix-round guidance, the AC asks for
  the UI entry, not tracking logic).
- **MAJOR-2 (accepted)** — suite could not catch a broken home screen.
  Added `src/lib/home.test.ts` (written first, red → green): 5 tests pin the
  start variant, the continue variant, their mutual exclusivity, and that the
  quick links (now the exported `HOME_QUICK_LINKS` the page renders) point at
  `/tours`, `/profiles`, `/settings` with non-empty Hungarian labels. Pure
  helpers over DOM rendering — node test env kept, no new test libraries (C4).
- **MINOR-1 (accepted)** — plan.md requires all v1 screens to be client
  components. Added `"use client"` to all eight screen pages;
  `/tours/[id]` now unwraps `params` with React's `use()` instead of `await`
  (client components cannot be async).

Gates after fix: typecheck 0 · lint 0 · test 0 (12 passed, 37 todo) ·
build 0 (all 8 routes unchanged in the route table).
