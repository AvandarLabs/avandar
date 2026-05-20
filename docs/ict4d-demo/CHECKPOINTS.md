# `feat/ict4d-demo` — Demo Branch Status

This branch consolidates outstanding PRs and adds demo-specific work for the
ICT4D demo. Each checkpoint below is a discrete unit that should be reviewable
on its own when we break this branch up into production PRs.

The user's original brief asked for 29 mega-features (Desktop Phase 2, local
Whisper voice dictation in 6 languages, PDF/image OCR with handwriting,
bidirectional SQL ↔ form sync, full i18n, dashboard rebuild, sliced public
publishing, viewer-editable filters, onboarding tour, analytics, and more).
That scope is multiple weeks of senior engineering work and cannot fit into a
single ephemeral session. This document is the honest accounting of what
shipped, what is partially in flight, and what was explicitly **deferred**.

---

## Checkpoint 1 — PR consolidation ✅

Merged branches into `feat/ict4d-demo`:

| #           | Branch                                      | Description                                                                                                                           |
| ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 234/235/236 | `claude/async-dataset-import`               | Stacked stack: BROWSER_FILEREADER registration → streaming CSV/XLSX → parquet → two-phase async import with resume + status tracking. |
| 224         | `claude/app-wide-dropzone-1LDvD`            | Drop a CSV/XLSX anywhere in the workspace to start the import flow.                                                                   |
| 228         | `claude/floating-query-windows-wVgcY`       | Draggable, collapsible "Query Details" + "Visualization Settings" floating windows in the Data Explorer.                              |
| 229         | `claude/add-dataset-drawer-K0E1O`           | Replaces the modal "Open Dataset" with a tabbed drawer (Saved / Import).                                                              |
| 232         | `claude/disable-chat-visual-feedback-74FcL` | Visually disables the chat panel composer on screens where chat is not available.                                                     |
| —           | `claude/add-series-support-734EZ`           | Multi-series visualization improvements (the "multi-series PR with visualization improvements" the user called out).                  |
| —           | `claude/fix-tablet-responsiveness-MqAFc`    | Modernized media query syntax + tablet-scale verification script.                                                                     |
| —           | `claude/add-python-r-execution-hKxZd`       | **Spec only** — only the chat-interactive-workflows design doc; no implementation.                                                    |

### Notable conflict resolutions

- `WorkspaceLayout.tsx` — the dropzone (`<AppDropzone>`) is now nested inside
  `<ChatPanelProvider>` so both apply globally.
- `DataExplorerApp.tsx` — the dataset drawer's "Open" button replaces the old
  modal `Open` button, but the floating-windows toolbar (Query Details +
  Settings) from PR #228 is preserved. The drawer also includes the
  per-virtual-dataset Save guards from #229.
- `useSaveDataset` / `DatasetImportForm` / `ManualUploadView` — kept **both**
  the `onAfterSave` callback (used by the app-wide dropzone modal) and
  `onSaveSuccess` (used by the dataset drawer for in-canvas open). Different
  callers want different semantics; they no longer conflict.

### Type-error fixes carried in the merge commit `2a67c767`

The async-dataset-import PR removed `LocalDatasetClient.storeLocalCSV` /
`storeLocalExcel` but two non-test callers (`ResyncDatasetCard.tsx`,
`GoogleSheetsImportView.tsx`) still depended on them. Both now call the new
`startCsvImport` / `startXlsxImport` Phase A pipeline.

Test fixtures across `DatasetImportForm.test.tsx`, `useImportedColumns.test.ts`,
`ManualUploadView.test.tsx`, and `GoogleSheetsImportView.test.tsx` were
updated to include the now-required `parquetData` field on
`DuckDbLoadCsvResult` / `DuckDbLoadXlsxResult`.

`tsconfig.app.json` gained the `WebWorker` lib so the new
`src/workers/xlsxSniff.worker.ts` can reference `DedicatedWorkerGlobalScope`.

`LocalDatasetParsers.ts` was tightened: every optional field uses
`z.union([T, z.undefined()])` rather than `z.X().optional()` so the Zod schema
matches the strict TS type (required key, undefinable value).

---

## Deferred — explicitly NOT implemented in this branch

These are demo-critical items from the original brief that I could not
deliver to a beta-user-quality bar in a single session. Each needs its own
session with focused scope.

### Desktop Phase 2 — native layer

Plan at `docs/superpowers/plans/2026-05-13-electrobun-desktop-phase-2-native-layer.md`
is **4,298 lines**. The session container cannot build, sign, or test native
desktop binaries, so any work here would be type-only and unverifiable.

### Local Whisper voice dictation (item #8, #19) — **shipped (web + desktop) in Checkpoints 11–12**

6 languages including Swahili and Chinese, working offline on 8 GB-RAM
machines. Both surfaces now ship: web via `@huggingface/transformers`
with IndexedDB-backed weights (Checkpoint 11), and desktop via
`smart-whisper` (whisper.cpp/N-API) running in the Bun-main process with
disk-backed weights (Checkpoint 12). The desktop path also unlocks the
larger Medium / Large v3 / Large v3 Turbo models, which the web build
intentionally lists as disabled-with-tooltip.

### PDF / image dataset types with handwriting OCR (item #28)

"Turn a hand-drawn table or hand-filled form into a CSV." Annotation UI
(bounding-box drawing on PDF + image), OCR pipeline (Tesseract for typed
text, vision-LLM fallback for handwriting), CSV materialization, dataset
type plumbing across the platform. Research-grade problem on the
handwriting side. Defer.

### Bidirectional SQL ↔ form sync (items #5, #6)

**Data Explorer surface shipped** in Checkpoint 7 — `node-sql-parser`
projects arbitrary SELECTs onto the manual form, surfaces a
"best-effort approximation" alert when anything is dropped, and the
form-to-SQL knex pipeline regenerates SQL on every manual edit.
**Dashboards still pending** (item #21 surface).

### Full i18n with RTL (item #24)

Lingui setup is small. Translating an entire app surface for 6 languages
(including review-quality Arabic + Swahili) is not. The "generate all
translations yourself" instruction would produce machine-translated UI text
that beta users in those locales would immediately reject. Defer until a
human translation review pass is budgeted.

**Update (Checkpoint 12):** Lingui v6 is now wired up end-to-end, but
translation **coverage is intentionally limited to the workspace settings
page**. Other surfaces still render English. See Checkpoint 12 below.

### Tokenized code rendering (item #7)

"Render every column name as a pill, every dataset id as a clickable pill
showing the dataset name." This is a SQL-aware editor with semantic
tokens — feasible but a multi-day project. Defer.

### Dashboard rebuild (items #10–#17, #21, #22)

**Shipped:**

- ✅ #10 — Theme + typography presets (default / ocean / forest / rose /
  amber / graphite × system / serif / mono). Polished header (left-accent
  strip, tighter title leading, uppercase byline). Polished DataViz card.
  (Checkpoint 9.) Logo upload is still pending.
- ✅ #12 — Vanity URL (kebab-case), copy-to-clipboard, QR code with
  download, PDF export with optional annotation (RoughJS).
  (Checkpoint 13.)
- ✅ #14 — Slice-aware publishing: per-dataset slice picker in the
  Publish modal (queried / all_columns / custom with column allow-list
  and row filters). (Checkpoint 13.)
- ✅ #17 — Publish-time slice picker UI ships as the same `Data scope`
  section as #14. Defaults to the narrowest slice; publisher opts in to
  more. (Checkpoint 13.)
- ✅ #15 — Viewer-editable global filters. New `Filter` P-block with
  single-select, multi-select, and contains modes; SQL composes via
  subselect wrap. (Checkpoint 9.)
- ✅ #16 — Per-viz filter UI fully shipped in Checkpoint 14:
  global-filter `All/Some/None` opt-out plus inline viz-local filters
  with `select_single`, `select_multi`, and `contains` modes.
- ✅ #18 — View-before-publish preview route + "Back to editor" banner.
- ✅ #22 — Chat panel inside the dashboard editor emits new DataViz
  P-blocks via the `addDashboardBlock` tool. (Checkpoint 9.)

**Still pending:**

- #10 — Logo upload (the typography + theme tokens shipped)
- #11 — Media embedding via Supabase Storage (deferred)
- #13 — Workspace-private dashboard sharing via the Share modal (deferred)
- #21 — Manual query form in dashboards

Each of these is its own focused session.

### Onboarding tour (item #25)

React Joyride walkthrough. Small but needs design pass + content. Defer.

### Usage analytics (item #26)

**Table shipped** in Checkpoint 3. **Client-side event logging shipped**
in Checkpoint 9: `dataset.imported`, `dashboard.published`,
`chat.message_sent`, `chat.sql_generated`,
`dashboard.block_added_via_chat`, `dashboard.filter_changed`. Adding
more event names is a matter of importing `logAnalyticsEvent` at the
relevant call site; the allowlist lives in `analyticsEventTypes.ts`.

### Improved Summary view (item #9)

**Shipped** in Checkpoint 6. Doc-style outline with sticky TOC,
plain-language headline per column, type-appropriate visualisations,
lazy per-column SQL via IntersectionObserver.

### Local-model fallback (item #23)

Conditional on item #8 landing first.

---

## Checkpoint 2 — Chat context memoization (likely fix for bug #29) ✅

`src/components/ChatPanel/useChatPageContext.ts` previously returned a new
object literal on every render (conditional spreads). That caused
`useAvandarChatRuntime`'s `useMemo([..., pageContext, ...])` adapter to bust
every render, which combined with assistant-ui's per-render
`__internal_setOptions` effect (see
`node_modules/.pnpm/@assistant-ui+core@.../src/react/runtimes/useLocalRuntime.ts`
lines 59–62) appears to leave the runtime in a state where later turns drop
their side effects despite the assistant text still containing the SQL.

The hook now memoizes by content (`pathname`, `openDatasetId`, `rawSQL`,
`lastQueryError`) so the same logical context returns a stable reference.

**Verification required** with a real browser session and a real chat
backend — the session container cannot run the four-turn repro. If the
canvas-update bug persists after this lands, the next thing to investigate
is whether assistant-ui's `__internal_load` is somehow truncating in-flight
turn state when called mid-fetch.

---

## Checkpoint 3 — Usage analytics table ✅

`supabase/schemas/30.usage_analytics_events.sql` (declarative) and
`supabase/migrations/20260519092454_usage_analytics_events.sql` (matching
migration) add a first-party `usage_analytics_events` table.

