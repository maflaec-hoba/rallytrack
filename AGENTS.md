<!-- BEGIN:nextjs-agent-rules -->
# Next.js: always read the version-matched docs before coding

Before any Next.js work, find and read the relevant documentation in
`node_modules/next/dist/docs/`. The installed documentation is the source of
truth for this project's Next.js version.
<!-- END:nextjs-agent-rules -->

# Agent rules

Starter for a small website built with AI-assisted development
(Next.js App Router + TypeScript + Tailwind + shadcn/ui).

## Rules

1. Follow `DESIGN-GUIDELINE.md` for anything visual.
2. UI building blocks come from `src/components/ui/` (shadcn/ui — local source,
   you may edit it). Add new ones with `npx shadcn@latest add <component>`.
3. Keep it simple: no new libraries, patterns, or abstractions unless the task
   truly needs them. One implementation ⇒ no interface.
4. Code, comments, and commit messages are English.
5. Before declaring any task done, run and fix until green:
   `npm run typecheck && npm run lint && npm run test`
6. Work test-first (TDD). The GWT scenarios of `docs/spec/given-when-then.md`
   are scaffolded as `it.todo` entries in `src/**/*.test.ts`. When starting a
   task: convert that task's todos into real failing tests (red), then
   implement until green. Never implement first and backfill tests, and never
   delete or weaken a scaffolded scenario — scope changes go through the spec.
7. After every production deploy, scan runtime errors via the Vercel MCP
   (`get_runtime_errors`, last 24h) and report the result. New error clusters
   after a deploy block further feature work until triaged.
8. Branching. `main` is protected: it only changes via PR with the CI
   `checks` gate green, and it auto-deploys to production. Each milestone
   lives on its own branch (`milestone/m1-alapok`, `milestone/m2-turakovetes`,
   `milestone/m3-rally-muszerek`, `milestone/m4-itiner-export`,
   `milestone/m5-szinkron`), cut from `main` when the milestone starts — its
   Vercel preview URL is where the milestone is viewed and tested in
   isolation. Every task gets its own branch (use the name Linear suggests)
   and merges into its milestone branch via PR: green CI + independent-review
   findings resolved. Milestone → `main` merge requires human approval.
9. Independent review (RUG): every task PR is reviewed by the other harness
   (Codex) per `docs/review-checklist.md` before merge. The reviewer produces
   findings and a verdict (APPROVE / REQUEST CHANGES) — never code changes;
   fixes are the maker's, and each finding is marked accepted or rejected in
   the PR before merging.
10. Task intake from Linear. Only pick up issues that are in **Todo** status
    and have no blocking (unfinished) prerequisites. Before starting, verify
    the issue is properly specified — it must trace to the spec (FR/GWT IDs)
    and have clear acceptance criteria; if not, stop and ask instead of
    guessing. The moment you start working on an issue, move it to
    **In Progress**.
11. Agentic operation runs per `docs/agentic-workflow.md`: only the
    orchestrator touches Linear and merges task PRs; makers implement in
    isolated worktrees and write a handoff file
    (`docs/handoff/<ISSUE-ID>.md`); the reviewer (Codex) reviews handoff +
    task + diff; max 2 fix rounds, then human escalation.

> This file grows during the workshop — every recurring correction you give
> the agent belongs here as a rule.
