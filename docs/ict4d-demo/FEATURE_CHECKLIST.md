# `feat/ict4d-demo` — Feature Checklist

Use this checklist to track progress on the 29 items from the demo brief.
For depth on what's done, what was deferred, and why, see
`docs/ict4d-demo/CHECKPOINTS.md`.

Legend: `[x]` done · `[~]` partial / in flight · `[ ]` not started · `[—]` **deferred** (intentionally not in scope for the demo)

---

## Branch & merges

- [x] **0. Create `feat/ict4d-demo` and merge all open PRs**
  - [x] PR #234 / #235 / #236 (async dataset import stack)
  - [x] PR #224 (app-wide dropzone)
  - [x] PR #228 (floating query windows)
  - [x] PR #229 (dataset drawer)
  - [x] PR #232 (chat panel disabled state)
  - [x] `claude/add-series-support-734EZ` (multi-series viz — explicitly called out by user)
  - [x] `claude/fix-tablet-responsiveness-MqAFc`
  - [x] `claude/add-python-r-execution-hKxZd` (spec doc only — implementation is item #2 below)

## Feature work

- [~] **2. Finish Desktop Phase 2 + Phase 2.5 LITE** (Phase 2 native
  layer landed previously; Phase 2.5 LITE shipped in **Checkpoint 9**
  — platform registry + real web adapters + keychain-backed offline
  session + post-signin snapshot bootstrap. The desktop "quit → go
  offline → relaunch → still signed in → still queryable" demo loop
  is now wired. Full Phase 2.5 consumer migration of ~80 files to
  `usePlatform()` is deferred — not required for the demo loop.)
- [~] **3. Merge other `claude/` session branches** — all visible ones merged in step 0
- [~] **4. Pull and finish work from `claude/` branches that only have plans**
  - [x] Plan pulled from `claude/add-python-r-execution-hKxZd`
  - [~] Implementation of the chat-interactive-workflows plan (see
    `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`
    for the full plan and per-phase architecture)
    - [x] Phase 0 - PII detector (16 tests green)
    - [x] Phase 0 - Bias detector (11 tests green)
    - [x] Phase 0 - Consent modal Modes A/B/C/D/E (composite + medical-strict shipped)
    - [x] Phase 0 - `crossBoundary` API with HMAC ack tokens
    - [x] Phase 0 - HMAC ack tokens + backend `UNAPPROVED_DATA_TRANSFER`
    - [x] Phase 0 - Dexie audit log + `/settings/privacy/log` page (Privacy log tab)
    - [x] Phase 0 - `isRowDataMessage` server helper for the Phase 2+ row-data path
    - [x] Phase 0 - Spanish + French pattern file stubs (UX copy translated; patterns still pending advisor review)
    - [x] Phase 0 - ESLint chokepoint guard preventing `crossBoundary` bypass
    - [ ] Phase 0 - `containsHealthData` workspace setting UI (admin toggle that elevates all PII detections to medical-strict; detector reads the flag but no UI to set it)
    - [ ] Phase 0 - Opt-in `shareAnonymousPrivacyMetrics` workspace setting + payload-review process
    - [ ] Phase 0 - Server-issued ack-token nonce registry (v2 design; replay protection currently in-memory on the edge worker)
    - [x] Phase 1 - `clarify` tool registered in chat backend with 3-turn cap
    - [x] Phase 1 - Inline ClarificationCard in the thread (free_text + fixed_options + discovery)
    - [x] Phase 1 - System-prompt clarification block
    - [x] Phase 1 - Bias check on outgoing user messages via `crossBoundary`
    - [x] Phase 1 - Bias check on LLM clarification questions (logs to console in v1)
    - [x] Phase 1 - Clarification audit table + telemetry (separate Dexie DB)
    - [x] Phase 1 - Privacy log gains a "Clarifications" sub-tab
    - [ ] Phase 1 - Silent bias re-prompt loop (currently only warns; spec calls for ≤2 retries with "rephrase neutrally" system note)
    - [ ] Phase 1 - 20-question ambiguous-question eval set + runner with ≥80% resolve-in-≤2 target
    - [x] Phase 2 - Discovery clarifications (`discovery` response shape; LLM emits read-only SELECT, dropdown populates from local DuckDB, selection routes through `crossBoundary`)
    - [x] Phase 2 - Shared `isReadOnlyDiscoveryQuery` validator on client + server (11 unit tests)
    - [x] Phase 2 - PII detection on column name + content for discovery selections
    - [ ] Phase 2 - Ack-token signing for `values` scope payloads (text scope is signed end-to-end; `values` is "accept-on-presence" in `chat.routes.ts`)
    - [ ] Phase 2 - "Edit selection" hook on the consent modal (spec sketches dropping values before approval; UI not built)
    - [x] Phase 3 - `proposePlan` tool with ≤8-step plans, schema-validated server-side
    - [x] Phase 3 - `PlanStateManager` + `planExecutor` + DuckDB temp-view lifecycle
    - [x] Phase 3 - xyflow visual DAG canvas with RoughJS hand-drawn edges (`PlanFlowView`, `PlanStepNode`, `RoughEdge`)
    - [x] Phase 3 - Animated zoom-in / zoom-out modes with `fitView` + `setCenter`
    - [x] Phase 3 - Auto vs Step run-mode toggle in the toolbar
    - [x] Phase 3 - IndexedDB step materialisation (`AvandarPlanStepDB` Dexie database, keyed by `(planId, stepId)`, explicit cleanup on Close / replace)
    - [x] Phase 3 - Save as virtual dataset persists the full plan in a new `plan_steps` JSONB column on `datasets__virtual`
    - [x] Phase 3 - Reopening a virtual dataset rehydrates the plan + every cached intermediate (`rehydratePlan` + parquet roundtrip through `loadParquet`)
    - [x] Phase 3 - Click failed node to retry; failed-step banner with explanation
    - [ ] Phase 3 - Viz **thumbnails** on each plan node (currently shows schema text, not mini-charts)
    - [x] Phase 4 - Schema-drift detection (`isSchemaDrift`, strict: names + order + type case-insensitive) + downstream-walker (`findAffectedDownstream`)
    - [x] Phase 4 - `POST /chat/:workspaceId/regenerate-plan` endpoint with forced `regenerateSteps` tool call
    - [x] Phase 4 - Frontend regen loop: detect drift -> hit endpoint -> dispatch `replaceStepCode` -> re-run affected steps in plan order
    - [x] Phase 4 - `regenAttempts` cap (≤2 attempts per step, tracked locally per run)
    - [~] Phase 5 - Branching
      - [x] Phase 5 - `PlanBranchStateManager` + `BranchRecord` (parent plan id, parent step id, anchor schema/view, title, plan + status snapshot)
      - [x] Phase 5 - `PlanBranchSidebar` shows Root + every branch; click to switch, X to close
      - [x] Phase 5 - `addBranch` action on `PlanStateManager` attaches a branch ref to a parent node
      - [x] Phase 5 - "Branch from here" CTA in the focused-step detail (only on succeeded steps)
      - [x] Phase 5 - 4 unit tests for the state manager (open / switch / close / clear-all)
      - [ ] Phase 5 - Separate assistant-ui chat thread per branch (currently the chat thread is shared; switching branches changes which plan the canvas renders but messages still feed the root). Requires assistant-ui multi-thread orchestration — follow-up.
      - [ ] Phase 5 - Persist branches into the virtual-dataset JSONB column so reopening a saved analysis restores the branch tree.
    - [~] Phase 6 - Python + R sandboxed executor
      - [x] Phase 6 - Sandboxed iframe at `/sandbox-executor.html`, mounted with `sandbox="allow-scripts"` (null opaque origin) + strict CSP (`default-src 'none'`, `connect-src https://cdn.jsdelivr.net`, no XHR/WebSocket/EventSource/sendBeacon/RTCPeerConnection)
      - [x] Phase 6 - Pre-boot network stubs (`fetch` allowlist, `XMLHttpRequest`/`WebSocket`/`EventSource`/`RTCPeerConnection` thrown) before runtime init
      - [x] Phase 6 - Pyodide lazy load (~10 MB) from jsdelivr; `pyarrow` + `pyarrow.parquet` + `pandas` pre-imported on boot
      - [x] Phase 6 - postMessage protocol (`sandboxProtocol.ts`) with `sandboxKey` discriminator on every request to reject rogue messages
      - [x] Phase 6 - Parent-side `runInSandbox` client (`sandboxClient.ts`) — mounts iframe, awaits ready, queues runs sequentially
      - [x] Phase 6 - `executePlanStep` dispatches `python`/`r` steps to the sandbox; inputs read as parquet from DuckDB, results round-tripped back as parquet via `loadParquet`
      - [x] Phase 6 - 30-second default timeout per run with caller override
      - [x] Phase 6 - System prompt updated: prefer SQL; >7 SQL steps should reconsider; calling conventions documented (`read_input(name)` / `result` variable / `write_output`)
      - [~] Phase 6 - WebR (R runtime) — **partial, out of scope for the demo but still planned post-demo.** Python is enough for the analytic use cases the demo covers. Today only Python is wired in `sandboxExecutor.ts` (`availableRuntimes: ["python"]`) and R steps return an error from the sandbox. The iframe + CSP + parquet bridge are runtime-agnostic, so when WebR is added it slots into the same harness with its own lazy-load + an R-side parquet roundtrip via R's `arrow` package.
      - [ ] Phase 6 - External security review — REQUIRED before exposing python/r to users. The iframe + CSP stack is the spec-correct foundation, but the threat model needs an independent pass (WASM escape paths, CSP bypasses, postMessage replay).
      - [ ] Phase 6 - stdout/stderr UI — currently piped to the parent console only.
    - [ ] Phase 7 - Context compression (summariser pass, routing-decision cache, OpenRouter prompt caching, `chat_token_usage` table + dashboard)
    - [~] Phase 9 - Canvas annotation + export
      - [x] Phase 9 - `PlanAnnotationStateManager` with text / sticky / arrow / pen annotation types
      - [x] Phase 9 - `PlanCanvasToolbar` with Pan / Text / Sticky / Arrow / Pen / Erase tools + colour palette + Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)
      - [x] Phase 9 - `PlanAnnotationOverlay` renders annotations in canvas-space, pans/zooms with xyflow viewport, pointer events gated by active tool
      - [x] Phase 9 - RoughJS-styled arrows match the existing plan-edge sketch aesthetic
      - [x] Phase 9 - `perfect-freehand` pen strokes
      - [x] Phase 9 - 50-deep undo / redo stack
      - [x] Phase 9 - IndexedDB persistence (`AvandarPlanAnnotationDB` Dexie database, keyed by `(planId, annotationId)`)
      - [x] Phase 9 - PNG export via `html-to-image` (configurable pixel ratio + background; toolbar + minimap excluded from capture)
      - [x] Phase 9 - PDF export via `@react-pdf/renderer` — page 1 is the canvas overview image, then one page per step (description + code + status + schema + row count)
      - [x] Phase 9 - 4 unit tests for the state manager (add / undo / redo / clear-plan-only)
      - [ ] Phase 9 - Save annotations into the virtual-dataset JSONB column so reopening a dataset restores the annotations alongside the plan. Currently annotations stay in IndexedDB (per device).
      - [ ] Phase 9 - Per-annotation drag-to-move handles (current overlay supports create + delete; moving requires the user to delete + redraw).
      - [ ] Phase 9 - Sticky-note resize handles.
    - [x] Plan approval gate - Plans land in `awaiting_approval` and the user must approve before any step runs. Includes a >7-SQL-step hint that suggests reconsidering Python / R.
    - [x] Multi-language plans - The `proposePlan` tool's `type` enum accepts `sql | python | r | clarification`; executor dispatches by type so a plan can mix languages freely.
    - [ ] Cross-cutting - 50-question eval harness with correctness + clarification-count + token-spend scoring
    - [ ] Cross-cutting - System prompt versioning with prompt-version label round-tripped to client
    - [ ] Cross-cutting - avandarlabs.com privacy page copy (sandboxing + PII + bias detection)
    - [ ] Cross-cutting - Spanish + French bias patterns themselves (currently stubs pending social-sector advisor review)
