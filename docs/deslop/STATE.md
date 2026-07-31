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
  `6a1366e26660753f17b90bd36f6e17e3a10bdafd`
  (subject: _refactor(chat): remove planning feature_)
- **Last update run on**: `2026-07-27`
- **Active rows**: 30 remaining. On 2026-07-24 the 5
  GROUP-1 rows (#077, #094, #001, #002, #003) merged into `develop`
  (`914bcbba`); on 2026-07-26 the 13 GROUP-2 rows (#008–#013, #044–#047,
  #049, #096, #097) merged (`59cdb59c`); on 2026-07-31 the 18 GROUP-3 rows
  (#015–#032) merged (`c703e5c2`). All flipped to `[x]`; their
  `[x]` rows are kept in `ALL_FEATURES.md` (with merge SHA) and the group
  - per-feature plan files were deleted. On 2026-06-26 the 3 earlier completed rows
    (#061, #078, #083) were removed from `ALL_FEATURES.md` — their
    `[x]` checkoff rows are gone; completion is recorded only in the
    Completed migrations log below. Also on 2026-06-26 the 6
    voice/speech-to-text rows (#050–#055, section "G. Multilingual
    voice dictation") were removed entirely — PR #254 deleted all voice
    features from `feat/ict4d-demo`, so there is nothing to migrate.
    On 2026-07-27 rows #033–#043 were retired when the chat workflow
    capability was removed from the source branch; their feature files
    and dedicated migration plans were deleted.
    Index numbering is intentionally non-dense (retired #4/#5/#6/#7
    folded into #1, #14 into #9, #084..#089 into #083; #050..#055
    retired as voice-removed; #097 added 2026-06-25).
- **Planning status**: **complete — Phase 2 batched into 5 group
  PRs (2026-06-26).** GROUP-1 (2026-07-24), GROUP-2 (2026-07-26), and
  GROUP-3 (2026-07-31) are now merged and merged back into
  `feat/ict4d-demo`; GROUP-4 and GROUP-5 remain. The consolidated group
  plans at `docs/deslop/GROUP-4..5-*.md` are the source of truth for the
  rest and supersede the per-feature `NNN-<slug>.md` plans where they
  disagree. Next step: cut GROUP-4 (dashboards) off the current
  `develop` tip.

`/deslop update` compares the analyzed-commit SHA above against
`origin/feat/ict4d-demo` and walks any new commits. Bump the SHA
when a run is complete.

---

## In-flight migrations

Refactor branches currently open (pushed to origin, not yet merged
into `develop`). Each row is added by `/deslop migrate` and removed
by `/deslop complete`.

| Feature index | Slug | Refactor branch | Started | Notes |
| ------------- | ---- | --------------- | ------- | ----- |
| _(none)_      |      |                 |         | GROUP-3 merged 2026-07-31; see Completed migrations log. |

GROUP-1 (`914bcbba`, 2026-07-24), GROUP-2 (`59cdb59c`, 2026-07-26), and
GROUP-3 (`c703e5c2`, 2026-07-31) are merged into `develop` and merged back
into `feat/ict4d-demo`.

**GROUP-4 branch prepared (not yet in flight).** On 2026-07-31 the
`refactor-g4/dashboards` branch + worktree were cut off `origin/develop`
@ `c703e5c2` (worktree `~/src/worktrees/avandar/refactor-g4/dashboards`).
Nothing is ported or pushed yet, so it is **not** an in-flight row above and
the GROUP-4 `ALL_FEATURES.md` rows remain `[ ]`. When the port lands and the
branch is pushed, flip rows `#064`–`#076` + `#048` to `[~]` and add the
in-flight row per `/deslop migrate` steps 7–8. The refreshed plan is
`docs/deslop/GROUP-4-dashboards.md` (re-verified against `c703e5c2`).

---

## Completed migrations log

Append a row when `/deslop complete <feature-slug>` succeeds. This is
the durable record once the per-feature markdown has been deleted.

| Feature index | Slug                                         | Merge SHA on `develop` | Completed  |
| ------------- | -------------------------------------------- | ---------------------- | ---------- |
| 78            | `lingui-scaffold`                            | `2881b0bb` (PR #242)   | 2026-06-10 |
| 83            | `billing-ptrck-series`                       | `a40d64a3` (PR #237)   | 2026-06-25 |
| 61            | `web-offline-mode`                           | `50fb7884` (PR #252)   | 2026-06-25 |
| 77            | `analytics-client-events` (GROUP-1)          | `914bcbba`             | 2026-07-24 |
| 94            | `chat-models-catalog-regeneration` (GROUP-1) | `914bcbba`             | 2026-07-24 |
| 1             | `async-dataset-import-pipeline` (GROUP-1)    | `914bcbba`             | 2026-07-24 |
| 2             | `app-wide-dropzone` (GROUP-1)                | `914bcbba`             | 2026-07-24 |
| 3             | `dataset-drawer` (GROUP-1)                   | `914bcbba`             | 2026-07-24 |
| 8             | `floating-query-windows` (GROUP-2)           | `59cdb59c`             | 2026-07-26 |
| 9             | `viz-multi-series-and-chart-types` (GROUP-2) | `59cdb59c`             | 2026-07-26 |
| 10            | `viz-settings-fieldsets` (GROUP-2)           | `59cdb59c`             | 2026-07-26 |
| 11            | `codemirror-sql-editor` (GROUP-2)            | `59cdb59c`             | 2026-07-26 |
| 12            | `sql-pill-rendering` (GROUP-2)               | `59cdb59c`             | 2026-07-26 |
| 13            | `chart-number-formatting` (GROUP-2)          | `59cdb59c`             | 2026-07-26 |
| 44            | `sql-to-structured-query` (GROUP-2)          | `59cdb59c`             | 2026-07-26 |
| 45            | `structured-query-to-sql` (GROUP-2)          | `59cdb59c`             | 2026-07-26 |
| 46            | `recursive-filter-ui` (GROUP-2)              | `59cdb59c`             | 2026-07-26 |
| 47            | `sql-form-sync-data-explorer` (GROUP-2)      | `59cdb59c`             | 2026-07-26 |
| 49            | `duckdb-sql-parser-updates` (GROUP-2)        | `59cdb59c`             | 2026-07-26 |
| 96            | `data-explorer-url-session-sync` (GROUP-2)   | `59cdb59c`             | 2026-07-26 |
| 97            | `data-explorer-auto-open-ai-panel` (GROUP-2) | `59cdb59c`             | 2026-07-26 |
| 15           | `chat-disabled-visual-feedback` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 16           | `chat-context-memo-fix` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 17           | `chat-empty-state-improvements` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 18           | `chat-try-again-and-retry-on-empty` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 19           | `chat-recover-sql-without-tool-call` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 20           | `chat-multi-dataset-clarification` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 21           | `chat-better-pblock-generation` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 22           | `privacy-pii-detector` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 23           | `privacy-bias-detector` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 24           | `privacy-consent-modal` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 25           | `privacy-crossboundary-hmac` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 26           | `privacy-audit-log-page` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 27           | `privacy-discovery-spanish-french-stubs` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 28           | `privacy-isrowdatamessage-helper` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 29           | `chat-clarify-tool` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 30           | `chat-clarification-card-and-bias-check` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 31           | `chat-clarification-telemetry` (GROUP-3) | `c703e5c2`             | 2026-07-31 |
| 32           | `chat-discovery-clarifications` (GROUP-3) | `c703e5c2`             | 2026-07-31 |

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
  - branch removed; row #001 stays `[ ]`. See plan file's Notes
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
- `2026-06-26` — **Phase 2 batched into 5 group PRs.** Operator
  decided to finish deslop in 5 large PRs (one per group) instead of
  ~80 per-feature PRs. All remaining rows grouped + consolidated
  migration plans authored at `docs/deslop/GROUP-1..5-*.md` (base
  `origin/develop` @ `6ec98d45`; PR #253 test-utils render fix is the
  newest develop commit). Five parallel agents wrote the plans against
  git-verified real paths — the group docs **supersede** the
  per-feature `NNN-*.md` plans where they disagree (those had many
  stale/aspirational paths). Group order + contents are indexed at the
  top of `ALL_FEATURES.md`. Notable drift the plans capture: the
  #061-merge relocated the offline hooks (`useIsOnline`/`useOfflineGate`/
  `useLocalDatasetIds`) so G1 re-introduces the flat paths #001 needs;
  G2 #096 must DELETE develop's predecessor URL-sync (from PR #238);
  the AvaPage schema chain is V2 (develop) → V3 (G2 #009) → V4 (G4
  #069). Next step: migrate group by group starting with G1.
- `2026-06-26` — **Voice / speech-to-text features removed (PR #254).**
  The operator deleted all voice and speech-to-text code from
  `feat/ict4d-demo` (`358cfbdd`): the entire `src/lib/voice/`,
  `src/lib/voiceWhisperCpp/`, desktop `registerVoiceHandlers` +
  `createWhisperService`, `VoiceContracts`, `VoiceInputButton`,
  `VoiceModelDownloadIndicator`/`VoiceModelLoadingNotification`, the
  whisper.wasm dependency, voice IPC, and the voice strings from all
  locale catalogs (~9.1k LoC deleted across 99 files). Deslop docs
  updated to drop voice from the migration scope:
  - **Removed section "G. Multilingual voice dictation" (rows
    #050–#055)** from `ALL_FEATURES.md`. Active rows 83 → 77. These
    indices are retired, not reused.
  - **Deleted plan files** `050-voice-web-whisper.md` …
    `055-voice-ui-polish.md`.
  - **GROUP-5 index updated** `#050–063` → `#056–063`;
    `GROUP-5-platform-i18n-standalone.md` no longer lists any voice
    rows (~16 constituent rows, all non-voice).
  - **PLAN_OF_PLANS.md** dropped the `3g (Voice)` sub-phase, the
    "Voice desktop depends on Desktop platform foundation" dep note,
    and the "Voice" category mention.
  - **Cross-references scrubbed:** `018-chat-try-again-and-retry-on-empty.md`
    (Swahili-hint note tied to retired #055), `056-desktop-platform-registry.md`
    (voice removed from its dependents list), `062-web-offline-webllm-chat.md`
    (E2E fixtures no longer mention the transcribe flow).
  - No code migration was ever started for any voice row, so nothing
    was un-done — this is purely scope removal.
- `2026-07-24` — **GROUP-1 completed + mergeback closed out.**
  `refactor-g1/data-foundation-ingestion` (rows #077, #094, #001,
  #002, #003) merged into `develop`; its commits land directly in
  develop's history at `914bcbba` (develop tip after follow-up lint
  fixes: `3bb77f4f`). The 3-way mergeback of the cleanup back into
  `feat/ict4d-demo` is committed (`3068320c` "completed mergeback of
  refactor-g1 branch").
  - **Bookkeeping done:** flipped rows #077/#094/#001/#002/#003 to
    `[x] (914bcbba)`; logged all five in the Completed migrations
    log; deleted the five per-feature plans (`077-*`, `094-*`,
    `001-*`, `002-*`, `003-*`) and `GROUP-1-data-foundation-ingestion.md`;
    deleted the `refactor-g1/...` local branch + worktree (remote
    branch already gone).
  - **Residual drift after mergeback (for operator eyeball; not a
    completion blocker).** `git diff origin/develop..feat/ict4d-demo`
    over the G1 path set is down to ~12 files / +132 −144, made up of:
    (a) **analytics case rename not collapsed** — develop renamed the
    client to PascalCase `src/lib/analytics/AnalyticsClient.ts` (81
    lines) but feat still carries the old lowercase
    `analyticsClient.ts` (46 lines); the mergeback did not adopt
    develop's PascalCase file on feat. (b) Two G1-plan files that
    never landed on develop: `useCanAddDataset.ts` (+51) and
    `OpenDatasetDrawer/datasetPreviewSQL.ts` (+16) exist only on feat
    — the real PR diverged from the aspirational group plan. (c)
    Minor test/import residue (`Model.test.ts` −51,
    `openFileImportFlow.test.tsx`, `useSaveDataset.ts`, five
    `source-datasets/*Client.ts` import repoints). None of this blocks
    G1; it is the kind of small drift a later `/deslop update` or a
    follow-up mergeback pass can absorb before G2's base matters.
  - **Analyzed-commit marker left at `eb86cfc9`.** The feat tip is now
    `3068320c`; the intervening commits are the G1 mergeback + lint/
    skills cleanup (`748fdc2e`, `b80b0418`, `3068320c`) and are all
    accounted for here, so a future `/deslop update` can bump the
    marker straight to `3068320c` and treat them as noise.
- `2026-07-26` — **GROUP-2 completed + mergeback + G3 plan refresh.**
  `refactor-g2/data-explorer-querying` (rows #008–#013, #044–#047, #049,
  #096, #097) merged into `develop`; its commits sit in develop's history
  at `59cdb59c` (base `3bb77f4f`). The 3-way mergeback of the cleanup into
  `feat/ict4d-demo` is committed (source + docs, not pushed).
  - **Bookkeeping done:** flipped all 13 rows to `[x] (59cdb59c)`; logged
    them in the Completed migrations log; deleted the 12 per-feature plans
    (#008–#013, #044–#047, #049, #096) and `GROUP-2-data-explorer-querying.md`
    (#097 never had a plan file); deleted the `refactor-g2/...` local branch
    - worktree (remote already gone).
  - **Mergeback outcome:** drift on the G2 path set fell from 210 files /
    +3023 −11701 to 19 files / +1713 −1180 (all legit feat-ahead: the G4/G5
    dashboard surface — V4 schema, Filter PBlocks, DataVizPBlock/pfields,
    getDashboardPuckConfig — plus feat-only Data Explorer integration
    wiring, offline `useLocalDatasetIds`, i18n
    RegenerateErrorBanner, `registerSessionExpiredHandler`). Adopted develop's
    `rawSQL`→`rawSql` and `URL`→`Url` renames codebase-wide, the
    `src/components/sql/` relocation of SqlEditor/AvaSqlBlock, and collapsed
    ~27 pre-existing feat flat/dir duplicate modules to develop's dir form.
    Left the 2 `src/components/offline/{OfflineGated,OfflineIndicator}` flat
    dups for the offline group. type-check + eslint + vitest green.
  - **GROUP-3 guide refreshed** against the post-G2 develop: new
    `src/components/sql/` import paths, `rawSql`/`Url` naming, and
    `node-sql-parser` already present.
  - **Analyzed-commit marker still `eb86cfc9`;** feat tip advanced through the
    G1 + G2 mergeback commits, all accounted for in this log.
- `2026-07-26` — **GROUP-3 cut + migrated (in flight).** Cut
  `refactor-g3/ai-chat-panel` off `develop @ f37ba802` in a worktree and ported
  GROUP-3 (rows #015–#032). type-check, eslint (G3 source),
  and vitest (14 files/110 tests + 9 ChatPanel/58) all green. Committed
  (`401419f2`), not pushed. Rows flipped `[ ]` → `[~]`.
  - **Deferred (flagged on the in-flight row):** `useAvandarChatRuntime.ts` kept
    at develop's slim version because the source runtime interweaves G3's privacy
    and clarification turn wiring with G4 dashboard-block generation and G5
    offline WebLLM chat that landed on the same turn path after G3, so it cannot
    be cleanly extracted to G3-only. The privacy detectors, crossBoundary,
    consent modal, clarification UI, and audit logs are ported + unit-tested but
    not yet threaded into the live turn lifecycle. Also
    stripped G5 offline (`OfflineChatDownloadControl`, Composer offline branch)
    and G4 dashboard branch (useChatPageContext). Complete the runtime wiring in
    coordination with G4/G5.
- `2026-07-27` — **Retired chat workflow rows removed from the source.**
  Deleted inventory rows and feature files #033–#043, narrowed GROUP-3 to
  rows #015–#032, and removed the related UI, tools, persistence, sandbox,
  dependencies, and tests from `feat/ict4d-demo` in `6a1366e2`. The
  in-flight `refactor-g3/ai-chat-panel` branch now needs the same removal
  applied surgically on top of its reviewed architecture.
- `2026-07-31` — **GROUP-3 merged + mergeback.** GROUP-3 (`ai-chat-panel`,
  rows #015–#032) landed on `develop`; its commits sit in develop's linear
  history from base `f37ba802` through the current tip `c703e5c2`. The
  3-way mergeback of the cleanup into `feat/ict4d-demo` was run over the
  G3 path set (233 files: 119 A, 89 M, 22 R, 3 D) — Added/Renamed/Deleted
  adopted develop verbatim, Modified 3-way-merged favouring develop.
  **Bookkeeping done:** flipped all 18 rows to `[x] (c703e5c2)`; logged
  them in the Completed migrations log; deleted the 18 per-feature plans
  (#015–#032) and `GROUP-3-ai-chat-panel.md`. No `refactor-g3/...` branch
  or worktree existed locally (the group landed on develop directly), so
  none to remove.
  - **Mergeback outcome:** drift on the G3 path set fell from 223 files /
    +17373 −8941 to 22 files / +6454 −5841 (16 of which are the
    regenerated i18n catalogs). Only **6 non-i18n files** retain drift,
    all legitimately feat-ahead / deferred:
    `useChatModelCatalog.ts` (G5-offline `hasDownloadedOfflineModels`),
    `http-api.types.ts` (G4 `DashboardsAPI`), `WorkspaceSettingsPage.tsx`
    (feat owner/non-owner tab split), `planUtils.ts` (feat-ahead billing),
    `packages/shared/clients/src/index.ts` (feat-only
    `ServerApiSessionRefresher`/`SessionExpiredError` exports), and
    `DataExplorerApp.tsx` (excluded; only a 4-line comment-style diff left).
  - **Entanglements resolved:** adopted develop's `Privacy/`→`privacy/`
    lowercase directory (removed feat's capital `ConsentModal` + repointed
    feat-only `src/lib/privacy/{crossBoundary,consentAuditLog}` imports);
    fixed the `chatSyntaxHighlighter.tsx`→`ChatSyntaxHighlighter.tsx`
    case rename (would have broken on case-sensitive CI); adopted develop's
    supabase-function route-file PascalCase renames (`*.routes.ts`→
    `*Routes.ts`) and the `makeParserRegistry`/`dexieVersions`/
    `buildSqlSystemPrompt` flat→dir moves; removed 3 rename-orphans
    (`buildSqlSystemPrompt.test.ts`, feat's flat
    `useChatPanelComposerAutoFocus.ts`, feat's `deleteObsoleteIndexedDBs/`
    dir). Re-added feat's `DashboardsAPI` line that `--theirs` had dropped
    from `http-api.types.ts` (this also cleared a downstream cascade of
    8 subscription/billing type errors).
  - **Verification green:** `pnpm type-check` 0 errors (matches feat's
    pre-mergeback baseline of 0); `eslint` clean on 139 changed frontend
    files; vitest 378 (chat/privacy/models/dexie) + 29 (clients) + 19
    (chat edge function) passing; catalogs `i18n:compile` clean.
  - **Left for the operator:** catalogs were regenerated via
    `lingui extract` (source-locations updated for the privacy move);
    ~3 new untranslated strings vs feat's pre-existing ~11 — run
    `pnpm i18n:update-translations` to fill them. Working tree is **left
    dirty (uncommitted, not pushed)** for `dif`/difit review per the
    mergeback rule.
- `2026-07-31` — **GROUP-4 plan refreshed + branch prepared (pre-port).**
  Re-verified `docs/deslop/GROUP-4-dashboards.md` (rows `#064`–`#076` + `#048`)
  path-by-path against `origin/develop @ c703e5c2` (post-G3) and
  `origin/feat/ict4d-demo @ b80b0418`. Drift patched into the group plan:
  - **AvaPage V3 is now on develop** (`CURRENT_SCHEMA_VERSION = 3`,
    `versionTransforms = [V1, V2, V3]`) — the old TOP-RISK prerequisite is
    satisfied; G4 appends **V4 only** and bumps 3 → 4.
  - `AvaPageDataMigrationV2.types.ts` is now **identical** on both branches
    (old ~116-line delta landed with V3) — surgical entry removed.
  - Deps: only **`qrcode`, `@types/qrcode`, `jspdf`** still need installing;
    `html-to-image`, `roughjs`, `node-sql-parser`, `react-querybuilder`,
    `@react-querybuilder/mantine` already on develop (G2/G3).
  - `#065` server side is **mostly already on develop** — G3 renamed
    `chat.routes.ts` → `ChatRoutes.ts` and refactored `addDashboardBlock` into
    `supabase/functions/chat/PostChatMessages/`. The `src/lib/offlineChat/`
    target is feat-only (**G5**, not G4) and was dropped from scope.
  - `#069` per-viz filter files are one dir deeper on feat
    (`DataVizPBlock/DataVizPBlock/`); 5 files the draft called "surgical edit"
    are actually new → moved to the copy-verbatim list. Base SHA in the plan
    bumped `6ec98d45` → `c703e5c2`.
  - **Branch prepared:** `refactor-g4/dashboards` cut off `origin/develop`
    @ `c703e5c2` in worktree `~/src/worktrees/avandar/refactor-g4/dashboards`.
    Nothing ported/pushed yet → not in the In-flight table; GROUP-4 rows stay
    `[ ]`. These deslop-doc edits are left **uncommitted** for operator review.