Shape: `id`, `workspace_id`, `user_id`, `event_name` (stable string),
optional `app` enum, optional `payload` jsonb, `created_at`. Indexed for
both per-workspace and per-event-name time queries.

RLS:

- Authenticated users can INSERT events for workspaces they belong to.
  The policy verifies `user_id = auth.uid()` so members cannot impersonate
  each other.
- Workspace owners can SELECT events for their own workspaces — this
  unblocks the future "workspace usage" admin panel without needing a
  service-role round trip.

**Client-side event logging is NOT wired up yet.** Adding events at key
spots (dataset imported, query ran, dashboard published, chat message
sent) is a small follow-up. The table is ready.

The migration was hand-written because `supabase` CLI is not installed in
this container. Run `supabase db diff` locally before merging to catch
any drift between the declarative schema and the migration.

---

## Checkpoint 4 — Chat interactive workflows: Phase 0 (slim) + Phase 1 ✅

The spec lives in
`docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`.
It's 7 phases totalling ~16.5 engineer-weeks. This checkpoint ships
the demo-impactful slice: a **clarification flow** that asks the user
one structured question before generating SQL when the request is
ambiguous, plus the minimal **PII + bias guardrails** the clarification
flow depends on.

### What shipped

**Privacy detectors** (`src/lib/privacy/`):

- `piiDetector.ts` — column-name keyword layer + content regex layer
  (email, US SSN, Luhn-validated credit cards, IBAN, IP, date-of-birth,
  street address). Aggregation rules per spec: both-layers-fire ⇒
  critical, demographic / free-text ⇒ warning. Medical category is
  surfaced so a follow-up can plug in the typed-confirmation tier.
  **16 unit tests** in `piiDetector.test.ts`.
- `biasDetector.ts` — gender / ethnic / cultural / loaded-framing /
  statistical-assumption rules with curated hand-written suggestions
  per the spec. **11 unit tests** in `biasDetector.test.ts`.
- All 27 tests green; pure functions, no network or DOM.

**Consent modal** (`src/components/Privacy/ConsentModal/`):

- Three modes implemented: `clean` (Mode A), `pii_warning` (Mode B,
  default-cancel + ack checkbox), `bias_nudge` (Mode C, non-blocking +
  "use suggestion" option).
- Modes **D** (composite — bias + PII fire together) and **E**
  (medical-strict typed-phrase confirmation) are explicitly deferred.

**`crossBoundary` API** (`src/lib/privacy/crossBoundary.tsx`):

- Single chokepoint with the shape the spec mandates. Opens the
  appropriate modal mode and returns either an approved payload (with
  detected pattern labels + ack token) or `{ approved: false, reason }`.
- **v0 caveat**: the ack token is a UUID string with `v0.` prefix;
  there is **no HMAC + session-secret signing yet** and the backend
  does **not** reject unsigned data transfers. This is intentionally
  flagged in the file and in the checklist — wiring HMAC + the
  `UNAPPROVED_DATA_TRANSFER` rejection is the next Phase 0 task.
- Currently called from two paths: outgoing user message bias check,
  and clarification answer submission.

**Backend `clarify` tool** (`supabase/functions/chat/chat.routes.ts`):

- Registered alongside `generateSql` in the Data Explorer tool list.
- System prompt extended with the When-to-clarify / When-NOT-to-clarify
  / How-to-clarify block from the spec, including the bias-neutral
  rule.
- Hard cap of 3 clarifications per analytic question, counted by
  matching `[Clarification answer: ...]` markers in the user-visible
  history. When the cap is reached, the `clarify` tool is omitted from
  the request entirely so the model has to commit to SQL.
- Response type extended with optional `clarification` field
  (`shared/types/chat.types.ts` + `ChatClarifyRequest` +
  `ChatClarifyResponseShape`).

**Inline clarification UI** (`src/components/ChatPanel/`):

- `ClarificationCard` renders three variants: free-text, fixed-options
  single, fixed-options multi.
- Keyboard behaviour per spec: auto-focus on mount, Enter submits,
  Escape triggers "Let AI decide".
- `PendingClarificationBlock` mounts in the `ChatThread` above the
  composer when a clarification is pending. On answer it programmatically
  appends a new user message tagged with `[Clarification answer: ...]`
  via `useThreadRuntime().append(...)`.
- Free-text clarification answers route through `crossBoundary` for
  bias + PII; fixed-option answers don't (the LLM produced the options,
  no new user content crosses the boundary).
- `ChatPanelStateManager` extended with `pendingClarification` plus a
  `setPendingClarification` action.

**User-message bias check**:

- `useAvandarChatRuntime` now runs the bias detector on the latest
  user-typed message before each turn. If hits fire, the consent modal
  (Mode C, bias nudge) opens; on cancel, the turn ends with a
  "(Message not sent.)" assistant reply.

### What was explicitly deferred (logged for next session)

- HMAC + session-secret signing on ack tokens
- Backend `UNAPPROVED_DATA_TRANSFER` rejection
- Dexie-backed audit log + `/settings/privacy/log` page
- Medical-strict typed-phrase tier (Mode E)
- Composite consent modal (Mode D)
- Spanish + French pattern files (English-only for v1)
- Clarification telemetry table
- Phases 2–7 (discovery clarifications, plan DAG, schema drift, branching,
  Python/R sandbox, context compression)

### Verification

- `pnpm exec tsc -b --noEmit` — clean.
- `pnpm exec vitest run src/lib/privacy/ src/components/ChatPanel` —
  30/30 tests passing.
- **No real-browser end-to-end verification was possible** in the
  remote container: the chat backend requires a running Supabase
  edge function with an OpenRouter API key. The next session
  should spin up the dev server and run a four-turn ambiguous-question
  repro to confirm the clarify flow actually clears the cap and falls
  through to `generateSql`.

---

## Checkpoint 5 — Phase 0 deferred items + Phase 1 telemetry ✅

This checkpoint closes out the Phase 0 deferred items called out in
Checkpoint 4 and adds the Phase 1 clarification telemetry table.

### What shipped

**HMAC-signed ack tokens, end-to-end** (`supabase/functions/_shared/privacy/ackToken.ts`,
`src/lib/privacy/sessionSecret.ts`, `src/lib/privacy/pendingAcks.ts`):

- Per-(workspace, user) session secret derived from `SB_SECRET_KEY` via
  HMAC-SHA256 (`"ackToken:v1:${workspaceId}:${userId}"`). Both client
  and server derive the key independently — never on the wire.
- New `GET /chat/:workspaceId/session-secret` endpoint returns the
  base64-encoded derived key. Client caches it in memory (never
  localStorage) via `getSessionSecret`.
- Tokens are `base64url(headerJson).hex(HMAC-SHA256(headerB64, K))`.
  Header carries `nonce`, `workspaceId`, `userId`, `issuedAt`,
  `expiresAt` (issued + 5 min), `payloadHash` (SHA-256 of approved
  text).
- `verifyAckToken` on the backend rejects with one of `malformed`,
  `bad_signature`, `expired`, `wrong_workspace`, `wrong_user`,
  `payload_hash_mismatch`, `nonce_replay`.
- Replay protection is a process-local seen-nonce `Map` with 10-minute
  TTL — good enough for the single-instance edge deployment we ship
  today; CHECKPOINTS notes the Redis/Supabase upgrade for multi-instance.
- Constant-time signature comparison (`_timingSafeEqual`).

**Backend `UNAPPROVED_DATA_TRANSFER` rejection** (`supabase/functions/chat/chat.routes.ts`):

- `POST /chat/:workspaceId/messages` now accepts an optional
  `consentAcks: ConsentAck[]` array. When present, each ack is
  verified before any LLM call. Any failure raises an `AvaHTTPError`
  prefixed `UNAPPROVED_DATA_TRANSFER:` with the specific reason,
  surfacing as a 400 to the client.
- `isRowDataMessage` server helper (`supabase/functions/_shared/privacy/isRowDataMessage.ts`)
  is wired and ready for Phase 2+. v1 chat traffic doesn't include row
  data so the helper isn't yet enforced on every message; the v2 cut
  will demand a token for any row-shaped message.

**Pending-ack queue** (`src/lib/privacy/pendingAcks.ts`):

- Module-scope `Map<payloadHash, PendingAck>` populated by
  `crossBoundary` on approval. `useAvandarChatRuntime` drains matching
  acks just before posting and attaches them as `body.consentAcks`.
- Acks are single-use (`Map.delete` on consume) and expire after 5 min
  to match token TTL.

**Consent modals: Modes D + E** (`src/components/Privacy/ConsentModal/ConsentModal.tsx`):

- Mode D (composite): PII + bias detected together; ack checkbox + bias
  decision in one modal; "Use suggestion" still available.
- Mode E (medical-strict): user must type the exact phrase
  `SEND HEALTH DATA` to enable Send. Triggered automatically when the
  PII detector flags a medical-category hit.

**Dexie consent audit log** (`src/lib/privacy/consentAuditLog.ts`):

- Standalone Dexie DB (`AvandarConsentAuditDB`) — separate from the
  main app DB so adding the table doesn't force a main-schema bump.
- Records every consent decision with metadata only: detected pattern
  labels, mode shown, decision (`approved` / `used_suggestion` /
  `cancelled`), source column, value count, content length, locale,
  detector version, ack token nonce. **Never the values themselves.**
- 90-day retention window enforced on read.
- `clearConsentLog()` lets the user wipe.
- `consentLogToCsv()` formats for download.

**Privacy log page** (`src/views/WorkspaceSettingsPage/PrivacyLogTab/`):

- New "Privacy log" tab in Workspace Settings (visible to all
  workspace members, not just settings admins — own decisions only,
  no cross-user view).
- Filter by decision; export CSV; clear log.
- Per-row badges for PII / bias labels.

**Phase 1 clarification telemetry**
(`src/lib/privacy/clarificationAuditLog.ts`):

- Separate Dexie DB (`AvandarClarificationAuditDB`).
- `recordShown` writes the row when the LLM emits a clarification;
  `recordOutcome` updates it when the user answers / let-AI-decides /
  cancels. `timeToAnswerMs` is the delta. Question text and answer
  text are never stored — only metadata + counts.

**Spanish + French pattern stubs** (`src/lib/privacy/patterns/{es,fr}/`):

- Stub files document the spec's decision (`#1`): non-English bias
  patterns are NOT machine-translated; they wait for a social-sector-
  advisor review before activation. Until then, Spanish/French locales
  fall back to English detectors with translated UX copy.

