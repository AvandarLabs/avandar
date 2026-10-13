# Incremental, state-preserving individual sync (P5.6) - design

**Status:** Draft
**Date:** 2026-10-12
**Roadmap:** P5.6 in `docs/production-plan-world-humanitarian-day.md`
(P5.8, P5.9 added alongside it for two related, explicitly out-of-scope gaps)
**Parents:** `docs/ontology-architecture.md` sections 6 and 13

> Code blocks in this document are illustrative. The repository is the
> authority on every signature.

---

## 1. Problem

`generateIndividuals`
(`src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/index.ts`)
recomputes every individual for a concept on every "Sync records" run. It
stages one row per `external_id` in DuckDB, with every row literally carrying
`gen_random_uuid() AS id`, `NOW() AS created_at`, `NOW() AS updated_at`,
`'active' AS status`, and `NULL::UUID AS assigned_to`, then upserts the full
staged set through `IndividualClient.crudFunctions.bulkInsert` with
`onConflict: (external_id, concept_id)`, `ignoreDuplicates: false`.

That upsert is a plain PostgREST `merge-duplicates` call
(`createSupabaseCrudClient.ts:239-272`): Postgres executes
`INSERT ... ON CONFLICT (...) DO UPDATE SET <every column in the payload>`.
Because every staged row includes `id`, `status`, and `assigned_to`, every
sync:

- assigns a **new `id`** to every pre-existing individual (breaks record
  URLs),
- resets `status` and `assigned_to` to their generation-time literals,
  destroying any case-workflow state a user set,
- rewrites every row whether or not anything about it changed, and
- never notices an individual whose `external_id` has left every source
  dataset.

`docs/ontology-architecture.md` section 6 documents this and names the fix
direction (narrow the staged/upserted columns, give `status` a column
default); section 13 explains why this has to land before any per-case
capability (status workflow, assignment, comments) can safely store state
without Sync erasing it.

Separately, Sync today is a manual, invisible action: a user must know to
click "Sync records" (even for a brand-new concept with zero individuals),
and the only feedback while it runs is a spinner on that one button. Section
6 covers the UX side of this change: renaming the action, triggering it
automatically on concept creation, and giving it a real progress indicator.

## 2. Scope

**In**

1. Stop the upsert from ever touching `id`, `status`, or `assigned_to` on an
   existing individual.
2. Give `status` a database default so a new individual still gets `'active'`
   without Sync having to say so.
3. Skip writing any individual whose generated `name` has not changed and
   whose presence-in-source has not changed - "no-op" rows produce zero
   writes.
4. Detect an individual whose `external_id` no longer appears in any source
   dataset, and flag it (without deleting it or touching `status`); clear the
   flag if it reappears on a later sync.
5. Rename the sync action to make clear it refreshes from source data, run it
   automatically on concept creation instead of requiring a manual click, and
   show real progress for both the automatic and manual runs, via a
   generalized version of the existing offline-model-download progress
   indicator (section 6).

**Out**

- Moving generation off the main thread. DuckDB already runs in a Web Worker
  (`makeDuckDbConnectionManager.ts:116-121`), and Sync already runs through
  the same `WorkspaceQuerySession` / `QueryMediator` path as every other QETL
  query. There is nothing concrete to move; this half of the roadmap item is
  already satisfied by the existing architecture.
