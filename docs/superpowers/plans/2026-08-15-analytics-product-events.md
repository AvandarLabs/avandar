# Analytics Product Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the five product events that the reporting views already read
but no emitter writes: `query.ran`, `query.failed`, `dashboard.pdf_exported`,
`chat.turn_completed`, and `chat.turn_failed`.

**Architecture:** Query events are emitted by `useDataQuery`, keyed on settled
React Query transitions so cached reads and mid-flight retries cannot
double-count, with the run's duration and auto-limit flag carried out of the
query function through a ref. Chat turn events are emitted by the `chat` edge
function, which is the only layer that knows the model id, the attempt count,
and the latency. Every payload derivation lives in a pure, unit-tested builder
module so the emitting call sites stay thin.

**Tech Stack:** TypeScript 5.9, React 19, TanStack Query v5, Vitest, Testing
Library, Supabase Edge Functions on Deno, `AnalyticsClient` (browser) and
`logAnalyticsEvent` (edge).

---

## Global Constraints

> **Where an ordered rule list decides an outcome, either pin the order with a
> test or remove the dependency.** This phase had three: `ERROR_CLASS_PATTERNS`
> in `QueryAnalyticsPayloads`, the mask chain in `_sanitizeMessage`, and
> `_classifyError` in `ChatTurnAnalyticsPayloads`. In every case the first
> matching rule wins, reordering produces a plausible-looking wrong answer
> rather than a crash, and the initial test suite passed with the order
> scrambled.
>
> A test only pins an order if its input matches **more than one** rule.
> Fixtures matching exactly one rule each pass under any permutation. Write at
> least one fixture that two rules both claim, then mutation-test it by
> swapping the pair.
>
> Removing the dependency is better where it is available. `_classifyError`
> ended up there: gating its network arm on `instanceof TypeError` **and** a
> transport-shaped message, rather than either alone, made every realistic
> input classify identically under both orders. Verified across eight cases
> including a provider body containing the word "network" and a programming
> `TypeError`. The remaining two lists genuinely need their pinning tests,
> because regex precedence is the only thing separating their rules.

- Work only in the `feat/analytics-p3` worktree.
- **This phase makes no database changes.** The two enums, the three columns,
  the category mapping, the insert policy, and all seven reporting views
  already cover every event here. If a task appears to need a migration, stop:
  something has been misread.
- Follow red/green TDD for every behavioral change. Write the failing test,
  watch it fail for the right reason, then implement.
- Analytics is fire-and-forget. No emission may block, delay, or fail a user
  action. Every `logEvent` call is `void`-prefixed and never awaited on a user
  path.
- Payloads carry ids, counts, types, classifications, and durations only. They
  never carry SQL text, chat content, dataset names, column values, filter
  values, or email addresses.
- **Error messages are sanitised before they are recorded.** See "The one
  spec conflict this plan resolves" below. No raw SQL may reach
  `usage_analytics_events.payload` through an error message.
- Keep new functions at 45 lines or fewer. Do not refactor unrelated existing
  functions.
- Add no user-facing text. If that changes, route it through Lingui.
- Do not use em dashes in code comments or in this document's output.
- Do not commit, push, merge, or publish. Leave the worktree dirty for user
  review. Each task ends at a review checkpoint instead of a commit.
- Run focused Vitest files only. Do not run the full E2E suite.

---

## Scope

This is Phase 3 of the four-phase plan in
`docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`. Phase 1
(the columns, the category mapping, `util__log_analytics_event`, the edge
helper, the typed registry, the enriched payloads of the seven already-firing
events) and Phase 2 (the eight trigger emitters, the `analytics` schema, the
seven reporting views) are complete and landed on `develop`.

**In scope:**

- `analyticsSurface` on `useDataQuery` and its three call sites.
- `query.ran`, emitted for Data Explorer executions only.
- `query.failed`, emitted from every authenticated surface.
- `dashboard.pdf_exported`, plus the missing `blockCount` on
  `dashboard.pdf_export_opened`.
- `chat.turn_completed` and `chat.turn_failed` from the `chat` edge function.
- Payload types for all five events in the shared registry, which currently
  resolve to `undefined`.

**Out of scope**, and untouched by this plan:

- `dashboard.share_settings_updated`. The spec's Phase 3 list at line 518 is
  stale: this event has been emitted since Phase 1B by
  `makeDashboardPublishAnalyticsEventFromDashboards.ts:33`. Task 11 corrects
  the spec.
- Everything in Phase 4: `chat_samples`, the `detectPii` move, the surrogates
  module, and the capture pipeline. `chat.turn_completed` ships here with
  `wasSampled: false` and no `piiSeverity`, and Phase 4 fills both in.
- `dashboard.public_viewed` and the public-dashboard `query.failed` gap. Both
  need an anonymous edge route and stay deferred. A public dashboard that
  fails to render still records nothing after this plan, by design.
- Any change to `supabase/schemas/`, `supabase/migrations/`, or
  `shared/types/database.types.ts`.

---

## Background The Engineer Needs

### Where the events are read

Do not design payload keys from scratch. Two views built in Phase 2 already
parse specific keys out of `payload`, and a mismatch produces a silently empty
report rather than an error:

- `supabase/schemas/91.analytics_view__chat_health.sql` reads
  `attemptCount`, `latencyMs`, and `outcome` from `chat.turn_completed`, and
  counts `chat.turn_failed` rows.
- `supabase/schemas/91.analytics_view__activation.sql` reads the mere
  existence of a `query.ran` row per workspace.

Read both files before writing the chat and query payloads.

### How events are emitted

**Browser.** `AnalyticsClient.logEvent` in `src/lib/analytics/AnalyticsClient.ts`.
It resolves the user from the Supabase session, no-ops when there is no
session, stamps `client` as `web` or `desktop` plus `app_version`, and swallows
every failure with a development-only `console.warn`. Its options type is the
discriminated union `ClientAnalyticsEvent`, so passing one event's payload
under a different event name is a compile error.

**Edge.** `logAnalyticsEvent` in
`supabase/functions/_shared/analytics/logAnalyticsEvent/logAnalyticsEvent.ts`.
It takes the service-role client explicitly, stamps `client: "server"` and a
null `app_version`, and logs failures with `console.error`. Its options type is
`ServerAnalyticsEvent`. `supabaseAdminClient` is already on the MiniServer
action context (`MiniServer.types.ts:113`), so no plumbing is needed to reach
it.

Neither emitter ever sends `event_category`. The
`tr__usage_analytics_events__set_category` trigger derives it from the event
name and overwrites anything a caller sends.

### The typed registry

`shared/analytics/AnalyticsEvents/AnalyticsEvents.constants.ts` holds three
name lists, one per emitting runtime. All five events in this plan are already
listed there: `query.ran`, `query.failed`, and `dashboard.pdf_exported` in
`CLIENT_ANALYTICS_EVENT_NAMES`; `chat.turn_completed` and `chat.turn_failed` in
`SERVER_ANALYTICS_EVENT_NAMES`.

`shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts` maps each name to
its payload with a chain of conditional types ending in `: undefined`. All five
events currently fall through to that `undefined` branch, which is why they
type-check today with no payload. Task 1 gives them real shapes, and that alone
turns every missing emission into a compile error at the call site.

Files under `shared/` are imported by both Vite and Deno, so **imports inside
`shared/` must carry a `.ts` extension**. Files under `src/` import from
`shared/` through the `$` alias without an extension. Files under
`supabase/functions/` use `$` with the `.ts` extension.

### How React Query behaves here, and why emission is not trivial

`src/config/AvaQueryClient.ts` sets the defaults every data query inherits:

- `retry`: one retry when online. **The query function therefore runs twice
  for a single user-visible failure.** Emitting from inside the query function
  would record two `query.failed` rows per failure.
- `staleTime`: six minutes when online, infinite when offline.
- `gcTime`: 24 hours.
- `refetchOnMount: true`, so a remount inside the stale window serves the
  cache without running the query function at all. Emitting on every settled
  render would record a `query.ran` for a query that never ran.

Those two facts pin the design:

1. The query function records **what happened** (duration, auto-limit flag)
   into a ref, tagged with a monotonically increasing `runId`. Retries
   overwrite the ref, so the ref always describes the most recent attempt.
2. A separate effect emits **once per settled run**, gated on `isFetching`
   being false and on `runId` differing from the last emitted one. A cache hit
   leaves the ref untouched (it is per hook instance and starts `undefined`),
   so nothing is emitted.

### The three `useDataQuery` call sites

`src/views/DataExplorerApp/useDataQuery.tsx` is called from:

| Caller            | File                                                                                      | Auth                    | Gets `query.ran`? |
| ----------------- | ----------------------------------------------------------------------------------------- | ----------------------- | ----------------- |
| `DataExplorerApp` | `src/views/DataExplorerApp/DataExplorerApp.tsx:107`                                       | always `workspace`      | yes               |
| `DataVizPBlock`   | `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx:81` | `workspace` or `public` | no                |
| `VizConfigPField` | `src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.tsx:60`           | `workspace` or `public` | no                |

`query.ran` is Data Explorer only because a dashboard with twelve blocks would
otherwise emit twelve "queries" per page view and drown the activation signal.
`query.failed` fires from all three, because a broken published dashboard is
always worth knowing about.

Both dashboard call sites resolve auth through `useAvaPageMetadata(puck)`,
which returns a discriminated union on `auth`. When `auth` is `"public"` there
is no session, `logEvent` no-ops anyway, and this plan skips emission
explicitly rather than relying on that.

### Where `didAutoLimit` comes from

`runStructuredQuery` computes it in `_selectSqlForExecution` (via
`resolveManualQueryForExecution`) and then throws it away. Task 3 adds a
`runStructuredQueryWithMetadata` export that returns it alongside the result, and
reduces `runStructuredQuery` to a one-line wrapper so the GIS caller
(`src/views/GisApp/layers/useMapLayerData/useMapLayerData.ts:27`) is untouched.

### The one spec conflict this plan resolves

The spec states two rules that collide:

- "no raw PII in this table (no email addresses, no SQL text, no chat
  content)" (line 80), described as binding.
- "`query.failed` stores a classified `errorClass` plus an error message
  truncated to 500 characters" (line 177).

DuckDB error messages routinely embed both. A parser error appends a
`LINE 1: SELECT ...` echo of the submitted SQL, and a conversion error quotes
the offending value: `Could not convert string 'jane@acme.com' to INT`. Storing
the message verbatim would put customer literals and SQL text into the payload,
violating the binding rule.

**Resolution, applied by this plan:** the message is sanitised before it is
recorded. `QueryAnalyticsPayloads.fromError` keeps only the first line, drops
any `LINE <n>:` SQL echo, replaces every single-quoted literal with `'?'` and
every run of four or more digits with `?`, then truncates to 500 characters.
Double-quoted identifiers survive, because "which column was missing" is the
whole diagnostic value of the event and an identifier is schema, not data.
Task 2 tests each of those rules.

### Deviations from the spec's `trigger` enum

The spec lists four values: `sql_submit`, `structured_change`,
`chat_generated`, `url_hydration`. Two more are required and are added here:

- **`dataset_opened`.** `DataExplorerApp.tsx:396` sets raw SQL when the user
  opens a saved dataset. That is a deliberate, user-initiated run with no home
  in the four listed values, and folding it into `url_hydration` would
  misattribute it.
- **`block_render`.** `query.failed` carries `trigger` on every surface, and a
  dashboard block or viz-config preview has no user-initiated trigger at all.
  This is the default for the two non-explorer surfaces.

### Emission is inert for PDF export until a flag flips

`src/views/DashboardApp/DashboardEditorView/ExportPdfButton.tsx:13` sets
`HIDE_EXPORT_AS_PDF = true` and the component early-returns `null`, so the
button never renders and the whole export flow is unreachable in the product
today. `ExportPdfButton` is the only entry point to `ExportPdfModal`.

Task 8 instruments it anyway. The alternative is to reopen these three files
later, when the flag flips, to add analytics that could have shipped with the
feature. The tests in Task 8 exercise the payload builder and the emission
directly, so the code is verified even though a user cannot reach it. **Record
in the Task 11 summary that `dashboard.pdf_exported` will produce zero rows in
production until `HIDE_EXPORT_AS_PDF` is removed.**

### Repository conventions that apply to every task

- Top-level functions use the `function` keyword. Nested functions and object
  properties are arrow functions.
- Local helper functions are prefixed `_` and declared **above** the exported
  function that uses them.
- Type imports always use `import type`.
- Payload builders follow the `ChatAnalyticsPayloads` shape: private `_from*`
  functions plus one exported const object
  (`src/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads.ts`).
- Tests mock the emitter with `vi.hoisted` plus `vi.mock`, as in
  `src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.test.tsx:10-18`.
- Per `docs/rules/testing.md`, never assert that a symbol exists or has a
  type. Assert emitted payloads, call counts, and error branches.

---

## File Structure

**Created:**