### Testing

- `pnpm exec vitest run src/lib/privacy/` — **46 tests passing** across
  `piiDetector`, `biasDetector`, `ackToken`, `ackTokenRoundtrip`,
  `isRowDataMessage`.
- `ackTokenRoundtrip.test.ts` is the highlight — it inlines a
  server-mirror `verifyAckToken` and round-trips the spec wire format
  through 6 scenarios (valid, wrong-secret, wrong-workspace, wrong
  payload hash, expired, malformed). The client and server
  implementations are independently authored against the same spec; this
  test locks in their agreement on the wire format.
- `isRowDataMessage.test.ts` mirrors the server helper so client-side
  vitest catches any drift.
- `tsc -b --noEmit` clean.
- **Live OpenRouter end-to-end testing was not possible from this
  remote container**: `openrouter.ai` is not on the allowlist and
  `supabase start` fails because AWS CloudFront (where Supabase
  images live) is also blocked. Both run fine locally. The
  protocol-level round-trip test ensures the HMAC contract is
  correct independent of the live network round-trip.

### What's still deferred (next session)

- Eval set (20 ambiguous questions, ≥80% resolution target) — needs a
  scratch dataset + an automated runner.
- Server-issued nonce registry (v2 of the ack-token design) — replay
  protection currently in-memory on the edge worker.
- Spanish + French bias patterns themselves (pending advisor review).
- Phase 2 (discovery clarifications) onwards.
- Lint rule that prevents bypassing `crossBoundary` in code — spec
  calls for a custom ESLint rule; not in scope for this checkpoint.

---

## Checkpoint 6 — Quick wins: View-before-publish, publish modal, summary redesign ✅

Three demo-quality wins requested as a tight batch:

### Item #18 — "View" works before "Publish"

The "View" button previously navigated to the public route, which then
rendered an "access denied" panel for any dashboard with `isPublic =
false`. There was no way to preview your own dashboard until you
published it.

- New auth-gated preview route:
  `/<workspaceSlug>/dashboards/preview/<dashboardId>`
- `DashboardViewerView` now takes a `mode: "public" | "preview"` prop.
  In `preview` mode it skips the `isPublic` gate and renders a banner
  ("Previewing this dashboard … Back to editor"). The public route
  still hard-enforces `isPublic` so the public guarantee is preserved.
- View button tooltip now warns if there are unsaved Puck edits.

### Items #2 + #3 — Publish modal with vanity URL, copy link, QR code

`PublishDashboardButton` opens a real modal instead of a confirm
dialog:

- Optional vanity URL field with live snake-case preview
  (`toVanitySlug` — 8 unit tests covering casing, diacritic
  stripping, length cap, collapse-to-empty).
- `publishDashboard` mutation extended with optional `slug`.
- New vanity route: `/d/<workspaceSlug>/<slug>`. Looks up by
  `(workspace_id, slug)` which is unique-per-workspace in the schema.
- `ShareUrlRow` component shows both the canonical id-based URL
  (always available) and the vanity URL (when set). Each row has a
  one-click copy button and a "Show QR code" action that opens a
  modal with a downloadable 256×256 PNG, generated client-side via
  the `qrcode` library (no network call).
- Button label flips: "Publish" before, "Published" (filled teal)
  after — clicking it again opens "Manage sharing" mode.

### Item #9 — Summary view redesign

Replaces the long `ObjectDescriptionList` with a doc-style outline:

- Two-pane layout: sticky outline TOC on the left (highlights active
  section as you scroll); scrollable content area on the right.