- Deciding what a stale (missing-from-source) individual's case-workflow
  status should become, archiving it, or surfacing it in any UI. This design
  only records the fact and the timestamp. Tracked separately as **P5.9** in
  the roadmap (added alongside this spec - it wasn't tracked before).
- The NULL-label crash and the partial-page-failure/no-atomicity issue also
  listed in `docs/ontology-architecture.md` section 16. Separate, pre-existing
  bugs, not part of this change. The NULL-label crash is now tracked as
  **P5.8** in the roadmap (also added alongside this spec); the no-atomicity
  issue is covered as a known limitation in section 7 below rather than as
  its own roadmap line, since it's a property of the page-by-page upsert
  design generally, not a bug with an obvious fix.
- Status sets (P5b.1), assignment (P5c.3), comments (P5c.2). This change is a
  precondition for those, not an implementation of any of them.
- Migrating `DatasetUploadProgressStore` (a separate, already-generic upload
  progress store with no floating UI) onto the new indicator from section 6.
  It isn't broken and nobody asked for it to move.

`docs/production-plan-world-humanitarian-day.md` is the one authoritative
roadmap for QETL, permissions, and ontology/case-management (confirmed: no
other `docs/production-plan*.md` or `docs/roadmap*.md` file exists;
`docs/ontology-architecture.md` section 17 is an index back to this file and
to `docs/superpowers/specs/`, not a second roadmap).

## 3. Approaches

**A. Client-side diff, narrowed upsert payload (recommended).** Before
staging, read every existing individual for the concept
(`IndividualClient.getAll`) into a `Map<externalId, {id, name,
missingFromSourceAt}>`. Stage only `external_id` and `name` in DuckDB (drop
the other five literals entirely). While paging through the staged rows,
diff each row against the map and build an upsert payload that **never
contains** `id`, `status`, `assigned_to`, `created_at`, or `updated_at` -
only `workspace_id`, `concept_id`, `external_id`, `name`, and
`missing_from_source_at`. Because those omitted columns are absent from the
payload, Postgres's `ON CONFLICT DO UPDATE SET` cannot write to them: an
existing row's `id`/`status`/`assigned_to` are structurally unreachable by
this call, not just "not changed by convention." After all pages, any
existing individual never matched gets a final write that sets
`missing_from_source_at` and nothing else.

- Plus: no new RPC, no new write path; same `createRdbCrudClient` abstraction
  that already works identically on web (Supabase) and desktop (SQLite
  mirror); the diff logic is pure data-in/data-out and unit-testable without
  DuckDB or Postgres.
- Minus: loads every existing individual for the concept into browser memory
  before syncing. Bounded by case count, not source-dataset size - the same
  order of magnitude the current implementation already re-upserts on every
  sync, so not a new scalability ceiling.

**B. Database-side conditional upsert (RPC).** A Postgres function that does
`ON CONFLICT (...) DO UPDATE SET name = excluded.name WHERE
individuals.name IS DISTINCT FROM excluded.name`, still omitting
`id`/`status`/`assigned_to` from the insert list. The "skip if unchanged"
check is then enforced atomically by Postgres instead of by a prior read.

- Plus: no separate read round-trip; the skip check can't race with a
  concurrent sync.
- Minus: bypasses the generic typed CRUD client with a new untyped RPC
  surface (own migration, grants, security-definer review). Stale detection
  still needs the full computed `external_id` set compared against what is
  stored, which either means sending that whole set into the RPC in one call
  (losing today's page-by-page streaming) or running a second statement with
  the same shape as approach A's final sweep. The atomicity win doesn't
  currently matter: Sync already has no cross-page atomicity (section 7),
  and nothing else writes individual rows concurrently with Sync today.

Recommendation: **A**. The scale here (case counts, not source-row counts)
doesn't justify a new RPC surface, and A keeps the change inside the file and
client it already lives in.

## 4. Schema changes

`supabase/schemas/20.individuals.sql`:

```sql
status text not null default 'active',
-- ...
-- Set when this individual's external_id stops appearing in any source
-- dataset on a sync. Clear the timestamp if it reappears. NULL means it
-- is present.
missing_from_source_at timestamptz,
```

No RLS policy change (same table, same membership-scoped policies already
cover every column). `shared/models/ontology/Individual/Individual.types.ts`
and `IndividualParsers.ts` gain `missingFromSourceAt` on the Read shape, so
the model accurately reflects the table even though no UI reads it yet.

## 5. Sync algorithm

Replacing steps 2-3 of today's `generateIndividuals`:

1. `existingByExternalId = await IndividualClient.getAll(where("concept_id", "eq", concept.id))`,
   keyed by `external_id`, keeping `id` (unused but read for completeness),
   `name`, and `missing_from_source_at` - same `where` helper the file already
   uses for `DatasetColumnClient.getAll`.
2. Stage `external_id, name` only (drop `id`/`created_at`/`updated_at`/
   `workspace_id`/`concept_id`/`assigned_to`/`status` from the generated
   SQL - `workspace_id`/`concept_id` are already plain JS values and don't
   need a DuckDB round-trip).
3. For each staged page, for each row:
   - not in `existingByExternalId` -> **new**: write
     `{ workspace_id, concept_id, external_id, name, missing_from_source_at: null }`.
   - in the map, and (`name` differs OR `missing_from_source_at` is set) ->
     **changed or reappeared**: write the same shape (the explicit `null`
     clears a stale flag).
   - in the map, name unchanged, not flagged missing -> **no-op**: write
     nothing.
   - Track every matched `external_id` in a `Set` across all pages.
   - Call `bulkInsert` only when a page produced at least one row to write.
4. After all pages: for every `external_id` in `existingByExternalId` not in
   the matched set, and with `missing_from_source_at` still `null`, write
   `{ workspace_id, concept_id, external_id, name: <unchanged>, missing_from_source_at: now() }`,
   chunked at the same page size as step 3. An individual already flagged
   missing on a prior sync is left untouched (no re-write of the same
   timestamp).
5. Drop the staging table in `finally`, as today.

Every write in steps 3-4 goes through the same
`IndividualClient.crudFunctions.bulkInsert({ upsert: true, onConflict: { columnNames: ["external_id", "concept_id"], ignoreDuplicates: false } })`
call used today, just with the narrower, pre-filtered payload shape above.
`generateIndividuals` is the only call site in the repo that reaches through
`crudFunctions` instead of the top-level, Model-shaped `bulkInsert` - that's
deliberate, not an oddity: `page.data` already comes out of
`DuckDbClient.forEachQueryPage` in DB shape (snake_case), matching
`crudFunctions.bulkInsert`'s `DBInsert` input directly. The top-level
`bulkInsert` would first convert that same data to the camelCase `Insert`
shape just so its parser could convert it straight back - pure overhead for
data that's already correctly shaped.

The diff in steps 3-4 is pure (existing map + staged rows in, rows-to-write
out), so it belongs in its own small, independently unit-tested function(s)
rather than inline in `generateIndividuals` - final naming/shape is a plan
decision, not a design decision.

## 6. UI: trigger and progress indicator

**Button rename.** `SyncRecordsButton` (`CaseTypeActions.tsx:36-85`) relabels
from "Sync records" to "Refresh {conceptName} records" (e.g. "Refresh
Facility records"), via the Lingui `t` macro interpolating `concept.name` as
a plain variable. The plural lands on "records," not on the concept's name,
so this reads correctly regardless of what the concept is called, with no
pluralization logic needed.

**Automatic first sync.** `insertConceptFromFormValues`
(`src/views/OntologyDesignerApp/insertConceptFromFormValues/`) is the one
function both creation paths already share - the form path
(`useSubmitConceptCreatorForm.ts`, which navigates to the concept's page on
success) and the chat path (`applyCreatedCaseTypes.ts`, which does not
navigate). Once it persists the concept and its attributes/mappings (the
"three writes" in `docs/ontology-architecture.md` section 5.1), it calls
`generateIndividuals(concept)` **without awaiting it**: concept creation
resolves immediately, and the first sync runs in the background. The call is
guarded with its own `.catch(...)` so a failure can't become an unhandled
promise rejection; the failure is reported through the progress store below
instead.

This is why the progress store needs to support more than one concurrent
task from the start, not as a hypothetical: `applyCreatedCaseTypes.ts` awaits
`insertConceptFromFormValues` sequentially per case type, but because the
sync *it* triggers is not awaited, a chat session creating three case types
in a row can have all three background syncs in flight at once.

**Generalized progress indicator**, replacing the single-purpose
`OfflineChatDownloadIndicator` (`src/components/OfflineChatDownloadIndicator/`)
and its bespoke, single-slot `OfflineChatEngineStore`:

- A new shared store, keyed by an opaque task id, built on the same
  `createExternalStore` factory `DatasetUploadProgressStore` already uses
  (`src/lib/utils/state/createExternalStore.ts`), rather than inventing a
  third pattern. Each entry is one of:
  - `{ status: "indeterminate", label, detail? }`
  - `{ status: "determinate", label, current, total, detail? }`
  - `{ status: "error", label, message }`

  Call sites get `startTask(label) -> id`, `updateTask(id, patch)`,
  `finishTask(id)` (removes the entry), and `failTask(id, message)` (moves it
  to `"error"`, left for the user to dismiss).
- One floating UI component, mounted once in `AppShell.tsx` exactly where
  `OfflineChatDownloadIndicator` is today, renders one panel per live task
  (stacked), each a label plus a Mantine `Progress` bar (indeterminate or
  determinate), or an error panel with a dismiss button for the `"error"`
  entries.
- `OfflineChatDownloadIndicator` becomes a thin adapter: it starts a task
  when a download begins, updates it with real progress, and finishes or
  fails it. Same visible behavior as today (including its existing "do not
  refresh or close this tab" copy, passed through as `detail`), plus one
  real change: today's store has no error state at all, so a failed download
  currently just vanishes; after this change it stays visible until
  dismissed.
- `generateIndividuals` manages its own task end-to-end: start it
  `"indeterminate"` ("Refreshing {conceptName} records…") while staging and
  reading existing individuals, switch to `"determinate"` once page-by-page
  upserting begins (`current`/`total` from the staged table's row or page
  count), and finish or fail it in the same `finally`/`catch` that already
  drops the staging table. Both the manual button click and the automatic
  first sync go through this one function, so both get progress reporting
  for free. The button keeps its own local loading/disabled state in
  addition (to stop a double-click); it isn't replaced by the floating
  indicator, it's complemented by it.

**Out of scope for this generalization:** migrating
`DatasetUploadProgressStore`'s own consumers onto the new floating component
(noted in section 2) - it already uses the right store factory, and giving
it a floating UI nobody asked for is a separate change.

## 7. Error handling

- Unchanged from today: no cross-page atomicity. Each page is its own
  `bulkInsert` call, each call is its own PostgREST request, and each request
  is its own Postgres transaction - there is no transaction wrapping the
  whole sync. If page 6 of 10 fails (a network error, or the pre-existing
  label-resolves-to-NULL crash, now tracked as P5.8), pages 1-5 are already
  committed and pages 7-10 never run: the concept is left in a
  partially-synced state (some individuals reflect the latest source data,
  some don't) until the next successful sync. This change doesn't fix that,
  but it does make a retry after a partial failure cheaper: the
  already-committed pages now produce no-op rows on the next attempt instead
  of being rewritten again.
- A page with zero rows to write skips the `bulkInsert` call entirely rather
  than sending an empty array.
- The final stale-sweep is skipped entirely (no call at all) when nothing is
  newly stale.
- The automatic first sync (section 6) runs detached from concept creation;
  its failure is reported to the progress store (`failTask`) and does not
  propagate anywhere else. A concept that fails its first sync is left
  exactly as a concept that was created and never manually synced - zero
  individuals, "Refresh" still available.

## 8. Testing

`generateIndividuals.test.ts` today mocks `bulkInsert` away and only tests
the staging-table-naming regression; it asserts nothing about upsert
payloads, which is how this bug shipped. New coverage needed:

1. Pure diff function(s): each of new, changed-name, unchanged, reappeared
   (an existing individual with `missing_from_source_at` set that shows up
   again in the staged rows), and newly-stale (an existing individual that
   does not show up in any staged page) produces the expected row, or no
   row at all for the unchanged case.
2. `generateIndividuals` with mocked `IndividualClient`: a `bulkInsert` call
   never contains `id`, `status`, `assigned_to`, `created_at`, or
   `updated_at` keys, for any row, in any scenario.
3. An all-unchanged page results in zero `bulkInsert` calls for that page.
4. A pgTAP test against real Postgres for the one thing a mocked test
   cannot prove: that Postgres's `ON CONFLICT DO UPDATE` actually leaves an
   omitted column alone. The `**/*.executed.test.ts` tier
   (`vitest.executed.config.ts`) is DuckDB-only by design (its own docstring:
   "DuckDB cannot run under jsdom") - no existing executed test, and no other
   Vitest test in the repo, writes to a real Postgres instance, and building
   that would mean standing up new infrastructure (a signed-in Supabase
   client, local-stack wiring) disproportionate to this fix. pgTAP already
   runs raw SQL against a real local Postgres under `pnpm test:db`
   (`supabase/tests/database/`), including non-permissions table-contract
   tests (e.g. `datasets__virtual_contract.test.sql`). A new
   `individuals__sync_upsert_contract.test.sql` there - seed an individual
   with a non-default `status`/`assigned_to`, run the same `INSERT ... ON
   CONFLICT (external_id, concept_id) DO UPDATE SET` shape the application
   code issues (naming only `workspace_id`, `concept_id`, `external_id`,
   `name`, `missing_from_source_at`), then assert `id`/`status`/`assigned_to`
   are unchanged and `name` updated - is the direct equivalent of the
   replay already done by hand on 2026-10-09 (`docs/ontology-architecture.md`
   section 13), just checked in instead of ad hoc.
5. The new progress store: `startTask`/`updateTask`/`finishTask`/`failTask`
   transitions produce the expected entry; two concurrently started tasks
   get distinct ids and don't clobber each other's state.
6. `insertConceptFromFormValues`: the returned promise resolves before a
   deliberately-deferred mock of `generateIndividuals` resolves (proves the
   sync isn't awaited); a rejection from that background call reaches
   `failTask` rather than throwing out of `insertConceptFromFormValues` or
   becoming an unhandled rejection.
7. `OfflineChatDownloadIndicator` as a regression check after being rebuilt
   on the new store: still renders its existing indeterminate/determinate/
   warning copy for a download, plus one new case - a failed download now
   renders a dismissible error instead of disappearing.

## 9. Exit criteria

- Running Sync twice in a row with no source changes leaves every existing
  individual's `id`, `status`, `assigned_to`, and `updated_at` unchanged, and
  issues no writes for already-synced rows. This only proves anything if the
  seeded individual's `status` and `assigned_to` are set to values *other
  than* the defaults (e.g. `status = 'confirmed'`, `assigned_to` a real user
  id) before the sync runs - checking against already-default values would
  pass even if the old clobbering behavior regressed.
- A new row in the source produces a new individual with `status = 'active'`,
  `assigned_to = NULL`.
- A changed label value updates `name` (and, via the existing trigger,
  `updated_at`) without touching `status` or `assigned_to`.
- A key that was present and is now absent from every source dataset gets
  `missing_from_source_at` set once; it is left alone on subsequent syncs
  while still absent, and cleared if it reappears.
- No RPC, no new raw-SQL write path, no change to RLS policies.
- The sync action reads "Refresh {conceptName} records" for any concept
  name, including ones a naive "+s" would mangle (e.g. "Facility").
- Creating a concept (either path) triggers its first sync automatically;
  concept creation resolves without waiting for that sync to finish.
- Three concepts created back to back (chat path) can show three concurrent
  progress panels, each labeled with its own concept's name.
- A failed background sync surfaces as a dismissible error in the floating
  indicator instead of vanishing silently.
- The manual "Refresh" click and the automatic first sync report progress
  through the identical code path - no duplicated progress logic.

## 10. Files

```text
supabase/schemas/
  20.individuals.sql                  status default, missing_from_source_at column
  (new migration via pnpm db:new-migration, per supabase-declarative-schema)

shared/models/ontology/Individual/
  Individual.types.ts                 + missingFromSourceAt on Read/Insert/Update
  IndividualParsers.ts                 DBReadSchema + missing_from_source_at

src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/
  index.ts                            narrowed staging SQL, diff-driven upsert,
                                       stale sweep, owns its own progress task
  generateIndividuals.test.ts          + upsert-payload and no-op-skip coverage
  (new) diff helper file(s) for the pure existing-vs-staged comparison, + unit tests

src/views/OntologyDesignerApp/ConceptMetaView/
  CaseTypeActions.tsx                  button label -> "Refresh {conceptName} records"

src/views/OntologyDesignerApp/insertConceptFromFormValues/
  insertConceptFromFormValues.ts       fire-and-forget first sync, .catch -> failTask

src/lib/utils/state/ (or wherever the new generic store lands - a plan decision)
  (new) task progress store, built on createExternalStore               + unit tests
  (new) floating progress indicator component, multi-task                + tests

src/components/OfflineChatDownloadIndicator/
  OfflineChatDownloadIndicator.tsx     rebuilt as a thin adapter over the new store
src/hooks/localChatModels/
  useOfflineChatEngineStatus.ts        replaced or adapted to the new store

src/components/AppShell/
  AppShell.tsx                         mounts the new floating component

supabase/tests/database/
  individuals__sync_upsert_contract.test.sql   real-Postgres upsert contract (section 8.4)
```

docs/production-plan-world-humanitarian-day.md also gains two new roadmap
items alongside this spec (not implemented by it): **P5.8** (the NULL-label
sync crash) and **P5.9** (deciding what a stale individual's product
behavior should be).
