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
  `c9f909a903fb4a436b39f475813a7ec83bcb9747`
  (subject: _docs(deslop): mark Phase 1 complete (pending comment
  sync)_)
- **Last update run on**: `2026-06-05`
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
- `2026-06-05` — `/deslop update` run. Baseline bumped from
  `31a166db` to `c9f909a9`. 21 non-merge commits scanned. Filter
  results:
  - **2 new feature rows added.** #94
    `chat-models-catalog-regeneration` (under section C);
    #95 `share-resource-modal-redesign` (under new section R
    "Permissions & sharing"). Sources: `09e1a97e` + `32ea53b6`
    (chat models catalog + ModelModule reorg), and `54d7930d`
    (share modal rewrite + flag wiring).
  - **1 extension to existing row.** Row #75
    `dashboard-pdf-export-annotate` now notes the
    `HIDE_EXPORT_AS_PDF` flag from commit `6fee1d3d`.
  - **Skipped — already on `develop` or noise.** `f35623d6`
    (DataVizPBlock NL prompt fix — empty diff vs develop;
    landed via the merge of #238 `Cleaned up chat panel
    architecture` which is `98d6535c`, develop's tip). `4fc6f42a`,
    `79fb1c5d`, `8dfa4b73`, `e3b59244`, `84235ccc`, `b8875042`
    (formatter / test-utils plumbing subsumed in the two new
    feature diffs above).
  - **Skipped — agent/IDE tooling (not avandar product).**
    `979f6e4e`, `83b678d7` (touch `.agents/`, `.claude/`,
    `.cursor/`, `.githooks/`, `.github/` and lockfiles).
  - **Skipped — deslop infrastructure (definitionally excluded).**
    `231391b7`, `4a1a4d7c`, `733c7f87`, `26391ec8`, `3240dcaa`,
    `2bdb1f8b`, `c9f909a9` (these ARE the deslop workflow).
  - **Subscription portion of `09e1a97e`/`32ea53b6` not given
    its own row.** Per operator rule (see memory file
    `feedback_migrate_refactored_not_legacy`): the
    `Subscription*` changes refactor files already covered by
    billing rows #83–89, so they ride along when those rows
    migrate rather than getting a separate row.
  - **No per-feature plans authored for #94/#95 yet.** Planning
    is paused; Session 2 owes a validation pass and Session 3+
    owes the per-feature plans.
  - **Session 2 todo added** to `ALL_FEATURES.md`: fold rows #4
    `dataset-upload-fixes`, #5 `xlsx-column-inference`, #7
    `resync-dataset-card` into #1
    `async-dataset-import-pipeline` (and consider folding #6
    `google-sheets-import-resilience` likewise). All four read as
    refactors/extensions of the pipeline feature rather than
    standalone work.