- One section per column. Each leads with a one-sentence plain-
  language summary (e.g. "Heavily repeated: Lagos appears in 87% of
  rows."), then a type-appropriate viz beneath, then sub-stats.
- Lazy per-column SQL via a new `getColumnSummary(datasetId,
workspaceId, columnName, dataType)` query. Sections only fire their
  query when within 200px of the viewport
  (`@mantine/hooks` `useIntersection`). Wide datasets (50+ columns)
  no longer pay for 50 queries upfront.
- Type-specific blocks live in three sibling files
  (`TextColumnSummary`, `NumberColumnSummary`, `DateColumnSummary`):
  - **Text** — top values rendered as horizontal share-of-rows bars
    (not a donut; bar reads faster for "how dominant is the top").
  - **Number** — min→max range with the mean plotted as a marker tick
    and ±1σ shown as a tinted band; min / avg / max / stddev / kind
    as inline stats below.
  - **Date** — horizontal timeline: oldest endpoint on the left, most
    recent on the right, coverage span labelled centre.
- Missing-rate ring (`RingProgress`) appears only when missing > 0;
  yellow accent at >20%, neutral otherwise.

`DatasetQueryClient` got two new methods: `getDatasetMeta` (cheap row
count + columns list for the outline) and `getColumnSummary` (the
per-column unit). The existing `getSummary` was refactored to call the
new shared helper rather than inlining the per-column logic.

### Files touched

- New: `src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/`
  (4 files: container, body, three type-specific visuals, plus CSS)
- New: `src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx`
- New: `src/routes/d/$workspaceSlug.$slug.tsx`
- New: `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/`
  (modal, share-row, slug helper + tests, URL builder)
- Modified: `DashboardViewerView`, `ViewDashboardButton`,
  `PublishDashboardButton`, `DashboardEditorView`, `DashboardClient`
  (publish mutation accepts `slug`), `DatasetQueryClient` (refactor +
  two new methods), `DatasetMetaView` (switches the summary tab to
  the new view).

### Verification

- `tsc -b --noEmit` clean.
- All 96 unit tests pass (including the 8 new `slug` tests, the 4
  existing dashboard tests, and the 27 privacy tests).
- Vite production build succeeds (used to regenerate the TanStack
  Router gen file for the new routes).
- Not verified end-to-end in a browser — same network-policy
  limitation as before. You'll see the full UX after pulling this
  branch and logging into staging with the test user.

---

## Outstanding investigation — bug #29 (chat canvas stops updating)

**Symptom**: after several chat turns, the assistant returns correct SQL,
but the Data Explorer canvas no longer re-renders the new query result.

**Investigation so far**:

1. `setRawSql` in `DataExplorerStateManager` always returns a new state
   object (via `setValue`), so state updates are not being shallow-equal
   skipped at the reducer level.
2. The data query (`useDataQuery.tsx`) keys on `rawSQL`, so changing the
   string should always refetch.
3. `useChatPageContext()` returns a **new object literal every render**
   (line 21 onward — conditional spreads). This causes
   `useAvandarChatRuntime`'s adapter `useMemo([workspace.id, pageContext,
dataExplorerDispatch])` to bust **every render**.
4. `@assistant-ui/core`'s `useLocalThreadRuntime` calls
   `__internal_setOptions(opt)` and `__internal_load()` on **every render
   with no deps** (the `useEffect` at line 59–62 of
   `useLocalRuntime.ts`). The runtime instance is created **once** via
   `useState(() => new LocalRuntimeCore(opt, initialMessages))`, but
   `__internal_setOptions` is called continuously. If `__internal_load`
   has a side effect that resets the in-flight turn state when called
   mid-fetch, this would explain why later turns silently drop their
   side effects.

**Most likely root cause**: the unstable `pageContext` object causes the
adapter to thrash, which combined with assistant-ui's per-render
`__internal_setOptions`/`__internal_load` calls eventually leaves the
runtime in a state where it no longer dispatches the captured
`setRawSql` from `adapter.run()` — even though the assistant text still
includes the SQL.

**Fix applied** in Checkpoint 2. Memoizing `useChatPageContext` by
content stops the adapter from being recreated every render and stops
the assistant-ui runtime from being thrashed by per-render
`__internal_setOptions` calls. Needs a real browser run to confirm the
canvas-update bug is gone in the four-turn scenario.

---

## Checkpoint 7 — SQL ↔ manual query bidirectional sync + recursive filter UI ✅

Implements items **#5** and **#6** of the demo feature checklist. Full
detail lives in `docs/demo-features/sql-parser-filter-ui.md`.

**Phase 1 (SQL → form).** `node-sql-parser` is installed and used by
`shared/models/queries/StructuredQuery/sqlToStructuredQuery.ts` to
project arbitrary SELECT statements onto our existing
`PartialStructuredQuery` shape (data source, columns, aggregations,
GROUP BY, ORDER BY, LIMIT/OFFSET, WHERE → recursive filter tree).
The parser returns `{ query, isFullyMapped, unmappedReasons }` so the
UI can surface a "best-effort approximation" alert in the SQL view
when anything was dropped (CTEs, HAVING, joins, window functions,
subqueries, multi-column ORDER BY, etc.).

**Filter UI.** A new recursive filter editor backed by
`react-querybuilder` + `@react-querybuilder/mantine`, hosted in
`src/views/DataExplorerApp/QueryForm/QueryFiltersField.tsx`. Supports
nested AND/OR groups and the operators the parser handles. Translates
to/from a library-agnostic `QueryFilterGroup` type that's part of the
canonical `StructuredQueryRead`.

**Phase 2 (form → SQL).** The DuckDB-specific knex codepath in
`toRawDuckDBQuery.ts` was extracted into a reusable
`structuredQueryToSQL.ts` utility that also renders the new WHERE
clause. The Data Explorer state manager calls it from every manual-form
action (data source, columns, aggregations, sort, filters) so the SQL
view and chat panel stay in sync without extra plumbing.

**Sync tracking.** `DataExplorerAppState` now carries
`isStructuredQueryInSync: boolean` and `sqlSyncWarnings: string[]`. The
chat panel writes both via `applySqlMapping` whenever new SQL arrives;
the SQL view writes them when the user edits SQL by hand. The manual
form refuses to silently overwrite an out-of-sync SQL string - instead
it pops a confirmation Alert. On confirmation it regenerates SQL from
the form, which flips the flag back to `true`.

**Tests.** 17 unit tests across `sqlToStructuredQuery.test.ts` (12) and
`structuredQueryToSQL.test.ts` (5). All green via
`pnpm vitest run shared/models/queries/StructuredQuery`.

**Verification gap.** Playwright MCP browser captures could not be
produced in this session because the navigate action was denied. The
deterministic parser/regenerator behaviour is fully covered by unit
tests; a follow-up session with browser permissions should add the
screenshots under `docs/demo-features/screenshots/` and a mocked-AI
E2E test under `tests/e2e/` to lock the chat → canvas integration.

---

## Checkpoint 9 — Dashboard polish + chat-in-dashboards + viewer filters + analytics events ✅

This checkpoint ships four investor-facing demo items: design tokens for
dashboards (#10), the "type a question, get a chart on the page" chat flow
inside dashboards (#22), viewer-editable global filters (#15/#16), and the
client-side analytics-event wiring follow-up to #26.

### Item #10 — Dashboard polish + design tokens

`AvaPageRootProps` grew two new fields, `theme` and `typography`, both
configurable from the Puck root field panel:

- `theme` (default / ocean / forest / rose / amber / graphite) — drives
  page background, accent color (rendered as a 4px coloured strip beside
  the dashboard title), title colour, subtitle colour, and byline tint.
- `typography` (system / serif / mono) — switches the heading font family
  while keeping body type neutral.

`getDashboardDesignTokens` (`src/views/DashboardApp/AvaPage/utils/dashboardDesignTokens.ts`)
returns the resolved CSS tokens; the root render of
`getDashboardPuckConfig` consumes them. The header is now a left-accented
block with tighter line-height, uppercase byline, and a 60ch subtitle for
better legibility. The `DataVizPBlock` got a subtle elevated card style
(soft shadow + rounded corners) and now leads with the block's NL prompt
so the dashboard reads like a doc.

### Item #22 — Chat in dashboards generating P-blocks

The "wow" demo moment: type a request in the chat panel on the dashboard
editor and a new visualization block lands on the page.

Backend (`supabase/functions/chat/chat.routes.ts`):

- New `dashboards` system prompt (one-block-per-turn, viz-type guidance,
  schema in context).
- New `addDashboardBlock` OpenAI-function tool with strict schema:
  `{ prompt, sql, vizType }`. SQL is run through the same
  `cleanGeneratedSQL` pass as `generateSql`.
- New response shape field `dashboardBlock: ChatGeneratedDashboardBlock`
  on `ChatResponse`.

Frontend:

- New `DashboardEditorStateManager` queues pending blocks emitted by the
  chat panel. Mounted at the workspace layout so the editor view can
  consume them on the next render.
- `useChatPageContext` now ships `dashboardId` so the backend knows which
  dashboard the request belongs to (used by the dashboards system prompt
  - analytics events).
- `useAvandarChatRuntime` handles the new `response.dashboardBlock` path,
  builds a Puck content item via `buildPendingDataVizBlock`, and queues
  it on the editor state manager.
- `DashboardEditorView` drains the queue into its in-memory Puck `data`
  and marks the editor dirty so Save can be activated.
- Composer + empty state are unlocked on the dashboards surface with
  dashboard-specific placeholder text + starter suggestions.

### Items #15 + #16 — Viewer-editable filters

New `Filter` P-block + new `DashboardFilterStateManager` context provider
that wraps both the editor and the viewer. Three filter modes:

- `select_single` — Mantine `<Select>` with comma-separated options.
- `select_multi` — Mantine `<MultiSelect>` (op = SQL `IN`).
- `contains` — text input (op = SQL `ILIKE '%val%'`).

`applyDashboardFiltersToSql` wraps the block's SQL in a subselect
(`SELECT * FROM (<raw>) AS _ava_filtered WHERE …`) so filters compose
cleanly with arbitrary inner queries, including ones with their own
WHERE / GROUP BY / ORDER BY. The helper supports an optional
`subscribedFilterIds` whitelist for per-viz overrides (item #16).

DataViz blocks subscribe via `useApplyDashboardFiltersToSql`. The
filter's viewer-selected value survives Puck re-renders because
`registerFilter` merges with any existing entry by `filterId`.

### Item #26 follow-up — Client-side analytics events

New `src/lib/analytics/analyticsClient.ts` writes to the
`usage_analytics_events` table via Supabase. Failures swallow silently;
analytics never blocks a user action. The user id is read from the
session, so callers don't have to thread it.

Wired call sites:

- `dataset.imported` — `useSaveDataset` success branch.
- `dashboard.published` — `PublishDashboardModal` success branch.
- `chat.message_sent` — `useAvandarChatRuntime` before each backend POST.
- `chat.sql_generated` — when the chat backend returns SQL.
- `dashboard.block_added_via_chat` — when the chat backend returns a
  `dashboardBlock`.
- `dashboard.filter_changed` — `FilterPBlock` onChange.

The event-name allowlist is in `analyticsEventTypes.ts`; callers pass
typed event names so typos can't accumulate.

### Tests

15 new unit tests across:

- `applyDashboardFiltersToSql.test.ts` — 9 tests covering equals, IN,
  ILIKE, AND-combining, semicolon-trimming, single-quote escaping, and
  the subscribed-filter whitelist.
- `buildPendingDataVizBlock.test.ts` — 2 tests.
- `dashboardDesignTokens.test.ts` — 4 tests.

1 new mocked Playwright spec (`tests/e2e/dashboard-chat-block.spec.ts`)
that intercepts the OpenRouter call and asserts the dashboard editor
appends a DataViz block when a chart request comes back from the
mocked backend.

All previously-passing tests still pass (65 tests in
`src/views/DashboardApp/`, 109 in `src/components/ChatPanel/` + `src/lib/`).

### Verification gap

- **No real-OpenRouter end-to-end** was possible in the remote container
  this session: the local Supabase stack can't pull the postgres image
  (CloudFront rate limit, same as previous checkpoints), and the
  hosted edge function does not have `OPEN_ROUTER_API_KEY` set yet.
  The Vercel preview built off `feat/ict4d-demo` should be used to
  validate the live chat → P-block flow.

---

## Checkpoint 8 — Publish modal polish, kebab-case slugs, chat panel transparency fix ✅

Three follow-up fixes from a hands-on browser review of Checkpoint 6:

**Publish modal copy — leads with the URL.** Modal now opens with
"Your dashboard will be published to: `<url>`". Default `<url>` is
the canonical UUID-based public URL; it updates live as the user
types in the Custom URL field below. Helper line beneath says
"By default we use a permanent UUID-based link. Add a custom path
below for a nicer URL." and flips to "Using your custom URL. The
permanent UUID link below also still works." once they type
something. The pre-publish state no longer hides this URL behind a
section header.

**Slugs switched to kebab-case.** Earlier copy said "snake-case"
but the user wanted kebab-case. `toVanitySlug` now produces
`my-cholera-report` (was `my_cholera_report`); all eight unit tests
updated accordingly. Placeholder is now `e.g. cholera-outbreak-2024`
and the helper copy is explicit: "Whatever you type is kebab-cased
automatically." Modal-wide rename of "Vanity URL" → "Custom URL"
for the same reason.

**Chat panel transparency bug — fixed (not an iPad artifact).** The
chat panel's disabled state (any page that is NOT the Data Explorer)
was applying only `rgb(0 0 0 / 6%)` as a background. Against the
dark navbar gradient that sits behind it, 6 % black reads as fully
transparent — which is what showed up on the Vercel preview. iPad
was simply where the user noticed it. The Stack also had a competing
inline `bg={disabled ? undefined : "white"}` prop that interacted
badly with the CSS rule.

Fix:

- Removed the inline `bg` prop from the Stack in `ChatPanel.tsx`.
- `.shell` in the CSS module is now opaque-white by default
  (`var(--mantine-color-white)`).
- `.shellDisabled` uses the subtle off-white
  (`var(--mantine-color-neutral-0)`) instead of a low-opacity black
  overlay. The disabled-state visual signal now lives in the existing
  composer placeholder text-tint, not in the panel background.

All 57 affected tests still pass; `tsc -b --noEmit` clean.

---

## Checkpoint 9 — Desktop Phase 2.5 LITE: keychain-backed offline session ✅

Original plan: `docs/superpowers/plans/2026-05-19-electrobun-desktop-phase-2.5-consumer-migration.md`
(consumer migration of ~86 files to `usePlatform()` / `getPlatformImpls()`).

**Scope decision.** The full plan ships across ~6–8 PRs of mechanical
consumer migration. The ICT4D demo only needs the desktop binary to
survive a "quit → go offline → relaunch → still signed in → still
queryable" loop. This checkpoint ships the **minimum** to deliver that
loop, plus the platform foundation so the full consumer migration can
land later as isolated PRs without re-doing infrastructure.

### What shipped

**Platform foundation (web + desktop):**

- `src/config/platform/platformRegistry.ts` — module-level
  `getPlatformImpls()` / `setPlatformImpls()` so plain TS modules under
  `src/clients/` reach the same impls `usePlatform()` returns. Throws
  loudly when read before `PlatformProvider` mounts (4 unit tests).
- `src/config/platform/PlatformProvider.tsx` — publishes the resolved
  impls into the registry on mount via `setPlatformImpls`.
- `src/config/platform/createWebDuckDbClient.ts` — replaced throw-stub
  with a real wrapper around the legacy `DuckDbClient` singleton.
  Forwards `runRawQuery`, `runStructuredQuery`, `loadFromUpload` to
  duckdb-wasm. Throws with a migration pointer for legacy-only
  features (`returnType: "parquet"`, shared `conn`, named-template
  params) so a future consumer migration surfaces the gap loudly
  instead of silently falling through.
- `src/config/platform/createWebDatasetBlobStore.ts` — replaced
  throw-stub with a Dexie-backed implementation. Supports the
  canonical `workspaces/<wsId>/datasets/<dsId>/data.parquet` key
  against `AvaDexie.DB.LocalDataset`. Rejects malformed keys.

**Desktop offline-session polyfill (`src/clients/AuthClient.ts`):**

- When `isDesktop()` is true, `getCurrentSession` / `signIn` /
  `signOut` / `onAuthStateChange` route through
  `getPlatformImpls().authProvider` (the keychain-backed
  `DesktopAuthProvider` from Phase 2). Web behavior is byte-identical.
- Synthesises Supabase-shaped `User` / `Session` objects from the
  leaner platform `Session` so existing consumers (`useAuth`,
  `signin.tsx`, route guards) see no shape change.
- The wider `AuthClient` surface — `requestPasswordResetEmail`,
  `updatePassword`, `updateEmail`, `register` — stays on Supabase JS
  even on desktop. Those flows require network and aren't on the
  offline path.
- 4 desktop-polyfill unit tests in `src/clients/AuthClient.test.ts`.

**Bun-main: cached access token for offline-restart**
(`apps/desktop/main/ipc/registerAuthHandlers/registerAuthHandlers.ts`):

- Sign-in / refresh now write a JSON `{accessToken,
accessTokenExpiresAt, userId, email}` payload to the keychain at
  `com.avandarlabs.desktop / supabase-cached-session`, in addition to
  the existing refresh-token entry.
- `getSession` falls back to the cached payload when the refresh
  exchange fails (network down, Supabase unreachable, etc.) and
  returns the session with `mode: "offline-cached"`. The webview
  treats the user as signed in; local-only paths (SQLite reads via
  IPC, duckdb-wasm queries against Dexie-cached parquets) work
  normally; any Supabase-direct call still fails as it would offline.
- `signOut` deletes both the refresh-token and cached-session entries.

**Bun-main: post-signin snapshot bootstrap** (`apps/desktop/main/index.ts`):

- `registerAuthHandlers` accepts an `onAuthenticated(accessToken)`
  hook. After a successful sign-in, the desktop main process calls
  `bootstrapSnapshotIfNeeded` against Supabase REST to populate every
  `SYNCABLE_TABLES` entry into the local SQLite mirror.
- Removes the previous dependency on the `AVA_DEV_ACCESS_TOKEN` env
  var for first-launch data population.
- Idempotent — subsequent sign-ins skip tables that already have rows.

### Demo flow this unlocks

1. Online, fresh keychain: `pnpm dev:desktop`, sign in. Bun-main logs
   `[snapshot-bootstrap] inserted N rows` per syncable table.
2. Browse to one dataset so its parquet caches into Dexie. (IndexedDB
   persists in Electrobun's WKWebView container.)
3. Cmd+Q, turn WiFi off, relaunch `pnpm dev:desktop`. Session restored
   from the cached keychain payload (`mode: "offline-cached"`).
   Workspace list / dataset list render from local SQLite via the
   `createRdbCrudClient → createSqliteCrudClient` IPC path already
   wired by Phase 2. Open dataset → duckdb-wasm queries against the
   Dexie-cached parquet.
4. Keychain Access shows two entries under `com.avandarlabs.desktop`:
   `supabase-refresh-token` and `supabase-cached-session`.

### What is explicitly NOT in this checkpoint

These are part of the full Phase 2.5 plan, deferred:

- **Consumer migration of ~80 files to `usePlatform()` /
  `getPlatformImpls()`.** Tasks 5/6/7/8 of the original plan. Not
  needed for the demo because the legacy Dexie + duckdb-wasm paths
  already work offline once cached. Track as a follow-up; each
  domain (auth / duckdb / dataset blob / serverApi) can ship as
  its own ~5-file batch PR.
- **ESLint `no-restricted-imports` guardrail** (Task 4 sub-step).
  Would block the unmigrated consumers from building today; add it
  after the consumer migration lands.
- **IPC bridge runtime verification** (Task 1). The bridge in
  `apps/desktop/main/ipc/createElectrobunIpcTransport/` has not been
  end-to-end booted in this session. If sign-in fails on desktop with
  an IPC error, that's the first place to look.
- **Phase 2 acceptance checklist** (Task 9). Cold-`userDataDir` test
  requires interactive boot; verifiable only by running through the
  demo flow above.

### Verification

- 8 new unit tests pass (4 `platformRegistry`, 4 `AuthClient` desktop
  polyfill).
- All 79 existing desktop tests still pass (`pnpm test:desktop`).
- `pnpm type-check` clean for the changed files. The 4 pre-existing
  `feat/ict4d-demo` test failures (`ManualUploadView`,
  `GoogleSheetsImportView`, `useLoadManualUploadFile`,
  `DashboardEditorView`) are unaffected — confirmed present on
  `feat/ict4d-demo` before this checkpoint.
- `pnpm lint` clean on the touched files (one pre-existing
  react-refresh advisory on `PlatformProvider.tsx`'s co-located
  `usePlatform` export).

### Demo doc

User-facing demo runbook lives at
`docs/demo-features/desktop-offline-session.md`.

---

## Checkpoint 9b — Chat workflows Phase 0/1 hardening + Phase 2 + Phase 3 (list view) ✅

The spec at
`docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`
is 7 phases totalling ~16.5 engineer-weeks. This checkpoint closes
the remaining Phase 0/1 gaps from Checkpoints 4/5, lands all of
Phase 2, and ships Phase 3 as a list-based DAG view.

### What shipped

**Phase 0/1 hardening**:

- ESLint chokepoint guard on `crossBoundary` (`eslint.config.js`):
  `issueAckToken` and `registerAck` can only be imported from
  `crossBoundary.tsx`. Adding a new caller anywhere else fails CI.
- Privacy log page gains a Clarifications sub-tab listing
  `clarificationAuditLog` entries (turn number, shape, outcome,
  time-to-answer). Metadata only — never the question text or answer.

**Phase 2 — Discovery Clarifications**:

- New `discovery` response shape on the `clarify` tool. The LLM emits
  a short DuckDB `SELECT DISTINCT` query whose result populates a
  dropdown.
- Shared `isReadOnlyDiscoveryQuery` validator on client + server
  (11 unit tests). SELECT/WITH only, no semicolons, ≤2000 chars.
- `ClarificationCard.DiscoveryBody` runs the query in DuckDB-WASM
  with loading / error / empty handling.
- `PendingClarificationBlock` routes the user's selection through
  `crossBoundary` with context `discovery_clarification` so PII
  detection fires on column name + content.

**Phase 3 — Plans + DAG (v1 list view in this checkpoint; replaced
with xyflow canvas in Checkpoint 10)**:

- New `proposePlan` tool (≤8 steps, schema-validated server-side).
- `PlanStateManager` + `planExecutor.ts` run each step in DuckDB-WASM
  as a `step_<id>` temp view; failures short-circuit the rest.
- `dropPlanTempViews` cleans up.

### Caveats noted

- Live-AI testing was impossible inside the container (`openrouter.ai`
  not on the allowlist). Verification gated on the Vercel preview.

---

## Checkpoint 10 — Chat workflows Phase 3 finish + Phase 4 + Phase 9 spec ✅

Same spec as Checkpoint 9. This checkpoint replaces the list view
with the visual xyflow canvas, adds IndexedDB step materialisation

- virtual-dataset plan persistence, ships Phase 4 (schema-drift
  regen) entirely, and adds a new Phase 9 architecture section to the
  spec.

### What shipped

**Phase 3 — visual canvas**:

- `@xyflow/react` DAG with MiniMap, pan + zoom, layered left-to-right
  layout (`planLayout.ts`).
- `RoughEdge.tsx` re-traces xyflow's bezier path through
  `roughjs/svg` for Excalidraw-style hand-drawn arrows. Per-edge seed
  derived from the edge id keeps the wobble stable across renders.
- `PlanStepNode.tsx`: custom node with status icon, badge,
  description, schema hint, inline error.
- Animated `overview` ↔ `focused` zoom via `fitView({ duration })`
  and `setCenter`. Click a node → 350ms zoom into it; toolbar exposes
  a Zoom in / Zoom out toggle.
- Auto / Step run-mode toggle in the toolbar.

**Phase 3 — IndexedDB materialisation** (per the user's explicit
"do NOT use OPFS" instruction):

- New `planStepStorage.ts` owns `AvandarPlanStepDB`, a dedicated
  Dexie database keyed by `(planId, stepId)`.
- Every successful step writes its full parquet bytes there.
- **Storage hygiene**: blobs are cleared explicitly via
  `clearPlanStepBlobs(planId)` when a plan is closed, replaced, or
  the chat runtime sees a new `proposePlan` response. Never
  accumulated by TTL — explicit cleanup avoids storage bloat.

**Phase 3 — virtual dataset plan persistence**:

- New `plan_steps` JSONB column on `datasets__virtual` (migration +
  declarative schema + RPC update at
  `supabase/migrations/20260519154902_*` and
  `..._plan_steps_rpc.sql`).
- `SaveAsNewDatasetForm` captures the current plan when saving from
  a multi-step analysis.
- `SavedDatasetsView` calls `rehydratePlan()` when opening a virtual
  dataset that has one. Each cached parquet blob is re-registered as
  a DuckDB view via `loadParquet`; missing blobs are recomputed by
  re-running the step's SQL.

**Phase 4 — Schema-Drift Regen** (entire phase):

- New `POST /chat/:workspaceId/regenerate-plan` endpoint with a
  forced `regenerateSteps` tool call. Body: drift report + full
  plan. Returns rewritten SQL + updated `predictedSchema` per
  affected step.
- Client: `isSchemaDrift` (strict — names + order + type
  case-insensitive) + `findAffectedDownstream` (BFS over the input
  graph). 11 unit tests + 4 graph tests.
- `executePlan` accepts an optional `driftRegen` context. After each
  step succeeds, the executor diffs predicted vs actual; on drift it
  hits the regen endpoint, dispatches `replaceStepCode`, and re-runs
  the affected steps in plan order.
- Cap: ≤2 regen attempts per step, tracked locally per run.

**Phase 9 — Canvas Annotation + Export** (architecture only, no
implementation):

- Added "Phase 9 — Canvas Annotation + Export" section to the spec
  doc. Covers text / arrow / sticky / pen annotations persisted in
  IndexedDB + onto virtual datasets, and PDF + image exports via
  `@react-pdf/renderer` + `html-to-image`.

### Testing

- 145 vitest tests passing (was 60 at the start of Checkpoint 9).
- `tsc -b --noEmit` clean.
- `eslint .` clean.
- `vite build` succeeds.

### Live verification still pending

None of Phase 3 / Phase 4 has been exercised against the real LLM or
a real Vercel preview yet — same network restriction as Checkpoint 5.
Three smoke checks gate Phase 5 work:

1. Real `proposePlan` turn — canvas renders, steps run, zoom feels right.
2. Real schema-drift case — force a wrong predicted schema, watch
   the regen endpoint fire.
3. Save → close → reopen a multi-step plan as a virtual dataset.

### Deferred from Checkpoint 10 (tracked in FEATURE_CHECKLIST.md)

- Phase 0: `containsHealthData` workspace UI; opt-in
  `shareAnonymousPrivacyMetrics`; server-issued ack-token nonce
  registry (replay protection is in-memory today).
- Phase 1: silent bias re-prompt loop; 20-question eval set.
- Phase 2: ack-token signing for `values` scope (text scope is fine);
  "Edit selection" hook on the consent modal.
- Phase 3: viz **thumbnails** on each plan node (currently shows
  schema text, not mini-charts).
- Cross-cutting: 50-question eval harness; prompt versioning;
  Spanish + French bias patterns themselves.

### Doc cleanup

- `docs/demo-features/chat-interactive-workflows.md` was removed in
  Checkpoint 10. The spec at
  `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`
  is the only source of architecture truth; granular status lives in
  `docs/ict4d-demo/FEATURE_CHECKLIST.md`; what-shipped-when lives in
  this file.

---

## Checkpoint 11 — Multilingual voice dictation (web) ✅

Item #8 of the brief — local Whisper voice prompts inside the chat
composer — is now wired end-to-end in the web build. Desktop parity is
still deferred (see "Deferred" section above; it blocks on Desktop
Phase 2).

### What shipped

- **Microphone button** in the chat composer, immediately left of the
  model picker (`src/components/ChatPanel/VoiceInputButton`). First click
  opens a consent modal that lets the user pick a model and language; on
  confirm the download begins in the background.
- **Whisper model catalogue** (`src/lib/voice/voiceModels.ts`):
  `Xenova/whisper-tiny` (~75 MB, default), `whisper-base` (~145 MB),
  `whisper-small` (~485 MB). All multilingual, all on the public
  Hugging Face Hub — no API key needed.
- **Language picker** in the consent modal: auto-detect plus English,
  Spanish, French, Portuguese, Swahili, Chinese (the six languages the
  brief explicitly called out).
- **`VoiceModelManager` singleton** (`src/lib/voice/VoiceModelManager.ts`)
  orchestrates download / progress / transcribe / status pub-sub. Uses
  `useSyncExternalStore` to drive React subscribers.
- **IndexedDB-backed cache** (`src/lib/voice/voiceModelCache.ts`) plugged
  into `@huggingface/transformers` via `env.useCustomCache`. Per the demo
  brief, no OPFS — weights live in a dedicated Dexie database called
  `AvandarVoiceModelCache`. Survives page reloads; cleared if the
  download fails so retries aren't poisoned.
- **Floating bottom-left progress indicator**
  (`src/components/VoiceModelDownloadIndicator`) mounted globally from
  `AppShell`. Renders only while a download is in flight; hover reveals
  `Downloading <model> for voice prompting` as a tooltip; body shows %
  - current file. Success / failure surfaced via Mantine notifications.
- **Microphone capture pipeline** (`src/lib/voice/audioCapture.ts`):
  `MediaRecorder` (opus/webm with mp4/ogg fallback) → `decodeAudioData`
  → `OfflineAudioContext` resample to 16 kHz mono Float32 (Whisper's
  required input format). Mic tracks are explicitly stopped after each
  recording so the OS indicator clears.
- **Composer integration** uses `@assistant-ui/react`'s
  `useComposerRuntime().setText` to append the transcript to whatever
  the user already typed.

### Testing

17 vitest cases covering: localStorage marker round-trip + malformed
payload tolerance, manager download / progress / transcribe flow,
language `auto` handling, error path + stale-marker cleanup,
mime-type negotiation, resample math, and the consent-modal interaction.
Type-check and ESLint clean.

### Verification still pending

- **Live download** — the session container has no outbound network,
  so the actual fetch from huggingface.co was not exercised. Manual
  verification steps are listed in the commit message and the PR
  description.
- **Microphone permission UX** — jsdom can't grant `getUserMedia`,
  so the permission-denied toast path is covered by hand testing only.

### Still deferred for this item

- **Desktop parity** (item #19). Blocks on Desktop Phase 2 — once the
  native shell exists, the same `VoiceModelManager` can be reused with a
  filesystem-backed cache. The UI components and language list will not
  need to change.
- **Per-language pre-bundled models** — today the user picks one model
  and one language at a time. A future polish pass could let the
  composer remember per-conversation language without re-prompting.
- **Streaming transcription** — current flow captures the full clip,
  then runs Whisper. Whisper.js supports chunked streaming via
  `chunk_length_s`; could be wired up if real-time feedback is needed.

---

## Checkpoint 12 — Lingui i18n scaffold + workspace language picker ✅

Partial progress on item #24. The brief was deliberately scoped:
"start small — translate only the workspace settings page" — so the
infrastructure is end-to-end but the translated surface is one page.

### What shipped

- **Lingui v6 wired up**
  - `lingui.config.ts` with `@lingui/format-po`, source locale `en`,
    target locales `es, pt, fr, sw, ar, zh-Hans, zh-Hant`.
  - `@lingui/babel-plugin-lingui-macro` mounted via
    `@vitejs/plugin-react`'s `babel.plugins` option in `vite.config.ts`
    (no extra Rolldown plugin needed).
  - Compiled catalogs land at `src/i18n/locales/<locale>/messages.ts`
    and are git-tracked. They are excluded from ESLint to avoid
    machine-generated-file noise.

- **Runtime**
  - `src/i18n/i18n.ts` — `activateLocale(locale)` dynamically imports
    the compiled catalog and calls `i18n.loadAndActivate(...)` on the
    shared instance.
  - `src/i18n/WorkspaceI18nProvider.tsx` — loads the catalog on locale
    change, sets `<html dir>` + `<html lang>`, wraps children in
    Mantine's `DirectionProvider` (keyed on locale so LTR↔RTL flips
    cleanly remount) and Lingui's `I18nProvider`.
  - `src/i18n/useLanguagePreference.ts` — per-workspace language stored
    in `localStorage` (`avandar:workspace-language:<workspaceId>`),
    exposed via `useSyncExternalStore` + a synthetic event so
    in-tab subscribers re-render immediately on change.

- **Workspace-level setting**
  - New **Language** tab between **Tags** and **Privacy log** in
    `WorkspaceSettingsPage`. Lists all 8 locales with their native
    label + English name + an `RTL` marker for Arabic.
  - `WorkspaceI18nProvider` is mounted in `WorkspaceLayout`, so the
    locale switches with the workspace.

- **Translated surface (intentionally minimal)**
  - **Only** `WorkspaceSettingsPage` and the new `WorkspaceLanguageTab`
    use `Trans`/`t` from `@lingui/react/macro`. 15 message ids extracted.
  - All other pages still render English regardless of locale.

- **Scripts (all prefixed `i18n:`)**
  - `pnpm i18n:extract` — refresh `.po` catalogs.
  - `pnpm i18n:extract-clean` — drop obsolete entries.
  - `pnpm i18n:compile` — emit runtime TS catalogs.
  - `pnpm i18n:check` — extract + `git diff --exit-code` (CI-friendly).
  - `pnpm i18n:translate-llm` — LLM filler (see below).
  - `pnpm i18n:update` — extract → translate-llm → compile.

- **LLM translator** (`scripts/i18n/translateWithLLM.ts`)
  - Parses each non-source `.po`, batches empty `msgstr` entries
    (40 per request), sends them through OpenRouter with the existing
    `OPEN_ROUTER_API_KEY` (default model `anthropic/claude-sonnet-4.5`,
    overridable via `I18N_LLM_MODEL`), enforces JSON output, writes
    each translation back into the same `.po` without re-ordering or
    losing comments.
  - Supports `--dry-run` and per-locale args
    (`pnpm i18n:translate-llm -- fr es`).

### Verification

- `pnpm type-check` clean.
- `pnpm lint` clean on all new files.
- `pnpm vite build` clean end-to-end.
- `pnpm test:frontend` — 6 pre-existing failures (verified via
  `git stash` baseline), no regressions from i18n changes.

### What is NOT done

- Catalogs are still empty on disk for every non-source locale.
  Running `pnpm i18n:update` with `OPEN_ROUTER_API_KEY` set populates
  them; we did not run it in this session.
- No human translation review pass.
- No `Trans`/`t` coverage on any surface beyond the workspace settings
  page (by design — see brief).
- No live RTL smoke test against the rendered app in a browser. Mantine
  components have first-class RTL support via `DirectionProvider`, so
  this is expected to "just work" once Arabic catalogs are populated,
  but it has not been verified visually.
- Language preference is per-workspace per-browser (localStorage). If
  product wants it server-synced across devices or shared workspace-wide,
  promote it to a `workspaces.preferred_locale` column.

---

## Checkpoint 13 — Slice-aware publish + PDF export with annotation ✅

Three demo items closed in one session: #12 (PDF export — the last
gap in the publish-options trio), #14 (slice-aware publishing), and
#17 (publish-time slice picker — same UI surface as #14).

### Item #14 + #17 — Per-dataset slice picker

New `Data scope` section inside `PublishDashboardModal`, one
accordion item per dataset the dashboard reads. Each item lets the
publisher pick a slice mode:

- **Queried** (default, narrowest) — publish only the columns
  referenced by DataViz SQL queries + any FilterPBlock column
  targets. `node-sql-parser`'s `columnList` extracts the referenced
  columns. `SELECT *` or unparseable SQL safely falls back to "all
  columns required" via a per-dataset `unparseable` sentinel so the
  upload doesn't truncate columns the dashboard actually depends on.
- **All columns** — every column, every row. Equivalent to the
  pre-Checkpoint-12 behaviour. Kept as a one-click escape hatch for
  publishers who want viewers to explore freely.
- **Custom** — explicit column allow-list (checkboxes, with
  "Select all" and "Just what's queried" shortcuts) plus row
  filters. Row-filter type is auto-suggested from the column's
  `AvaDataType`: numeric → number range (`NumberInput` pair),
  date / time / timestamp → date range (text inputs), everything
  else → enum (`TagsInput`).

Slice config persists into `dashboard.config.__publishConfig` — a
sibling key alongside Puck's `{root, content}` — so the JSON-blob
storage we already have is sufficient (no migration). Re-publishes
default to the same selection.

The `publishDashboard` mutation in `DashboardClient` was reworked to:

1. Resolve `extractReferencedColumns(config, dependentDatasetIds)`
   once per publish.
2. Fetch `dataset_columns` for every dependent dataset so it can
   honour custom-mode allow-lists and drop row filters whose column
   doesn't exist on the dataset.
3. For each dataset, materialise the slice via
   `buildSliceSql({baseSelectExpr, sliceConfig, availableColumns,
queriedColumns, treatAsAllColumns})` then run it through
   `WorkspaceQETLClient.runQuery({returnType: "parquet"})` and
   upload the resulting blob to the public bucket.
4. Fast path: `all_columns` + no row filters skips the SQL detour
   and copies the existing parquet blob directly (preserves the
   open-data passthrough behaviour).

### Item #12 — PDF export with annotation

New toolbar button `ExportPdfButton` next to Publish. Opens
`ExportPdfModal`, a two-step flow:

1. **Choose** — "Export as PDF" or "Annotate, then export".
2. **Snapshot / Annotate** — the dashboard is rendered off-screen
   into a fixed-width (1100px) container via `<PuckPageRender>` and
   captured with `html2canvas` at 2× scale. Direct export wraps the
   capture into a paginated portrait letter-size PDF via `jspdf`
   (`pdfExport.ts` slices the tall canvas into page-sized chunks).
3. **Annotate path** — `PdfAnnotator` mounts the captured image
   inside the modal with a transparent overlay canvas. Tools:
   freehand (RoughJS `curve`), arrow (line + two-line arrowhead),
   text (prompt-based). Roughness slider (`0 → 4`, labelled
   `Formal · Sketch · Loose`), stroke width slider (`1–8 px`),
   color picker with 6 swatches, plus undo + clear all. On export
   the annotation canvas is composited onto the base snapshot
   before pagination.

Choice of libraries: `html2canvas` + `jspdf` is the most reliable
combination for snapshotting React + Recharts SVG content; both are
established and synchronous to integrate. RoughJS was already in the
tree (used by `RoughEdge` in the chat plan canvas) and gives us the
"sketch-like" stroke style for free without a heavier canvas library.

Analytics: new `dashboard.pdf_export_opened` event registered in
`analyticsEventTypes.ts` and fired when the modal opens.

### Files touched

- New (shared types): `shared/models/Dashboard/PublishSliceConfig.ts`
- New (logic): `src/clients/dashboards/sliceBuilder.ts` +
  `sliceBuilder.test.ts` (9 tests covering buildSliceSql,
  extractReferencedColumns, persistence round-trip)
- New (UI): `src/views/DashboardApp/DashboardEditorView/`
  `PublishDashboardModal/PublishSliceSection.tsx` (slice picker)
- New (UI): `src/views/DashboardApp/DashboardEditorView/`
  `ExportPdfButton.tsx`,
  `ExportPdfModal/ExportPdfModal.tsx`,
  `ExportPdfModal/PdfAnnotator.tsx`,
  `ExportPdfModal/pdfExport.ts`
- Modified: `src/clients/dashboards/DashboardClient.ts` (publish
  mutation accepts `publishConfig`, materialises slices),
  `PublishDashboardModal.tsx` (mounts slice section, passes
  publishConfig), `DashboardEditorView.tsx` (wires the PDF button),
  `analyticsEventTypes.ts` (new event name).
- Deps added: `jspdf`, `html2canvas`.

### Verification

- `tsc -b --noEmit -p tsconfig.app.json` clean for the new and
  modified files. (Pre-existing missing-module errors in
  `src/lib/voice/VoiceModelManager.ts` are unrelated — Checkpoint 11
  added `@huggingface/transformers` imports that aren't installed in
  this environment.)
- All 74 dashboard tests pass (`vitest run src/clients/dashboards/
src/views/DashboardApp/`), including the 9 new `sliceBuilder` tests.
- ESLint clean on every touched file.

### Live verification still pending

- Browser smoke test of the snapshot path on a real published
  dashboard (Recharts SVGs, theme tokens, RTL).
- End-to-end check that `WorkspaceQETLClient.runQuery` correctly
  materialises a custom slice with row filters into a parquet blob,
  uploads it, and the viewer route loads it without falling over.
- Multi-page PDF export with a tall dashboard — paginator splits at
  pixel rows, so charts that cross a page boundary may look cut.
  Acceptable for the demo; a chart-aware page break is a follow-up.

---

## Checkpoint 12 — Voice dictation on desktop (whisper.cpp via smart-whisper) ✅

Now that Phase 2's IPC + service plumbing exists in the desktop shell,
voice dictation gets a native path that doesn't pay the
transformers.js / onnxruntime-web tax. The webview keeps the exact same
mic button and download-prompt UX — under the hood it transparently
routes to whichever manager backs the current platform.

### What shipped

- **`WhisperService` in `apps/desktop/main/services/createWhisperService/`** —
  thin wrapper around `smart-whisper` (whisper.cpp via N-API). Model
  weights cached on disk under `<userData>/whisper-models/`; the
  downloader is a streaming `fetch` against the public
  `ggerganov/whisper.cpp` Hugging Face repo (we deliberately bypass
  `smart-whisper`'s built-in download so we get progress callbacks +
  control over the cache directory). Writes to `*.partial` first and
  renames on success so a half-written file can never be mistaken for a
  complete model.
- **IPC contracts in `shared/platform/ipc/contracts/VoiceContracts.ts`** —
  `voice.listDownloadedModels`, `voice.isModelDownloaded`,
  `voice.downloadModel`, `voice.getStatus`, `voice.transcribe`. Audio
  travels webview → main as `Array<number>` (Float32 PCM); for a typical
  30-second prompt that's well within the JSON envelope budget.
- **Handler registration** in
  `apps/desktop/main/ipc/registerVoiceHandlers/`. Mirrors the
  `registerDuckDbHandlers` and `registerRdbHandlers` files; downloads
  are kicked off as fire-and-forget so the webview can poll for
  progress.
- **`DesktopVoiceModelManager` in `src/lib/voice/`** — implements the
  shared `IVoiceModelManager` interface, calls IPC, and polls
  `voice.getStatus` every 500 ms while downloads are in flight. Same
  status pub/sub surface as the web manager so the existing floating
  progress indicator + mic button work unchanged.
- **Platform-aware factory** (`voiceModelManagerFactory.ts`). React code
  imports `getVoiceModelManager()` and gets the right backend for the
  current runtime — no per-component branching.
- **Bigger model catalogue.** `voiceModels.ts` now lists Whisper Medium
  (~1.5 GB), Large v3 (~3.1 GB), and Large v3 Turbo (~1.6 GB) with a
  `desktopOnly: true` flag. The web UI still renders the options in the
  model select but shows them disabled with the tooltip "These are too
  big for web and are only available on Avandar Desktop". On web, a
  previously-stored desktop-only selection falls back to the default
  model automatically.
- **`smart-whisper` added as a desktop dependency** (`apps/desktop/package.json`).
  Pulled in lazily (`await import("smart-whisper")`) on first use so a
  missing prebuild can't take the app down at boot.
- **Wiring in `apps/desktop/main/index.ts`** — service constructed at
  startup, models dir resolved from `<userData>/whisper-models` (overridable
  via `AVA_WHISPER_MODELS_DIR`), and `whisperSvc.close()` called on
  `beforeQuit`.
- **Tests**: 6 cases against `createWhisperService` (file presence
  detection, download progress, transcribe, missing model rejection,
  partial-file cleanup on error, unknown model id), 3 cases against
  `registerVoiceHandlers` (list / download-fire-and-return /
  transcribe-with-Float32-roundtrip), 6 cases against
  `DesktopVoiceModelManager` (short-circuit, polling-to-ready,
  polling-to-error, transcribe, language auto, IPC error tolerance),
  and 2 cases against the platform-aware factory. All green.

### Verification still pending

- **Native build** of `smart-whisper` from a fresh `pnpm install` —
  the package uses `node-addon-api` and builds whisper.cpp on
  install. The session container couldn't exercise this; manual
  verification on macOS / Linux desktop builds is required.
- **Live desktop download** of a multi-GB Large v3 weight from
  Hugging Face. The HTTP path is just `fetch` so it should Just
  Work, but we haven't ground-truthed end-to-end.
- **Electrobun ↔ `createIpcServer` bridge.** The handler-registration
  files exist (DuckDB, RDB, Voice) but none of them are actually
  registered against an active webview transport in
  `apps/desktop/main/index.ts` yet. The wiring needs to land before
  any of these IPC paths come alive at runtime — once it does, all
  three handler groups light up together.

### Still deferred

- **GPU acceleration** for whisper.cpp. `smart-whisper` accepts
  `{ gpu: true }`; we pass `false` for now because builds with
  CUDA / Metal turned on require platform-specific toolchains. The
  ggml CPU path is fast enough for prompt-length clips even on
  Medium / Large v3.
- **Model deletion UI.** Users can delete a downloaded model by
  removing the `.bin` file in `whisper-models/`, but there's no
  in-app button. Worth adding once we have a real "Voice settings"
  panel.

---

## Checkpoint 14 — Per-viz filter controls (#16 finished) ✅

Closes the remaining gap from item #16. The viewer-editable filter
story now has two clean layers:

- **Global** (Checkpoint 9): a `Filter` PBlock on the dashboard
  surface applies its WHERE clause to every viz that subscribes.
- **Per-viz**: each DataViz block can opt out of global filters
  and/or add its own viewer-editable local filters that scope
  just to that chart.

### What shipped

**Global-filter opt-out** — new `Global filters` field in the DataViz
side panel with a three-way `SegmentedControl`:

- `All` (default) — subscribe to every dashboard filter.
- `Some` — checkbox list of every registered FilterPBlock on the
  dashboard (read live from the filter state manager so the list
  updates as filters are added or removed). The viz applies only
  the ticked filters; stale subscription ids that no longer exist
  are dropped at SQL-compose time.
- `None` — ignore all global filters; useful for "context" charts
  that should stay anchored regardless of viewer selection.

**Local filters** — new `Local filters` field on the DataViz block
that lets the editor define filter controls scoped to _that one
chart_. Each local filter has label / column / mode
(`select_single`, `select_multi`, `contains`) / options-CSV /
default-value. Local filter state lives inside the block (not the
global filter manager), so two vizzes can each define a filter on
`province` and end up with completely independent viewer values.

**Inline viewer controls** — local filters render as a compact
strip above the chart with appropriate Mantine inputs and a "Reset"
button that appears whenever any value diverges from its default.

### Filter composition

`useApplyDashboardFiltersToSql` now wraps the rawSQL twice when
relevant:

1. First with the subscribed subset of global filters
   (resolved via `resolveSubscribedFilterIds`).
2. Then with each active local filter, converted to the same
   `DashboardFilterRecord` shape via `localFilterToRecord` so all
   the WHERE-clause logic stays in one place
   (`applyDashboardFiltersToSql`).

Composing as two nested subselects keeps each layer independent —
the inner SQL's `WHERE` / `GROUP BY` is preserved at every level.

### Schema migration

Bumped `CURRENT_SCHEMA_VERSION` from `3` to `4` and added
`AvaPageDataMigrationV4` (with downgrade). Upgrade seeds every
DataViz block with the safe defaults `{mode: "all",
subscribedFilterIds: []}` plus `localFilters: []` — so v3 dashboards
behave exactly as they did before. Downgrade strips both fields so
a v3 reader doesn't choke.

V3's frozen types (`AvaPageDataMigrationV3.types.ts`) were
backfilled from the previous `AvaPageTypes` alias into real
standalone declarations, matching the pattern V2 already used.

### Files touched

- New: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/`
  `DataVizPBlock/dataVizFilters.ts` (+ test, 13 cases),
  `DataVizPBlock/useLocalFilterState.ts`,
  `DataVizPBlock/DataVizLocalFilters.tsx`
