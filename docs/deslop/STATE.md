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
  `eb86cfc9d159c0984c58198127927bd911506c54`
  (subject: _fix: use createUsePuck selector for selectedItem and
  remove nested form in ManualQueryForm (#251)_)
- **Last update run on**: `2026-06-25`
- **Active rows**: 86 (was 85; #97 `data-explorer-auto-open-ai-panel`
  added on the 2026-06-25 update run). Index numbering is
  intentionally non-dense (retired #4/#5/#6/#7 folded into #1, #14
  into #9, #084..#089 into #083).
- **Planning status**: **complete (2026-06-05; reshuffled 2026-06-10).**
  All active rows except the newly-added #097 have a matching
  `NNN-<slug>.md` plan in `docs/deslop/`. Section 0 (Infrastructure
  prerequisites) is now mostly drained: #078, #061, and #083 are all
  merged into `develop`; #077 and #094 remain pending. The operator
  can continue Phase 2 migrations with `/deslop migrate
  <feature-slug>` or `/deslop continue`. **#097 still needs a plan
  authored** (`/deslop continue` will pick it up; operator should
  confirm its scope first).

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
| _(none)_ | | | | Both prior in-flight migrations (#083 billing-ptrck-series, #061 web-offline-mode) merged into `develop` and were closed out on the 2026-06-25 update run. |

---

## Completed migrations log

Append a row when `/deslop complete <feature-slug>` succeeds. This is
the durable record once the per-feature markdown has been deleted.

| Feature index | Slug | Merge SHA on `develop` | Completed |
|---|---|---|---|
| 78 | `lingui-scaffold` | `2881b0bb` (PR #242) | 2026-06-10 |
| 83 | `billing-ptrck-series` | `a40d64a3` (PR #237) | 2026-06-25 |
| 61 | `web-offline-mode` | `50fb7884` (PR #252) | 2026-06-25 |

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
- `2026-06-10` — `/deslop migrate async-dataset-import-pipeline`
  attempted and abandoned. Worktree created off `2881b0bb`, all
  40 listed paths ported byte-clean; `pnpm tsc` surfaced ~40+
  errors from undocumented cross-feature imports. Five deps must
  land first: `#061 web-offline-mode`, `#077 analytics-client-events`,
  `#094 chat-models-catalog-regeneration`, and the `#083`-`#086`
  PTRCK billing series. DuckDbClient scope expansion (12 files,
  +1819/-322) also folded into #001's plan as in-scope. Worktree
  + branch removed; row #001 stays `[ ]`. See plan file's Notes
  section for the full sequencing implication.
- `2026-06-10` — **inventory reshuffle + PTRCK fold + in-flight registration.**
  Operator request: order /deslop continue so blockers come first.
  - **Folded #083+#084+#085+#086+#087+#088+#089 into a single
    `billing-ptrck-series` row at index #083.** All 22 PTRCK driver
    commits confirmed reachable from `origin/feature/patrick-work-vi`
    via `git merge-base --is-ancestor`. Plans `084..089` deleted; plan
    `083-billing-native-free.md` renamed to `083-billing-ptrck-series.md`
    and rewritten end-to-end. Section O of ALL_FEATURES (Billing PTRCK
    series) retired.
  - **Marked #083 `[~]` in-flight on `feature/patrick-work-vi`.**
    Non-standard refactor branch (pre-existing operator branch with an
    open PR), not a freshly-cut `refactor-NNN/<slug>`. The completion
    procedure was annotated in the plan accordingly.
  - **Promoted four rows to Section 0** (cross-cutting prerequisites
    for #001 and likely other UI rows): #083 (folded billing), #061
    `web-offline-mode`, #077 `analytics-client-events`, #094
    `chat-models-catalog-regeneration`. The new walk order under
    Section 0 is #078 (done), #083 (in flight), #061, #077, #094.
    Once those merge, /deslop continue falls through to Section A
    starting with #001.
  - **Retired Section M** (Analytics — sole row #077 relocated).
    Section O was already retired by the fold above.
  - **Active row count**: 91 → 85 (six rows folded into billing-series).
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
- `2026-06-25` — `/deslop update` run + two completions, after merging
  the latest `origin/develop` (tip PR #252) back into `feat/ict4d-demo`.
  Marker bumped `c9f909a9` → `eb86cfc9`. 42 non-merge commits scanned.
  - **2 in-flight migrations completed.** Both landed on `develop` and
    their refactor branches are gone from origin:
    - **#083 `billing-ptrck-series`** — PR #237 squash-merged at
      `a40d64a3`. Row flipped `[~]` → `[x]`; plan
      `083-billing-ptrck-series.md` deleted; removed from in-flight.
    - **#061 `web-offline-mode`** — PR #252 (`refactor 061/web offline
      mode`) squash-merged at `50fb7884`. Row flipped `[~]` → `[x]`;
      plan `061-web-offline-mode.md` deleted; removed from in-flight.
      **Drift:** a later feat/ict4d-demo-only service-worker tweak
      (`1a436512`) is not on `develop` — flagged on the row.
  - **1 new feature row added.** #097
    `data-explorer-auto-open-ai-panel` (PR #240, commit `6d3841b6`;
    new file `dataExplorerPanelPreferences.ts` + `DataExplorerApp.tsx`
    effect + `useAuth.ts` tweak). No plan authored yet — operator to
    confirm scope before `/deslop migrate`.
  - **Skipped — already on `develop`** (`git cherry` `-` lines):
    `98695647` (Model.make #244), `35ef962f`/`adb9f52a` (Polar free
    plan + proration — ride with #083, now done), `4cbd5748`/`9a930e19`
    (CI/Playwright tooling).
  - **Skipped — subsumed by existing not-yet-migrated rows** (per the
    "migrate refactored code, not legacy" rule; the current
    feat/ict4d-demo state of each row already includes these fixes, so
    they migrate when the parent row does): the 7 UI hot-fixes
    `eb86cfc9` #251 (ManualQueryForm → §F manual querying),
    `2bdedf2b` #250 / `469ac02c` #249 (chart settings/axes → #9),
    `aca06851` #248 / `75e3a7d3` #247 / `daa0f768` #246 (dashboard
    scroll/crash/filter overflow → §I/§J dashboard rows),
    `101ecbe6` #245 (pfield render-ref stability → §B/§F);
    i18n pipeline + catalogs `6d7e2b02`/`4d74cace`/`3747d15e`/`ba6b0c85`
    (→ §N i18n rows #079–#082); `3a2445fc` (cors methods → edge-fn
    rows); `d18e880b` #241 (invite-modal SegmentedControl fix — small
    fix to pre-existing develop code, no row per the PTRCK-001/002
    precedent).
  - **Skipped — noise/tooling:** `86bfdcea` (formatter), `0c559f79`
    (gitignore worktrees).
