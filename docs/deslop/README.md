# `docs/deslop/` — De-slopping the production branch

This directory exists because the production branch is not `main`.

`feat/ict4d-demo` is currently deployed to production. It diverged
from `develop` by ~78 non-merge commits (896 files, +128k / -28k lines)
across ~16 checkpoints of demo-driven feature work that landed
agentically (Claude, Codex, Cursor). The goal of this directory is to
get back to a clean `develop → main` flow without users losing any
feature.

The plan has three phases. Phase 1 (schema) and Phase 3 (cutover) are
operator-driven. Phase 2 — feature parity — is the multi-week effort
this directory exists to organize.

## Quick orientation

If you are an agent landing in a new session, read these files in this
order:

1. **`PLAN_OF_PLANS.md`** — the orchestration doc. Tells you exactly
   what to do next based on what's already been done. Always start
   here.
2. **`PROCESS.md`** — what the three phases are, how drift between
   branches is handled, what "migrate" means here, glossary of terms.
3. **`ALL_FEATURES.md`** — the master inventory. Every feature that
   exists on `feat/ict4d-demo` but not on `develop`, indexed and
   status-tracked.
4. **`FEATURE_TEMPLATE.md`** — the shape every per-feature migration
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
