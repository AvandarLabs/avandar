# `STATE.md` — live state for the de-slop workflow

This file is the single source of truth for **meta state** about the
de-slop effort. It is read and written by every `/deslop ...` command
and by every planning session.

When something changes, update this file in the same commit. Do not
let it drift.

---

## Phase 1 — schema parity

- **Status**: `complete (pending trivial comment sync)`
- **Verified on**: `2026-06-05` against `origin/develop` at
  `98d6535c`.
- **Evidence**: `git diff origin/develop..origin/feat/ict4d-demo`
  is empty for `supabase/migrations/` and for the generated DB types
  (`src/types/database*`, `shared/types/database*`,
  `src/lib/supabase/types*`, `shared/supabase/types*`). The only
  remaining diff under `supabase/schemas/` is a 3-line comment
  reflow on `plan_steps` in `20.datasets__virtual.sql` — table
  definition is unchanged.
- **In flight**: `chore/sync-datasets-virtual-comment` (branched
  off `origin/develop`, pushed 2026-06-05) carries the comment
  reflow. Operator opens the PR. When it merges, this section can
  be flipped to a flat `complete` with the merge SHA recorded
  below.
- **Notes**: Phase 1 is narrow. It (a) copies all Supabase
  migrations and the declarative schema from `feat/ict4d-demo` onto
  `develop`, (b) runs `pnpm db:gen-types`, and (c) patches any
  resulting TypeScript errors with the smallest edits possible. It
  does NOT create new `*Client` or model files for the new tables —
  those land per feature during Phase 2. As of the 2026-06-05
  verification, (a) is already on `develop` (likely via prior
  cherry-picks rather than a single closing PR), (b) and (c) are
  implicit in the matching generated types.

---

## ALL_FEATURES inventory

- **Header status**: `DRAFT — Session 1 (2026-05-21)`
- **Last analyzed commit on `feat/ict4d-demo`**:
  `31a166db17e4c7b537d6016ddf94aa897d53f819`
  (subject: _Apply pre-PR formatter to i18n catalogs_)
- **Last update run on**: `2026-05-25`
- **Next planning session**: Session 2 — validate the draft inventory
  against the codebase per `PLAN_OF_PLANS.md`.

`/deslop update` compares the analyzed-commit SHA above against
`origin/feat/ict4d-demo` and walks any new commits. Bump the SHA
when a run is complete.

---

## In-flight migrations

Refactor branches currently open (pushed to origin, not yet merged
into `develop`). Each row is added by `/deslop migrate` and removed
by `/deslop complete`.

| Feature index | Slug | Refactor branch | Started | Notes |
|---|---|---|---|---|
| _(none yet)_ | | | | |

---

## Completed migrations log

Append a row when `/deslop complete <feature-slug>` succeeds. This is
the durable record once the per-feature markdown has been deleted.

| Feature index | Slug | Merge SHA on `develop` | Completed |
|---|---|---|---|
| _(none yet)_ | | | |

---

## Update log

Append-only log of `/deslop update` runs.

- `2026-05-25` — initial state file authored. No inventory update
  yet; baseline marker set to
  `31a166db17e4c7b537d6016ddf94aa897d53f819`.
- `2026-06-05` — Phase 1 verified complete via diff (`develop` at
  `98d6535c`): `supabase/migrations/` identical, generated DB types
  identical, only a 3-line comment reflow remained in
  `supabase/schemas/20.datasets__virtual.sql`. That reflow was
  branched off `develop` as
  `chore/sync-datasets-virtual-comment` (commit `6001a778`). PR
  pending operator. No inventory update run yet; ~20 unanalyzed
  non-merge commits exist on `feat/ict4d-demo` past the baseline
  marker (`/deslop update` still owes a sweep).