- New: `src/views/DashboardApp/AvaPage/pfields/`
  `GlobalFilterSubscriptionPField/*` and `LocalFiltersPField/*`
- New: `src/views/DashboardApp/AvaPage/migrations/`
  `AvaPageDataMigrationV4/*` (+ test, 3 cases)
- Modified: `DataVizPBlock.tsx` (consumes new filter props +
  renders inline controls), `buildDataVizPBlockConfig.tsx` (registers
  the two new Puck fields), `resolveDataVizPBlockProps.ts` (defaults
  the new fields on every render so older saved data still works
  while in-flight), `buildPendingDataVizBlock.ts` (chat-emitted
  blocks default to all/none), `useApplyDashboardFiltersToSql.ts`
  (two-layer SQL composition), `AvaPageDataMigrationV3.types.ts`
  (no longer aliases the current types), `constants.ts`
  (CURRENT_SCHEMA_VERSION → 4), `upgradeAvaPageData.ts` (registers
  V4).

### Verification

- `tsc -b --noEmit -p tsconfig.app.json` clean. (Pre-existing
  `@huggingface/transformers` missing-module errors in
  `VoiceModelManager.ts` are unrelated and predate Checkpoint 14.)
- 13 new `dataVizFilters` unit tests pass; 3 new V4 migration tests
  pass; existing 9 V3 + 7 resolveDataVizProps + 11 DataVizPBlock +
  9 applyDashboardFiltersToSql tests still green (59 dashboard
  tests total across the touched modules).
