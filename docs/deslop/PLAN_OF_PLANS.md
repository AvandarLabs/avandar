# Plan of plans — the orchestration doc

**If you're an agent landing in a fresh session, read this file
first.** This document tells you exactly what to do next based on
what's already been done.

When the operator runs `/deslop continue`, the `deslop` skill points
the agent at this file. Read `STATE.md` alongside it for the live
state of the inventory.

## What we're trying to produce

By the time this plan is finished, the operator should be able to
start "Phase 2 — feature migrations" without any more planning.
Concretely, that means:

1. `docs/deslop/README.md` — exists ✅
2. `docs/deslop/PROCESS.md` — exists ✅
3. `docs/deslop/FEATURE_TEMPLATE.md` — exists ✅
4. `docs/deslop/PLAN_OF_PLANS.md` — this file ✅
5. `docs/deslop/ALL_FEATURES.md` — populated with every distinct
   feature that exists on `feat/ict4d-demo` but not on `develop`.
   Status: **drafted in Session 1, awaiting validation pass.**
6. `docs/deslop/NNN-feature-slug.md` for every row in
   `ALL_FEATURES.md`. Status: **NOT STARTED.**

When (5) is validated and (6) is fully written, this file should end
with an explicit "all planning is done, Phase 2 can begin" line, and
the agent that writes that line should ping the operator that
planning is complete.

## Current state (update this section at the end of every session)

- **Session 1 (2026-05-21)**: created the directory, wrote
  `README.md`, `PROCESS.md`, `FEATURE_TEMPLATE.md`, this
  `PLAN_OF_PLANS.md`, and an initial draft of `ALL_FEATURES.md`
  based on:
  - `docs/ict4d-demo/CHECKPOINTS.md` (Checkpoints 1–16, including
    the partial-status notes in each)
  - `docs/ict4d-demo/FEATURE_CHECKLIST.md` (29-item user-facing
    checklist)
  - `docs/ict4d-demo/random-thoughts.md` (skim only — these are
    future ideas, not built features)
  - `docs/superpowers/specs/` and `docs/superpowers/plans/` (titles
    only; full reads done in Session 2)
  - `git log --no-merges origin/develop..feat/ict4d-demo` (78
    commits) and `git diff --stat origin/develop..feat/ict4d-demo`
    (896 files, +128k / −28k)
  - `git diff --name-only` on `supabase/migrations/` and
    `supabase/schemas/` (the schema delta Phase 1 covers)
- **Session 2 (2026-06-05)**: validated the inventory.
  - Spawned an Explore agent to read all 22
    `docs/superpowers/{specs,plans}/*` + `docs/demo-features/*` +
    `docs/permissions-architecture.md` + supporting docs end-to-end
    and map every doc-described feature to an inventory row. Agent
    confirmed all 95 rows are doc-backed and no missing rows from
    the spec corpus.
  - Independently verified PTRCK uniqueness (`git cherry` —
    zero `-` lines; all PTRCK commits unique to `feat/ict4d-demo`).
    PTRCK series spans broader than billing: PTRCK-001/002 are
    auth/navbar polish (skipped as develop-refactors);
    PTRCK-009/010 was a missing feature → added row #96
    `data-explorer-url-session-sync` (+838 LoC, 4 new files).
  - Independently verified profile-page row #90 — real net diff
    (+257/-79) in `src/routes/_auth/$workspaceSlug/profile.tsx`.
  - Applied operator rule "migrate refactored code, not legacy":
    folded rows #4 `dataset-upload-fixes`, #5
    `xlsx-column-inference`, #6 `google-sheets-import-resilience`,
    #7 `resync-dataset-card` into row #1
    `async-dataset-import-pipeline`. Folded PTRCK-005/006/007/008
    chart-suite expansion (pie/funnel/radar/area/bubble/curveType/
    withLegend/auto-hydration) into row #9, renamed to
    `viz-multi-series-and-chart-types`.
  - Flipped header from `DRAFT — Session 1` to
    `validated — Session 2 (2026-06-05)`.