| Path                                                                                                             | Responsibility                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads.ts`               | Pure builders for the `query.ran` and `query.failed` payloads, including error classification and message sanitisation |
| `src/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads.test.ts`          | Vitest: classification table, sanitiser rules, payload shapes                                                          |
| `src/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMeta.types.ts`                                      | The record one query-function invocation leaves behind                                                                 |
| `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder.ts`             | Hook owning the run ref and the `beginRun` timer                                                                       |
| `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder.test.ts`        | Vitest: run ids increment, durations are recorded, retries overwrite                                                   |
| `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.ts`                                       | Hook emitting once per settled run                                                                                     |
| `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.test.ts`                                  | Vitest: cache hits, retries, surface asymmetry, public skip                                                            |
| `src/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads.ts`      | Pure builders for the two PDF export payloads                                                                          |
| `src/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads.test.ts` | Vitest: block counts and durations                                                                                     |
| `supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.ts`                                | Pure builders and classifiers for the two chat turn payloads                                                           |
| `supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.test.ts`                           | Vitest: outcome classification, error classification, char counts                                                      |

**Modified:**

| Path                                                                                   | Change                                                                                  |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`                            | Payload types for the five events, plus the surface, trigger, and error-class unions    |
| `shared/analytics/AnalyticsEvents/AnalyticsEvents.test.ts`                             | Extends the documented-shape guard to the five product events                           |
| `src/clients/queries/runStructuredQuery/runStructuredQuery.ts`                         | Adds `runStructuredQueryWithMetadata` returning `didAutoLimit`                          |
| `src/views/DataExplorerApp/useDataQuery.tsx`                                           | Required `analyticsSurface`, optional `analyticsTrigger`, run recording, analytics hook |
| `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts`     | Adds `queryTrigger` to the state                                                        |
| `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx`      | `_applyQueryChange` stamps `structured_change`; adds `setQueryTrigger`                  |
| `src/views/DataExplorerApp/DataExplorerApp.tsx`                                        | Passes the surface and trigger; stamps `dataset_opened`                                 |
| `src/views/DataExplorerApp/SqlQueryView/SqlQueryView.tsx`                              | Stamps `sql_submit`                                                                     |
| `src/views/DataExplorerApp/useDataExplorerUrlSync.ts`                                  | Stamps `url_hydration`                                                                  |
| `src/components/ChatPanel/useAvandarChatRuntime.ts`                                    | Stamps `chat_generated`                                                                 |
| `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx` | Passes `analyticsSurface: "dashboard_block"`                                            |
| `src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.tsx`           | Passes `analyticsSurface: "viz_config"`                                                 |
| `src/views/DashboardApp/DashboardEditorView/ExportPdfButton.tsx`                       | Adds `blockCount` to the opened event                                                   |
| `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/ExportPdfModal.tsx`         | Times and emits `dashboard.pdf_exported` for both export paths                          |
| `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotator.tsx`           | Threads the `onExported` callback                                                       |
| `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/useAnnotatedPdfExport.ts`   | Times the annotated export and reports the duration                                     |
| `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`                         | Counts attempts, times the turn, emits both chat events                                 |
| `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`                   | Phase status update and the two corrections                                             |

---

## Task 1: Give the five events real payload types

Doing this first makes every later task's omission a compile error rather than
a silent gap.

**Files:**

- Modify: `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`
- Modify: `shared/analytics/AnalyticsEvents/AnalyticsEvents.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `shared/analytics/AnalyticsEvents/AnalyticsEvents.test.ts`, after the
existing `describe("analytics trigger event payloads")` block:

```ts
type ProductEventPayloads = {
  "query.ran": {
    trigger: QueryAnalyticsTrigger;
    source: "rawSql" | "structured";
    dataSourceType: "dataset" | "entity" | "none";
    rowCount: number;
    columnCount: number;
    durationMs: number;
    didAutoLimit: boolean;
  };
  "query.failed": {
    surface: QueryAnalyticsSurface;
    trigger: QueryAnalyticsTrigger;
    errorClass: QueryErrorClass;
    errorMessage: string;
    isOffline: boolean;
  };
  "dashboard.pdf_export_opened": { dashboardId: string; blockCount: number };
  "dashboard.pdf_exported": {
    dashboardId: string;
    blockCount: number;
    durationMs: number;
  };
  "chat.turn_completed": {
    modelId: string;
    latencyMs: number;
    attemptCount: number;
    outcome: ChatTurnOutcome;
    promptChars: number;
    responseChars: number;
    schemaDatasetCount: number;
    wasSampled: boolean;
    piiSeverity?: "clean" | "warning" | "critical";
  };
  "chat.turn_failed": {
    modelId: string;
    errorClass: ChatTurnErrorClass;
    latencyMs: number;
  };
};

describe("analytics product event payloads", () => {
  it("documents every privacy-safe product payload shape", () => {
    expectTypeOf<
      Pick<AnalyticsEventPayloads, keyof ProductEventPayloads>
    >().toEqualTypeOf<ProductEventPayloads>();
  });

  it("gives the reporting views the keys they already parse", () => {
    // `analytics.chat_health` reads these three keys out of `payload` with
    // `->>`. A rename here produces an empty report rather than an error, so
    // the view's contract is pinned in a test.
    expectTypeOf<
      AnalyticsEventPayloads["chat.turn_completed"]
    >().toHaveProperty("attemptCount");
    expectTypeOf<
      AnalyticsEventPayloads["chat.turn_completed"]
    >().toHaveProperty("latencyMs");
    expectTypeOf<
      AnalyticsEventPayloads["chat.turn_completed"]
    >().toHaveProperty("outcome");
  });
});
```

Add these imports at the top of the same file, beside the existing type
imports:

```ts
import type {
  AnalyticsEventPayloads,
  ChatTurnErrorClass,
  ChatTurnOutcome,
  QueryAnalyticsSurface,
  QueryAnalyticsTrigger,
  QueryErrorClass,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types.ts";
```

Remove the now-duplicated standalone `AnalyticsEventPayloads` import line so
the file has a single import from that module.

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run shared/analytics/AnalyticsEvents/AnalyticsEvents.test.ts
```

Expected: FAIL. TypeScript cannot resolve `QueryAnalyticsTrigger`,
`QueryAnalyticsSurface`, `QueryErrorClass`, `ChatTurnOutcome`, or
`ChatTurnErrorClass` from the types module.

- [ ] **Step 3: Add the unions and payload types**

In `shared/analytics/AnalyticsEvents/AnalyticsEvents.types.ts`, add these
exported unions directly below the existing `AnalyticsApp` type:

```ts
/** Which surface executed a query. Decides whether `query.ran` is recorded. */
export type QueryAnalyticsSurface =
  "data_explorer" | "dashboard_block" | "viz_config";

/**
 * What caused a query to run.
 *
 * `dataset_opened` covers opening a saved dataset from the Data Explorer
 * drawer. `block_render` is what dashboard blocks and viz-config previews
 * report, since neither has a user-initiated trigger: they run whenever their
 * SQL changes.
 */
export type QueryAnalyticsTrigger =
  | "sql_submit"
  | "structured_change"
  | "chat_generated"
  | "url_hydration"
  | "dataset_opened"
  | "block_render";

/**
 * Coarse classification of a failed query, derived from the runtime error.
 * Classifying at the emitter is what makes failures groupable in SQL without
 * storing the error text that would be needed to group them after the fact.
 */
export type QueryErrorClass =
  | "offline"
  | "syntax"
  | "missing_column"
  | "missing_table"
  | "permission"
  | "timeout"
  | "network"
  | "unknown";

/** What a completed chat turn produced. */
export type ChatTurnOutcome =
  "sql" | "clarification" | "dashboard_block" | "text" | "empty";

/** Coarse classification of a chat turn that never produced a response. */
export type ChatTurnErrorClass =
  "upstream_error" | "network" | "parse" | "unknown";
```

Then add the payload type aliases beside the existing ones (above the
`AnalyticsEventPayloads` mapped type):

```ts
/**
 * Recorded for Data Explorer executions only. A dashboard with twelve blocks
 * would otherwise report twelve queries per page view and drown the
 * activation signal, so the other two surfaces record failures only.
 */
type QueryRanPayload = {
  trigger: QueryAnalyticsTrigger;
  source: "rawSql" | "structured";
  dataSourceType: "dataset" | "entity" | "none";
  rowCount: number;
  columnCount: number;
  durationMs: number;
  didAutoLimit: boolean;
};

/**
 * Recorded from every authenticated surface. `errorMessage` is sanitised
 * before it gets here: first line only, SQL echo removed, quoted literals and
 * long digit runs masked, truncated to 500 characters. Raw SQL and customer
 * literals must never reach this column.
 */
type QueryFailedPayload = {
  surface: QueryAnalyticsSurface;
  trigger: QueryAnalyticsTrigger;
  errorClass: QueryErrorClass;
  errorMessage: string;
  isOffline: boolean;
};

/**
 * Recorded by the chat edge function, the only layer that knows the model,
 * the latency, and how many attempts the empty-response escalation took.
 *
 * `wasSampled` and `piiSeverity` describe chat-sample retention. Nothing
 * retains samples yet, so `wasSampled` is always false and `piiSeverity` is
 * always absent until the capture pipeline exists.
 */
type ChatTurnCompletedPayload = {
  modelId: string;
  latencyMs: number;
  attemptCount: number;
  outcome: ChatTurnOutcome;
  promptChars: number;
  responseChars: number;
  schemaDatasetCount: number;
  wasSampled: boolean;
  piiSeverity?: "clean" | "warning" | "critical";
};
```

Finally, replace the five `undefined`-resolving branches by adding these arms
to the `AnalyticsEventPayloads` conditional chain. Put the two query arms
directly after the `"dataset.imported"` arm, and the rest beside their
neighbours:

```ts
  : K extends "query.ran" ? QueryRanPayload
  : K extends "query.failed" ? QueryFailedPayload
```

```ts
  : K extends "dashboard.pdf_export_opened" ?
    { dashboardId: string; blockCount: number }
  : K extends "dashboard.pdf_exported" ?
    { dashboardId: string; blockCount: number; durationMs: number }
```

```ts
  : K extends "chat.turn_completed" ? ChatTurnCompletedPayload
  : K extends "chat.turn_failed" ?
    { modelId: string; errorClass: ChatTurnErrorClass; latencyMs: number }
```

Note that the existing `"dashboard.pdf_export_opened"` arm resolves to
`{ dashboardId: string }` today. Replace it in place rather than adding a
second arm; the first matching arm in a conditional chain wins, so a duplicate
would be silently dead.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run shared/analytics/AnalyticsEvents/AnalyticsEvents.test.ts
```

Expected: PASS.

- [ ] **Step 5: Confirm the intended compile errors appeared**

```bash
pnpm type-check
```

Expected: FAIL, with an error at
`src/views/DashboardApp/DashboardEditorView/ExportPdfButton.tsx:65` reporting
that `blockCount` is missing from the `dashboard.pdf_export_opened` payload.
This is the point of the task: the type now demands the payload. Task 9 fixes
it. No other file should error, because the other four events have no emitter
yet.

If any other file errors, stop and read it before continuing.

- [ ] **Step 6: Review checkpoint**

Do not commit. Record the type-check output showing exactly one expected error.

---

## Task 2: Build the query payloads

> **The shipped code diverges from the listing below. The files are the source
> of truth, not this section.** Code review found the sanitiser as specified
> here leaks customer data, and the classification table both over- and
> under-reaches. Do not re-apply this section verbatim. The substantive
> corrections, all verified against a real DuckDB instance:
>
> - The single-quote mask must be greedy, `/'.*'/g`. The `/'[^']*'/g` below
>   needs balanced quotes, so `'O'Brien'` masks to `'?'Brien'` and leaks the
>   tail. Greedy fails closed, at the cost of collapsing multi-literal lines.
> - Two masks must run **before** it, or a quoted value containing an
>   apostrophe eats their delimiters:
>   `/(duplicate key )"[^"]*"/gi` → `'$1"?"'` and
>   `/\([^)]*\)=\([^)]*\)/g` → `"(?)=(?)"`. These cover DuckDB's duplicate-key
>   format and PostgREST's unique-violation format, neither of which the three
>   rules below touch at all.
> - `missing_column` needs `does not have a column named`, which is what DuckDB
>   emits for a qualified missing column (`select t.ssn from t`).
> - `missing_table` must not match a bare `catalog error` or `does not exist`,
>   or a missing function lands in the missing-table bucket.
> - DuckDB reports a missing **view** as `Table with name v_nope does not
exist!`. The word "View" never appears, and real missing-table messages
>   carry **no quotes** around the name.
>
> `_classifyError` is named `_getErrorClassFromMessage` in the shipped code.

**Files:**

- Create: `src/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads.ts`
- Create: `src/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads.test.ts`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads.test.ts`:

```ts
/**
 * The sanitiser here is a privacy control, not a formatting nicety. DuckDB
 * error messages embed both the submitted SQL and the offending customer
 * value, and `usage_analytics_events.payload` is barred from carrying either.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryAnalyticsPayloads } from "@/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads";

function _setOnline(isOnline: boolean): void {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(isOnline);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("QueryAnalyticsPayloads.fromResult", () => {
  it("reports the result size and the recorded run metadata", () => {
    const payload = QueryAnalyticsPayloads.fromResult({
      trigger: "sql_submit",
      runMeta: {
        runId: 3,
        durationMs: 128.6,
        didAutoLimit: true,
        source: "rawSql",
        dataSourceType: "dataset",
      },
      result: {
        columns: [
          { name: "region", dataType: "varchar" },
          { name: "total", dataType: "double" },
        ],
        numRows: 42,
      },
    });

    expect(payload).toEqual({
      trigger: "sql_submit",
      source: "rawSql",
      dataSourceType: "dataset",
      rowCount: 42,
      columnCount: 2,
      durationMs: 129,
      didAutoLimit: true,
    });
  });

  it("rounds the duration so payloads do not carry float noise", () => {
    const payload = QueryAnalyticsPayloads.fromResult({
      trigger: "structured_change",
      runMeta: {
        runId: 1,
        durationMs: 0.4,
        didAutoLimit: false,
        source: "structured",
        dataSourceType: "entity",
      },
      result: { columns: [], numRows: 0 },
    });

    expect(payload.durationMs).toBe(0);
  });
});

describe("QueryAnalyticsPayloads.fromError", () => {
  it("classifies a missing column before a missing table", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        'Binder Error: Referenced column "revenu" not found in FROM clause!',
      ),
    });

    expect(payload.errorClass).toBe("missing_column");
    expect(payload.surface).toBe("data_explorer");
    expect(payload.trigger).toBe("sql_submit");
    expect(payload.isOffline).toBe(false);
  });

  it("classifies a missing table", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "dashboard_block",
      trigger: "block_render",
      error: new Error(
        'Catalog Error: Table with name "orders" does not exist!',
      ),
    });

    expect(payload.errorClass).toBe("missing_table");
  });

  it("classifies a parser error as syntax", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error('Parser Error: syntax error at or near "SELCT"'),
    });

    expect(payload.errorClass).toBe("syntax");
  });

  it("classifies a denied read as permission", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "viz_config",
      trigger: "block_render",
      error: new Error("permission denied for table datasets"),
    });

    expect(payload.errorClass).toBe("permission");
  });

  it("classifies a failed fetch as network", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "structured_change",
      error: new TypeError("Failed to fetch"),
    });

    expect(payload.errorClass).toBe("network");
  });

  it("classifies anything unrecognised as unknown", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "structured_change",
      error: new Error("something went sideways"),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("reports offline first, whatever the message says", () => {
    _setOnline(false);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "structured_change",
      error: new Error('Parser Error: syntax error at or near "SELCT"'),
    });

    expect(payload.errorClass).toBe("offline");
    expect(payload.isOffline).toBe(true);
  });

  it("drops the SQL echo DuckDB appends to parser errors", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        'Parser Error: syntax error at or near "SELCT"\nLINE 1: SELCT ssn FROM patients\n        ^',
      ),
    });

    expect(payload.errorMessage).toBe(
      'Parser Error: syntax error at or near "SELCT"',
    );
    expect(payload.errorMessage).not.toContain("patients");
  });

  it("drops a single-line SQL echo too", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        "Parser Error: bad token LINE 1: SELECT ssn FROM people",
      ),
    });

    expect(payload.errorMessage).toBe("Parser Error: bad token");
  });

  it("masks quoted customer values", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(
        "Conversion Error: Could not convert string 'jane@acme.com' to INT",
      ),
    });

    expect(payload.errorMessage).toBe(
      "Conversion Error: Could not convert string '?' to INT",
    );
  });

  it("masks long digit runs that could be an identifier or an account number", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error("Constraint Error: duplicate key 4111111111111111"),
    });

    expect(payload.errorMessage).toBe("Constraint Error: duplicate key ?");
  });

  it("keeps double-quoted identifiers, which are schema rather than data", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error('Binder Error: Referenced column "revenu" not found'),
    });

    expect(payload.errorMessage).toContain('"revenu"');
  });

  it("truncates a very long message to 500 characters", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: new Error(`Error: ${"x".repeat(900)}`),
    });

    expect(payload.errorMessage).toHaveLength(500);
  });

  it("handles a thrown non-Error without crashing", () => {
    _setOnline(true);
    const payload = QueryAnalyticsPayloads.fromError({
      surface: "data_explorer",
      trigger: "sql_submit",
      error: "just a string",
    });

    expect(payload.errorMessage).toBe("just a string");
    expect(payload.errorClass).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Create the run-metadata type**

Create
`src/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMeta.types.ts`:

```ts
/**
 * What one invocation of the data query function left behind.
 *
 * Written by the query function and read by the effect that emits analytics
 * after the query settles. React Query retries once by default, so a single
 * user-visible failure runs the query function twice; `runId` increments per
 * invocation so the emitter can tell "a new run finished" from "React
 * re-rendered", and the last write wins.
 */
