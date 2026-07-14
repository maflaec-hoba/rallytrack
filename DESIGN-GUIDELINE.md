# Design guideline

The house style rulebook — the agent follows it in every UI task.
You fill it in during the workshop (v0 / shadcn will help); an empty section
is still a section: it tells the agent that the decision is still open.

> You may write your VALUES in Hungarian if that feels more comfortable —
> English is recommended, as models follow English instructions best.

## Brand & tone

Instrument-panel character: purposeful, calm, high-contrast — a digital rally
tripmaster for veteran-car crews, not a playful consumer app. Data first:
big numerals, minimal chrome, no decoration that competes with readings.
UI copy is Hungarian, short and imperative ("Túra indítása", "Trip nullázás").

## Colors

- Base: `zinc` scale — app background `bg-zinc-950` (dark is the primary
  theme; in-car use), surfaces `bg-zinc-900`, borders `border-zinc-800`,
  body text `text-zinc-100`, secondary text `text-zinc-400`.
- Primary accent: `amber-400` (rally-plate amber) for primary actions and
  active states — `bg-amber-400 text-zinc-950` on buttons.
- Recording/live indicator: `emerald-500`. Destructive/stop: `red-600`.
- Navigator view is stricter: pure `bg-black` with `text-zinc-50` numerals;
  accent use minimal; everything ≥ WCAG AA (aim AAA for primary numerals).

## Typography

- UI text: Geist Sans (already wired in the layout).
- All numeric readouts (distance, time, speed): Geist Mono with
  `tabular-nums` so digits never jump while counting.
- Scale: readouts `text-5xl`–`text-7xl` (navigator view may go larger),
  screen titles `text-lg font-semibold`, labels above readouts
  `text-xs uppercase tracking-wide text-zinc-400`, body `text-sm`/`text-base`.

## Layout & spacing

- Mobile-first, single column, `max-w-md mx-auto`, page padding `px-4`,
  vertical rhythm in Tailwind steps of 4 (`gap-4`, `py-4`, sections `py-6`).
- Fixed bottom navigation on app screens; content never hidden behind it
  (safe-area padding included).
- Touch targets ≥ 48×48 px (`h-12` minimum) — in-motion controls (trip
  reset, corrections, stopwatch) larger: `h-14`+ full/half width.
- One primary action per screen, placed in the thumb zone (bottom half).

## Components

- Buttons and cards come from `src/components/ui/` (Button, Card); add
  further shadcn components via `npx shadcn@latest add <component>` as
  needed (expected: `tabs`, `dialog`, `input`, `label`, `badge`, `alert`).
- Metric readout (label + big mono value + unit) is the app's own reusable
  component — build it once in `src/components/` and use it everywhere
  (dashboard, trip counter, navigator, tour detail).
- Dialogs only for confirmation (delete tour) and short forms (calibration,
  profile); never for content that is used while driving.

## Don'ts

- No inline styles, no new UI libraries, no custom CSS files beyond
  `globals.css` — Tailwind utilities + shadcn only.
- No light-on-light or low-contrast text; never below WCAG AA.
- No map/tile services or external fonts/CDNs — the app must render fully
  offline (constitution C1).
- Don't shrink touch targets below 48 px or move primary actions to the top
  of the screen.
- Don't use proportional figures for numeric readouts (always tabular mono).
- Don't invent colors outside the tokens above.

---

## Agent-driven design chain (2026-07 state)

You don't design by hand and you don't prompt blindly: the agent drives a design
tool FOR you, from the spec you approved. Two proven paths — both end back in
this file, because **this guideline is the contract: agents follow it, humans
approve it.**

**Prerequisites** (once, before the design step):
- Claude in Chrome/Edge browser extension installed and signed in →
  official guide: <https://claude.ai/chrome>
- OR for the Codex path: the Codex IDE/browser integration →
  official guide: <https://developers.openai.com/codex>
- An APPROVED spec package (constitution/spec/given-when-then/plan/tasks —
  module 3 output). Design starts from the spec, never from vibes.

### Path A — Claude Code drives Claude Design

1. In your Claude Code session run `/design consent` — this lets the agent
   read/write your Claude Design projects.
2. Fill (or let the agent draft) the token sections above — the agent can
   extract them from an existing brand site if you have one.
3. Give the agent this prompt (adjust the bracketed parts):

   > Using the approved spec package in `docs/spec/` and the tokens in
   > `DESIGN-GUIDELINE.md`: (1) sync the tokens and one reference page as a
   > design-system project via Claude Design; (2) open claude.ai/design in my
   > browser, complete the design-system setup wizard with our brand blurb and
   > exact tokens, and run the generation; (3) when it finishes, review the
   > result against the guideline and list deviations. Do not invent colors or
   > fonts — everything comes from the guideline.

4. Review the generated system at claude.ai/design (your eyes are the gate).
5. Import: the agent copies accepted components into `src/components/` and
   writes every new token decision BACK into this file — one source of truth.

### Path B — v0 + shadcn (from Codex or Claude)

1. Prompt v0 (v0.dev) with the spec's screen list plus the tokens above:

   > Build the [screen name] screen for the app specified as: [2-3 sentence
   > summary from spec.md]. Use exactly these design tokens: [paste Colors +
   > Typography sections]. shadcn/ui components only, mobile-first, no new
   > libraries.

2. Iterate in v0 until the screen matches the guideline, then pull the result
   into the starter: `npx shadcn@latest add "<v0 component URL>"`.
3. Record any token or component decision v0 introduced back into this file,
   and have the agent run the usual gates (`npm run typecheck && npm run lint
   && npm run test`) before committing.

Whichever path you take: the spec says WHAT, this guideline says HOW IT LOOKS,
and the agent connects the two — with you approving at both gates.
