# Handoff — INS-20: T15 — Telepítés linkkel: /install oldal QR-kóddal

- Issue: https://linear.app/insiron/issue/INS-20
- Branch / worktree: `maflaec/ins-20-t15-telepites-linkkel-install-oldal-qr-koddal` (worktree `C:/Work/ai-workshop/worktrees/ins-20`, cut from `milestone/m1-alapok` @ c870e9e)
- Commit(s): see PR
- Maker: Claude (Fable 5) · Date: 2026-07-14

## Scope / files changed
- `src/lib/qr.ts` — NEW: hand-written minimal QR encoder (byte mode, EC level M, versions 1–6 auto-selected, ≤ 106 UTF-8 bytes): GF(256) Reed-Solomon, block interleaving, module placement, all 8 masks with penalty-based selection, format info, SVG path helper. Zero dependencies (C1: offline, C4/rule 3: no new library).
- `src/lib/qr.test-vectors.ts` — NEW: known-good reference fixtures (RS block, full v1/v3/v5 matrices, all 8 forced masks) generated at development time from `qrcode@1.5.4` (node-qrcode, ISO/IEC 18004 conformant). The library is NOT a project dependency; only its output is checked in.
- `src/lib/qr.test.ts` — NEW: 31 unit tests — RS vector, version-selection boundaries (1/14/15/…/106/107 bytes), UTF-8 byte counting, byte-identical matrix comparison against the reference for v1, v3, v5 (two interleaved RS blocks) and all 8 forced masks, structural invariants, SVG path.
- `src/lib/platform.ts` — NEW: pure UA classification `detectPlatform()` → `android-chrome | ios-safari | other` + `selectInstallFlow()` (highlight + section order).
- `src/lib/platform.test.ts` — NEW: 9 tests with real UA strings (Android Chrome/Samsung/Edge/Opera/Firefox, iPhone/iPad Safari, CriOS/FxiOS, desktop Chrome/Safari, empty).
- `src/components/use-install-prompt.ts` — NEW: `useInstallPrompt()` hook — captures `beforeinstallprompt` (preventDefault + stash), `appinstalled`, standalone display-mode via `useSyncExternalStore` (hydration-safe, lint-clean).
- `src/app/install/page.tsx` — REPLACED the T3 placeholder: QR card (locally generated SVG for `${origin}/install`, 4-module quiet zone, skeleton until client mount), copyable link (`navigator.clipboard` + `execCommand` fallback, Hungarian feedback via `role="status"`), Android Chrome section ("Telepítés" pill, disabled + explanation when the event never fired — NFR-3), iOS Safari step list, own platform highlighted (orange border + "Ez a te készüléked" badge, ordered first; other section secondary `bg-zinc-50`).

## Acceptance criteria — per-AC status
| AC (FR-8.5 / GWT-40) | Status | Evidence (test / command / manual) |
|----|--------|------------------------------------|
| QR code of the app URL, generated locally without network (C1) | PASS (unit) | `qr.test.ts`: byte-identical to independent reference encoder for v1/v3/v5 + all 8 masks; additionally round-trip decoded with independent decoder `jsqr` for 4 arbitrary URLs (v3/v4/v5) — all `DECODED-OK`. No runtime dependency, no network. |
| Copyable link shown | PASS (unit + smoke) | Prerendered HTML contains link block + "Link másolása"; clipboard has legacy fallback + Hungarian success/error feedback. |
| Android Chrome: `beforeinstallprompt`-driven "Telepítés" button | PASS (code + smoke) | `use-install-prompt.ts`; disabled state + explanation when event never fires (NFR-3). Device confirmation = GWT-40 manual. |
| iOS Safari: "Hozzáadás a kezdőképernyőhöz" steps | PASS (smoke) | 4-step Hungarian instructions in prerendered HTML. |
| Own platform's flow highlighted on a phone | PASS (unit) | `platform.test.ts` (detection + order/highlight); visual check = GWT-40 manual. |
| GWT-40 manual test on both platforms | **OPEN — manual** | Must be executed on the milestone preview URL with a real Android (Chrome) and iOS (Safari) device; no `it.todo` scaffold existed for GWT-40 (manual level), so nothing was converted or weakened. |

## Gate results
- typecheck: exit 0 · lint: exit 0 · test: exit 0 (102 passed, 37 todo) · build: exit 0

## Decisions / assumptions
- **QR encoder hand-written instead of a library** — resolves the plan.md-vs-C1 tension flagged at task start: rule 3/C4 forbids an unjustified new dependency, C1 demands offline generation. Validation is two-sided: (1) fixtures pinned to `qrcode@1.5.4` output (byte-identical matrices incl. auto mask choice); (2) independent decode with `jsqr` in a scratch environment. Neither tool entered `package.json`.
- **Versions capped at 6 (106 bytes, EC M)** — avoids version-info blocks (v7+) while fitting long Vercel preview URLs; `encodeQr` throws beyond that and the page degrades to the copyable link (never crashes).
- **QR/link encode `${origin}/install`, not the bare origin** — GWT-40 requires that scanning lands on the same page with the platform flow shown.
- **Strict platform detection** — Samsung Internet/Edge/Opera on Android and CriOS/FxiOS on iOS classify as `other` (their install UI differs; honest generic view per NFR-3). iPadOS "desktop site" mode reports as macOS → `other` (both flows still shown).
- **Penalty scoring (N3/N4) follows the reference encoder's spec reading** so auto mask selection is reproducible against fixtures; any mask is decodable regardless.
- **`/install` still not in bottom nav** (T3 decision upheld); linking it from `/settings` belongs to the settings task — follow-up below.

## Known risks / follow-ups
- GWT-40 manual check on both platforms is the "Done when" — run it on the milestone preview before milestone merge.
- `beforeinstallprompt` fires only when Chrome's installability criteria pass (HTTPS, manifest, SW) — on the preview URL this should hold (T1); if Chrome ever withholds the event, the page shows the manual menu route (NFR-3 behavior, not a bug).
- Follow-up for the settings task (T9/INS-10): add a link to `/install` from `/settings` (as anticipated in the INS-8 handoff).
- Fixture regeneration (if ever needed): in a scratch dir `npm i qrcode@1.5.4`, then `QRCode.create(text, { errorCorrectionLevel: "M" })` and dump `modules` — lowercase/URL inputs to stay in byte mode.

## How to verify
- `cd C:/Work/ai-workshop/worktrees/ins-20 && npm install`
- `npm run typecheck && npm run lint && npm run test && npm run build`
- `npx next start -p 3111` → open `http://localhost:3111/install`: QR renders (scan it with a phone — it opens `/install` on the phone with that platform's section highlighted first with an orange border + badge), "Link másolása" copies and confirms in Hungarian.
- GWT-40 manual (on the milestone preview URL): Android Chrome → "Telepítés" button shows the native prompt, app lands on the home screen; iOS Safari → follow the 4 steps, icon appears on the home screen.