export type DataQueryRunMeta = {
  runId: number;
  durationMs: number;
  didAutoLimit: boolean;
  source: "rawSql" | "structured";
  dataSourceType: "dataset" | "entity" | "none";
};
```

- [ ] **Step 4: Create the payload builders**

Create
`src/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads.ts`:

```ts
import type { DataQueryRunMeta } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMeta.types";
import type {
  AnalyticsEventPayloads,
  QueryAnalyticsSurface,
  QueryAnalyticsTrigger,
  QueryErrorClass,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";

/** Longest error message recorded, matching the design's stated cap. */
const MAX_ERROR_MESSAGE_CHARS = 500;

/**
 * Ordered classification table. Order is load-bearing: a DuckDB binder error
 * for a missing column also contains "not found in FROM clause", so the
 * column rule has to win over the table rule.
 */
const ERROR_CLASS_PATTERNS: ReadonlyArray<{
  errorClass: QueryErrorClass;
  pattern: RegExp;
}> = [
  {
    errorClass: "missing_column",
    pattern: /referenced column|column .* not found|binder error: .*column/i,
  },
  {
    errorClass: "missing_table",
    pattern:
      /catalog error|does not exist|not found in from clause|no such table/i,
  },
  { errorClass: "syntax", pattern: /parser error|syntax error/i },
  {
    errorClass: "permission",
    pattern: /permission denied|row-level security|not authorized|forbidden/i,
  },
  { errorClass: "timeout", pattern: /timeout|timed out/i },
  {
    errorClass: "network",
    pattern: /failed to fetch|networkerror|network error|load failed/i,
  },
];

function _errorToText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function _classifyError(message: string): QueryErrorClass {
  const match = ERROR_CLASS_PATTERNS.find((entry) => {
    return entry.pattern.test(message);
  });
  return match?.errorClass ?? "unknown";
}

/**
 * Strips everything the payload is barred from carrying, then truncates.
 *
 * Three rules, each covering a way that DuckDB leaks user data into an error
 * string: it appends a `LINE n:` echo of the submitted SQL, it quotes the
 * offending value in conversion and constraint errors, and it prints raw key
 * values. Double-quoted identifiers survive, because knowing which column was
 * missing is the entire diagnostic value of the event and an identifier is
 * schema rather than data.
 */
function _sanitizeMessage(message: string): string {
  const firstLine = message.split("\n")[0] ?? "";
  const sqlEchoIndex = firstLine.search(/\bLINE \d+:/);
  const withoutSqlEcho =
    sqlEchoIndex === -1 ? firstLine : firstLine.slice(0, sqlEchoIndex);
  return withoutSqlEcho
    .replace(/'[^']*'/g, "'?'")
    .replace(/\b\d{4,}\b/g, "?")
    .trim()
    .slice(0, MAX_ERROR_MESSAGE_CHARS);
}

function _fromResult(
  options: Readonly<{
    trigger: QueryAnalyticsTrigger;
    runMeta: DataQueryRunMeta;
    result: { columns: readonly unknown[]; numRows: number };
  }>,
): AnalyticsEventPayloads["query.ran"] {
  const { trigger, runMeta, result } = options;
  return {
    trigger,
    source: runMeta.source,
    dataSourceType: runMeta.dataSourceType,
    rowCount: result.numRows,
    columnCount: result.columns.length,
    durationMs: Math.round(runMeta.durationMs),
    didAutoLimit: runMeta.didAutoLimit,
  };
}

function _fromError(
  options: Readonly<{
    surface: QueryAnalyticsSurface;
    trigger: QueryAnalyticsTrigger;
    error: unknown;
  }>,
): AnalyticsEventPayloads["query.failed"] {
  const { surface, trigger, error } = options;
  const isOffline = !navigator.onLine;
  const message = _errorToText(error);
  return {
    surface,
    trigger,
    // Offline wins over the message: when the device is offline the query
    // failed because it could not run at all, whatever DuckDB reported on the
    // way down.
    errorClass: isOffline ? "offline" : _classifyError(message),
    errorMessage: _sanitizeMessage(message),
    isOffline,
  };
}

/** Privacy-safe payload builders for query execution analytics. */
export const QueryAnalyticsPayloads = {
  fromResult: _fromResult,
  fromError: _fromError,
};
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm vitest run src/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads.test.ts
```

Expected: PASS, 16 tests.

If the "keeps double-quoted identifiers" test fails because the message was
classified before sanitisation, check that `_classifyError` receives the raw
message and `_sanitizeMessage` receives it independently. Classification reads
the original text on purpose: sanitising first would mask the very tokens the
patterns match on.

- [ ] **Step 6: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 3: Return the auto-limit flag from the query runner

**Files:**

- Modify: `src/clients/queries/runStructuredQuery/runStructuredQuery.ts:52-79` and `:207-237`
- Modify: `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts`

> **Correction: this test file already exists** and holds four tests covering
> raw SQL, the empty result, the public-path rejection, and entity field
> remapping. Add the new `describe` block to it. Do not overwrite it.

- [ ] **Step 1: Write the failing test**

Create `src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts`:

```ts
/**
 * `didAutoLimit` is computed deep inside SQL selection and was previously
 * discarded. Analytics needs it, so it is now returned; this pins that it
 * reflects what the resolver decided rather than a constant.
 */
import { describe, expect, it, vi } from "vitest";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { Workspace } from "$/models/Workspace/Workspace";

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;

const { resolveManualQueryForExecutionMock, runQueryMock } = vi.hoisted(() => {
  return {
    resolveManualQueryForExecutionMock: vi.fn(),
    runQueryMock: vi.fn(),
  };
});

vi.mock(
  "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution",
  () => {
    return {
      resolveManualQueryForExecution: resolveManualQueryForExecutionMock,
      fetchDatasetRowCount: vi.fn(),
      buildDataSourceCommitOptions: vi.fn(),
    };
  },
);

vi.mock("@/clients/qetl/WorkspaceQetlClient", () => {
  return { WorkspaceQetlClient: { runQuery: runQueryMock } };
});

describe("runStructuredQueryWithMetadata", () => {
  it("reports the auto-limit decision alongside the result", async () => {
    const emptyResult = { id: "r1", columns: [], data: [], numRows: 0 };
    runQueryMock.mockResolvedValue(emptyResult);

    const run = await runStructuredQueryWithMetadata({
      auth: "workspace",
      workspaceId: TEST_WORKSPACE_ID,
      query: { queryColumns: [], aggregations: {} } as never,
      rawSql: "SELECT 1",
    });

    expect(run.result).toBe(emptyResult);
    expect(run.didAutoLimit).toBe(false);
  });

  it("reports true when the resolver bounded a large dataset", async () => {
    const emptyResult = { id: "r2", columns: [], data: [], numRows: 0 };
    runQueryMock.mockResolvedValue(emptyResult);
    resolveManualQueryForExecutionMock.mockResolvedValue({
      query: { queryColumns: [], aggregations: {}, limit: 5000 },
      didAutoLimit: true,
      rowCount: 900000,
    });

    const run = await runStructuredQueryWithMetadata({
      auth: "workspace",
      workspaceId: TEST_WORKSPACE_ID,
      query: { queryColumns: [], aggregations: {} } as never,
      rawSql: undefined,
      isStructuredQueryInSync: true,
    });

    expect(run.didAutoLimit).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts
```

Expected: FAIL. `runStructuredQueryWithMetadata` is not exported.

- [ ] **Step 3: Thread the flag through SQL selection**

In `src/clients/queries/runStructuredQuery/runStructuredQuery.ts`, change
`_selectSqlForExecution`'s return type and returned object:

```ts
async function _selectSqlForExecution(
  params: RunStructuredQueryParams,
): Promise<{
  sqlToRun: string | undefined;
  executionQuery: StructuredQuery.Partial;
  didAutoLimit: boolean;
}> {
  const { query, rawSql, isStructuredQueryInSync = true } = params;

  const resolved =
    rawSql === undefined && params.auth === "workspace"
      ? await resolveManualQueryForExecution({
          query,
          workspaceId: params.workspaceId,
        })
      : { query, didAutoLimit: false as const };

  const sqlToRun = selectSqlToExecute({
    rawSql,
    isStructuredQueryInSync,
    executionQuery: resolved.query,
  });

  return {
    sqlToRun,
    executionQuery: resolved.query,
    didAutoLimit: resolved.didAutoLimit,
  };
}
```

- [ ] **Step 4: Split the public entry point in two**

Replace the existing `runStructuredQuery` export at the bottom of the same file
with:

```ts
/** A query result plus the execution facts analytics records about it. */
export type RunStructuredQueryResult = {
  result: QueryResult.T<UnknownRow>;
  /**
   * True when the large-dataset guard replaced the caller's query with a
   * bounded one. Analytics records this so an unexpectedly small row count can
   * be told apart from a genuinely small dataset.
   */
  didAutoLimit: boolean;
};

/**
 * Runs a structured query (or caller-supplied raw SQL) and returns the result
 * together with the execution facts analytics needs.
 *
 * Callers that do not record analytics should use {@link runStructuredQuery},
 * which is this function with the metadata dropped.
 */
export async function runStructuredQueryWithMetadata(
  params: RunStructuredQueryParams,
): Promise<RunStructuredQueryResult> {
  const { query } = params;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, { sortBy: prop("id") });

  const { sqlToRun, executionQuery, didAutoLimit } =
    await _selectSqlForExecution(params);

  if (sqlToRun) {
    return { result: await _runRawSql(params, sqlToRun), didAutoLimit };
  }

  if (params.auth === "public") {
    // This message reaches the user through the Data Explorer's error banner
    // and the map's status overlay, so it is translated here rather than left
    // as an English literal.
    throw new Error(
      i18n._(
        msg`Public queries are not supported for structured queries. Use raw SQL instead.`,
      ),
    );
  }

  return {
    result: await _runSourceQuery({
      workspaceId: params.workspaceId,
      dataSource,
      executionQuery,
      sortedQueryColumns,
    }),
    didAutoLimit,
  };
}

/**
 * Runs a structured query (or caller-supplied raw SQL) against the right QETL
 * client, resolving dataset and entity sources.
 *
 * This is the single execution path shared by the Data Explorer and the GIS
 * app. Callers wrap it in their own caching hook rather than duplicating the
 * source-resolution branches.
 */
export async function runStructuredQuery(
  params: RunStructuredQueryParams,
): Promise<QueryResult.T<UnknownRow>> {
  const { result } = await runStructuredQueryWithMetadata(params);
  return result;
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm vitest run src/clients/queries/runStructuredQuery/runStructuredQuery.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Confirm the GIS caller is untouched**

```bash
pnpm type-check 2>&1 | grep -i gis || echo "no GIS errors"
```

Expected: `no GIS errors`. `useMapLayerData` still calls `runStructuredQuery`
and still receives a bare `QueryResult`.

- [ ] **Step 7: Review checkpoint**

Do not commit. Record both outputs.

---

## Task 4: Record what each query run did

> **The shipped code diverges from the listing below. The files are the source
> of truth.** Code review found that "last settled run wins" is the wrong
> policy, and the correction matters to Task 5's emitter.
>
> The retry case given below as the motivation for `runId` cannot actually
> interleave: TanStack Query starts attempt 2 only after attempt 1 rejects, so
> run 1 always records before run 2 begins. Two runs genuinely coexist only
> when the **query key changes mid-flight**, which happens whenever the user
> edits the SQL or switches dataset while a query is in the air. Run 1's
> promise still resolves and still calls its recorder. If it lands after run 2,
> the ref holds run 1's timing while the data on screen came from run 2, and
> the emitter then records a second event carrying the superseded run's
> numbers.
>
> The shipped closure therefore guards on the counter before writing:
>
> ```ts
> if (runId !== runCountRef.current) {
>   return;
> }
> ```
>
> The fourth test pins that corrected policy (`runId` 2 wins, not 1). This is
> also what makes the captured `runId` load-bearing rather than incidental.
>
> Two structural changes: the hook lives in its own directory,
> `useDataQueryAnalytics/useDataQueryRunRecorder/`, matching the convention
> every other hook-with-a-test in this repo follows. And the test drives the
> clock with `vi.useFakeTimers({ toFake: ["performance"] })` rather than a
> hand-rolled queue of `performance.now` return values, which cannot leak into
> later tests the way an unrestored spy did.

**Files:**

- Create: `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder.ts`
- Create: `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder.test.ts`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder.test.ts`:

```ts
/**
 * The recorder is what lets the emitter tell "a new run finished" from "React
 * re-rendered". React Query retries once by default, so two invocations can
 * back one settled failure; the last one has to win.
 */
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useDataQueryRunRecorder } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder";

describe("useDataQueryRunRecorder", () => {
  it("records nothing until a run finishes", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "rawSql",
        dataSourceType: "dataset",
      });
    });

    expect(result.current.runMetaRef.current).toBeUndefined();
  });

  it("records the duration, source, and auto-limit flag of a finished run", () => {
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1075);

    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "structured",
        dataSourceType: "entity",
      });
    });

    act(() => {
      const recordRun = result.current.beginRun();
      recordRun(true);
    });

    expect(result.current.runMetaRef.current).toEqual({
      runId: 1,
      durationMs: 75,
      didAutoLimit: true,
      source: "structured",
      dataSourceType: "entity",
    });
  });

  it("increments the run id per invocation so a retry overwrites the first attempt", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "rawSql",
        dataSourceType: "none",
      });
    });

    act(() => {
      result.current.beginRun()(false);
      result.current.beginRun()(false);
    });

    expect(result.current.runMetaRef.current?.runId).toBe(2);
  });

  it("attributes each recorder to its own run even when two runs interleave", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "rawSql",
        dataSourceType: "dataset",
      });
    });

    act(() => {
      const recordFirstRun = result.current.beginRun();
      const recordSecondRun = result.current.beginRun();
      recordSecondRun(false);
      recordFirstRun(true);
    });

    // The slow first run settled last, so its metadata is what the emitter
    // sees. Recording the id it was issued is what makes the emitter able to
    // notice a new settle at all.
    expect(result.current.runMetaRef.current?.runId).toBe(1);
    expect(result.current.runMetaRef.current?.didAutoLimit).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement the recorder**