- [x] **5. Install `node-sql-parser`; best-effort SQL → manual query form parsing** (Data Explorer + Dashboards. Supports SELECT / GROUP BY / ORDER BY / WHERE / HAVING / JOIN / nested subqueries. See `docs/demo-features/sql-parser-filter-ui.md`.)
- [x] **6. Bidirectional SQL ↔ manual-query-form sync** (Data Explorer + Dashboards. Knex-based form → SQL regeneration + lossy-mapping warning + overwrite-confirmation flow. Dashboards reuse the same `ManualQueryForm` + `useSqlToStructuredQuery` infra via a per-block `useDashboardManualQueryState` hook in `NLQueryPField`.)
- [ ] **7. Tokenize generated SQL / Python / R — column names + dataset IDs as clickable pills**
- [x] **8. Multilingual voice dictation in chat panel (Whisper, 6 languages, web + desktop)**
  - **Web** uses `@huggingface/transformers` (ONNX). Mic icon next to the model picker; first click prompts to download a Whisper model from Hugging Face. Model weights stream into an IndexedDB-backed cache (no OPFS). A floating bottom-left progress indicator shows `Downloading <model> for voice prompting` with %; toast appears on success. Subsequent clicks record from the mic, run Whisper locally, and inject the transcript into the composer. Web build offers tiny / base / small.
  - **Desktop** uses `smart-whisper` (whisper.cpp via N-API) running in the Bun-main process; weights cached on disk under `<userData>/whisper-models/` so the user can download once and stay offline forever. Adds Medium, Large v3, and Large v3 Turbo to the model picker — those three are gated to Desktop and rendered disabled-with-tooltip in the web build ("These are too big for web and are only available on Avandar Desktop"). React side talks to main via typed IPC contracts (`VoiceContracts.*`); download progress is polled (~500 ms) from `voice.getStatus`.
  - 6 languages surfaced in the UI (English, Spanish, French, Portuguese, Swahili, Chinese) plus auto-detect. No API tokens needed.