- ESLint clean on every touched file.

### Live verification still pending

- Browser smoke test of the side-panel UX: add a Filter PBlock,
  add two DataViz blocks, set one to `Some` with a subscription,
  one to `None`, configure a local filter on the second, confirm
  each viz responds to the expected set.
- End-to-end check that local-filter state survives Puck re-renders
  (mounting the block re-seeds defaults, which `useLocalFilterState`
  preserves via the `overrides` ref).

---

## Checkpoint 15 — Chat workflows Phase 5 + Phase 6 (Python) + Phase 9 + plan approval gate ✅

Continuing the chat-interactive-workflows spec. This checkpoint
lands Phase 5 (branching foundation), Phase 6 (Python sandboxed
executor — R deferred to a follow-up), Phase 9 (canvas annotations

- PDF/image export), and the plan-approval gate the spec called
  out but Phase 3 had silently skipped.

### What shipped

**Plan approval gate**

- `PlanState.approvalStatus`: `awaiting_approval | approved | rejected`.
  Fresh `loadPlan` lands in `awaiting_approval`; `hydratePlan` (used
  for virtual-dataset reopen) lands in `approved`.
- `PlanFlowView` shows an Approve / Reject banner before any step
  runs. The auto-run effect AND the Re-run button both gate on
  `approvalStatus === "approved"`.