Create
`src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder.ts`:

```ts
import { useRef } from "react";
import type { DataQueryRunMeta } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMeta.types";
import type { RefObject } from "react";

type DataQueryRunRecorder = {
  /**
   * Starts timing one query-function invocation. Returns the function that
   * closes it out, which takes the auto-limit decision the run made.
   */
  beginRun: () => (didAutoLimit: boolean) => void;
  runMetaRef: RefObject<DataQueryRunMeta | undefined>;
};

/**
 * Times each invocation of a data query function and leaves the result where
 * the analytics effect can read it after the query settles.
 *
 * A ref rather than state on purpose: writing this must not re-render, and the
 * settle that follows re-renders anyway.
 */
export function useDataQueryRunRecorder(
  options: Readonly<{
    source: DataQueryRunMeta["source"];
    dataSourceType: DataQueryRunMeta["dataSourceType"];
  }>,
): DataQueryRunRecorder {
  const { source, dataSourceType } = options;
  const runMetaRef = useRef<DataQueryRunMeta | undefined>(undefined);
  const runCountRef = useRef(0);

  const beginRun = (): ((didAutoLimit: boolean) => void) => {
    runCountRef.current += 1;
    const runId = runCountRef.current;
    const startedAt = performance.now();
    return (didAutoLimit: boolean): void => {
      runMetaRef.current = {
        runId,
        durationMs: performance.now() - startedAt,
        didAutoLimit,
        source,
        dataSourceType,
      };
    };
  };

  return { beginRun, runMetaRef };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 5: Emit once per settled run

**Files:**

- Create: `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.ts`
- Create: `src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.test.ts`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.test.ts`:

```ts
/**
 * Four behaviours decide whether this instrumentation is trustworthy: a cache
 * hit must not count as a run, a retry must not count twice, only the Data
 * Explorer records successes, and a public page records nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useDataQueryAnalytics } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics";
import type { DataQueryRunMeta } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMeta.types";
import type { QueryAnalyticsSurface } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const { logEventMock } = vi.hoisted(() => {
  return { logEventMock: vi.fn() };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: logEventMock } };
});

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;

const RUN_META: DataQueryRunMeta = {
  runId: 1,
  durationMs: 50,
  didAutoLimit: false,
  source: "rawSql",
  dataSourceType: "dataset",
};

const SUCCESS_RESULT = {
  id: "result-1",
  columns: [{ name: "region", dataType: "varchar" }],
  data: [],
  numRows: 7,
};

type FakeQueryResult = {
  status: "pending" | "success" | "error";
  isFetching: boolean;
  data: unknown;
  error: unknown;
};

function _renderAnalytics(
  options: Readonly<{
    surface?: QueryAnalyticsSurface;
    workspaceId?: Workspace.Id;
    runMeta?: DataQueryRunMeta;
    queryResult: FakeQueryResult;
  }>,
) {
  const runMetaRef = { current: options.runMeta };
  return renderHook(
    (props: { queryResult: FakeQueryResult }) => {
      return useDataQueryAnalytics({
        surface: options.surface ?? "data_explorer",
        trigger: "sql_submit",
        workspaceId:
          "workspaceId" in options ? options.workspaceId : TEST_WORKSPACE_ID,
        runMetaRef,
        queryResult: props.queryResult as never,
      });
    },
    { initialProps: { queryResult: options.queryResult } },
  );
}

beforeEach(() => {
  logEventMock.mockReset();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDataQueryAnalytics", () => {
  it("records query.ran when a Data Explorer run settles successfully", () => {
    _renderAnalytics({
      runMeta: RUN_META,
      queryResult: {
        status: "success",
        isFetching: false,
        data: SUCCESS_RESULT,
        error: null,
      },
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock).toHaveBeenCalledWith({
      event: "query.ran",
      workspaceId: TEST_WORKSPACE_ID,
      app: "data_explorer",
      payload: {
        trigger: "sql_submit",
        source: "rawSql",
        dataSourceType: "dataset",
        rowCount: 7,
        columnCount: 1,
        durationMs: 50,
        didAutoLimit: false,
      },
    });
  });

  it("records nothing when the data came from cache and no run happened", () => {
    _renderAnalytics({
      runMeta: undefined,
      queryResult: {
        status: "success",
        isFetching: false,
        data: SUCCESS_RESULT,
        error: null,
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("records nothing while a retry is still in flight", () => {
    _renderAnalytics({
      runMeta: RUN_META,
      queryResult: {
        status: "error",
        isFetching: true,
        data: undefined,
        error: new Error("boom"),
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("records one failure for a run that was retried and then settled", () => {
    const { rerender } = _renderAnalytics({
      runMeta: { ...RUN_META, runId: 2 },
      queryResult: {
        status: "error",
        isFetching: true,
        data: undefined,
        error: new Error("Parser Error: syntax error"),
      },
    });

    rerender({
      queryResult: {
        status: "error",
        isFetching: false,
        data: undefined,
        error: new Error("Parser Error: syntax error"),
      },
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.failed",
      payload: { errorClass: "syntax", surface: "data_explorer" },
    });
  });

  it("does not re-record when React re-renders without a new run", () => {
    const settled: FakeQueryResult = {
      status: "success",
      isFetching: false,
      data: SUCCESS_RESULT,
      error: null,
    };
    const { rerender } = _renderAnalytics({
      runMeta: RUN_META,
      queryResult: settled,
    });

    rerender({ queryResult: { ...settled } });
    rerender({ queryResult: { ...settled } });

    expect(logEventMock).toHaveBeenCalledTimes(1);
  });

  it("does not record query.ran for a dashboard block", () => {
    _renderAnalytics({
      surface: "dashboard_block",
      runMeta: RUN_META,
      queryResult: {
        status: "success",
        isFetching: false,
        data: SUCCESS_RESULT,
        error: null,
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("does record query.failed for a dashboard block", () => {
    _renderAnalytics({
      surface: "dashboard_block",
      runMeta: RUN_META,
      queryResult: {
        status: "error",
        isFetching: false,
        data: undefined,
        error: new Error("permission denied for table datasets"),
      },
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.failed",
      app: "dashboards",
      payload: { errorClass: "permission", surface: "dashboard_block" },
    });
  });

  it("records nothing on a public page, which has no session to attribute", () => {
    _renderAnalytics({
      surface: "dashboard_block",
      workspaceId: undefined,
      runMeta: RUN_META,
      queryResult: {
        status: "error",
        isFetching: false,
        data: undefined,
        error: new Error("permission denied"),
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement the emitter hook**

Create
`src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.ts`:

```ts
import { useEffect, useRef } from "react";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { QueryAnalyticsPayloads } from "@/views/DataExplorerApp/useDataQueryAnalytics/QueryAnalyticsPayloads/QueryAnalyticsPayloads";
import type { DataQueryRunMeta } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMeta.types";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  AnalyticsApp,
  QueryAnalyticsSurface,
  QueryAnalyticsTrigger,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UseQueryResult } from "@tanstack/react-query";
import type { RefObject } from "react";

/** The app surface each query surface reports its events under. */
function _surfaceToApp(surface: QueryAnalyticsSurface): AnalyticsApp {
  return surface === "data_explorer" ? "data_explorer" : "dashboards";
}

/**
 * Records `query.ran` and `query.failed` once per settled query execution.
 *
 * Two React Query behaviours make naive emission wrong, and both are handled
 * here. A remount inside the six-minute stale window serves the cache without
 * running the query function, so emitting on every settled render would invent
 * runs that never happened: the run ref stays `undefined` in that case and
 * nothing is recorded. And a failure is retried once, so the query function
 * runs twice for one user-visible failure: emission waits for `isFetching` to
 * go false and keys on the run id, so the retried pair produces one row.
 *
 * `query.ran` is deliberately restricted to the Data Explorer. A dashboard
 * with twelve blocks would otherwise report twelve queries per page view.
 * Failures are recorded from every authenticated surface, because a broken
 * published dashboard is always worth knowing about.
 */
export function useDataQueryAnalytics(
  options: Readonly<{
    surface: QueryAnalyticsSurface;
    trigger: QueryAnalyticsTrigger;
    /** Undefined on public pages, which have no session to attribute. */
    workspaceId: Workspace.Id | undefined;
    runMetaRef: RefObject<DataQueryRunMeta | undefined>;
    queryResult: UseQueryResult<QueryResult.T<UnknownRow>>;
  }>,
): void {
  const { surface, trigger, workspaceId, runMetaRef, queryResult } = options;
  const lastEmittedRunIdRef = useRef<number | undefined>(undefined);
  const { status, isFetching, data, error } = queryResult;

  useEffect(
    function emitSettledQueryAnalytics() {
      const runMeta = runMetaRef.current;
      if (workspaceId === undefined || runMeta === undefined) {
        return;
      }
      if (isFetching || status === "pending") {
        return;
      }
      if (runMeta.runId === lastEmittedRunIdRef.current) {
        return;
      }
      lastEmittedRunIdRef.current = runMeta.runId;

      if (status === "error") {
        void AnalyticsClient.logEvent({
          event: "query.failed",
          workspaceId,
          app: _surfaceToApp(surface),
          payload: QueryAnalyticsPayloads.fromError({
            surface,
            trigger,
            error,
          }),
        });
        return;
      }

      if (surface !== "data_explorer" || data === undefined) {
        return;
      }

      void AnalyticsClient.logEvent({
        event: "query.ran",
        workspaceId,
        app: "data_explorer",
        payload: QueryAnalyticsPayloads.fromResult({
          trigger,
          runMeta,
          result: data,
        }),
      });
    },
    [
      status,
      isFetching,
      data,
      error,
      workspaceId,
      surface,
      trigger,
      runMetaRef,
    ],
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run src/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 6: Track what triggered each Data Explorer query

**Files:**

- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts`
- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx`
- Create: `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerQueryTrigger.test.tsx`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerQueryTrigger.test.tsx`:

```tsx
/**
 * `query.ran` separates deliberate runs from incidental ones, and the whole
 * separation rests on the state manager stamping the right trigger. Manual
 * form edits must stamp themselves; every other origin stamps explicitly.
 */
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ReactNode } from "react";

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

function _renderStateManager() {
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    { wrapper: _wrapper },
  );
}

describe("Data Explorer query trigger", () => {
  it("starts as a structured change, which is what an untouched form is", () => {
    const { result } = _renderStateManager();

    expect(result.current[0].queryTrigger).toBe("structured_change");
  });

  it("stamps a structured change when the manual form edits the query", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setQueryTrigger("chat_generated");
    });
    act(() => {
      result.current[1].setLimit(100);
    });

    expect(result.current[0].queryTrigger).toBe("structured_change");
    expect(result.current[0].query.limit).toBe(100);
  });

  it("keeps an explicit trigger when raw SQL is set", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setQueryTrigger("sql_submit");
      result.current[1].setRawSql("SELECT 1");
    });

    expect(result.current[0].queryTrigger).toBe("sql_submit");
    expect(result.current[0].rawSql).toBe("SELECT 1");
  });

  it("resets the trigger when the explorer is reset", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setQueryTrigger("dataset_opened");
    });
    act(() => {
      result.current[1].resetState();
    });

    expect(result.current[0].queryTrigger).toBe("structured_change");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerQueryTrigger.test.tsx
```

Expected: FAIL. `queryTrigger` is not on the state and `setQueryTrigger` is not
an action.

- [ ] **Step 3: Add the state field**

In `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts`,
add the import and the field. The import goes with the other type imports:

```ts
import type { QueryAnalyticsTrigger } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
```

Add this to `DataExplorerAppState`, after `lastResultColumns`:

```ts
/**
 * What caused the query that is about to run, recorded on `query.ran` and
 * `query.failed`. The explorer re-runs on every pill and limit change, so
 * this is what separates a deliberate run from an incidental one in
 * reporting.
 *
 * Manual-form actions stamp `structured_change` themselves. Every other
 * origin dispatches `setQueryTrigger` immediately before the dispatch that
 * changes the query, so the trigger is already correct by the time the new
 * query key exists.
 */
queryTrigger: QueryAnalyticsTrigger;
```

Add the initial value to `INITIAL_DATA_EXPLORER_STATE`, after
`lastResultColumns: undefined`:

```ts
  queryTrigger: "structured_change",
```

- [ ] **Step 4: Stamp the trigger in the reducer**

In `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx`,
change `_applyQueryChange` to stamp itself:

```ts
/**
 * Apply a structured-query change and also refresh `rawSql` to match,
 * marking SQL to form sync as `true`. Used by manual-form actions that
 * the user makes after opening the panel.
 *
 * Every action routed through here is a manual form edit by definition, so it
 * stamps `structured_change` and overwrites whatever the previous origin was.
 */
