# Agentic delivery workflow (orchestrator – maker – reviewer)

How tasks flow from Linear to merged code with no human in the inner loop.
Complements the AGENTS.md rules (esp. 5–10) and `docs/review-checklist.md`;
where this document is silent, those rules apply unchanged.

## Roles

| Role | Who | May touch Linear | May write code | May merge |
|---|---|---|---|---|
| **Orchestrator** | Claude Code (main session) | **yes — exclusively** | no | task PR → milestone branch only |
| **Maker** | Claude subagent (isolated worktree) | no | yes | no |
| **Reviewer** | Codex CLI (`codex exec --sandbox read-only`) | no | no — findings + verdict only | no |

The orchestrator is the single writer of Linear state and the single merge
authority for task PRs. Makers and reviewers receive everything they need in
their prompt and report back to the orchestrator; they never act on Linear,
never merge, and never talk to each other directly.

## Task intake (orchestrator)

1. Eligible task = Linear issue that is **Todo**, belongs to the current
   milestone, and has **no unfinished prerequisite** (Linear "blocked by"
   relations and the `Depends on:` lines of `docs/spec/tasks.md` — both must
   be clear; prerequisites count as finished when their PR is merged into the
   milestone branch and the issue is Done).
2. Before dispatch the orchestrator verifies the issue is properly specified
   per AGENTS.md rule 10 (traces to FR/GWT IDs, clear "done when"). If not:
   comment on the issue with what is missing, leave it in Todo, escalate to
   the human, and pick the next eligible task.
3. On dispatch: move the issue to **In Progress** and comment which agent run
   picked it up.

## Parallelism

- Multiple makers may run concurrently on eligible tasks that do not block
  each other. Each maker works in an **isolated git worktree** on its own
  task branch (name from Linear), cut from the milestone branch.
- Concurrency cap: **3 makers** at a time.
- Expected file overlap (e.g. two tasks both editing the root layout) is not
  a reason to serialize — conflicts are resolved at merge time: first
  APPROVE + green CI merges first; the orchestrator then instructs remaining
  makers to rebase onto the updated milestone branch, re-run the gates, and
  CI re-runs on the PR before it may merge.
- The reviewer step for one task may run while makers work on others.

## Maker protocol

Input: the Linear issue (full description), pointers to the spec package,
AGENTS.md, DESIGN-GUIDELINE.md. Steps:

1. **Validate before building.** Re-check the task is implementable as
   specified (spec/GWT references resolve, acceptance criteria are testable,
   no hidden dependency on unfinished work). If not: implement nothing,
   return a structured refusal (what is missing, what question the human must
   answer) to the orchestrator.
2. Work per AGENTS.md: read the version-matched Next.js docs first (rule at
   top), TDD — convert the task's `it.todo` scenarios to red tests, then
   implement to green (rule 6), gates green (rule 5).
3. Open a PR from the task branch into the milestone branch.
4. Write the **handoff file** (below) and commit it on the task branch.
5. Return to the orchestrator: PR URL, handoff path, gate results, and any
   deviations from the spec (which must be none without escalation).

## Handoff file

Path: `docs/handoff/<ISSUE-ID>.md` (e.g. `docs/handoff/INS-6.md`), committed
on the task branch so the reviewer reads it from the diff. Contents:

```markdown
# Handoff — <ISSUE-ID> <title>
- **Task:** <Linear URL> · **PR:** <URL> · **Branch:** <name>
- **What was built:** files touched and why, in 5–15 lines
- **Spec coverage:** which FR/GWT IDs are implemented; which GWTs turned
  from `it.todo` into passing tests
- **Decisions:** choices the spec left open, with reasoning
- **Not done / out of scope:** anything deliberately left out and where it
  is tracked
- **How it was verified:** gate results, manual checks performed
```

Fix rounds append a `## Fix round N` section listing each finding and what
changed; the handoff is the running log of the task, not a snapshot.

## Review protocol

The orchestrator moves the issue to **In Review** and invokes Codex per
`docs/review-checklist.md`, providing: the handoff file, the Linear issue
text, and the diff range. The reviewer returns findings
(`[BLOCKER|MAJOR|MINOR] file:line — …`) and a verdict.

- **BLOCKER or MAJOR** → verdict is REQUEST CHANGES: issue goes back to
  **In Progress**, the same maker (same worktree) fixes; every finding is
  marked accepted/rejected in the PR (rule 9); Codex re-reviews the fix.
- **MINOR only** → verdict may be APPROVE-with-minors: the maker fixes the
  minors before merge, gates re-run, but no new full review round is
  spawned; the orchestrator spot-checks that each minor was addressed.
- **Fix-round limit: 2.** If the third review is still REQUEST CHANGES, the
  orchestrator stops the task: Linear comment summarizing the disagreement,
  issue back to Todo with a `needs-human` label, escalate. No fourth round.

## Merge policy

- Task PR → milestone branch: **merged automatically by the orchestrator**
  once the reviewer verdict is APPROVE, all findings are resolved in the PR,
  and the CI `checks` gate is green on the current head. Squash merge,
  branch deleted, issue moved to **Done**, closing comment with the merge
  SHA and review summary.
- Milestone branch → `main`: **human approval only**, unchanged (rule 8).

## Escalation to the human

The orchestrator stops work on a task — never silently drops it — and pings
the human with a Linear comment when:

- the task is under-specified (intake step 2 or maker validation),
- the fix-round limit is exhausted,
- gates or CI cannot be brought green for reasons outside the task's scope
  (broken main, infra failure),
- a post-deploy runtime-error cluster blocks feature work (rule 7),
- the maker proposes any spec or scope change (those go through the spec,
  never through code).

Other eligible tasks continue in parallel; escalation blocks only the
affected task and its dependents.

## Audit trail & reporting

Every state transition gets a Linear comment (picked up / PR opened / review
verdict + findings / fix round / merged with SHA). When the milestone's Todo
queue is empty (or everything left is escalated), the orchestrator stops and
reports: tasks done with merge SHAs, review statistics (findings by
severity, fix rounds used), open escalations, and the milestone preview URL
for human testing — the input for the human milestone → `main` decision.
