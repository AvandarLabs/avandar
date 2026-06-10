# `STATE.md` — live state for the de-slop workflow

This file is the single source of truth for **meta state** about the
de-slop effort. It is read and written by every `/deslop ...` command
and by every planning session.

When something changes, update this file in the same commit. Do not
let it drift.

---

## Phase 1 — schema parity

- **Status**: `complete`
- **Verified on**: `2026-06-05` against `origin/develop` at
  `98d6535c`; closed out on `2026-06-06` when the comment-sync PR
  merged.
- **Closing merge**: PR #239 (`chore/sync-datasets-virtual-comment`)
  squash-merged into `develop` at `39d86322` on 2026-06-06.
- **Evidence**: `git diff origin/develop..origin/feat/ict4d-demo`
  is empty for `supabase/migrations/`, for `supabase/schemas/`, and
  for the generated DB types (`src/types/database*`,
  `shared/types/database*`, `src/lib/supabase/types*`,
  `shared/supabase/types*`).
- **Notes**: Phase 1 is narrow. It (a) copies all Supabase
  migrations and the declarative schema from `feat/ict4d-demo` onto
  `develop`, (b) runs `pnpm db:gen-types`, and (c) patches any
  resulting TypeScript errors with the smallest edits possible. It
  does NOT create new `*Client` or model files for the new tables —
  those land per feature during Phase 2.

---

## ALL_FEATURES inventory

- **Header status**: `Ready for Phase 2 — Session 3 (2026-06-05)`
- **Last analyzed commit on `feat/ict4d-demo`**:
  `c9f909a903fb4a436b39f475813a7ec83bcb9747`
  (subject: _docs(deslop): mark Phase 1 complete (pending comment
  sync)_)
- **Last update run on**: `2026-06-05`
- **Active rows**: 91 (95 global indices minus retired #4/#5/#6/#7
  folded into #1 and #14 folded into #9, plus #96 added). Index
  numbering is intentionally non-dense.
- **Planning status**: **complete (2026-06-05).** All 91 active
  rows have a matching `NNN-<slug>.md` plan in `docs/deslop/`. The
  operator can begin Phase 2 migrations with `/deslop migrate
  <feature-slug>` or `/deslop continue`.

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
| _(none)_ | | | | |

---

## Completed migrations log

Append a row when `/deslop complete <feature-slug>` succeeds. This is
the durable record once the per-feature markdown has been deleted.

| Feature index | Slug | Merge SHA on `develop` | Completed |
|---|---|---|---|
| 78 | `lingui-scaffold` | `2881b0bb` (PR #242) | 2026-06-10 |

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
- `2026-06-06` — PR #239 (`chore/sync-datasets-virtual-comment`)
  squash-merged into `develop` at `39d86322`. Phase 1 flipped to
  flat `complete`. Closes the last remaining diff under
  `supabase/schemas/` between `develop` and `feat/ict4d-demo`.
- `2026-06-10` — `/deslop complete lingui-scaffold`. PR #242
  squash-merged into `develop` at `2881b0bb`. First Phase 2
  feature on the board. Refactor branch + worktree deleted; plan
  file `078-lingui-scaffold.md` removed.
- `2026-06-05` — Session 2 validation completed.
  - Spawned an Explore agent to read all 22 spec/plan/demo-feature
    docs end-to-end. Agent confirmed all 95 inventory rows are
    doc-backed.
  - Verified PTRCK uniqueness via `git cherry origin/develop
    origin/feat/ict4d-demo` — zero `-` lines; all PTRCK commits
    unique to `feat/ict4d-demo`.
  - Verified profile-page row #90 — real net diff +257/-79.
  - **1 new row added.** #96 `data-explorer-url-session-sync`
    (PTRCK-009 + PTRCK-010, +838 LoC across 4 new files).
  - **4 rows folded into row #1.** Per the operator rule "migrate
    refactored code, not legacy" (see memory file
    `feedback_migrate_refactored_not_legacy`): #4
    `dataset-upload-fixes`, #5 `xlsx-column-inference`, #6
    `google-sheets-import-resilience`, #7 `resync-dataset-card`
    absorbed into #1 `async-dataset-import-pipeline`. Row #1's
    description was expanded to cover them; the deleted row
    numbers are NOT reused (the header note allows non-dense
    indices).
  - **Row #9 expanded.** Now `viz-multi-series-and-chart-types`
    (was `viz-multi-series`). Description covers pie/funnel/radar
    chart types, area + bubble extensions, `CurveType`,
    `withLegend`, auto-hydration, `hydratePieFromQuery` — all the
    PTRCK-005/006/007/008 expansion (commits `517daefc` and
    `7b738f13`). Per the operator rule, this is migrated as the
    up-to-date chart suite rather than legacy + later expansion.
  - **Header flipped** from `DRAFT — Session 1` to
    `validated — Session 2 (2026-06-05)`.
  - **Active row count**: 92 (95 global indices minus retired
    #4/#5/#6/#7 plus added #96).
  - **PTRCK-001/002 skipped.** Sign-in tweaks and navbar workspace
    pill polish are small refactors of pre-existing develop code;
    no new row warranted per operator rule.
  - **Phase 1 PR status**: `chore/sync-datasets-virtual-comment`
    (the 3-line schema comment sync from earlier today) still
    pending operator review and merge.