function _applyQueryChange(
  state: DataExplorerAppState,
  newQuery: PartialStructuredQuery,
): DataExplorerAppState {
  const newSql = _regenerateRawSqlFromQuery(newQuery);
  return {
    ...state,
    query: newQuery,
    rawSql: newSql,
    isStructuredQueryInSync: true,
    sqlSyncWarnings: [],
    queryTrigger: "structured_change",
  };
}
```

Add the `setQueryTrigger` action to the `actions` object, directly above
`resetState`:

```ts
    /**
     * Record what is about to cause the next query run.
     *
     * Dispatch this immediately *before* the dispatch that changes the query.
     * The trigger is not part of the query key, so setting it first is always
     * safe, while setting it afterwards can let a render slip through with the
     * previous origin still recorded.
     */
    setQueryTrigger: (
      state: DataExplorerAppState,
      queryTrigger: QueryAnalyticsTrigger,
    ): DataExplorerAppState => {
      return { ...state, queryTrigger };
    },
```

Add the type import at the top of the file, with the other type imports:

```ts
import type { QueryAnalyticsTrigger } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm vitest run src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerQueryTrigger.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Confirm the existing state-manager tests still pass**

```bash
pnpm vitest run src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.test.ts
```

Expected: PASS, unchanged.

- [ ] **Step 7: Review checkpoint**

Do not commit. Record both Vitest outputs.

---

## Task 7: Stamp the trigger at each origin

> **`url_hydration` works only because React batches, and nothing enforces
> that.** The five structured restores in `useDataExplorerUrlSync` all route
> through `_applyQueryChange`, which stamps `structured_change`. Stamping
> `url_hydration` before them would be overwritten five times over. It works
> only because every dispatch from `setDataSource` through `setIsHydrated` is
> synchronous, with the block's single `await` sitting above the first of
> them, so React coalesces the whole set into one render and the last stamp
> wins.
>
> Verified: the only `await` in that block is at `useDataExplorerUrlSync.ts:167`
> and the first dispatch is at `:173`.
>
> **Inserting any `await` between those dispatches silently breaks the
> `url_hydration` trigger**, and every query stamped by that path would then
> report `structured_change` with no test going red. If a future change needs
> to suspend mid-hydration, the trigger has to move into the query-changing
> action payloads instead.
>
> **Add this test** to
> `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerQueryTrigger.test.tsx`.
> It pins the mechanism directly, without needing the full URL-sync harness:
>
> ```tsx
> it("lets a stamp dispatched after manual-form actions in the same render win", () => {
>   const { result } = _renderStateManager();
>
>   // URL hydration restores the structured query first, and each of those
>   // restores stamps `structured_change`. It stamps its own origin last,
>   // inside the same synchronous block, so React coalesces the whole set
>   // into one render and no query ever observes an intermediate value.
>   act(() => {
>     result.current[1].setLimit(100);
>     result.current[1].setQueryTrigger("url_hydration");
>   });
>
>   expect(result.current[0].queryTrigger).toBe("url_hydration");
>   expect(result.current[0].query.limit).toBe(100);
> });
> ```
>
> **Known coverage gap, accepted.** Of the four origins this task stamps, only
> `sql_submit` is exercised through its component. `chat_generated`,
> `dataset_opened`, and `url_hydration` are verified by inspection and by the
> `rg` count in the final task. Testing them end to end would mean standing up
> the chat runtime, the dataset drawer, and the URL-sync harness with mocked
> dataset queries, which is not worth it for a one-line dispatch at each site.

Four call sites set the query from somewhere other than the manual form. Each
dispatches `setQueryTrigger` immediately before the dispatch that changes the
query.

**Files:**

- Modify: `src/views/DataExplorerApp/SqlQueryView/SqlQueryView.tsx:51-61`
- Modify: `src/views/DataExplorerApp/useDataExplorerUrlSync.ts:163-255`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime.ts:350-372`
- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx:392-400`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DataExplorerApp/SqlQueryView/SqlQueryView.test.tsx`:

```tsx
/**
 * Re-running edited SQL is the most deliberate query a user can make, and
 * `query.ran` has to be able to say so.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { SqlQueryView } from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView";
import type { ReactNode } from "react";

vi.mock("@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery", () => {
  return {
    useSqlToStructuredQuery: () => {
      return {
        parseSql: () => {
          return {
            query: { queryColumns: [], aggregations: {} },
            isFullyMapped: true,
            unmappedReasons: [],
          };
        },
      };
    },
  };
});

function _TriggerProbe(): ReactNode {
  const state = DataExplorerStateManager.useState();
  return <output data-testid="trigger">{state.queryTrigger}</output>;
}

function _renderSqlView(): void {
  render(
    <DataExplorerStateManager.Provider
      initialStateOverrides={
        {
          ...DataExplorerStateManager.useState,
          rawSql: "SELECT 1",
        } as never
      }
    >
      <SqlQueryView />
      <_TriggerProbe />
    </DataExplorerStateManager.Provider>,
  );
}

describe("SqlQueryView", () => {
  it("records that the next run came from a SQL submit", () => {
    _renderSqlView();

    fireEvent.click(screen.getByRole("button", { name: /edit query/i }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "SELECT 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /re-run query/i }));

    expect(screen.getByTestId("trigger")).toHaveTextContent("sql_submit");
  });
});
```

If the `initialStateOverrides` spread above does not compile, replace the
wrapper with a small component that dispatches `setRawSql("SELECT 1")` in a
`useEffect` before asserting. The point of the test is the trigger value after
submit, not how the initial SQL got there.

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/views/DataExplorerApp/SqlQueryView/SqlQueryView.test.tsx
```

Expected: FAIL. The trigger reads `structured_change` because nothing stamps
`sql_submit` yet.

- [ ] **Step 3: Stamp `sql_submit`**

In `src/views/DataExplorerApp/SqlQueryView/SqlQueryView.tsx`, change
`onSubmitSql`:

```ts
const onSubmitSql = (rawValue: string): void => {
  const trimmedValue = rawValue.trim();
  dispatch.setQueryTrigger("sql_submit");
  dispatch.setRawSql(trimmedValue);
  const mapping = parseSql(trimmedValue);
  dispatch.applySqlMapping({
    query: mapping.query,
    isFullyMapped: mapping.isFullyMapped,
    unmappedReasons: mapping.unmappedReasons,
  });
  setIsEditMode(false);
};
```

- [ ] **Step 4: Stamp `chat_generated`**

In `src/components/ChatPanel/useAvandarChatRuntime.ts`, inside
`reviewAndApplySql`, add the stamp immediately before the existing
`setRawSql` call at line 353:

```ts
dataExplorerDispatch.setQueryTrigger("chat_generated");
dataExplorerDispatch.setRawSql(sql);
dataExplorerDispatch.setNlPrompt(prompt);
```

- [ ] **Step 5: Stamp `dataset_opened`**

In `src/views/DataExplorerApp/DataExplorerApp.tsx`, in the `OpenDatasetModal`
`onOpen` handler at line 395:

```tsx
        onOpen={(info, rawSql) => {
          dispatch.setQueryTrigger("dataset_opened");
          dispatch.setRawSql(rawSql);
          dispatch.setOpenDataset(info);
          closeOpenDatasetModal();
        }}
```

- [ ] **Step 6: Stamp `url_hydration`**

In `src/views/DataExplorerApp/useDataExplorerUrlSync.ts`, add the stamp as the
**last** dispatch inside the async hydration block, immediately before
`setIsHydrated(true)` at line 254:

```ts
// Restore viz config last: may overwrite the result of
// hydrateFromQuery that setColumns triggered above.
if (urlState.vizConfig) {
  dispatch.setVizConfig(urlState.vizConfig);
}

// Stamped last on purpose. Stamping earlier would not survive: the
// structured restores above route through the manual-form reducer,
// which stamps `structured_change` itself.
//
// This works only because every dispatch above runs synchronously in
// this block, so React coalesces them into one render and no query
// observes an intermediate trigger. Do not introduce an `await`
// between the first dispatch and this line. A render could then commit
// mid-hydration, and every hydrated query would silently report
// `structured_change` instead. If suspending here ever becomes
// necessary, the trigger has to move into the query-changing action
// payloads rather than being stamped separately.
dispatch.setQueryTrigger("url_hydration");

setIsHydrated(true);
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
pnpm vitest run src/views/DataExplorerApp/SqlQueryView/SqlQueryView.test.tsx
pnpm vitest run src/views/DataExplorerApp
```

Expected: PASS for both. The second command exercises every existing Data
Explorer test against the new state field.

- [ ] **Step 8: Review checkpoint**

Do not commit. Record both Vitest outputs and confirm all four stamps are in
place with `rg -n "setQueryTrigger" src`.

Expected: five hits. One in the state manager, four at the call sites.

---

## Task 8: Wire the analytics into `useDataQuery` and its three callers

> **`recordRun(false)` in the `catch` block is load-bearing, not defensive.**
> The emitter reports a failure only when the query function recorded its run,
> and it reads an absent record as "no run happened" and stays silent. Omit
> that call and `query.failed` silently never fires anywhere in the product.
>
> That coupling is deliberate. Gating failures on the recorded run is also what
> stops a cached error from being re-reported: React Query keeps a failed query
> in `status: "error"` for the full `gcTime`, which this app sets to 24 hours,
> so a remount inside that window would otherwise emit a duplicate failure
> every time the user navigates back. The run record is per hook instance, so a
> remount that serves the cached error has no record and correctly stays quiet.
>
> The "records query.failed when the run throws" test in this task is the only
> thing that catches an omission. Do not weaken or skip it.

**Files:**

- Modify: `src/views/DataExplorerApp/useDataQuery.tsx`
- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx:107-113`
- Modify: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx:81-93`
- Modify: `src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.tsx:60-72`

- [ ] **Step 1: Write the failing test**

Create `src/views/DataExplorerApp/useDataQuery.test.tsx`:

```tsx
/**
 * End-to-end for one query: a real React Query cycle through `useDataQuery`
 * has to produce exactly one `query.ran` with the duration and shape of the
 * run that actually happened.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import type { ReactNode } from "react";
import type { Workspace } from "$/models/Workspace/Workspace";

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;

const { logEventMock, runStructuredQueryWithMetadataMock } = vi.hoisted(() => {
  return {
    logEventMock: vi.fn(),
    runStructuredQueryWithMetadataMock: vi.fn(),
  };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: logEventMock } };
});

vi.mock("@/clients/queries/runStructuredQuery/runStructuredQuery", () => {
  return {
    runStructuredQueryWithMetadata: runStructuredQueryWithMetadataMock,
    runStructuredQuery: vi.fn(),
  };
});

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  logEventMock.mockReset();
  runStructuredQueryWithMetadataMock.mockReset();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDataQuery analytics", () => {
  it("records one query.ran for a successful Data Explorer run", async () => {
    runStructuredQueryWithMetadataMock.mockResolvedValue({
      result: {
        id: "r1",
        columns: [{ name: "a", dataType: "varchar" }],
        data: [{ a: "x" }],
        numRows: 1,
      },
      didAutoLimit: false,
    });

    renderHook(
      () => {
        return useDataQuery({
          query: { queryColumns: [], aggregations: {} } as never,
          rawSql: "SELECT 1",
          auth: "workspace",
          workspaceId: TEST_WORKSPACE_ID,
          analyticsSurface: "data_explorer",
          analyticsTrigger: "sql_submit",
        });
      },
      { wrapper: _wrapper },
    );

    await waitFor(() => {
      expect(logEventMock).toHaveBeenCalledTimes(1);
    });
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.ran",
      workspaceId: TEST_WORKSPACE_ID,
      app: "data_explorer",
      payload: {
        trigger: "sql_submit",
        source: "rawSql",
        rowCount: 1,
        columnCount: 1,
        didAutoLimit: false,
      },
    });
  });

  it("records query.failed when the run throws", async () => {
    runStructuredQueryWithMetadataMock.mockRejectedValue(
      new Error('Binder Error: Referenced column "nope" not found'),
    );

    renderHook(
      () => {
        return useDataQuery({
          query: { queryColumns: [], aggregations: {} } as never,
          rawSql: "SELECT nope",
          auth: "workspace",
          workspaceId: TEST_WORKSPACE_ID,
          analyticsSurface: "data_explorer",
          analyticsTrigger: "sql_submit",
        });
      },
      { wrapper: _wrapper },
    );

    await waitFor(() => {
      expect(logEventMock).toHaveBeenCalledTimes(1);
    });
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.failed",
      payload: { errorClass: "missing_column", trigger: "sql_submit" },
    });
  });

  it("records a positive duration for a run that took real time", async () => {
    runStructuredQueryWithMetadataMock.mockImplementation(async () => {
      await new Promise((resolve) => {
        return setTimeout(resolve, 20);
      });
      return {
        result: { id: "r2", columns: [], data: [], numRows: 0 },
        didAutoLimit: true,
      };
    });

    renderHook(
      () => {
        return useDataQuery({
          query: { queryColumns: [], aggregations: {} } as never,
          rawSql: "SELECT 1",
          auth: "workspace",
          workspaceId: TEST_WORKSPACE_ID,
          analyticsSurface: "data_explorer",
          analyticsTrigger: "structured_change",
        });
      },
      { wrapper: _wrapper },
    );

    await waitFor(() => {
      expect(logEventMock).toHaveBeenCalledTimes(1);
    });
    const payload = logEventMock.mock.calls[0]?.[0]?.payload;
    expect(payload.durationMs).toBeGreaterThan(0);
    expect(payload.didAutoLimit).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/views/DataExplorerApp/useDataQuery.test.tsx
```

Expected: FAIL. `analyticsSurface` is not an accepted option and nothing is
emitted.

- [ ] **Step 3: Rewrite `useDataQuery`**

Replace the whole contents of `src/views/DataExplorerApp/useDataQuery.tsx`:

```tsx
import { Model } from "@avandar/models";
import { useQuery } from "@avandar/query-hooks";
import { prop, sortObjList } from "@avandar/utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import { useDataQueryAnalytics } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics";
import { useDataQueryRunRecorder } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { DataQueryRunMeta } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMeta.types";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type {
  QueryAnalyticsSurface,
  QueryAnalyticsTrigger,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";

type UseDataQueryOptions = {
  query: StructuredQuery.Partial;
  rawSql: string | undefined;
  /**
   * When true, `rawSql` was generated from the manual form and row-count guard
   * logic may replace it with bounded SQL before execution.
   */
  isStructuredQueryInSync?: boolean;

  /**
   * Which surface is running this query. Decides whether a successful run is
   * recorded: only the Data Explorer records `query.ran`, because a dashboard
   * would otherwise report one query per block per page view. Failures are
   * recorded from every surface.
   */
  analyticsSurface: QueryAnalyticsSurface;

  /**
   * What caused this run. The Data Explorer passes the value its state manager
   * tracks. Dashboard blocks and viz-config previews have no user-initiated
   * trigger, so they keep the default.
   */
  analyticsTrigger?: QueryAnalyticsTrigger;
} & (
  | {
      auth: "workspace";
      workspaceId: Workspace.Id;
    }
  | {
      auth: "public";
      publicAvaPageId: Dashboard.Id;
    }
);