- **`ALL_FEATURES.md` status**: **validated.** 92 active rows (95
  global indices minus the 4 retired #4/#5/#6/#7 plus the 1 added
  #96). Index numbering is intentionally non-dense — folded-in row
  numbers are not reused; rows have global IDs.
- **Session 3a (2026-06-05)**: authored the first batch of five
  per-feature migration plans by dispatching parallel Explore
  agents to gather canonical paths, file lists, dependency wiring,
  and risks for each row. Plans written for #1
  `async-dataset-import-pipeline` (the foundational pipeline; rows
  #2 and #3 depend on it), #2 `app-wide-dropzone`, #3
  `dataset-drawer`, #8 `floating-query-windows`, and #9
  `viz-multi-series-and-chart-types` (the largest single migration
  in the queue, ~7.2k LoC added across ~80 files; ships
  `AvaPageDataMigrationV3`). Notable finding folded into the #3
  plan: the feature row in `ALL_FEATURES.md` claims a Drawer with
  slide-from-bottom transitions, but the current `feat/ict4d-demo`
  state has been refactored back to a centered Modal — the plan
  flags this discrepancy in "Notes for future you" rather than
  silently "fixing" the row.

## Next: Session 3b+ — continue per-feature migration plans

Outstanding: 87 plans (92 active rows − 5 authored). Recommended
batching: ~5-10 plans per session. Next likely batch: #10
`viz-settings-fieldsets`, #11 `codemirror-sql-editor`, #12
`sql-pill-rendering`, #13 `chart-number-formatting`, #14
`chart-color-picker-fix`, #96 `data-explorer-url-session-sync` —
contiguous through the Data Explorer surface, with row #96 folded
in because it shares the surface.

Per the "Session 3+ — Write per-feature migration plans" section
below. Per the operator rule, write each plan against the **current
state** of `feat/ict4d-demo`, not the introduction-commit snapshot.

## How to know which session number you are

If `ALL_FEATURES.md` does not yet carry a `validated` marker in its
header, you are Session 2.

If `ALL_FEATURES.md` is validated but `NNN-feature-slug.md` files
don't exist yet for every row, you are Session 3+.

If every row in `ALL_FEATURES.md` has a corresponding
`NNN-feature-slug.md` file and the last line of this plan-of-plans
says "Phase 2 ready" — planning is done; ping the operator.

---

## Session 2 — Validate `ALL_FEATURES.md`

### Goal

Confirm that `ALL_FEATURES.md` is **exhaustive and accurate**.
Session 1's draft was built from the markdown docs + commit
subject lines. It is likely:

- Missing features that landed but were never documented
  (commits with subjects like `more fixes`, `changes`).
- Containing items that look like features but are really just
  refactors of pre-existing code.
- Splitting one logical feature into multiple rows or vice versa.

### How to do it

1. Read `ALL_FEATURES.md` end-to-end so you know what's already
   captured.
2. Walk the spec/plan files in full:
   - `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`
   - `docs/superpowers/specs/2026-05-14-testing-strategy.md`
   - `docs/superpowers/specs/2026-05-17-share-resource-modal-redesign-design.md`
   - `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`
   - `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md`
   - `docs/superpowers/plans/2026-05-13-electrobun-desktop-phase-2-native-layer.md`
   - `docs/superpowers/plans/2026-05-13-electrobun-desktop-phase-3-sync-engine.md`
   - `docs/superpowers/plans/2026-05-13-electrobun-desktop-phase-4-hardening-macos-launch.md`
   - `docs/superpowers/plans/2026-05-13-electrobun-desktop-phase-5-windows-port.md`
   - `docs/superpowers/plans/2026-05-17-share-resource-modal-redesign.md`
   - `docs/superpowers/plans/2026-05-19-async-dataset-import.md`
   - `docs/superpowers/plans/2026-05-19-electrobun-desktop-phase-2.5-consumer-migration.md`
   - `docs/superpowers/plans/2026-05-20-offline-webllm-chat.md`
   - `docs/superpowers/plans/2026-05-20-web-read-only-offline-mode-demo.md`
   - `docs/demo-features/desktop-offline-session.md`
   - `docs/demo-features/sql-parser-filter-ui.md`
   - `docs/demo-features/web-offline-mode.md`
   - `docs/offline-chat-sql-hardening.md`
   - `docs/permissions-architecture.md`
   - `docs/adding-new-data-source-types.md`
   - `docs/avandar-packages.md`
3. Diff each spec/plan against `ALL_FEATURES.md`. If a spec
   describes a feature that exists in the codebase on
   `feat/ict4d-demo` but isn't in `ALL_FEATURES.md`, add it. If a
   row in `ALL_FEATURES.md` doesn't match any actual code, remove
   it.
4. Spot-check with the codebase. For each questionable row, use:
   ```sh
   git log --oneline origin/develop..feat/ict4d-demo -- <path>
   ```
   and:
   ```sh
   git diff --stat origin/develop..feat/ict4d-demo -- <path>
   ```
   to confirm the work actually happened on this delta. If
   `--stat` shows zero changes for the paths the feature claims to
   touch, the feature already exists identically on `develop` (or
   never existed) — **remove the row**. A feature only belongs in
   `ALL_FEATURES.md` if there is a real, non-empty diff between
   `develop` and `feat/ict4d-demo` for its paths. Features that
   were built on `develop` and later forward-ported into
   `feat/ict4d-demo` produce zero diff and must NOT be listed.
5. For each commit that looks substantial but isn't represented in
   any row, investigate it (`git show <sha> --stat`). Before adding
   a row, confirm the work is genuinely unique to
   `feat/ict4d-demo`: run
   `git diff origin/develop..feat/ict4d-demo -- <paths>` and only
   add the row if the diff is non-empty. Use
   `git cherry origin/develop feat/ict4d-demo` to spot
   forward-ported commits (lines prefixed `-` are already on
   `develop`). Otherwise attach the commit to an existing row.
6. When done:
   - Re-number indices so they are dense (1..N).
   - Replace the `DRAFT — Session 1` marker in the
     `ALL_FEATURES.md` header with `validated — Session N (YYYY-MM-DD)`.
   - Update the "Current state" section above.
   - Commit + push:
     `docs(deslop): validate ALL_FEATURES inventory`.

### Stop conditions for Session 2

- If the inventory grows past ~80 rows, pause and surface this to
  the operator — that's a sign granularity is too fine and rows
  need to be merged.
- If you discover Phase 1 hasn't been completed yet, stop and
  flag it. Validation can still proceed, but every reference to
  "Phase 1 done" in the per-feature docs needs to be a flagged
  assumption. Phase 1 is defined narrowly: Supabase migrations +
  declarative schema copied to `develop`, `pnpm db:gen-types`
  run, type errors patched minimally. No new clients/models
  yet — those are per-feature work in Phase 2.

---

## Session 3+ — Write per-feature migration plans

### Goal

Produce one `NNN-feature-slug.md` per row in `ALL_FEATURES.md`,
each following `FEATURE_TEMPLATE.md` exactly.

### How to do it

Recommended batching: ~5-10 feature docs per session, depending on
complexity. Some features are tiny (one component, ~20 LoC); some
are spec-sized (Phase 3 plan canvas). Order doesn't matter — pick
a contiguous range of indices and walk them.

For each feature:

1. Open the relevant section of `ALL_FEATURES.md` to get the
   description and sources.
2. Read the relevant checkpoint section in CHECKPOINTS.md and the
   spec/plan it references (if any).
3. Get the file list:
   ```sh
   git log --name-only --pretty=format:'%H %s' \
     origin/develop..feat/ict4d-demo -- <feature-paths>
   ```
   Then narrow to the canonical paths that should be brought over
   (not every transient file touched by intermediate "fix" commits).
4. Compute a stat:
   ```sh
   git diff --stat origin/develop..feat/ict4d-demo -- <paths> | tail -1
   ```
5. Identify dependencies. If the feature relies on something else
   in `ALL_FEATURES.md`, note it under `Depends on`. Common
   deps to look for:
   - Chat workflows phases depend on the previous phase.
   - Voice desktop depends on Desktop platform foundation.
   - Anything touching dashboards likely depends on
     `AvaPageDataMigrationV4` if it adds new block fields.
6. Author the migration doc using `FEATURE_TEMPLATE.md`. Replace
   every placeholder. Delete sections that don't apply.
7. **Sanity-check the doc**: imagine you're a cold-context agent
   and read your own doc. Could you migrate this feature without
   asking anything? If no, fix the gaps before moving on.
8. Commit in batches:
   `docs(deslop): write migration plans for features NN–MM`.

### Stop conditions for Session 3+

- Hit the per-session context budget (e.g. >100k tokens consumed
  on file reads). Stop, commit what you have, update the "Current
  state" section, push, end the session.
- Discover a feature that doesn't decompose cleanly into a single
  PR-sized migration. Don't force it; instead, split the row in
  `ALL_FEATURES.md` into multiple rows, write a quick justification
  in the "Notes for future you" section of each, and continue.

---

## When planning is complete

When every row in `ALL_FEATURES.md` has a matching `NNN-feature-slug.md`:

1. Add the line `## Phase 2 ready` to the bottom of this file.
2. Update `ALL_FEATURES.md` header to say `Ready for Phase 2`.
3. Update `STATE.md` to reflect the new planning status.
4. Commit + push.
5. **Tell the operator**: "Planning is done. Every feature in
   `ALL_FEATURES.md` has a migration doc. You can start Phase 2 by
   running `/deslop migrate <feature-slug>`."

The operator will then start running Phase 2 from
`PROCESS.md`'s "Phase 2 — Feature parity" workflow, one
`/deslop migrate` invocation per feature.

---

## Working notes / decisions

This section is a scratch space for cross-session decisions that
might otherwise get lost. Append; don't overwrite.

- **2026-05-21 (Session 1)**: Decided to keep `ALL_FEATURES.md`
  organized by category (Schema, Data Explorer, Chat, Voice,
  Dashboards, ...) rather than chronologically. Indices are global
  so the order can be reshuffled without renumbering.
- **2026-05-21 (Session 1)**: The 78-commit delta includes a
  significant `PTRCK-NN` series about Polar billing. These look
  like they're already on `develop` upstream (they predate the
  ICT4D demo focus) — Session 2 must verify before listing them as
  to-migrate.
- **2026-05-21 (Session 1)**: Treating "fix X" / "more fixes"
  commits as part of whichever feature they touched, not as
  separate rows. Session 2 should preserve this discipline.