- [x] **9. Redesigned dataset Summary view (visualizations, lazy-load, scroll-on-demand)**
  - Doc-style outline with sticky TOC on the left, plain-language headline per column, type-appropriate viz beneath (bar for text top values, range+stddev for numbers, timeline for dates), missing-rate ring when nonzero.
  - Lazy-loaded per column: `getColumnSummary` only fires when a section is within 200px of the viewport.
- [x] **10. Dashboard polish: spacing, typography, color, editable design + semantic tokens, logo upload**
  - Theme + typography presets selectable from the Puck root field panel.
  - Polished dashboard header (left-accented strip, tighter title leading, uppercase byline).
  - Polished DataViz block (elevated card + leading NL prompt).
- [—] **11. Dashboard media: video / image / media embed via Supabase Storage** _(deferred — not needed for the demo)_
- [x] **12. Dashboard publish options: PDF export, QR code, vanity URL**
  - [x] Vanity URL (optional; auto kebab-cased; lands at `/d/<workspaceSlug>/<slug>`).
  - [x] Copy share link to clipboard.
  - [x] QR code (rendered client-side via `qrcode`, downloadable as PNG).
  - [x] Publish modal leads with the URL the dashboard will be published to.
  - [x] PDF export — toolbar `Export PDF` button (`html2canvas` + `jspdf`).
        Two-step modal: (a) export immediately, or (b) annotate-then-export.
        Annotator supports text, arrows, and freehand strokes drawn via RoughJS
        with adjustable roughness, stroke width, and color.
