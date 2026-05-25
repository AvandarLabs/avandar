# `docs/deslop/` — De-slopping the production branch

This directory exists because the production branch is not `main`.

`feat/ict4d-demo` is currently deployed to production. It diverged
from `develop` by ~78 non-merge commits (896 files, +128k / -28k lines)
across ~16 checkpoints of demo-driven feature work that landed
agentically (Claude, Codex, Cursor). The goal of this directory is to
get back to a clean `develop → main` flow without users losing any
feature.

The plan has three phases. Phase 1 (schema + type-check) and Phase 3
(cutover) are operator-driven one-shots. Phase 2 — feature parity —
is the multi-week effort this directory exists to organize.

Phase 1 only brings the Supabase schema across and runs
`pnpm db:gen-types`; it deliberately does **not** create any clients
or models for new tables. Those land per-feature during Phase 2 when
something actually needs them. See `PROCESS.md` for the full rules.

## Driving this with the `/deslop` skill

In an interactive Claude Code session, the workflow is driven by
short slash commands handled by the `deslop` skill at
`.claude/skills/deslop/SKILL.md`. The available commands are:

- `/deslop list` — show the command list.
- `/deslop status` — current planning + migration state.
- `/deslop continue` — pick up planning where the previous session
  stopped (reads `PLAN_OF_PLANS.md`).
- `/deslop update` — scan `feat/ict4d-demo` for commits since the
  last analyzed SHA in `STATE.md` and add any new features to
  `ALL_FEATURES.md`.
- `/deslop migrate <feature-slug>` — port one feature into
  `refactor-NNN/<feature-slug>` off `develop`.
- `/deslop complete <feature-slug>` — verify the refactor branch
  merged into `develop`, run the cleanup ritual, log completion.

The full procedure for each command lives in the skill file. The
prose below is the human-facing context that the skill points at.

## Quick orientation

If you are an agent landing in a new session, read these files in this
order:

1. **`PLAN_OF_PLANS.md`** — the orchestration doc. Tells you exactly
   what to do next based on what's already been done. Always start
   here.
2. **`STATE.md`** — meta state: last analyzed commit on
   `feat/ict4d-demo`, in-flight migrations, completed migrations,
   Phase 1 status.
3. **`PROCESS.md`** — what the three phases are, how drift between
   branches is handled, what "migrate" means here, glossary of terms.
4. **`ALL_FEATURES.md`** — the master inventory. Every feature that
   exists on `feat/ict4d-demo` but not on `develop`, indexed and
   status-tracked.
5. **`FEATURE_TEMPLATE.md`** — the shape every per-feature migration
   markdown must take. Used both when writing new ones and when
   executing them.

Then look at the numbered files (`NNN-feature-slug.md`) — those are
the individual feature migration plans, one per row in
`ALL_FEATURES.md`. Each one is self-contained: another agent should
be able to execute `migrate <feature-slug>` from a cold context just
by reading that one file.

## What lives here vs. elsewhere

This directory:

- Inventory of differences between `feat/ict4d-demo` and `develop`
- Per-feature migration plans
- The orchestration / process docs that wrap them

NOT this directory:

- Architecture specs for features themselves — those live in
  `docs/superpowers/specs/` on `feat/ict4d-demo` and stay there.
- Checkpoint history of how `feat/ict4d-demo` was built — that's
  `docs/ict4d-demo/CHECKPOINTS.md` and the granular task list in
  `docs/ict4d-demo/FEATURE_CHECKLIST.md`.
- Day-to-day operator notes — those go in the operator's own working
  notes, not here.

## When this directory disappears

When `ALL_FEATURES.md` shows every feature marked complete and every
`NNN-feature-slug.md` has been deleted, Phase 2 is done. Phase 3 will
delete this directory along with `docs/ict4d-demo/` once `develop` is
promoted back to `main`.