/** Classifies where a run's SQL and rows came from, for the analytics payload. */
function _describeQuerySource(
  options: Readonly<{
    dataSource: StructuredQuery.Partial["dataSource"];
    rawSql: string | undefined;
  }>,
): Pick<DataQueryRunMeta, "source" | "dataSourceType"> {
  const { dataSource, rawSql } = options;
  return {
    source: rawSql ? "rawSql" : "structured",
    dataSourceType:
      dataSource === undefined
        ? "none"
        : Model.isOfModelType(dataSource, "Dataset")
          ? "dataset"
          : "entity",
  };
}

/**
 * This is the main hook in the DataExplorerApp that will query the data.
 * This hook calls the appropriate clients to query the data, which in turn
 * will call the appropriate sub-systems to pull the source data.
 *
 * If the workspaceId is `undefined` then the query will be run as a public
 * user.
 *
 * TODO(jpsyx): we should not support public querying here. That is just
 * a stopgap. We should have a proper usePublicDataQuery hook to handle
 * it properly.
 */
export function useDataQuery(
  options: UseDataQueryOptions,
): UseQueryResultTuple<QueryResult.T<UnknownRow>> {
  const {
    auth,
    query,
    rawSql,
    isStructuredQueryInSync = true,
    analyticsSurface,
    analyticsTrigger = "block_render",
  } = options;
  const { dataSource, queryColumns } = query;
  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("id"),
  });
  const workspaceId =
    auth === "workspace" ? options.workspaceId : options.publicAvaPageId;
  const { beginRun, runMetaRef } = useDataQueryRunRecorder(
    _describeQuerySource({ dataSource, rawSql }),
  );

  const queryResult = useQuery({
    enabled: !!dataSource || !!rawSql,
    queryKey: [
      auth,
      workspaceId,
      query,
      "rawSql",
      rawSql,
      "dataSource",
      dataSource,
      "select",
      sortedQueryColumns,
      "structuredInSync",
      isStructuredQueryInSync,
    ],
    queryFn: async (): Promise<QueryResult.T<UnknownRow>> => {
      const recordRun = beginRun();
      // Branching rather than spreading a precomputed params object: the
      // queryKey lint rule tracks the identifiers this callback reads, and
      // only the if/else form lets it see the two ids as mutually exclusive.
      // Both are already carried in the key as `workspaceId` above.
      try {
        if (auth === "workspace") {
          const run = await runStructuredQueryWithMetadata({
            auth: "workspace",
            workspaceId: options.workspaceId,
            query,
            rawSql,
            isStructuredQueryInSync,
          });
          recordRun(run.didAutoLimit);
          return run.result;
        }
        const run = await runStructuredQueryWithMetadata({
          auth: "public",
          publicAvaPageId: options.publicAvaPageId,
          query,
          rawSql,
          isStructuredQueryInSync,
        });
        recordRun(run.didAutoLimit);
        return run.result;
      } catch (error) {
        recordRun(false);
        throw error;
      }
    },
  });

  useDataQueryAnalytics({
    surface: analyticsSurface,
    trigger: analyticsTrigger,
    workspaceId: auth === "workspace" ? options.workspaceId : undefined,
    runMetaRef,
    queryResult: queryResult[2],
  });

  return queryResult;
}
```

- [ ] **Step 4: Pass the surface at all three call sites**

`src/views/DataExplorerApp/DataExplorerApp.tsx:107`:

```tsx
const [queryResults, isLoadingResults, dataQuery] = useDataQuery({
  query: state.query,
  rawSql: state.rawSql,
  isStructuredQueryInSync: state.isStructuredQueryInSync,
  auth: "workspace",
  workspaceId: workspace.id,
  analyticsSurface: "data_explorer",
  analyticsTrigger: state.queryTrigger,
});
```

`src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx:81`:

```tsx
const [queryResults, isLoadingResults] = useDataQuery({
  query: emptyStructuredQuery,
  rawSql: filteredSql,
  analyticsSurface: "dashboard_block",
  ...(metadata.auth === "workspace"
    ? {
        auth: "workspace" as const,
        workspaceId: metadata.workspaceId,
      }
    : {
        auth: "public" as const,
        publicAvaPageId: metadata.dashboardId,
      }),
});
```

`src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.tsx:60`:

```tsx
const [queryResults] = useDataQuery({
  query: emptyStructuredQuery,
  rawSql: rawSql,
  analyticsSurface: "viz_config",
  ...(workspaceId !== undefined
    ? {
        auth: "workspace" as const,
        workspaceId,
      }
    : {
        auth: "public" as const,
        publicAvaPageId: dashboardId,
      }),
});
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pnpm vitest run src/views/DataExplorerApp/useDataQuery.test.tsx
pnpm type-check
```

Expected: PASS for the first, and for `type-check`, the single pre-existing
`ExportPdfButton.tsx` error from Task 1 and nothing new.

- [ ] **Step 6: Confirm the dashboard call sites still render**

```bash
pnpm vitest run src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.test.tsx src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.test.tsx
```

Expected: PASS. Both tests mock `useDataQuery` wholesale, so the new option
changes nothing for them.

- [ ] **Step 7: Review checkpoint**

Do not commit. Record all three outputs.

---

## Task 9: Record PDF exports

Read the "Emission is inert for PDF export until a flag flips" note in
Background before starting. `HIDE_EXPORT_AS_PDF = true` makes this flow
unreachable in the product; the instrumentation ships anyway so it is ready
when the flag is removed.

**Files:**

- Create: `src/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads.ts`
- Create: `src/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads.test.ts`
- Modify: `src/views/DashboardApp/DashboardEditorView/ExportPdfButton.tsx:61-66`
- Modify: `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/ExportPdfModal.tsx:86-109` and `:189`
- Modify: `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotator.tsx:17-53`
- Modify: `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/useAnnotatedPdfExport.ts`

- [ ] **Step 1: Write the failing test**

Create
`src/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads.test.ts`:

```ts
/**
 * Block count is what makes an export duration interpretable: a slow export of
 * two blocks and a slow export of forty are different problems.
 */
import { describe, expect, it } from "vitest";
import { DashboardPdfAnalyticsPayloads } from "@/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

function _fakeDashboard(blockCount: number): Dashboard.T {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Quarterly",
    config: {
      root: { props: {} },
      content: Array.from({ length: blockCount }, (_unused, index) => {
        return { type: "DataViz", props: { id: `block-${index}` } };
      }),
      zones: {},
    },
  } as unknown as Dashboard.T;
}

