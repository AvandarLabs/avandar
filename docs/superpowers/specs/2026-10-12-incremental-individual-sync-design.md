# Incremental, state-preserving individual sync (P5.6) - design

**Status:** Draft
**Date:** 2026-10-12
**Roadmap:** P5.6 in `docs/production-plan-world-humanitarian-day.md`
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

**Out**

- Moving generation off the main thread. DuckDB already runs in a Web Worker
  (`makeDuckDbConnectionManager.ts:116-121`), and Sync already runs through
  the same `WorkspaceQuerySession` / `QueryMediator` path as every other QETL
  query. There is nothing concrete to move; this half of the roadmap item is
  already satisfied by the existing architecture.
- Deciding what a stale (missing-from-source) individual's case-workflow
  status should become, archiving it, or surfacing it in any UI. This design
  only records the fact and the timestamp.
- The NULL-label crash and the partial-page-failure/no-atomicity issue also
  listed in `docs/ontology-architecture.md` section 16. Separate, pre-existing
  bugs, not part of this change.
- Status sets (P5b.1), assignment (P5c.3), comments (P5c.2). This change is a
  precondition for those, not an implementation of any of them.

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
  currently matter: Sync already has no cross-page atomicity (section 6),
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
-- dataset on a sync; cleared if it reappears. NULL means it is present.
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

The diff in steps 3-4 is pure (existing map + staged rows in, rows-to-write
out), so it belongs in its own small, independently unit-tested function(s)
rather than inline in `generateIndividuals` - final naming/shape is a plan
decision, not a design decision.

## 6. Error handling

- Unchanged from today: no cross-page atomicity (a failed page leaves earlier
  pages written); the label-resolves-to-NULL crash is untouched. Both are
  pre-existing, out of scope (section 2).
- A page with zero rows to write skips the `bulkInsert` call entirely rather
  than sending an empty array.
- The final stale-sweep is skipped entirely (no call at all) when nothing is
  newly stale.

## 7. Testing

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

## 8. Exit criteria

- Running Sync twice in a row with no source changes leaves every existing
  individual's `id`, `status`, `assigned_to`, and `updated_at` unchanged, and
  issues no writes for already-synced rows.
- A new row in the source produces a new individual with `status = 'active'`,
  `assigned_to = NULL`.
- A changed label value updates `name` (and, via the existing trigger,
  `updated_at`) without touching `status` or `assigned_to`.
- A key that was present and is now absent from every source dataset gets
  `missing_from_source_at` set once; it is left alone on subsequent syncs
  while still absent, and cleared if it reappears.
- No RPC, no new raw-SQL write path, no change to RLS policies.

## 9. Files

```text
supabase/schemas/
  20.individuals.sql                  status default, missing_from_source_at column
  (new migration via pnpm db:new-migration, per supabase-declarative-schema)

shared/models/ontology/Individual/
  Individual.types.ts                 + missingFromSourceAt on Read/Insert/Update
  IndividualParsers.ts                 DBReadSchema + missing_from_source_at

src/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/
  index.ts                            narrowed staging SQL, diff-driven upsert, stale sweep
  generateIndividuals.test.ts          + upsert-payload and no-op-skip coverage
  (new) diff helper file(s) for the pure existing-vs-staged comparison, + unit tests

supabase/tests/database/
  individuals__sync_upsert_contract.test.sql   real-Postgres upsert contract (section 7.4)
```
