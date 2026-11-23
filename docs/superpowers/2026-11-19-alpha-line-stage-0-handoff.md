# Alpha line Stage 0: handoff

> **Superseded on 2026-11-23** by [the production cutover plan](../measles-demo/production-cutover-plan.md). The alpha line was abandoned.

Start a fresh Claude Code session on `sonnet`, medium effort, in the
`demo/measles` worktree, and paste:

> Execute `docs/superpowers/plans/2026-11-19-alpha-line-stage-0.md` with the
> superpowers:subagent-driven-development skill. Read
> `docs/measles-demo/alpha-launch-plan.md` (the spec) and
> `docs/measles-demo/alpha-migration-audit.md` (if present) first. Follow
> the plan's ground rules: never write to the production Supabase project,
> never push, never reset or reseed a local stack. Route models per my global
> CLAUDE.md routing table. Tasks 3, 4, 8, 9, and 11 are high-risk and get a
> task-level review. Stop and ask me if the audit lists a blocker that
> changes Task 11 or 12.

## State at handoff

- Spec approved 2026-11-19, including `alpha-dev`, its persistent Supabase
  branch, and the `-alpha-dev` version suffix.
- A read-only migration audit was started in the planning session. It
  writes `docs/measles-demo/alpha-migration-audit.md` on `demo/measles`.
- Nothing is pushed. Nothing in production has changed.
