# `ALL_FEATURES.md` — features on `feat/ict4d-demo` not on `develop`

> **Status: Ready for Phase 2 — Session 3 (2026-06-05).** Session 2 walked the
> full `docs/superpowers/` spec/plan set (22 docs) via an Explore agent
> and confirmed every doc-described feature is covered by an inventory
> row. PTRCK billing commits verified unique to `feat/ict4d-demo` via
> `git cherry`. Profile-page row #90 confirmed via real net-diff
> (+257/-79). One missing row added (#96 `data-explorer-url-session-sync`
> from PTRCK-009/010). Per the operator rule "migrate refactored code,
> not legacy", rows #4 `dataset-upload-fixes`, #5
> `xlsx-column-inference`, #6 `google-sheets-import-resilience`, and #7
> `resync-dataset-card` were folded into row #1
> `async-dataset-import-pipeline`; PTRCK-005/006/007/008 chart-suite
> expansion was folded into row #9 (now `viz-multi-series-and-chart-types`).
>
> **Session 3 (2026-06-05) fold:** Row #14 `chart-color-picker-fix`
> absorbed into row #9 (color-picker fix ships in the same commit
> family as the chart-suite expansion — inseparable).
>
> **2026-06-10 reshuffle (cross-cutting prereqs).** Triggered by the
> abandoned `/deslop migrate async-dataset-import-pipeline` attempt
> against `develop @ 2881b0bb`, which exposed five undocumented deps
> that block #001 from type-checking. Changes:
>
> - **Folded rows #083 through #089** into a single
>   `billing-ptrck-series` row (`#083`). All 22 PTRCK driver commits
>   confirmed reachable from `feature/patrick-work-vi`, the in-flight
>   refactor branch.
> - **Relocated four rows to Section 0** (cross-cutting prerequisites):
>   the new folded `#083 billing-ptrck-series`, `#061 web-offline-mode`,
>   `#077 analytics-client-events`, `#094 chat-models-catalog-regeneration`.
>   Each is required by `#001 async-dataset-import-pipeline`.
> - **Retired Section M** (Analytics — its only row moved up) and
>   **gutted Section O** (Billing PTRCK series — all rows folded).
> - **Dep-discovery rule.** When a future migration surfaces a
>   previously-undocumented import dependency, the responsible row(s)
>   get promoted to Section 0 in the same `/deslop continue` /
>   `/deslop migrate` cycle. The inventory's top-to-bottom walk order
>   is the authoritative migration order — `/deslop continue` should
>   never propose a slug that is provably blocked.
>
> Index numbering is intentionally non-dense — folded-in row numbers
> (#4–#7, #14, #84–#89) are not reused. Rows have global IDs so they
> can be reshuffled without renumbering.
>
> The live "last analyzed commit" SHA and in-flight / completed
> migration logs live in `STATE.md`, not here. Update both files
> together whenever a status flips.

## Phase 2 batch grouping (2026-06-26)

To finish deslop in a handful of reviews instead of ~80 per-feature
PRs, all remaining rows were batched into **5 groups, each shipping
as ONE PR** off a `refactor-gN/<slug>` branch. Consolidated migration
plans (with verified real paths — they supersede the per-feature
`NNN-*.md` files where they disagree) live in:

1. `GROUP-1-data-foundation-ingestion.md` — rows #077, #094, #001, #002, #003
2. `GROUP-2-data-explorer-querying.md` — #008–#013, #096, #097, #044–#047, #049
3. `GROUP-3-ai-chat-panel.md` — #015–#043 (chat core + privacy + plan workflows)
4. `GROUP-4-dashboards.md` — #064–#076, #048
5. `GROUP-5-platform-i18n-standalone.md` — #050–#063, #079–#082, #090, #095, #091–#093

**Migration order is 1 → 2 → 3 → 4 → 5** (dependency-ordered; e.g.
the AvaPage schema chain V2→V3 (G2 #009)→V4 (G4 #069), G4 #065 needs
G3's chat tools, G5 #081 lingui-wiring lands dead last). Base for all
five is `origin/develop` @ `6ec98d45`. Per-row order inside each group
doc is the in-branch build sequence, not separate PRs.

## How to read this

Each row is a feature — a logical unit of capability that will land
in one reviewable PR. Rows are categorized for human navigation; the
index column is global so rows can be reshuffled without renumbering.

Legend:
- `[ ]` — not started (no `NNN-feature-slug.md` exists yet)
- `[~]` — migration in progress (refactor branch exists, not merged)
- `[x]` — completed (merged into `develop`; merge SHA in parens)

Status updates happen in `PLAN_OF_PLANS.md` (planning side) and here
(per-feature completion side). The operator drives both.

Supabase migrations and declarative schema files are **out of
scope** for this list: they belong to Phase 1 (operator-driven,
one-shot). Phase 1 also runs `pnpm db:gen-types` and patches any
resulting TypeScript errors with the smallest possible edits.

Phase 1 explicitly does **not** create new clients or new TS
model wrappers for the new tables/columns. Those land **per
feature** during Phase 2: the migration doc that introduces a
feature is responsible for any new `*Client` / model code that
feature needs. Every per-feature migration assumes Phase 1 has
already been completed (schemas + generated DB types in sync;
`tsc` clean) — but assumes no application-level client/model code
for those new tables exists yet.

---

## 0. Infrastructure prerequisites (foundational)

These rows are cross-cutting build/runtime prerequisites that must
land on `develop` before the bulk of the inventory can be
type-checked or shipped. **`/deslop continue` walks this section
top-to-bottom and will only fall through to the feature-area
sections (A onwards) once every row here is `[x]` or `[~]`.**

When a future migration surfaces a previously-undocumented
dependency (e.g. a port that fails `pnpm tsc` because it imports
from an unmigrated module), promote the responsible row(s) into
this section. Index numbering across sections is intentionally
non-dense — moving a row into Section 0 keeps its original global
index.

| # | Status | Feature | Sources |
|---|---|---|---|
| 77 | `[ ]` | **analytics-client-events** — `src/lib/analytics/analyticsClient.ts` writes to `usage_analytics_events` (Phase 1 schema); `analyticsEventTypes` typed allowlist; wired call sites: `dataset.imported`, `dashboard.published`, `chat.message_sent`, `chat.sql_generated`, `dashboard.block_added_via_chat`, `dashboard.filter_changed`, `dashboard.pdf_export_opened`. **Required by #001** — `useSaveDataset` imports from `@/lib/analytics/analyticsClient`. | CHECKPOINT 3 + 9 + 13 |
| 94 | `[ ]` | **chat-models-catalog-regeneration** — Generated chat-models catalog (`supabase/functions/chat/chat-models-catalog.gen.json`), `scripts/regenerateChatModels.ts` regen script, type additions in `shared/types/chat.types.ts`, `shared/lib/zodHelpers.ts` helpers, and the `ModelModule` directory reorganization (`packages/shared/models/src/Model/ModelModule/`) that the regen script depends on. **Required by #001** — `DatasetClient` imports from `shared/types/chat.types` (extended types from this row). The `Subscription*` portions of the same commits are refactors of files already covered by the folded billing series (#083 here) and ride along when that lands (no separate row). | Commits `09e1a97e`, `32ea53b6` |

## A. Data ingestion & dataset management

| # | Status | Feature | Sources |
|---|---|---|---|
| 1 | `[ ]` | **async-dataset-import-pipeline** — Streaming CSV/XLSX import via Web Worker, parquet output, two-phase async import with resume + status tracking. Replaces the synchronous upload path. Bundles all downstream adaptations of the pipeline: the XLSX sniffer worker (`src/workers/xlsxSniff.worker.ts`) column-inference improvements, `GoogleSheetsImportView` adapted to the new `startCsvImport`/`startXlsxImport` entry points, `ResyncDatasetCard.tsx` rewritten against the new pipeline, dataset name/CSV name display + tooltips + import validation, and all subsequent parser/status-tracking fixes. Per the operator rule "migrate refactored code, not legacy", these are all migrated together with the pipeline itself. | CHECKPOINT 1 (PRs #234/#235/#236); `docs/superpowers/plans/2026-05-19-async-dataset-import.md`; the `claude/async-dataset-import` branch series; commits `da43443`, `673419e`, `2a67c767`, `6098c3ef` (PTRCK-004) |
| 2 | `[ ]` | **app-wide-dropzone** — Drop a CSV/XLSX anywhere in the workspace to open the dataset-import flow. Mounted globally inside `<ChatPanelProvider>` in `WorkspaceLayout`. | CHECKPOINT 1 (PR #224) |
| 3 | `[ ]` | **dataset-drawer** — Replace the modal "Open Dataset" with a tabbed drawer (Saved / Import), with per-virtual-dataset save guards. Slide-from-bottom transition variants. | CHECKPOINT 1 (PR #229); commits `2ce199a`, `09c24af` |

## B. Data Explorer UX

| # | Status | Feature | Sources |
|---|---|---|---|
| 8 | `[ ]` | **floating-query-windows** — Draggable, collapsible Query Details and Visualization Settings floating windows on top of the Data Explorer canvas. | CHECKPOINT 1 (PR #228) |
| 9 | `[ ]` | **viz-multi-series-and-chart-types** — Multi-series visualizations across the full chart-type expansion: bar/line/area + scatter + bubble + **pie + funnel + radar**, all with per-series xKey/yKey/sizeKey (or nameKey/valueKey for pie-like configs); axis-mapping tooltip on Series header; prune-on-column-change in hydration helpers; auto-hydration of viz axes from query results; `CurveType` shared type with `curveType` setting on Line/Area; `withLegend` setting across Bar/Line/Area; `hydratePieFromQuery`/`hydratePieFromQueryResult` utilities. Per the operator rule, the PTRCK-005/006/007/008 expansion is bundled into this row rather than split — migrate the up-to-date chart suite, not the original multi-series + later expansion. **Also absorbs retired row #14 `chart-color-picker-fix`** (commit `c8fb6b6`): color picker behavior + chart rendering fixes for big-number columns ship in the same commit family and are inseparable. | CHECKPOINT 1 (`claude/add-series-support`); commits `7c8d08a`, `add9d03`, `3d7f527`, `517daefc` (PTRCK-005+006), `7b738f13` (PTRCK-007+008), `c8fb6b6` (color-picker fix, ex-#14) |
| 10 | `[ ]` | **viz-settings-fieldsets** — Visualization Settings restructured into labelled fieldsets matching the design doc. | `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md`; commit `4e85af6` |
| 11 | `[ ]` | **codemirror-sql-editor** — CodeMirror-based SQL editor in the Data Explorer (replaces the prior textarea), supporting dataset/column pills inline. | Commit `314f8a9`; sql-pills design spec |
| 12 | `[ ]` | **sql-pill-rendering** — Render dataset names and column names as pills inside the read-only SQL block (`AvaSqlBlock`); editable pill dropdowns when the SQL is editable; widened dropdown. | Commits `4e85af6`, `6febbcf`, `a01db18` |
| 13 | `[ ]` | **chart-number-formatting** — Centralized formatting helper used across the chart layer for big-number columns, locale-aware. | Commits `57c5803`, `c8fb6b6` |
| 96 | `[ ]` | **data-explorer-url-session-sync** — Data Explorer state (`ds`, `cols`, `agg`, `orderBy`, `orderDir`, `sql`, `vc`, `od`) hydrates from and serializes back to the URL via `replace: true` navigation. Adds `DataExplorerURLState` parse/serialize helpers (+332 LoC), `dataExplorerURLHydration` deferral/hydrate-key checks (+54), `useDataExplorerURLSync` first-load hydration + ongoing sync (+299), and `remapColumnsByBaseId` in `QueryColumnMultiSelect` so URL-hydrated columns stay aligned with fetched metadata. Reset clears search params in one navigation so the query string can go bare. ~838 lines of new code; none of these files exist on `develop`. | Commit `7b738f13` (PTRCK-009 + PTRCK-010) |
| 97 | `[ ]` | **data-explorer-auto-open-ai-panel** — Auto-opens the AI/chat panel on a user's first Data Explorer visit per session. Adds `src/views/DataExplorerApp/dataExplorerPanelPreferences.ts` (new), an `openChatPanelOnMount` effect in `DataExplorerApp.tsx`, and a small `useAuth.ts` adjustment. Added post-marker on `feat/ict4d-demo` (PR #240); no plan file authored yet — operator to confirm scope before `/deslop migrate`. | Commit `6d3841b6` (PR #240) |

## C. Chat panel core fixes & UX

| # | Status | Feature | Sources |
|---|---|---|---|
| 15 | `[ ]` | **chat-disabled-visual-feedback** — Chat composer visibly disabled on pages where chat is not available (dim background + placeholder copy). Includes the transparency fix on top of the dark navbar gradient. | CHECKPOINT 1 (PR #232); CHECKPOINT 8 (publish modal polish notes) |
| 16 | `[ ]` | **chat-context-memo-fix** — Memoize `useChatPageContext` by content (pathname/openDatasetId/rawSQL/lastQueryError) to stop the assistant-ui runtime from being thrashed; fixes the "canvas stops updating after multi-turn" bug (#29). | CHECKPOINT 2; FEATURE_CHECKLIST #29 |
| 17 | `[ ]` | **chat-empty-state-improvements** — Improved empty-chat-state rendering (suggested prompts, no jumpy layout) merged with i18n suggestion prompts. | Commits `8ca7ce9`, `661511a` |
| 18 | `[ ]` | **chat-try-again-and-retry-on-empty** — Per-turn "Try Again" button on chat replies; automatic retry-on-empty so transient backend hiccups don't leave the user staring at silence. | Commit `1e7d335` |
| 19 | `[ ]` | **chat-recover-sql-without-tool-call** — When the model returns SQL in its message body but skipped the `generateSql` tool, recover the SQL and apply it anyway. | Commit `381b07d` |
| 20 | `[ ]` | **chat-multi-dataset-clarification** — When 2+ datasets could plausibly answer a question, force a clarification asking which dataset to use before generating SQL. | Commit `2359378` |
| 21 | `[ ]` | **chat-better-pblock-generation** — Improvements to AI-driven P-block generation for chat-in-dashboards (column resolution, viz type heuristics). | Commits `c3e63d6`, `a01db18` |

*Row #94 `chat-models-catalog-regeneration` was relocated to Section 0 on 2026-06-10 — it is a cross-cutting prerequisite for #001 and other UI rows that consume `shared/types/chat.types`.*

## D. Chat interactive workflows — Phase 0 (privacy guardrails)

The chat-interactive-workflows spec is
`docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`.
Phases 0-9 cumulatively land below.

| # | Status | Feature | Sources |
|---|---|---|---|
| 22 | `[ ]` | **privacy-pii-detector** — Column-name keyword + content regex layers (email, SSN, Luhn CC, IBAN, IP, DOB, address). `src/lib/privacy/piiDetector.ts` with 16 unit tests. | CHECKPOINT 4 |
| 23 | `[ ]` | **privacy-bias-detector** — Gender / ethnic / cultural / loaded-framing / statistical-assumption rules with curated suggestions. `src/lib/privacy/biasDetector.ts` with 11 unit tests. | CHECKPOINT 4 |
| 24 | `[ ]` | **privacy-consent-modal** — Modes A/B/C/D/E (clean / PII / bias / composite / medical-strict typed phrase). `src/components/Privacy/ConsentModal/`. | CHECKPOINT 4 + 5 |
| 25 | `[ ]` | **privacy-crossboundary-hmac** — `crossBoundary` API as the single chokepoint, HMAC-signed ack tokens with replay protection, `UNAPPROVED_DATA_TRANSFER` rejection on the server, ESLint chokepoint guard. | CHECKPOINT 5; CHECKPOINT 9b ESLint guard |
| 26 | `[ ]` | **privacy-audit-log-page** — Dexie-backed consent audit log + `/settings/privacy/log` page with filter, CSV export, clear. Metadata-only. | CHECKPOINT 5 |
| 27 | `[ ]` | **privacy-discovery-spanish-french-stubs** — Locale stub files for Spanish + French patterns (UX copy translated; patterns themselves pending advisor review). | CHECKPOINT 5 |
| 28 | `[ ]` | **privacy-isrowdatamessage-helper** — Server helper that detects row-shaped messages (for Phase 2+ values-scope enforcement). | CHECKPOINT 5 |

## E. Chat interactive workflows — Phases 1-9

| # | Status | Feature | Sources |
|---|---|---|---|
| 29 | `[ ]` | **chat-clarify-tool** — `clarify` tool registered alongside `generateSql` with a 3-turn cap; system-prompt clarification block. | CHECKPOINT 4 |
| 30 | `[ ]` | **chat-clarification-card-and-bias-check** — Inline `ClarificationCard` (free-text / fixed-options-single / fixed-options-multi), keyboard behavior, bias check on outgoing user messages + on LLM clarification questions. | CHECKPOINT 4 + 5 |
| 31 | `[ ]` | **chat-clarification-telemetry** — Separate Dexie DB `AvandarClarificationAuditDB`, recordShown/recordOutcome with timing, Privacy log "Clarifications" sub-tab. | CHECKPOINT 5 + 9b |
| 32 | `[ ]` | **chat-discovery-clarifications** — Phase 2: LLM emits a read-only `SELECT DISTINCT`, dropdown populates from local DuckDB, selection routes through `crossBoundary` with `discovery_clarification` context. Shared `isReadOnlyDiscoveryQuery` validator. | CHECKPOINT 9b |
| 33 | `[ ]` | **chat-plan-propose** — Phase 3: `proposePlan` tool with ≤8-step plans, schema-validated server-side; `PlanStateManager` + `planExecutor` + DuckDB temp-view lifecycle (`step_<id>`). | CHECKPOINT 9b + 10 |
| 34 | `[ ]` | **chat-plan-canvas** — xyflow visual DAG canvas with `RoughEdge` (RoughJS-styled bezier), custom `PlanStepNode`, animated zoom-in/zoom-out via `fitView`+`setCenter`, Auto/Step run-mode toggle. | CHECKPOINT 10 |
| 35 | `[ ]` | **chat-plan-step-materialization** — `planStepStorage.ts` Dexie DB keyed by `(planId, stepId)`; explicit cleanup on Close / replace / new `proposePlan`; **no OPFS**. | CHECKPOINT 10 |
| 36 | `[ ]` | **chat-plan-virtual-dataset-persistence** — Save-as-virtual-dataset persists the full plan in a new `plan_steps` JSONB column; reopening rehydrates the plan and re-registers cached parquet blobs (`rehydratePlan` + `loadParquet`). | CHECKPOINT 10 |
| 37 | `[ ]` | **chat-plan-schema-drift-regen** — Phase 4: `isSchemaDrift` strict comparator + `findAffectedDownstream` BFS; `POST /chat/:workspaceId/regenerate-plan` endpoint with forced `regenerateSteps` tool; frontend regen loop with ≤2-attempt cap per step. | CHECKPOINT 10 |
| 38 | `[ ]` | **chat-plan-branching** — Phase 5: `PlanBranchStateManager` + `PlanBranchSidebar` + "Branch from here" CTA on succeeded steps. (Per-branch chat thread + virtual-dataset persistence intentionally deferred upstream.) | CHECKPOINT 15 |
| 39 | `[ ]` | **chat-plan-python-sandbox** — Phase 6: Sandboxed iframe at `/sandbox-executor.html` with strict CSP + pre-boot network stubs, lazy Pyodide load, parquet bridge via `pyarrow`, `sandboxClient`/`sandboxProtocol`, 30 s default timeout. WebR explicitly deferred. | CHECKPOINT 15 |
| 40 | `[ ]` | **chat-plan-approval-gate** — `approvalStatus: awaiting_approval | approved | rejected`; Approve/Reject banner blocks auto-run; >7-SQL-step heuristic suggests Python/R. | CHECKPOINT 15 |
| 41 | `[ ]` | **chat-plan-annotations** — Phase 9: `PlanAnnotationStateManager` (text/sticky/arrow/pen via perfect-freehand), `PlanCanvasToolbar`, `PlanAnnotationOverlay` sharing xyflow viewport, RoughJS arrows, 50-deep undo/redo, `AvandarPlanAnnotationDB` Dexie persistence. | CHECKPOINT 15 |
| 42 | `[ ]` | **chat-plan-png-pdf-export** — PNG export via `html-to-image` (toolbar/minimap excluded); PDF export via dynamic-imported `@react-pdf/renderer` — page 1 overview + one page per step (description / code / status / schema / row count). | CHECKPOINT 15 |
| 43 | `[ ]` | **chat-multi-language-plans** — `proposePlan` `type` enum accepts `sql | python | r | clarification`; executor dispatches by type. R returns error today (Python only registered in `availableRuntimes`). | CHECKPOINT 15 |

## F. Manual querying & SQL form

| # | Status | Feature | Sources |
|---|---|---|---|
| 44 | `[ ]` | **sql-to-structured-query** — `node-sql-parser` driven `sqlToStructuredQuery` that projects arbitrary SELECT statements onto `PartialStructuredQuery`. Returns `{ query, isFullyMapped, unmappedReasons }`. 12 unit tests. | CHECKPOINT 7; `docs/demo-features/sql-parser-filter-ui.md` |
| 45 | `[ ]` | **structured-query-to-sql** — Knex-based form-to-SQL renderer extracted from `toRawDuckDBQuery` into a reusable utility. Also renders the new WHERE clause. 5 unit tests. | CHECKPOINT 7 |
| 46 | `[ ]` | **recursive-filter-ui** — `QueryFiltersField` powered by `react-querybuilder` + `@react-querybuilder/mantine`; nested AND/OR groups; library-agnostic `QueryFilterGroup` shape. | CHECKPOINT 7 |
| 47 | `[ ]` | **sql-form-sync-data-explorer** — Bidirectional sync: `applySqlMapping` updates `isStructuredQueryInSync` + `sqlSyncWarnings`, manual edits regenerate SQL, out-of-sync confirmation Alert. | CHECKPOINT 7 |
| 48 | `[ ]` | **sql-form-sync-dashboards** — Per-block `useDashboardManualQueryState` hook giving DataViz blocks the same SQL ↔ form parity as Data Explorer; 3-tab `NLQueryPField` (Prompt / Manual / SQL). | CHECKPOINT 16 |
| 49 | `[ ]` | **duckdb-sql-parser-updates** — Parser-side updates so DuckDB-specific SQL parses correctly. | Commit `673419e` |

## G. Multilingual voice dictation

| # | Status | Feature | Sources |
|---|---|---|---|
| 50 | `[ ]` | **voice-web-whisper** — Mic button in chat composer, `@huggingface/transformers` Whisper (tiny/base/small), IndexedDB-backed `AvandarVoiceModelCache`, MediaRecorder → 16 kHz Float32 pipeline, consent modal with language picker, floating bottom-left progress indicator. | CHECKPOINT 11 |
| 51 | `[ ]` | **voice-desktop-whispercpp** — `smart-whisper` (whisper.cpp via N-API) in Bun-main; disk-backed cache under `<userData>/whisper-models/`; IPC contracts (`VoiceContracts.*`); `DesktopVoiceModelManager` polling `voice.getStatus`; Medium / Large v3 / Large v3 Turbo gated to desktop. | CHECKPOINT 12 (desktop voice) |
| 52 | `[ ]` | **voice-platform-factory** — `voiceModelManagerFactory.ts` returns the right backend so React code stays platform-agnostic. | CHECKPOINT 12 (desktop voice) |
| 53 | `[ ]` | **voice-per-file-progress** — Per-file download progress tracking in the voice download indicator. | Commit `82fdc1b` |
| 54 | `[ ]` | **voice-wasm-worker-path** — Parallel whisper.cpp WASM voice pipeline running in a Web Worker (alternative web path with better isolation). | Commit `ef5bd0a` |
| 55 | `[ ]` | **voice-ui-polish** — Voice transcription UI updates (modal styling, badges, swahili-specific hint). | Commits `5a1a3bb`, `a8f96c9`, `1e7d335` (swahili hint), `91137e6` (offline badges) |

## H. Desktop platform & offline (web + desktop)

| # | Status | Feature | Sources |
|---|---|---|---|
| 56 | `[ ]` | **desktop-platform-registry** — Module-level `getPlatformImpls`/`setPlatformImpls`; `PlatformProvider` publishes resolved impls; throws loudly if read before mount. | CHECKPOINT 9 (desktop) |
| 57 | `[ ]` | **desktop-web-platform-impls** — `createWebDuckDbClient` real wrapper around legacy `DuckDbClient` singleton; `createWebDatasetBlobStore` Dexie-backed `LocalDataset` store; loud throws for not-yet-migrated paths. | CHECKPOINT 9 (desktop) |
| 58 | `[ ]` | **desktop-offline-session** — `AuthClient` desktop polyfill routing through keychain-backed `DesktopAuthProvider`; cached access token survives offline relaunch; `signOut` clears both keychain entries. | CHECKPOINT 9 (desktop) |
| 59 | `[ ]` | **desktop-bootstrap-snapshot** — `onAuthenticated` hook in `registerAuthHandlers`; first-launch fetches every syncable table into local SQLite. Idempotent. | CHECKPOINT 9 (desktop) |
| 60 | `[ ]` | **desktop-duckdb-offline-fix** — Fixes so duckdb-wasm works correctly on the desktop offline path. | Commit `2e26626` |
| 62 | `[ ]` | **web-offline-webllm-chat** — Local WebLLM-based chat with multi-pass local inference. `releaseLoadedPipeline` lifecycle. E2E verification fixtures. | `docs/superpowers/plans/2026-05-20-offline-webllm-chat.md`; commits `d515040`, `2d60b41`, `8744137` |
| 63 | `[ ]` | **offline-chat-sql-hardening** — Misc hardening on the offline-chat SQL path (validation, fallback). | `docs/offline-chat-sql-hardening.md` |

## I. Dashboards — polish & design tokens

| # | Status | Feature | Sources |
|---|---|---|---|
| 64 | `[ ]` | **dashboard-design-tokens** — `AvaPageRootProps` gains `theme` (default/ocean/forest/rose/amber/graphite) and `typography` (system/serif/mono); polished header (left-accent strip, tighter title leading, uppercase byline); polished DataViz card. | CHECKPOINT 9 (dashboards) |
| 65 | `[ ]` | **dashboard-chat-in-editor** — `addDashboardBlock` tool; `DashboardEditorStateManager` queues blocks; chat composer unlocked on dashboards surface; `buildPendingDataVizBlock`. | CHECKPOINT 9 (dashboards) |
| 66 | `[ ]` | **dashboard-export-buttons-polish** — Updated dashboard buttons and export UI styling. | Commits `9d4ac78`, `7abad7d` |
| 67 | `[ ]` | **dashboard-modal-styles** — Modal style refresh used by dashboards (Publish, Export, etc.). | Commit `98dc225`, `5eed96a` |

## J. Dashboards — filters

| # | Status | Feature | Sources |
|---|---|---|---|
| 68 | `[ ]` | **dashboard-global-filters** — `Filter` P-block (single-select, multi-select, contains); `DashboardFilterStateManager`; `applyDashboardFiltersToSql` subselect wrap. | CHECKPOINT 9 (dashboards) |
| 69 | `[ ]` | **dashboard-per-viz-filters** — Per-viz global-filter All/Some/None opt-out; per-viz local filters with independent state; `AvaPageDataMigrationV4` seeds defaults on every DataViz block. | CHECKPOINT 14 |

## K. Dashboards — publishing & sharing

| # | Status | Feature | Sources |
|---|---|---|---|
| 70 | `[ ]` | **dashboard-view-before-publish** — Auth-gated preview route `/<workspaceSlug>/dashboards/preview/<dashboardId>` with "Back to editor" banner; `mode: "public" \| "preview"` prop on `DashboardViewerView`. | CHECKPOINT 6 |
| 71 | `[ ]` | **dashboard-publish-modal** — Real modal replaces confirm dialog. URL-first copy ("Your dashboard will be published to: <url>"). | CHECKPOINT 6 + CHECKPOINT 8 polish |
| 72 | `[ ]` | **dashboard-vanity-url** — Kebab-case slug input + live preview; `toVanitySlug` utility with 8 unit tests; public route `/d/<workspaceSlug>/<slug>` with workspace-scoped uniqueness. | CHECKPOINT 6 + 8 |
| 73 | `[ ]` | **dashboard-share-url-row-qr** — `ShareUrlRow` shows canonical + vanity URLs with copy buttons; downloadable 256×256 QR PNG via `qrcode` library (client-side, no network). | CHECKPOINT 6 |
| 74 | `[ ]` | **dashboard-slice-aware-publish** — `Data scope` section with `queried` (default, narrowest) / `all_columns` / `custom` modes; `node-sql-parser` `columnList` extracts referenced columns; `unparseable` sentinel for safe fallback; `buildSliceSql` materializes the slice; persists in `dashboard.config.__publishConfig`. | CHECKPOINT 13 |
| 75 | `[ ]` | **dashboard-pdf-export-annotate** — `ExportPdfButton` next to Publish; two-step modal (export immediately / annotate then export); off-screen render via `<PuckPageRender>` + `html2canvas` 2× → `jspdf` paginated portrait letter; annotator with freehand/arrow/text (RoughJS), roughness/stroke/color sliders, undo+clear, composited before pagination. Currently gated behind a local `HIDE_EXPORT_AS_PDF = true` flag — migrate the gate alongside the feature so it ships defaulted-off. | CHECKPOINT 13; commit `6fee1d3d` (HIDE_EXPORT_AS_PDF flag) |

## L. Dataset summary view

| # | Status | Feature | Sources |
|---|---|---|---|
| 76 | `[ ]` | **summary-view-redesign** — `DatasetSummaryView` doc-style outline with sticky TOC, one section per column with plain-language headline + type-appropriate viz (text/number/date), missing-rate `RingProgress` when nonzero, lazy `getColumnSummary` via `useIntersection` 200px margin. New `getDatasetMeta`/`getColumnSummary` on `DatasetQueryClient`. | CHECKPOINT 6 |

*Section M (Analytics) was retired on 2026-06-10 — its only row (#77 `analytics-client-events`) was relocated to Section 0 as a cross-cutting prerequisite for #001 and any other feature emitting analytics events.*

## N. i18n / Lingui

The `lingui-scaffold` build-time prerequisite (#078) is already
merged into `develop` (see the Completed migrations log in
`STATE.md`). The remaining i18n rows live here.

| # | Status | Feature | Sources |
|---|---|---|---|
| 79 | `[ ]` | **workspace-language-picker** — Workspace Settings "Language" tab, `WorkspaceI18nProvider`, `useLanguagePreference` (per-workspace localStorage), Mantine `DirectionProvider` keyed on locale for RTL. | CHECKPOINT 12 |
| 80 | `[ ]` | **i18n-translate-llm-script** — `scripts/i18n/translateWithLLM.ts` rewritten to use OpenAI Chat Completions; real CLI with `--help`/`--scope`/`--locale`/`--all`/`--model`/`--dry-run`; preserves PO comments + refs; 32 vitest tests. | CHECKPOINT 12.5 |
| 81 | `[ ]` | **frontend-lingui-wiring** — Wire remaining frontend to Lingui beyond Workspace Settings; translations populated across all 7 non-source locales for the in-scope surfaces. | Commits `c93ad08`, `c3e63d6`, `b161920`, `4f8f00f`, `efa8211` |
| 82 | `[ ]` | **i18n-catalogs-formatter** — Pre-PR formatter applied to i18n catalogs so prettier doesn't fight regeneration. | Commit `31a166d` |

*Section O (Billing / subscriptions PTRCK series) was retired on 2026-06-10 — all seven rows (#083 + #084 + #085 + #086 + #087 + #088 + #089) were folded into a single `billing-ptrck-series` row now living in Section 0, and that row is in flight on `feature/patrick-work-vi`. Per the operator rule "fold inseparable features into a single migration".*

## P. Profile page

| # | Status | Feature | Sources |
|---|---|---|---|
| 90 | `[ ]` | **profile-page-redesign** — Redesigned profile page (AppLayout + sectioned identity / account / security layout); `UserClient.updateProfile` mutation for workspace-scoped display name; typography normalized in workspace-name dropdown. (Worktree merge commit `20cfc1b` also brought in `.agents/skills/` files — those are tooling noise, NOT part of this migration.) | Merge commit `20cfc1b` |

## Q. Documentation (deslop scope only)

These docs exist on `feat/ict4d-demo` and provide context for the
above features. They should be brought across in bulk via a single
docs migration; they are not features themselves.

| # | Status | Feature | Sources |
|---|---|---|---|
| 91 | `[ ]` | **docs-ict4d-demo-history** — Copy `docs/ict4d-demo/CHECKPOINTS.md`, `FEATURE_CHECKLIST.md`, `random-thoughts.md` to develop **read-only** as historical record (or decide to leave them only on `feat/ict4d-demo`). Operator decision required. | Existing on source |
| 92 | `[ ]` | **docs-superpowers-specs-plans** — Copy `docs/superpowers/specs/` and `docs/superpowers/plans/` to develop as the canonical spec/plan history. | Existing on source |
| 93 | `[ ]` | **docs-demo-features** — Copy `docs/demo-features/` (web-offline-mode, sql-parser-filter-ui, desktop-offline-session) plus `docs/offline-chat-sql-hardening.md`, `docs/permissions-architecture.md`, `docs/avandar-packages.md`, `docs/adding-new-data-source-types.md`. | Existing on source |

## R. Permissions & sharing

| # | Status | Feature | Sources |
|---|---|---|---|
| 95 | `[ ]` | **share-resource-modal-redesign** — Implements the share-resource modal redesign already documented on both branches (`docs/superpowers/specs/2026-05-17-share-resource-modal-redesign-design.md` + matching plan). Rewrites `shared/permissions/ShareResourceModal/*` (ShareAddPrincipalRow, ShareGeneralAccess, SharePrincipalList, SharePrincipalRow, ShareResourceButton, ShareResourceModal, ShareSummaryLine, buildShareSummary, shareCopy — ~16 files, +220/-142 net), gates rollout behind the `enable-shared-with-me` feature flag (added to `playwright.config.ts` env, `src/lib/offline/isAppLinkAvailableOffline.ts`, README, and i18n catalogs in all 8 locales), and bundles the e2e infra it needs (Playwright `reducedMotion: "reduce"` context + `ensureE2eViteFeatureFlags` boot). The matching Supabase RPC migrations were added (`20260517204100_list_shared_with_me_rpc.sql`) and later dropped (`20260602172559_drop_list_shared_with_me_rpc.sql`) on **both** branches, so no schema work is owed here. | `docs/superpowers/specs/2026-05-17-share-resource-modal-redesign-design.md`; `docs/superpowers/plans/2026-05-17-share-resource-modal-redesign.md`; commit `54d7930d` |

---

## Session 2 verification notes (2026-06-05)

- [x] **PTRCK uniqueness sweep.** `git cherry origin/develop
  origin/feat/ict4d-demo` returned zero `-` lines — every PTRCK
  commit is genuinely unique to `feat/ict4d-demo`. The PTRCK series
  spans more than billing: PTRCK-001/002 are auth/navbar polish
  (treated as develop-refactor and skipped per operator rule);
  PTRCK-004 dataset/CSV display tweaks fold into row #1;
  PTRCK-005/006/007/008 chart-suite expansion folds into row #9;
  PTRCK-009/010 are the new row #96
  `data-explorer-url-session-sync`; PTRCK-011/012 → #83;
  PTRCK-013/014/016/020 → #84; PTRCK-015 → #85;
  PTRCK-017/019/022/024 → #86; PTRCK-018/023 → #88; PTRCK-021 →
  #89; PTRCK-025 series → #87.
- [x] **Profile-page uniqueness.** No commits on `origin/develop`
  touch `src/routes/_auth/$workspaceSlug/profile.tsx`. Real net
  diff +257/-79. Row #90 stands.
- [x] **`docs/ict4d-demo/CHECKPOINTS.md` "✅" claims.** Inventory
  carries no row for `datasets__pdf` / `datasets__image` (#28) or
  dashboard media embed (#11). Both confirmed deferred by Session
  1; no stub schema sneaked onto the delta.
- [x] **Chat-workflow phase granularity.** Explore-agent pass
  confirmed current granularity (rows #22–43 mapping to Phases 0–9
  with one row per logical chunk) matches the spec at
  `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`.
  No row-merge needed.
- [x] **Commit-only features Session 1 missed.** Walked the 78
  non-merge commits. Genuine new feature found: PTRCK-009 +
  PTRCK-010 URL session sync → added as row #96. All other
  vague-subject commits (`changes`, `more fixes`, `Fixed more
  errors`, etc.) trace to existing rows or are noise (e.g. the
  3-line `8f64724f` "changes" patch to
  `OfflineChatResourceManager.ts` is a sub-feature of row #62).
- [x] **Folded refactor-of-existing-feature rows into originals.**
  Rows #4, #5, #6, #7 absorbed into row #1
  `async-dataset-import-pipeline` (description expanded; row
  numbers retired). Row #9 description expanded to include
  pie/funnel/radar chart types and auto-hydration (PTRCK-005/006/007/008).

Header flipped to `validated — Session 2 (2026-06-05)`. Session 3+
(per `PLAN_OF_PLANS.md`) authors per-feature `NNN-<slug>.md` plans.
