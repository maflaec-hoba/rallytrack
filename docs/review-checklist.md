# Independent review checklist (RUG)

The independent reviewer (Codex CLI — a different harness and model than the
maker) reviews every task PR against this checklist. The reviewer **never
writes or pushes code**: its output is a findings list; fixes go back to the
maker, producing a fix SHA, then the changed parts are re-reviewed.

## Inputs

The reviewer reads, in this order:

1. `AGENTS.md` — repo rules (Codex picks this up automatically)
2. The Linear task referenced by the PR title/branch — the approved scope
3. `docs/spec/spec.md` + `docs/spec/given-when-then.md` — the FRs and GWT
   scenarios the task claims to implement
4. `docs/spec/plan.md` — architecture boundaries and justified dependencies
5. `DESIGN-GUIDELINE.md` — if the diff touches UI
6. The full PR diff

## Checks

### 1. Scope

- [ ] Every change in the diff serves the task's Linear issue; no unrelated
  refactors, features, or drive-by edits.
- [ ] Nothing from the spec's "Out of scope (v1)" list crept in.

### 2. Spec & GWT coverage

- [ ] The task's FRs are implemented as specified (values, limits, formats —
  e.g. 50 m accuracy cutoff, factor range 0.5–2.0, `mm:ss.cc`).
- [ ] The task's GWT scenarios were converted from `it.todo` to real tests,
  and the test assertions encode the scenario's concrete values (not
  weakened, reordered into meaninglessness, or replaced with snapshots).
- [ ] No scaffolded scenario was deleted or left as todo while its feature
  is claimed done.

### 3. Test quality (the maker wrote the tests — verify them)

- [ ] Tests fail if the implementation is broken (no tautologies, no
  asserting the implementation against itself).
- [ ] Clock/randomness are injected, not real (`performance.now` param,
  fake timers); no sleeps or real GPS in tests.
- [ ] New domain logic lives in pure functions under `src/lib/` with unit
  tests; browser APIs stay behind `src/services/` adapters.

### 4. Repo rules (AGENTS.md)

- [ ] No new dependency beyond those justified in `docs/spec/plan.md`.
- [ ] English code/comments/commits; Hungarian UI copy.
- [ ] One implementation ⇒ no interface; no speculative abstractions.
- [ ] Units convention: metres and epoch ms in the domain layer; formatting
  only at the UI edge.

### 5. Constitution risks

- [ ] Offline-first (C1/C2): nothing requires network at time of use; data
  is written locally first; no external fonts/CDNs/tiles.
- [ ] Data-loss paths: state that must survive swipe-away/restart is
  persisted (flush on `pagehide`, restore on start).
- [ ] In-motion safety (C5): touch targets ≥ 48 px, readable numerals,
  WCAG AA contrast, light theme (never dark backgrounds).

### 6. Gates (verify, don't trust)

- [ ] CI is green on the PR — and the green is meaningful: run
  `npm run test` and check the todo count dropped by exactly the task's
  scenario count.

## Output format

A findings list, each item:

```
[BLOCKER|MAJOR|MINOR] file:line — what is wrong, which rule/FR/GWT it
violates, and why it matters. Suggested direction (not a patch).
```

Then a verdict: **APPROVE** (no BLOCKER/MAJOR) or **REQUEST CHANGES**.
If there are no findings, say so explicitly ("no findings") — an empty
review is a statement, not an omission.

The findings go into a PR comment (evidence); the maker marks each finding
accepted (fix follows) or rejected (with reasoning) before merging.

## How to invoke

From the repo root, on the PR branch:

```bash
codex exec --sandbox read-only \
  "You are the independent reviewer. Review the diff of this branch against
   main per docs/review-checklist.md. Output findings in the checklist's
   format, then a verdict."
```