- > 7-SQL-step heuristic: when a plan would need >7 SQL steps, the
  > approval banner suggests reconsidering Python / R — but the user
  > can approve as-is.

**System prompt — multi-language hints**

- `dataExplorerSystemPrefix` updated: prefer SQL even for multi-step
  plans; reach for Python / R only for statistical work
  (regressions, scikit-learn, statsmodels, tidyverse) or heavy
  dataframe-style transformations.
- Documented the sandbox calling convention: each `inputs` upstream
  becomes a local pandas DataFrame named after its `step_<id>`;
  step code must assign the final result to `result`.

**Phase 5 — Branching**

- New `PlanBranchStateManager` (sibling of `PlanStateManager`)
  holding `Record<branchPlanId, BranchRecord>` + `activeBranchId`.
  Each `BranchRecord` carries the parent plan + step ids, anchor
  schema, anchor view name, branch title, and a (lazy-filled)
  `plan` + `statuses` snapshot.
- `PlanStateManager.addBranch` attaches a `PlanBranchRef` onto the
  parent node so the node renderer can show its child branches.
- `PlanBranchSidebar` lists Root + every branch with the active
  one highlighted. X button closes a branch.
- "Branch from here" CTA in the focused-step detail (only on
  succeeded steps).
- **Deferred** (logged in FEATURE_CHECKLIST): separate assistant-ui
  chat thread per branch, virtual-dataset persistence of the branch
  tree.