- [—] **13. Workspace-private dashboard sharing via Share modal (dashboards as shareable resources)** _(deferred — not needed for the demo)_
- [x] **14. Slice-aware public publishing (package only the data slices the dashboard reads)**
  - New `Data scope` section in the Publish modal. Default mode `queried`
    publishes only the columns referenced by DataViz SQL + FilterPBlock
    columns (column-narrowed via `node-sql-parser`'s `columnList`). Other
    modes: `all_columns` (full dataset) and `custom` (explicit column
    allow-list + row filters).
  - Slice config persists in `dashboard.config.__publishConfig` so future
    re-publishes default to the same selection.
- [x] **15. Viewer-editable global dashboard filters**
  - New `Filter` P-block with single-select, multi-select, and contains modes.
  - SQL composes cleanly via subselect wrap so block-level WHERE / GROUP BY etc. are preserved.
- [x] **16. Viewer-editable per-viz dashboard filters**
  - **Per-viz global-filter opt-out**: each DataViz block has a `Global filters` side-panel field with three modes — `All` (subscribe to every dashboard filter, default), `Some` (checkbox list of registered FilterPBlocks), `None` (ignore all).
  - **Local filters**: each DataViz block has a `Local filters` side-panel field that lets the editor define filters that only apply to that chart. Each local filter has label / column / mode (single, multi, contains) / options / default. Viewers see inline controls above the chart with a "Reset" button when active.
  - Local filter state lives in the block (not the global filter manager), so two vizzes can each define a filter on `province` and end up with independent viewer-selected values.
  - Bumped dashboard schema to `v4`; new `AvaPageDataMigrationV4` seeds `globalFilterSubscription` + `localFilters` on every existing DataViz block.
- [x] **17. Publish-time slice picker (default = dashboard creator's slices; opt in to more)**
  - Same `Data scope` UI as #14: per-dataset accordion lets the publisher
    pick `queried` (default), `all_columns`, or `custom`. Custom mode
    supports column checkboxes plus row filters: enum (TagsInput),
    number range (NumberInput pair), and date range (text inputs).
  - Row-filter type is auto-suggested from the column's `AvaDataType`
    (numeric → range_number; date/time/timestamp → range_date;
    everything else → enum).
- [x] **18. Make dashboard "View" button work before "Publish"**
  - New auth-gated preview route at `/<workspaceSlug>/dashboards/preview/<dashboardId>` shows the read-only render with a "Back to editor" banner. Public route at `/public/dashboards/...` still enforces `isPublic`.
- [~] **19. Everything still works in Desktop + offline mode**
  - **Auth offline ✅** (Desktop checkpoint) — keychain holds refresh token
    - cached access-token payload; offline relaunch restores session
      with `mode: "offline-cached"`.
  - **Local SQLite reads ✅** (Phase 2 + post-signin bootstrap) — workspace /
    dataset / config tables populate on first sign-in; subsequent launches
    read locally via the `createSqliteCrudClient → IPC → bun:sqlite` path.
  - **DuckDB queries offline ✅** — still routed through duckdb-wasm in the
    webview (Dexie-cached parquets). Native DuckDB via IPC is wired but unused
    until Task 6 consumer migration lands.
  - **Voice dictation offline ✅** — desktop path via `smart-whisper`
    (`registerVoiceHandlers` + `createWhisperService`); web path via item #8.
  - Remaining gaps tracked under item #2 (Desktop Phase 2 finishing).
- [~] **20. Manual querying works offline (LLM queries don't, but manual must)**
  - Manual query form runs against duckdb-wasm in the webview; parquet bytes
    survive across launches via Dexie. End-to-end demo flow validated by the
    desktop offline runbook (`docs/demo-features/desktop-offline-session.md`).
  - Re-verify once dashboard manual-query work (#21) is exercised end-to-end.
- [x] **21. Manual query form available inside dashboards**
  - The DataViz block's right-side `NLQueryPField` is now three tabs:
    `Prompt` (existing AI flow), `Manual` (full structured query form —
    data source, columns, aggregations, filters, sort), and `SQL`
    (existing read-only/editable view).
  - The Manual tab reuses `ManualQueryForm` from the Data Explorer
    (refactored to a controlled component) and a per-block
    `useDashboardManualQueryState` hook that holds the structured query
    in local state, regenerates SQL via `structuredQueryToSQL` on every
    form change, and writes it back to `nlQuery.rawSql`.
  - When external SQL changes (e.g. an AI generation lands), the hook
    re-derives the structured query via the shared
    `useSqlToStructuredQuery` parser and surfaces the same lossy-mapping
    warnings + overwrite-confirmation flow the Data Explorer ships.
  - No schema changes: the structured query is ephemeral local state,
    re-derived from `rawSql`.
- [x] **22. Chat panel works inside dashboards — produces Puck blocks (P-blocks)**
  - New `addDashboardBlock` chat tool registered when on the dashboards surface.
  - New `DashboardEditorStateManager` queues blocks emitted by the chat panel; the editor view drains them on render.
  - Composer + empty state unlocked on dashboards with surface-specific copy and starter suggestions.
- [—] **23. Optional local model fallback for offline use (only if 8 GB RAM-feasible)** _(deferred — not needed for the demo)_
- [~] **24. Lingui i18n: EN / FR / ES / AR (with RTL) / ZH / SW; workspace-level language setting**
  - Lingui v6 wired up: `lingui.config.ts`, Babel macro via `@vitejs/plugin-react`, dynamic catalog loader, Mantine `DirectionProvider` keyed on locale for RTL.
  - 8 locales scaffolded: `en, es, pt, fr, sw, ar, zh-Hans, zh-Hant` (PT and split zh-Hans/zh-Hant added beyond the original brief).
  - Per-workspace language picker in `WorkspaceSettingsPage` (new **Language** tab). Selection persisted in `localStorage` per `workspaceId`, applied immediately via `WorkspaceI18nProvider` mounted in `WorkspaceLayout`.
  - Translations implemented **only on the workspace settings page** so far (per "start small" brief). All other surfaces still render English regardless of locale.
  - Scripts: `pnpm i18n:extract`, `i18n:extract-clean`, `i18n:compile`, `i18n:check`, `i18n:translate-llm`, `i18n:update`.
  - LLM translator (`scripts/i18n/translateWithLLM.ts`) now hits the **OpenAI Chat Completions API** (default `gpt-4o-mini`; override with `--model` or `I18N_LLM_MODEL`). Auth via `OPENAI_API_KEY` loaded by `dotenv` from `.env.development` (falls back to `.env.development.edge`). CLI flags: `--help`/`-h` (also printed when no args), `--scope <pattern>` (repeatable + comma-separated; matches against the entry's `#:` source-file references so we can translate page-by-page), `--locale <code>` (repeatable + comma-separated), `--all`, `--model`, `--dry-run`. Covered by 32 vitest tests in `scripts/i18n/translateWithLLM.test.ts`.
  - **Spanish (`es`) translations populated for the Workspace Settings page** (all 15 msgids: page chrome + Language tab copy). Other locales / surfaces still empty by design — run `pnpm i18n:translate-llm --scope <Page> --locale <code>` to extend coverage one page / language at a time.
  - Remaining: populate the other 6 locales for Workspace Settings (1 command each), smoke-test RTL flip on Arabic, and decide whether to extend coverage past the settings page.
- [—] **25. React Joyride onboarding tour** _(deferred — not needed for the demo)_
- [x] **26. Usage analytics — Supabase table + RLS** (`usage_analytics_events`)
  - Client-side event logging shipped: dataset imported, dashboard published, chat message sent, chat SQL generated, dashboard block added via chat, dashboard filter changed.
- [x] **27. Hugging Face API token plumbing (`.env.development` only, never committed)** — token will be added when Whisper / HF features land in item #8. Reminder: do **not** commit it; do **not** add to docs.
- [ ] **28. New dataset types `datasets__pdf` and `datasets__image` with annotation → CSV extraction**
- [x] **29. BUGFIX: chat canvas stops updating after multi-turn**
  - Memoization fix applied to `useChatPageContext`. Needs browser verification with the four-turn repro.

## Quality / process gates

- [x] Typecheck passing on the merged branch
- [ ] Full test suite passing on the merged branch (not yet run — duckdb native build was blocked in the previous session; needs to be run locally)
- [ ] Smoke test in the browser (import a CSV, run a chat query, drop a CSV, save to dashboard) before showing to beta users
- [ ] Run `supabase db diff` locally against the hand-written analytics migration to catch any drift

---

## DEFERRED — explicitly out of scope for the demo

These items are real features in the original 30-line brief but were
**intentionally deferred** by product. They will not block the demo and
should not be picked up unless explicitly re-prioritised.

- **#11 — Dashboard media (video / image / media embed via Supabase Storage)**
  Needs Storage bucket setup + a media-picker P-block. Real work but
  not differentiating for the demo audience.
- **#13 — Workspace-private dashboard sharing via Share modal**
  Internal-share-only path for dashboards. The public-publish path
  (with vanity URL + QR) covers every demo flow we plan to show.
- **#23 — Optional local-model fallback for offline LLM**
  Conditional on #8 (Whisper local) landing, and #8 is itself out of
  scope. The "everything works offline" demo guarantee is satisfied by
  the manual query path; the LLM path is documented as online-only.
- **#25 — React Joyride onboarding tour**
  Walk-the-user-through guided tour. Demo is presenter-driven; a
  guided tour competes with the presenter and adds little.

The remaining `[ ]` items are still in scope for the demo but not
started yet. The remaining `[~]` items are partial — see the inline
notes for each one to know what's done and what's missing.

---

## How to ask for more work

Reference an item by its number or short title — e.g. "do #21" or "wire
analytics event logging for #26". If you want me to skip ahead (e.g.
"start on dashboards first") that's fine; the checklist exists so you
don't have to re-paste the original brief every time.