describe("DashboardPdfAnalyticsPayloads", () => {
  it("counts the blocks on the dashboard being opened for export", () => {
    expect(
      DashboardPdfAnalyticsPayloads.fromOpen({ dashboard: _fakeDashboard(4) }),
    ).toEqual({
      dashboardId: "00000000-0000-4000-8000-000000000001",
      blockCount: 4,
    });
  });

  it("reports zero blocks for an empty dashboard rather than omitting the count", () => {
    expect(
      DashboardPdfAnalyticsPayloads.fromOpen({ dashboard: _fakeDashboard(0) })
        .blockCount,
    ).toBe(0);
  });

  it("rounds the export duration", () => {
    expect(
      DashboardPdfAnalyticsPayloads.fromExport({
        dashboard: _fakeDashboard(2),
        durationMs: 1840.7,
      }),
    ).toEqual({
      dashboardId: "00000000-0000-4000-8000-000000000001",
      blockCount: 2,
      durationMs: 1841,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run src/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Create the payload builders**

Create
`src/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads.ts`:

```ts
import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { AnalyticsEventPayloads } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Dashboard config is stored as JSON, while the editor guarantees the Ava Page
 * shape before an export can be started.
 */
function _countBlocks(dashboard: Dashboard.T): number {
  return (dashboard.config as unknown as AvaPageGenericData).content.length;
}

function _fromOpen(
  options: Readonly<{ dashboard: Dashboard.T }>,
): AnalyticsEventPayloads["dashboard.pdf_export_opened"] {
  return {
    dashboardId: options.dashboard.id,
    blockCount: _countBlocks(options.dashboard),
  };
}

function _fromExport(
  options: Readonly<{ dashboard: Dashboard.T; durationMs: number }>,
): AnalyticsEventPayloads["dashboard.pdf_exported"] {
  return {
    dashboardId: options.dashboard.id,
    blockCount: _countBlocks(options.dashboard),
    durationMs: Math.round(options.durationMs),
  };
}

/** Privacy-safe payload builders for dashboard PDF export analytics. */
export const DashboardPdfAnalyticsPayloads = {
  fromOpen: _fromOpen,
  fromExport: _fromExport,
};
```

- [ ] **Step 4: Use the builder for the opened event**

In `src/views/DashboardApp/DashboardEditorView/ExportPdfButton.tsx`, replace
the inline payload at line 65 and add the import:

```tsx
import { DashboardPdfAnalyticsPayloads } from "@/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads";
```

```tsx
void AnalyticsClient.logEvent({
  event: "dashboard.pdf_export_opened",
  workspaceId: dashboard.workspaceId,
  app: "dashboards",
  payload: DashboardPdfAnalyticsPayloads.fromOpen({ dashboard }),
});
```

- [ ] **Step 5: Time and record the direct export**

In `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/ExportPdfModal.tsx`,
add the two imports:

```tsx
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { DashboardPdfAnalyticsPayloads } from "@/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads";
```

Add a shared emitter above `onDirectExport`, inside the component:

```tsx
const logPdfExported = useCallback(
  (durationMs: number): void => {
    void AnalyticsClient.logEvent({
      event: "dashboard.pdf_exported",
      workspaceId: dashboard.workspaceId,
      app: "dashboards",
      payload: DashboardPdfAnalyticsPayloads.fromExport({
        dashboard,
        durationMs,
      }),
    });
  },
  [dashboard],
);
```

Then time the direct path:

```tsx
const onDirectExport = useCallback(async (): Promise<void> => {
  if (!renderContainerRef.current) {
    notifyError({ title: t`Dashboard not ready`, message: t`Try again.` });
    return;
  }
  setIsExporting(true);
  const startedAt = performance.now();
  try {
    await PdfExport.captureAndDownloadPdf({
      element: renderContainerRef.current,
      filename,
      title: dashboard.name || t`Untitled dashboard`,
    });
    logPdfExported(performance.now() - startedAt);
    notifySuccess(t`PDF downloaded.`);
    onClose();
  } catch (error: unknown) {
    console.error(error);
    notifyError({
      title: t`Couldn't export PDF`,
      message: t`Please try again. The PDF was not created.`,
    });
  } finally {
    setIsExporting(false);
  }
}, [filename, dashboard.name, onClose, t, logPdfExported]);
```

Note the emission sits **before** `onClose()` and inside the `try`, so a failed
export records nothing.

- [ ] **Step 6: Report the annotated export's duration upward**

In `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/useAnnotatedPdfExport.ts`,
add the callback to the options type and time the capture:

```ts
type UseAnnotatedPdfExportOptions = {
  sourceElement: HTMLElement | undefined;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  filename: string;
  title: string;
  onClose: () => void;
  /** Called with the wall-clock duration after a successful export only. */
  onExported: (durationMs: number) => void;
};
```

```ts
const { filename, onClose, onExported, overlayRef, sourceElement, title } =
  options;
const [isExporting, setIsExporting] = useState(false);
const exportPdf = useCallback(async (): Promise<void> => {
  if (!sourceElement || !overlayRef.current) {
    return;
  }
  setIsExporting(true);
  const startedAt = performance.now();
  try {
    await PdfExport.captureAndDownloadPdf({
      element: sourceElement,
      annotationCanvas: overlayRef.current,
      filename,
      title,
    });
    onExported(performance.now() - startedAt);
    onClose();
  } catch (error: unknown) {
    console.error(error);
    notifyError({
      title: t`Couldn't export PDF`,
      message: t`Please try again. The PDF was not created.`,
    });
  } finally {
    setIsExporting(false);
  }
}, [filename, onClose, onExported, overlayRef, sourceElement, t, title]);
```

In `src/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotator.tsx`,
add `onExported` to `Props`, destructure it, and pass it through:

```tsx
type Props = {
  sourceElement: HTMLElement | undefined;
  filename: string;
  title: string;
  onClose: () => void;
  onBack: () => void;
  /** Called with the wall-clock duration after a successful export only. */
  onExported: (durationMs: number) => void;
};
```

```tsx
export function PdfAnnotator({
  sourceElement,
  filename,
  title,
  onClose,
  onBack,
  onExported,
}: Props): ReactNode {
```

```tsx
const { isExporting, exportPdf } = useAnnotatedPdfExport({
  sourceElement,
  overlayRef,
  filename,
  title,
  onClose,
  onExported,
});
```

Back in `ExportPdfModal.tsx`, pass the emitter to the annotator at line 189:

```tsx
      <PdfAnnotator
        onExported={logPdfExported}
```

Keep every other prop already on that element unchanged.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
pnpm vitest run src/views/DashboardApp/DashboardEditorView/DashboardPdfAnalyticsPayloads/DashboardPdfAnalyticsPayloads.test.ts
pnpm type-check
```

Expected: PASS for the first. `type-check` now reports **zero** errors: the
`ExportPdfButton` error introduced in Task 1 is resolved by Step 4.

- [ ] **Step 8: Review checkpoint**

Do not commit. Record both outputs and note in the summary that this event
cannot fire in production while `HIDE_EXPORT_AS_PDF` is `true`.

---

## Task 10: Build the chat turn payloads

**Files:**

- Create: `supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.ts`
- Create: `supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.test.ts`

- [ ] **Step 1: Write the failing test**

Create
`supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.test.ts`:

```ts
/**
 * `analytics.chat_health` parses `outcome`, `attemptCount`, and `latencyMs`
 * out of these payloads with `->>`. A wrong value here produces a silently
 * empty report rather than an error, so the classification is pinned.
 */
import { ChatTurnAnalyticsPayloads } from "@sbfn/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.ts";
import { describe, expect, it } from "vitest";

const BASE_COMPLETED = {
  modelId: "openai/gpt-4o-mini",
  latencyMs: 1234.6,
  attemptCount: 1,
  promptChars: 40,
  schemaDatasetCount: 3,
};

describe("ChatTurnAnalyticsPayloads.fromCompletedTurn", () => {
  it("classifies a turn that generated SQL", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Here is the SQL I ran.",
      parsed: { generatedSql: { sql: "SELECT 1" } },
    });

    expect(payload.outcome).toBe("sql");
    expect(payload.latencyMs).toBe(1235);
    expect(payload.responseChars).toBe("Here is the SQL I ran.".length);
    expect(payload.wasSampled).toBe(false);
    expect(payload).not.toHaveProperty("piiSeverity");
  });

  it("prefers clarification over a dashboard block when both are present", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Which region?",
      parsed: {
        clarification: { question: "Which region?" },
        dashboardBlock: { kind: "DataViz" },
      },
    });

    expect(payload.outcome).toBe("clarification");
  });

  it("classifies a dashboard block turn", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Added a bar chart.",
      parsed: { dashboardBlock: { kind: "DataViz" } },
    });

    expect(payload.outcome).toBe("dashboard_block");
  });

  it("classifies a plain text answer", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      assistantText: "Your dataset has 4 columns.",
      parsed: { text: "Your dataset has 4 columns." },
    });

    expect(payload.outcome).toBe("text");
  });

  it("classifies an escalation that still produced nothing as empty", () => {
    const payload = ChatTurnAnalyticsPayloads.fromCompletedTurn({
      ...BASE_COMPLETED,
      attemptCount: 3,
      assistantText: "I could not generate a query for that. Try rephrasing.",
      parsed: {},
    });

    expect(payload.outcome).toBe("empty");
    expect(payload.attemptCount).toBe(3);
  });
});

describe("ChatTurnAnalyticsPayloads.fromFailedTurn", () => {
  it("classifies a non-2xx from the model provider", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 900.2,
      error: new Error("OpenRouter API error: 429 rate limited"),
    });

    expect(payload).toEqual({
      modelId: "openai/gpt-4o-mini",
      errorClass: "upstream_error",
      latencyMs: 900,
    });
  });

  it("classifies a transport failure as network", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      error: new TypeError("error sending request for url"),
    });

    expect(payload.errorClass).toBe("network");
  });

  it("classifies a malformed response body as parse", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      error: new SyntaxError("Unexpected token < in JSON at position 0"),
    });

    expect(payload.errorClass).toBe("parse");
  });

  it("classifies anything else as unknown", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      error: new Error("something else"),
    });

    expect(payload.errorClass).toBe("unknown");
  });

  it("never carries the error message, which can echo the provider's body", () => {
    const payload = ChatTurnAnalyticsPayloads.fromFailedTurn({
      modelId: "openai/gpt-4o-mini",
      latencyMs: 10,
      error: new Error('OpenRouter API error: {"prompt":"my secret data"}'),
    });

    expect(JSON.stringify(payload)).not.toContain("secret");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.test.ts
```

Expected: FAIL. The module does not exist.

Edge-function tests run under Vitest, not Deno, using the `@sbfn` alias
configured in `vite.config.ts:201`. `logAnalyticsEvent.test.ts` is the existing
example.

- [ ] **Step 3: Create the builders**

Create
`supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.ts`:

```ts
import type {
  AnalyticsEventPayloads,
  ChatTurnErrorClass,
  ChatTurnOutcome,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types.ts";

/** The parts of a parsed model response that decide a turn's outcome. */
type ParsedTurn = {
  text?: string;
  generatedSql?: unknown;
  clarification?: unknown;
  dashboardBlock?: unknown;
};

/**
 * Ordered because a single response can carry more than one of these. A
 * clarification outranks a dashboard block: when the model asks a question it
 * has not done the work yet, whatever else it attached.
 */
function _classifyOutcome(parsed: ParsedTurn): ChatTurnOutcome {
  if (parsed.generatedSql) {
    return "sql";
  }
  if (parsed.clarification) {
    return "clarification";
  }
  if (parsed.dashboardBlock) {
    return "dashboard_block";
  }
  return parsed.text ? "text" : "empty";
}

function _classifyError(error: unknown): ChatTurnErrorClass {
  if (error instanceof SyntaxError) {
    return "parse";
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/OpenRouter API error/i.test(message)) {
    return "upstream_error";
  }
  if (
    error instanceof TypeError ||
    /fetch|network|sending request/i.test(message)
  ) {
    return "network";
  }
  return "unknown";
}

function _fromCompletedTurn(
  options: Readonly<{
    modelId: string;
    latencyMs: number;
    attemptCount: number;
    promptChars: number;
    schemaDatasetCount: number;
    assistantText: string;
    parsed: ParsedTurn;
  }>,
): AnalyticsEventPayloads["chat.turn_completed"] {
  return {
    modelId: options.modelId,
    latencyMs: Math.round(options.latencyMs),
    attemptCount: options.attemptCount,
    outcome: _classifyOutcome(options.parsed),
    promptChars: options.promptChars,
    responseChars: options.assistantText.length,
    schemaDatasetCount: options.schemaDatasetCount,
    // Nothing retains chat samples yet, so no turn is ever sampled and no
    // severity is assessed.
    wasSampled: false,
  };
}

/**
 * Records only the classification, never the message. Provider error bodies
 * can echo the request, which would put prompt text into an analytics payload.
 */
function _fromFailedTurn(
  options: Readonly<{
    modelId: string;
    latencyMs: number;
    error: unknown;
  }>,
): AnalyticsEventPayloads["chat.turn_failed"] {
  return {
    modelId: options.modelId,
    errorClass: _classifyError(options.error),
    latencyMs: Math.round(options.latencyMs),
  };
}

/** Privacy-safe payload builders for server-side chat turn analytics. */
export const ChatTurnAnalyticsPayloads = {
  fromCompletedTurn: _fromCompletedTurn,
  fromFailedTurn: _fromFailedTurn,
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the Vitest output.

---

## Task 11: Emit the chat turn events

> **Keep the `try` narrow, around the request attempts only.** Anything else
> that throws inside it gets classified as a chat turn failure and recorded as
> such. `_classifyError` labels a `TypeError` whose message looks like
> transport as `network`, so a plain programming error in payload assembly
> pulled inside this block would be reported as provider flakiness in
> `analytics.chat_health`, sending whoever reads it to debug the wrong system.
>
> The block wraps the three OpenRouter attempts and their parsing. It must not
> grow to cover the response construction or the emit calls that follow.

**Files:**

- Modify: `supabase/functions/chat/PostChatMessages/PostChatMessages.ts:97-278`

- [ ] **Step 1: Write the failing test**

Create
`supabase/functions/chat/PostChatMessages/analytics/emitChatTurnAnalytics.test.ts`:

```ts
/**
 * The emitter is what makes `analytics.chat_health` non-empty. It must record
 * exactly one row per turn, must never let an analytics failure surface to the
 * user, and must classify a failed turn without the attempt ever completing.
 */
import { emitChatTurnAnalytics } from "@sbfn/chat/PostChatMessages/analytics/emitChatTurnAnalytics.ts";
import { describe, expect, it, vi } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

function _createFakeClient(): {
  client: AvaSupabaseClient;
  insert: ReturnType<typeof vi.fn>;
} {
  const insert = vi.fn(() => {
    return { throwOnError: vi.fn(async () => ({ error: null })) };
  });
  return {
    client: { from: vi.fn(() => ({ insert })) } as unknown as AvaSupabaseClient,
    insert,
  };
}

describe("emitChatTurnAnalytics", () => {
  it("records a completed turn against the workspace and user", async () => {
    const fake = _createFakeClient();

    await emitChatTurnAnalytics({
      supabaseAdminClient: fake.client,
      workspaceId: "ws-1",
      userId: "user-1",
      pageApp: "data-explorer",
      outcome: {
        kind: "completed",
        modelId: "openai/gpt-4o-mini",
        latencyMs: 1200,
        attemptCount: 2,
        promptChars: 12,
        schemaDatasetCount: 4,
        assistantText: "ok",
        parsed: { generatedSql: { sql: "SELECT 1" } },
      },
    });

    expect(fake.insert).toHaveBeenCalledTimes(1);
    expect(fake.insert.mock.calls[0]?.[0]).toMatchObject({
      event_name: "chat.turn_completed",
      workspace_id: "ws-1",
      user_id: "user-1",
      app: "data_explorer",
      client: "server",
    });
    expect(fake.insert.mock.calls[0]?.[0]?.payload).toMatchObject({
      outcome: "sql",
      attemptCount: 2,
      latencyMs: 1200,
    });
  });

  it("records a failed turn", async () => {
    const fake = _createFakeClient();

    await emitChatTurnAnalytics({
      supabaseAdminClient: fake.client,
      workspaceId: "ws-1",
      userId: "user-1",
      pageApp: "dashboards",
      outcome: {
        kind: "failed",
        modelId: "openai/gpt-4o-mini",
        latencyMs: 300,
        error: new Error("OpenRouter API error: 500"),
      },
    });

    expect(fake.insert.mock.calls[0]?.[0]).toMatchObject({
      event_name: "chat.turn_failed",
      app: "dashboards",
    });
    expect(fake.insert.mock.calls[0]?.[0]?.payload).toMatchObject({
      errorClass: "upstream_error",
    });
  });

  it("leaves the app null on the generic surface, which has no app_type value", async () => {
    const fake = _createFakeClient();

    await emitChatTurnAnalytics({
      supabaseAdminClient: fake.client,
      workspaceId: "ws-1",
      userId: "user-1",
      pageApp: "other",
      outcome: {
        kind: "failed",
        modelId: "m",
        latencyMs: 1,
        error: new Error("x"),
      },
    });

    expect(fake.insert.mock.calls[0]?.[0]?.app).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/analytics/emitChatTurnAnalytics.test.ts
```

Expected: FAIL. The module does not exist.

- [ ] **Step 3: Create the emitter**

Create
`supabase/functions/chat/PostChatMessages/analytics/emitChatTurnAnalytics.ts`:

```ts
import { logAnalyticsEvent } from "@sbfn/_shared/analytics/logAnalyticsEvent/logAnalyticsEvent.ts";
import { ChatTurnAnalyticsPayloads } from "@sbfn/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { AnalyticsApp } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";

/** What a turn ended up being, and the facts only the server knows about it. */
type ChatTurnOutcomeRecord =
  | {
      kind: "completed";
      modelId: string;
      latencyMs: number;
      attemptCount: number;
      promptChars: number;
      schemaDatasetCount: number;
      assistantText: string;
      parsed: {
        text?: string;
        generatedSql?: unknown;
        clarification?: unknown;
        dashboardBlock?: unknown;
      };
    }
  | {
      kind: "failed";
      modelId: string;
      latencyMs: number;
      error: unknown;
    };

/**
 * The chat page context uses hyphenated surface names while the database enum
 * uses underscores, and the generic surface has no enum value at all.
 */
function _pageAppToAnalyticsApp(
  pageApp: ChatPageContext.ChatApp,
): AnalyticsApp | undefined {
  switch (pageApp) {
    case "data-explorer":
      return "data_explorer";
    case "data-sources":
      return "data_sources";
    case "dashboards":
      return "dashboards";
    case "other":
      return undefined;
  }
}

/**
 * Records one chat turn. Never throws: `logAnalyticsEvent` swallows its own
 * failures, and a turn that a user already paid for must not fail because a
 * telemetry row could not be written.
 */
export async function emitChatTurnAnalytics(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    workspaceId: string;
    userId: string;
    pageApp: ChatPageContext.ChatApp;
    outcome: ChatTurnOutcomeRecord;
  }>,
): Promise<void> {
  const { supabaseAdminClient, workspaceId, userId, pageApp, outcome } =
    options;
  const app = _pageAppToAnalyticsApp(pageApp);

  if (outcome.kind === "failed") {
    await logAnalyticsEvent({
      supabaseAdminClient,
      workspaceId,
      userId,
      app,
      event: "chat.turn_failed",
      payload: ChatTurnAnalyticsPayloads.fromFailedTurn({
        modelId: outcome.modelId,
        latencyMs: outcome.latencyMs,
        error: outcome.error,
      }),
    });
    return;
  }

  await logAnalyticsEvent({
    supabaseAdminClient,
    workspaceId,
    userId,
    app,
    event: "chat.turn_completed",
    payload: ChatTurnAnalyticsPayloads.fromCompletedTurn({
      modelId: outcome.modelId,
      latencyMs: outcome.latencyMs,
      attemptCount: outcome.attemptCount,
      promptChars: outcome.promptChars,
      schemaDatasetCount: outcome.schemaDatasetCount,
      assistantText: outcome.assistantText,
      parsed: outcome.parsed,
    }),
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm vitest run supabase/functions/chat/PostChatMessages/analytics/emitChatTurnAnalytics.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Count the attempts and time the turn**

In `supabase/functions/chat/PostChatMessages/PostChatMessages.ts`, add the
import beside the other `@sbfn/chat/PostChatMessages/*` imports:

```ts
import { emitChatTurnAnalytics } from "@sbfn/chat/PostChatMessages/analytics/emitChatTurnAnalytics.ts";
```

Change the action signature at line 97 to destructure the admin client:

```ts
  .action(async ({ pathParams, body, supabaseClient, supabaseAdminClient, user }) => {
```

Replace the `runAttempt` helper at lines 205-211 so it counts:

```ts
const turnStartedAt = performance.now();
let attemptCount = 0;

// Single OpenRouter attempt, wrapped in a helper so the
// retry-on-empty escalation below can re-call it with different
// params. Throws on non-2xx so the outer handler surfaces it.
// The counter is what `analytics.chat_health` reports as
// `avg_attempt_count`, which is how often the escalation below fires.
const runAttempt = (attemptRequestBody: Record<string, unknown>) => {
  attemptCount += 1;
  return sendOpenRouterRequest({
    requestBody: attemptRequestBody,
    apiKey: openRouterApiKey,
    referer: openRouterReferer,
  });
};
```

- [ ] **Step 6: Wrap the attempts and emit**

Wrap the three-attempt block in a try/catch that records a failed turn and
rethrows. Replace lines 213-259 (from `// Attempt 1` through the closing brace
of the third attempt) with the same code wrapped as follows, keeping every
attempt body byte-identical:

Declare `parsed` outside the `try` with an explicit type, because the code
after the block reads it. `attempt` stays inside, since nothing below the block
uses it.

```ts
let parsed: ReturnType<typeof parseOpenRouterResponse>;
try {
  // Attempt 1: normal call.
  let attempt = await runAttempt(requestBody);
  parsed = parseOpenRouterResponse({
    message: attempt.message,
    attemptText: attempt.text,
    isDataExplorer,
    isDashboards,
    lastUserPrompt,
    priorClarifications,
  });

  // Attempt 2 (only when attempt 1 returned nothing): literal repeat
  // with a bumped temperature so we get a meaningfully different
  // draw rather than the same emptiness twice.
  if (isEmptyParsedAttempt(parsed)) {
    attempt = await runAttempt({ ...requestBody, temperature: 0.5 });
    parsed = parseOpenRouterResponse({
      message: attempt.message,
      attemptText: attempt.text,
      isDataExplorer,
      isDashboards,
      lastUserPrompt,
      priorClarifications,
    });
  }

  // Attempt 3 (only when attempts 1 and 2 returned nothing): force
  // the model into one of the registered tools. Skipped on the
  // generic surface where the request has no tools to pick from.
  const hasTools =
    Array.isArray(requestBody.tools) &&
    (requestBody.tools as unknown[]).length > 0;
  if (isEmptyParsedAttempt(parsed) && hasTools) {
    attempt = await runAttempt({
      ...requestBody,
      temperature: 0.5,
      tool_choice: "required",
    });
    parsed = parseOpenRouterResponse({
      message: attempt.message,
      attemptText: attempt.text,
      isDataExplorer,
      isDashboards,
      lastUserPrompt,
      priorClarifications,
    });
  }
} catch (error) {
  await emitChatTurnAnalytics({
    supabaseAdminClient,
    workspaceId,
    userId: user.id,
    pageApp: context.app,
    outcome: {
      kind: "failed",
      modelId: model,
      latencyMs: performance.now() - turnStartedAt,
      error,
    },
  });
  throw error;
}
```

Then record the completed turn immediately before the `return result;` at the
end of the action:

```ts
const result: ChatResponse.T = Model.make("ChatResponse", {
  assistantText,
  ...(generatedSql ? { generatedSql: generatedSql } : {}),
  ...(clarification ? { clarification } : {}),
  ...(dashboardBlock ? { dashboardBlock } : {}),
});

await emitChatTurnAnalytics({
  supabaseAdminClient,
  workspaceId,
  userId: user.id,
  pageApp: context.app,
  outcome: {
    kind: "completed",
    modelId: model,
    latencyMs: performance.now() - turnStartedAt,
    attemptCount,
    promptChars: lastUserPrompt.length,
    schemaDatasetCount: schema.datasets.length,
    assistantText,
    parsed: { text, generatedSql, clarification, dashboardBlock },
  },
});

return result;
```

- [ ] **Step 7: Verify the whole chat function still type-checks and tests green**

```bash
pnpm vitest run supabase/functions/chat
pnpm type-check
```

Expected: PASS and zero type errors.

- [ ] **Step 8: Review checkpoint**

Do not commit. Record both outputs.

---

## Task 12: Full verification and spec status update

**Files:**

- Modify: `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md:9-29` and `:500-531`

- [ ] **Step 1: Run the full frontend suite**

```bash
pnpm test:frontend
```

Expected: PASS. This includes every edge-function unit test, because
`test:frontend` excludes only `apps/`, `packages/`, and `shared/lib/`.

- [ ] **Step 2: Type-check and lint**

```bash
pnpm type-check && pnpm lint
```

Expected: both clean.

- [ ] **Step 3: Confirm no database change slipped in**

```bash
git status --short supabase/schemas supabase/migrations shared/types
```

Expected: no output. This phase is instrumentation only; a change under any of
those paths means something was misread and must be reverted.

- [ ] **Step 4: Confirm every event now has an emitter**

```bash
rg -n '"query\.ran"|"query\.failed"|"dashboard\.pdf_exported"|"chat\.turn_completed"|"chat\.turn_failed"' src supabase --glob '!*.test.*'
```

Expected: at least one non-test emitter or payload-builder reference for each
of the five names, in these files:

- `query.ran` and `query.failed`: `useDataQueryAnalytics.ts`
- `dashboard.pdf_exported`: `ExportPdfModal.tsx`
- `chat.turn_completed` and `chat.turn_failed`: `emitChatTurnAnalytics.ts`

- [ ] **Step 4b: Confirm the three query surfaces are wired to the right callers**

```bash
rg -n "analyticsSurface: \"" src --glob '!*.test.*'
```

Expected exactly three, one per caller:

- `data_explorer` in `DataExplorerApp.tsx`
- `dashboard_block` in `DataVizPBlock.tsx`
- `viz_config` in `VizConfigPField.tsx`

This grep is now belt-and-braces rather than the real guard. `useDataQuery`'s
options are a discriminated union: `data_explorer` requires an
`analyticsTrigger`, and the other two surfaces forbid one. Both call-site
shapes already satisfied that, so the union cost no churn and made the
mistake a compile error in both directions.

Verified by mutation. Before the union, changing `DataExplorerApp`'s surface to
`dashboard_block` left every test green, because the hook's own tests drive it
directly and both dashboard call sites mock `useDataQuery` wholesale. That
single literal gates whether `query.ran` is ever recorded, so a silent change
would have emptied the activation metric permanently with nothing failing.
After the union the same edit fails with `TS2345` at `DataExplorerApp.tsx`,
and flipping a dashboard site to `data_explorer` fails because the trigger
becomes required.

The two dashboard literals are additionally pinned by assertions in
`DataVizPBlock.test.tsx` and `VizConfigPField.test.tsx`, which already mocked
`useDataQuery` and only needed one `expect.objectContaining` each.

- [ ] **Step 5: Update the spec's phase status**

In `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`,
replace the Phase 3 paragraph in the "Phase status" section (lines 25-29):

```markdown
**Phase 3, product events: complete (2026-08-15).** `analyticsSurface` on
`useDataQuery`, `query.ran`, `query.failed`, `dashboard.pdf_exported`,
`chat.turn_completed`, and `chat.turn_failed` are implemented. No database
change was needed: every column, category mapping, and reporting view these
events feed already existed. `analytics.activation.days_to_first_query` and the
`analytics.chat_health` chat-turn columns are now populated.

Four deliberate deviations from the catalog below.
`dashboard.share_settings_updated` was already emitted from Phase 1B and was
not part of this phase. The `trigger` enum gained `dataset_opened` (opening a
saved dataset is a deliberate run with no other home) and `block_render` (the
two non-explorer surfaces have no user-initiated trigger). And `query.failed`
sanitises its `errorMessage` before recording it: first line only, `LINE n:`
SQL echo dropped, single-quoted literals and long digit runs masked, then
truncated to 500 characters. Storing the message verbatim would have put SQL
text and customer literals in the payload, which the catalog's own privacy rule
forbids.

`dashboard.pdf_exported` gained a `mode` of `direct` or `annotated`. Both
export paths time the same span, but the annotated one additionally composites
over a double-resolution canvas before pagination, so `durationMs` is bimodal.
Without the field a latency regression could not be attributed to either path.
The event carries no database consequence, since payloads are jsonb.

`dashboard.pdf_exported` will record zero rows until `HIDE_EXPORT_AS_PDF` is
removed from `ExportPdfButton.tsx`: the export flow is unreachable in the
product today. The instrumentation shipped with the phase so the event arrives
with the feature rather than after it.

**Phase 4, chat samples: next.** Moving `detectPii` to `shared/`, extending it
to return all matched spans, the surrogates module, the `chat_samples` table,
the capture pipeline, and retention.
```

- [ ] **Step 6: Correct the Implementation Phases section**

In the same file, replace the Phase 3 entry (lines 518-521):

```markdown
**Phase 3, product events: complete.** `analyticsSurface` on `useDataQuery`,
`query.ran`, `query.failed`, `dashboard.pdf_exported`, `chat.turn_completed`,
and `chat.turn_failed`. Implemented by
`docs/superpowers/plans/2026-08-15-analytics-product-events.md`.
`dashboard.share_settings_updated` is absent from this list because it shipped
in Phase 1B.
```

- [ ] **Step 7: Correct the stale claim in the Query Event Scope section**

In the same file, append to the "Query Event Scope" section, after the
`trigger` paragraph (line 198):

```markdown
Two further trigger values exist in the implementation. `dataset_opened` covers
opening a saved dataset from the Data Explorer drawer, which is a deliberate
run that none of the four values above describes. `block_render` is what
dashboard blocks and viz-config previews report on `query.failed`, since
neither has a user-initiated trigger.
```

- [ ] **Step 8: Final review checkpoint**

Do not commit. Report to the user:

1. The `pnpm test:frontend`, `pnpm type-check`, and `pnpm lint` results.
2. That no database change was needed or made.
3. That `dashboard.pdf_exported` is inert until `HIDE_EXPORT_AS_PDF` is
   removed, and that removing that flag is a product decision outside this
   plan.
4. That `dashboard.public_viewed` and the public-dashboard `query.failed` gap
   remain deferred.

---

## Verifying Edge-Function Types: Use The Right Command

**`pnpm type-check` does not cover `supabase/functions`.** All three tsconfigs
exclude it (`tsconfig.json:7`, `tsconfig.app.json:29`, `tsconfig.node.json:20`).
The command that does cover it is **`pnpm tsc-watch`**, which runs
`deno check shared supabase/functions packages/shared` alongside the `tsc`
watch. Vitest transpiles without checking, so a green test run proves nothing
about types there.

This matters, and not hypothetically. Giving `chat.turn_failed` a required
payload in this phase's first task silently invalidated two pre-existing calls
in
`supabase/functions/_shared/analytics/logAnalyticsEvent/logAnalyticsEvent.test.ts`,
which passed a bare `event` with no payload. Those tests kept passing, because
they exercise error swallowing at runtime. The breakage survived ten tasks of
per-task verification because that verification used `pnpm type-check`, which
cannot see the directory. `pnpm tsc-watch` would have shown it immediately.

Both calls now carry a real payload.

Two things worth knowing for future work here:

- **CI does not run `deno check`.** The workflows run `pnpm lint`,
  `pnpm type-check`, and `pnpm test`; no step covers edge-function types.
  Whether to add one is a repo-level decision outside this phase.
- **Any task touching `supabase/functions` should verify with `pnpm tsc-watch`**
  (or `bash scripts/tsc-watch.sh --deno-only`, which exits rather than
  watching, when Deno is installed). Where Deno is unavailable, a throwaway
  tsconfig including the directory with an ambient `Deno` shim gives partial
  signal, but it reports `npm:` and `jsr:` specifiers as unresolvable because
  those resolve only under Deno.

## Follow-Up Worth Doing, Deliberately Not Done Here

**Extract the three-attempt escalation out of `PostChatMessages`'s action
body.** Adding the try/catch pushed that body from roughly 165 lines to 215 and
forced a whole-body Prettier reindent. Pulling the escalation into its own
function would let the `try` wrap a single call, make `parsed` a `const`
without a derived type annotation, remove `attemptCount` as a mutable closure
variable, and let the arrow fit back on the `.action(` line.

Not done here for one reason: **the escalation has no direct test coverage.**
Nothing exercises the retry-on-empty behavior or the `tool_choice: "required"`
third attempt, so a mechanical-looking extraction would be unverifiable at the
point in the phase where everything else is green. Write tests for the
escalation first, then extract.

The churn is also less bad than it looks: `git diff -w` on that file collapses
to 47 insertions and 3 deletions, with the only structural move being `attempt`
migrating inside the `try`.

## What This Phase Deliberately Leaves Undone

- **The `url_hydration` trigger has no test.** Verified empirically: moving its
  stamp to the top of the hydration block, which breaks it, leaves all 137
  Data Explorer tests green. There is no test file for
  `useDataExplorerUrlSync` at all, and reaching the structured-restore path
  that creates the ordering risk needs datasets, entity configs, a workspace,
  and router context stood up. The only real mitigation is a pair of comments:
  one at the stamp explaining why it must be last, and one at the top of the
  hydration block warning against inserting an `await`, placed where that
  mistake would actually be typed.

  The batching test in `DataExplorerQueryTrigger.test.tsx` is **not** a
  mitigation for this, despite covering the mechanism the stamp relies on. It
  asserts that two dispatches in one `act` apply in order, which is a React
  `useReducer` guarantee, and it says nothing about `useDataExplorerUrlSync`
  stamping last. Treat it as executable documentation of the invariant. If
  that hook ever gets a test harness, a test rendering it with a URL carrying
  both `colNames` and `rawSql` and asserting `url_hydration` is what would
  actually close this.

- **`chat_generated` and `dataset_opened` are also untested**, for the same
  reason: each is a one-line dispatch whose call site would need the chat
  runtime or the dataset drawer stood up. Both are verified by inspection and
  by the `rg` count in the final task.

- **Public dashboard failures go unrecorded.** `useDataQuery` serves public
  pages with `auth: "public"`, where there is no session and `logEvent` cannot
  write. Recording them needs an anonymous edge route with JWT verification
  disabled, which is the same work `dashboard.public_viewed` needs. Both stay
  deferred together.
- **`dashboard.pdf_exported` cannot fire in production.** See Task 9.
- **Chat samples are not captured.** `chat.turn_completed` ships with
  `wasSampled: false` and no `piiSeverity`. Phase 4 fills both in and is the
  only phase carrying privacy risk.
- **A stale-window remount re-records the last trigger.** When the Data
  Explorer is remounted after six minutes with state still populated, the
  refetch records `query.ran` with whatever trigger was last stamped. The run
  is real, so counting it is correct; only the attribution is approximate. A
  dedicated trigger for that case was not worth a sixth enum value.
