# Analytics Payload Enrichment Design

## Context

The analytics event foundation provides a shared event registry, typed client
and server emitters, and storage for event payloads. Several browser events
already fire, but their payloads do not yet include the dimensions defined by
the usage analytics design. One publishing call site also records share-setting
updates as new publications.

This work completes the deferred client-event enrichment without expanding into
query analytics, PDF export instrumentation, server chat outcome events, or
database changes.

## Goals

- Record the approved dimensions for currently active client events.
- Distinguish first dashboard publication from later sharing updates.
- Record filter changes only from authenticated workspace dashboards.
- Preserve one `chat.message_sent` event per submitted user message.
- Enforce required payloads for events that define a payload shape.
- Keep analytics failures from affecting product behavior.
- Avoid recording SQL, prompts, filter values, labels, or other sensitive
  content.

## Non-goals

- Query run or failure instrumentation.
- PDF export instrumentation or changes to the hidden PDF flow.
- Server-side chat completion and failure events.
- Chat sampling or content capture.
- Analytics schema, migration, RPC, or production database changes.
- Changes to user-facing copy or translation catalogs.

## Approach

Event emission remains at the existing product call sites. Simple payloads are
assembled inline. Non-trivial derivation is extracted into small pure helpers
near the owning feature so behavior can be tested without introducing a global
analytics facade.

This keeps the change local while avoiding repeated conditional logic inside
large hooks and components. A central facade is not warranted because these
events depend on feature-specific state and have no shared orchestration.

## Payload type contract

`AnalyticsEventPayloads` will define the enriched payload for each event in
scope. The `ClientAnalyticsEvent` discriminated union will conditionally require
`payload` whenever an event maps to an object payload, while events mapped to
`undefined` will continue to accept no payload.

Required payload objects can still contain optional properties when the browser
cannot know a value accurately. Optional fields are omitted rather than filled
with invented defaults.

## Event contracts

| Event                              | Payload                                                                             | Emission rule                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `dataset.imported`                 | `datasetId`, `sourceType`, `columnCount`, `rowCount`, `isFirstInWorkspace`          | Once after a dataset is saved successfully.                                  |
| `dashboard.published`              | `dashboardId`, `blockCount`, `hasVanitySlug`                                        | Only when a private dashboard becomes public.                                |
| `dashboard.share_settings_updated` | `dashboardId`, `slugAction`                                                         | Only when saving an already-public dashboard's sharing settings.             |
| `chat.message_sent`                | `promptChars`, `pageApp`, optional `modelId`, `runtimeMode`, `hasOpenDataset`       | Once after privacy approval and initial runtime selection, before execution. |
| `chat.sql_generated`               | `sqlChars`                                                                          | When generated SQL is accepted by the existing application path.             |
| `dashboard.block_added_via_chat`   | `blockKind`, optional `vizType`, optional `dashboardId`, optional `blockCountAfter` | After a generated block is queued for the dashboard editor.                  |
| `dashboard.filter_changed`         | `dashboardId`, `filterId`, `mode`, `wasCleared`                                     | On a workspace-dashboard user change, with text changes debounced.           |

The existing top-level `workspaceId` and `app` fields remain outside each JSON
payload and continue to be supplied to `AnalyticsClient.logEvent`.

## Dataset import flow

`useSaveDataset` will read the existing workspace dataset query before the
mutation succeeds and use that pre-save snapshot to derive
`isFirstInWorkspace`. It will not infer the value from an invalidated or
post-save query.

All supported load results already provide `numRows` and column metadata:

- CSV and XLSX use `datasetLoadResult.columns`.
- Google Sheets uses `datasetLoadResult.sheetLoadMetadata.columns`.
- All three use `datasetLoadResult.numRows`.

The successful save continues to emit asynchronously. Upload, notification,
callback, and navigation behavior are unchanged.

## Dashboard publishing flow

The publishing modal snapshots whether the dashboard was public before the
mutation. On success it emits exactly one event:

- A first publish emits `dashboard.published`.
- A save for an already-public dashboard emits
  `dashboard.share_settings_updated`.

`blockCount` is derived from the successfully returned dashboard config, and
`hasVanitySlug` reflects the successfully persisted slug.

`slugAction` describes the persisted transition:

- `set` when the successful update adds or changes a vanity slug.
- `clear` when it removes an existing vanity slug.
- `unchanged` when the vanity slug is the same before and after the update.

## Chat flow

The latest non-clarification user message remains the unit represented by
`chat.message_sent`. The event is emitted only after the existing privacy check
allows the message to proceed.

Runtime selection moves ahead of the event emission. `runtimeMode` records the
initially selected `cloud` or `local` route. A later cloud failure followed by
an accepted local fallback does not rewrite or duplicate the message event.
Future completion telemetry can describe the final execution outcome.

The payload uses only derived metadata:

- `promptChars` is the user message string length.
- `pageApp` is the current chat page context app.
- `modelId` is the resolved picker identifier when available.
- `runtimeMode` is the initially selected route.
- `hasOpenDataset` is true when the page context has an open dataset ID.

`chat.sql_generated` records only `sql.length`. It never records SQL text.

When chat queues a dashboard block, `blockCountAfter` is the current editor
content count plus the accepted block. The count is omitted during the narrow
editor-mount race where current content is unavailable. No database fetch is
added solely to fill that optional field.

## Dashboard filter flow

`FilterPBlock` accepts Puck props and reads page metadata through
`useAvaPageMetadata`, matching the existing dashboard block pattern. It emits
analytics only when metadata identifies an authenticated workspace dashboard.
Public dashboard interactions update local filter state but emit no event.

Select and multi-select controls emit immediately after a user change. The
contains control emits after 500 milliseconds without a newer input. Pending
text events are cancelled on unmount. Initial registration and configuration
changes do not emit analytics.

`wasCleared` is true for an empty multi-select array, an absent single-select
value, or an empty contains value. Filter values and labels are never included.

## Failure behavior

All emissions remain fire-and-forget. Analytics insertion or session lookup
failures continue to be handled by `AnalyticsClient` and cannot block dataset
saves, publishing, chat, SQL application, dashboard updates, or filtering.

Debounced events use cleanup to avoid emitting after unmount. Missing optional
context is omitted. Required values come from successful product results or
validated page context.

## Test strategy

Implementation follows red/green TDD with focused Vitest coverage:

1. Extend payload derivation tests for all dataset source shapes, publication
   classification and slug transitions, chat metadata, and block counts.
2. Add `FilterPBlock` component tests with fake timers for immediate selects,
   coalesced contains changes, clear detection, workspace metadata, public
   suppression, and unmount cleanup.
3. Add focused integration tests proving successful dataset saves and publish
   mutations emit exactly one enriched event.
4. Add a narrow chat runtime seam test proving one message event uses the
   initial runtime and SQL or block events contain only derived metadata.
5. Update existing `AnalyticsClient` tests to pass required payloads and retain
   their non-throwing behavior assertions.
6. Run focused tests, TypeScript checking, changed-file formatting and linting,
   and React diagnostics. A full end-to-end suite is not required unless the
   focused tests reveal a user-flow gap.

## Expected change surface

The implementation is expected to touch only the shared analytics registry,
the existing dataset import, dashboard publish, chat runtime, and filter block
features, plus focused tests and this design's implementation plan. It will not
touch Supabase schemas, generated files, PDF components, or translation
catalogs.