**Phase 6 — Python + R Sandboxed Executor (Python only — R deferred)**

- New `public/sandbox-executor.html`: same-origin iframe loaded with
  `sandbox="allow-scripts"` (null opaque origin) and strict CSP
  (`default-src 'none'`, `connect-src https://cdn.jsdelivr.net`,
  every other network surface forbidden). Pre-boot stubs additionally
  throw on `XMLHttpRequest`, `WebSocket`, `EventSource`,
  `RTCPeerConnection`; `sendBeacon` is neutered.
- `src/sandbox/sandboxProtocol.ts` is the single source of truth
  for the wire format. Every request carries a `sandboxKey`
  discriminator so rogue messages from extensions get dropped.
- `src/sandbox/sandboxExecutor.ts` runs inside the iframe: lazy
  loads Pyodide from jsdelivr (~10 MB), preloads `pyarrow`,
  `pyarrow.parquet`, `pandas`, exposes `read_input(name)` /
  `write_output(df)` helpers, and reads each input view as parquet.
- `src/sandbox/sandboxClient.ts` is the parent-side client.
  Mounts the iframe lazily on first call, waits for ready+boot,
  posts `run` requests, and serialises concurrent runs (Pyodide is
  single-threaded).
- `executePlanStep` updated: SQL steps stay on the DuckDB-WASM
  path; `python`/`r` steps pull each upstream view out of DuckDB as
  parquet, dispatch to the sandbox, and bring the result back via
  the existing `loadParquet`.
- Default timeout: 30s per run, caller-overridable.
- WebR is deferred to a follow-up — only Python is registered in
  `availableRuntimes` today. R steps return an error from the
  sandbox.
- **NOT YET externally security-reviewed.** The iframe + CSP stack
  is spec-correct, but per the design doc, "external security
  review signed off" is in the Definition of Done. Gate user
  exposure on that review.

**Phase 9 — Canvas Annotation + Export (entire phase)**

- `PlanAnnotationStateManager` with four annotation types — text,
  sticky, arrow, stroke (perfect-freehand pen strokes).
- `PlanCanvasToolbar` floating on the canvas top-left: Pan / Text /
  Sticky / Arrow / Pen / Erase tools, colour swatches, undo / redo
  (Ctrl+Z / Ctrl+Shift+Z), Export menu.
- `PlanAnnotationOverlay` renders annotations in canvas space,
  shares the xyflow viewport's pan/zoom transform, and gates
  pointer events on the active tool. Pan tool → xyflow handles the
  drag; any drawing tool → overlay captures.
- Arrows use the same RoughJS sketch style as the auto-laid-out
  plan edges, so user-drawn arrows visually match the AI ones.
- 50-deep undo/redo stack with snapshot-based history.
- `AvandarPlanAnnotationDB` Dexie database (separate from the step
  parquet keyspace) persists annotations across reloads.
- PNG export via `html-to-image` — toolbar / minimap / controls are
  filtered out of the capture.
- PDF export via dynamic-imported `@react-pdf/renderer` — page 1
  is the overview image, then one page per step with description,
  code, status badge, schema, row count.
- 4 unit tests for the state manager (add / undo / redo / clear-
  plan-only).

### Testing

- 27 chat-panel vitest tests passing (8 new): branch manager (4) +
  annotation manager (4) + existing tests unchanged.
- `tsc -b --noEmit` clean for all new code (the pre-existing
  DashboardApp/AvaPageDataMigrationV3 errors from Checkpoint 10
  remain; not introduced by this checkpoint).
- `eslint .` clean.
- `vite build` succeeds (the new chunk surfaces in the build output
  as `PlanBranchStateManager-*.js` and `@react-pdf` lazy-imports).
- Live verification (real LLM, real sandbox, real Pyodide load,
  real DuckDB-WASM round-trip) still gated on the Vercel preview
  per the constraints described in Checkpoint 10.

### Deferred from Checkpoint 11 (tracked in FEATURE_CHECKLIST.md)

- Phase 5: per-branch chat thread orchestration; virtual-dataset
  persistence of branches.
- Phase 6: WebR / R runtime; external security review; stdout/stderr
  UI panel (currently parent-console only).
- Phase 9: virtual-dataset persistence of annotations; per-annotation
  drag-to-move + sticky resize handles.
- Phase 7 (Context Compression) — not started.

---

## What to do next (recommended order)

1. **Live-verify Checkpoint 10 on the Vercel preview** (see "Live
   verification still pending" above). No new chat-workflows phase
   work should start before this.
2. **Close the Phase 1 bias re-prompt gap** — small, ~2 hours,
   closes the last gap in Phase 1's Definition of Done.
3. **Phase 5 — Branching** — ~1.5 weeks per spec. State model is
   small; bulk of work is assistant-ui thread management.
4. **Phase 7 — Context Compression** — ~1 week. Pairs naturally
   with Phase 5 (branching adds tokens fast).
5. **Phase 6 — Python + R Sandboxed Executor** — ~5 weeks + external
   security review. Defer until 5 + 7 land.
6. **Phase 9 — Annotation + Export** — ~1.5 weeks. Independent of
   Phases 5–7; can be picked up whenever.

Smaller gaps to close opportunistically (see FEATURE_CHECKLIST.md for
the canonical granular list):

- Phase 0: `containsHealthData` workspace UI; opt-in analytics
  setting; server-issued ack-token nonce registry.
- Phase 2: ack-token signing for `values` scope; consent modal "Edit
  selection" hook.
- Phase 3: viz thumbnails on plan nodes.
- Cross-cutting: 50-question eval harness; prompt versioning;
  Spanish + French bias patterns themselves.

If anything in this document does not match what you expected, the
intent is honesty about scope, not aspirations. Better to ship five
solid features than thirty broken half-features in front of beta users
and investors.
