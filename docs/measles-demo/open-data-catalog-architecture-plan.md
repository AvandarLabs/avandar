# Open Data Catalog: Socrata connector and write-back cache - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Socrata connector to the Open Data Catalog, and give both it
and the existing CKAN connector a write-back cache, so the first workspace to
query an `api_resource` catalog entry pays a live-fetch cost and every later
workspace reads a cached copy instead - with zero changes to QETL or any
browser-side wrapper code.

**Architecture:** All new acquisition logic lives in
`shared/connectors/open-data/` (renamed from `shared/open-data/`), reachable
from the browser, Deno, and Node with no client singleton, mirroring
`CkanClient`'s existing shape exactly. The cache check is inserted entirely
inside the `open-data` edge function's existing route
(`OpenDataRoutes.ts`), behind the exact request/response contract the browser
already calls - `DatasetParquetWrapper`, `createDefaultRegistry.ts`, and
`fetchOpenDataCatalogResource.ts` are not edited by this plan at all.

**Tech Stack:** TypeScript, Deno (edge functions), Zod (wire validation),
Vitest, Supabase (Postgres + Storage), `ts-pattern`.

**Spec:** [`open-data-catalog-architecture.md`](open-data-catalog-architecture.md).
Read it before starting; this plan does not re-explain the design decisions,
only how to build them.

---

## Before you start

Every schema-touching task below (Tasks 4-6) requires, in this order, per
`CLAUDE.md`'s Supabase section:

```bash
ava supabase status   # confirm this worktree is switched, not on the shared stack
ava supabase switch   # only if status is not green
pnpm db:reset          # immediately before pnpm db:new-migration, every time
```

Do not run `pnpm db:new-migration` without having just run `pnpm db:reset`
first - the diff must be taken against a database built only from this
branch's migrations.

---

### Task 1: Rename `OpenDataAccess`'s CKAN-named fields to protocol-generic names

A non-CKAN connector is about to populate `OpenDataAccess`'s `api_resource`
variant, so its two CKAN-named fields (`ckanDatasetId`, `ckanResourceId`) get
generic names before Socrata ever touches this type - matching the database
column names they already come from (`external_dataset_id`,
`api_resource_id`).

**Files:**
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts:112-121`
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryModule.ts:55-63`
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryModule.test.ts:77-78`
- Modify: `shared/open-data/acquireOpenDataResource.ts:94-104`
- Test: existing tests in the files above, updated in place (no new test file)

- [ ] **Step 1: Update the type**

In `OpenDataCatalogEntry.types.ts`, replace:

```ts
  | {
      kind: "api_resource";
      apiService: OpenDataApiService;
      apiBaseUrl: string;
      /** The CKAN dataset containing the resource, by slug or id. */
      ckanDatasetId: string;
      ckanResourceId: string;
      /** The format recorded when the entry was written. */
      expectedFormat: string;
    };
```

with:

```ts
  | {
      kind: "api_resource";
      apiService: OpenDataApiService;
      apiBaseUrl: string;
      /** The external dataset containing the resource, by slug or id. */
      externalDatasetId: string;
      apiResourceId: string;
      /** The format recorded when the entry was written. */
      expectedFormat: string;
    };
```

- [ ] **Step 2: Update the builder**

In `OpenDataCatalogEntryModule.ts`, replace:

```ts
  return {
    kind: "api_resource",
    apiService,
    apiBaseUrl,
    ckanDatasetId: externalDatasetId,
    ckanResourceId: apiResourceId,
    expectedFormat: apiResourceFormat,
  };
```

with:

```ts
  return {
    kind: "api_resource",
    apiService,
    apiBaseUrl,
    externalDatasetId,
    apiResourceId,
    expectedFormat: apiResourceFormat,
  };
```

- [ ] **Step 3: Update the test fixture**

In `OpenDataCatalogEntryModule.test.ts:77-78`, replace:

```ts
      ckanDatasetId: "hdx-hapi-operational-presence",
      ckanResourceId: "e3a18c4c-ec1b-457e-9f60-cee283c04e0c",
```

with:

```ts
      externalDatasetId: "hdx-hapi-operational-presence",
      apiResourceId: "e3a18c4c-ec1b-457e-9f60-cee283c04e0c",
```

- [ ] **Step 4: Update the one consumer**

In `acquireOpenDataResource.ts`, the block reading:

```ts
  const client = createCkanClient(params.http);
  const ckanPackage = await client.getPackage({
    baseUrl: access.apiBaseUrl,
    ckanDatasetId: access.ckanDatasetId,
  });
  const resource = getCkanResourceFromPackage({
    ckanPackage,
    ckanResourceId: access.ckanResourceId,
    baseUrl: access.apiBaseUrl,
    expectedFormat: access.expectedFormat,
    maxBytes: params.maxBytes ?? DEFAULT_MAX_BYTES,
  });
```

becomes (unchanged logic, renamed fields - this function is fully rewritten
again in Task 10, so this step is intentionally minimal):

```ts
  const client = createCkanClient(params.http);
  const ckanPackage = await client.getPackage({
    baseUrl: access.apiBaseUrl,
    ckanDatasetId: access.externalDatasetId,
  });
  const resource = getCkanResourceFromPackage({
    ckanPackage,
    ckanResourceId: access.apiResourceId,
    baseUrl: access.apiBaseUrl,
    expectedFormat: access.expectedFormat,
    maxBytes: params.maxBytes ?? DEFAULT_MAX_BYTES,
  });
```

- [ ] **Step 5: Run the affected tests**

Run: `pnpm vitest run shared/models/catalog-entries/OpenDataCatalogEntry shared/open-data/acquireOpenDataResource.test.ts`
Expected: PASS, no other files touched

- [ ] **Step 6: Commit**

```bash
git add shared/models/catalog-entries/OpenDataCatalogEntry shared/open-data/acquireOpenDataResource.ts
git commit -m "refactor(open-data): rename OpenDataAccess's ckan-named fields to protocol-generic names"
```

---

### Task 2: Rename `shared/open-data/` to `shared/connectors/open-data/`

**Files:**
- Move: every file under `shared/open-data/` to the same relative path under
  `shared/connectors/open-data/`
- Modify: every importer (listed in step 2 below)

- [ ] **Step 1: Move the directory**

```bash
mkdir -p shared/connectors
git mv shared/open-data shared/connectors/open-data
```

- [ ] **Step 2: Find every importer**

```bash
grep -rln '\$/open-data/' shared/ src/ supabase/ apps/ --include="*.ts" --include="*.tsx"
```

Every matching file's import specifiers change from `$/open-data/...` to
`$/connectors/open-data/...` (the `$/` alias resolves to `shared/`, so this is
a pure path-segment insertion, not an alias change - confirm this against
`deno.json`'s `"$/": "../shared/"` entries wherever one exists; do not edit
those entries, only the import specifiers).

- [ ] **Step 3: Apply the rename across every importer**

```bash
grep -rl '\$/open-data/' shared/ src/ supabase/ apps/ --include="*.ts" --include="*.tsx" \
  | xargs sed -i '' 's#\$/open-data/#$/connectors/open-data/#g'
```

(`sed -i ''` is the macOS/BSD form already in use on this machine; confirm
with `sed --version` if running on GNU sed instead, where the empty string
after `-i` is omitted.)

- [ ] **Step 4: Fix the one doc cross-reference this move affects**

`docs/qetl-architecture.md`'s own component table (section 5) names
`shared/open-data/` directly:

```text
| Open data (shared) | [`shared/open-data/`](../shared/open-data/) | CKAN client, resource selection, size-capped HTTP | runtime-neutral |
```

becomes:

```text
| Open data (shared) | [`shared/connectors/open-data/`](../shared/connectors/open-data/) | CKAN and Socrata clients, the Open Data Catalog's own storage client, resource selection, size-capped HTTP | runtime-neutral |
```

- [ ] **Step 5: Type-check and run the full affected test suite**

```bash
pnpm type-check
pnpm vitest run shared/connectors supabase/functions/open-data
```

Expected: PASS. A failure here almost always means a `sed` substitution
missed a specifier shape (e.g. a multi-line import) - grep again for
`\$/open-data/` with zero remaining hits before moving on.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move shared/open-data to shared/connectors/open-data"
```

---

### Task 3: Rename the `external-datasets` edge function to `connectors`

**Files:**
- Move: `supabase/functions/external-datasets/` to `supabase/functions/connectors/`
- Modify: `supabase/functions/connectors/ExternalDatasetRoutes.ts` (the
  `defineRoutes` call's first argument)
- Modify: `tests/e2e/postgres-connector-import.spec.ts` (the route prefix it
  asserts against)
- Modify: `src/views/DataManagerApp/DataImportView/PostgresConnectorImportView/`
  (wherever it builds the request URL - grep for `external-datasets` to find
  it precisely, since the exact call site was not read while writing this
  plan)

- [ ] **Step 1: Move the directory**

```bash
git mv supabase/functions/external-datasets supabase/functions/connectors
```

- [ ] **Step 2: Rename the route group**

In `supabase/functions/connectors/ExternalDatasetRoutes.ts`, change:

```ts
export const ExternalDatasetRoutes = defineRoutes<ExternalDatasetsApi>(
  "external-datasets",
  {
```

to:

```ts
export const ExternalDatasetRoutes = defineRoutes<ExternalDatasetsApi>(
  "connectors",
  {
```

and update the docstring immediately above it (currently describing "the
`external-datasets` proxy's route table") to say `connectors` instead.
`connectorRegistry.ts` and `ExternalDatasetConnector.ts` are unaffected by
this rename, since neither hardcodes the route prefix.

- [ ] **Step 3: Fix every caller**

Verified callers (via `grep -rln "external-datasets" src/`), each gets its
`/external-datasets/` path segment changed to `/connectors/` with no other
behavior change:

- `src/clients/connections/DatabaseConnectionClient.ts`
- `src/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation.ts`
- `src/clients/qetl/wrappers/PostgresTableWrapper/PostgresTableWrapper.ts`
- `src/clients/qetl/wrappers/PostgresTableWrapper/PostgresTableWrapper.test.ts`
- `src/types/http-api.types.ts`
- `src/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable.ts`
- `src/views/DataManagerApp/DataImportView/PostgresConnectorImportView/postgresConnectorImportErrorCopy.ts`
- `src/views/DataManagerApp/DataImportView/PostgresConnectorImportView/PostgresConnectorImportView.test.tsx`
- `tests/e2e/postgres-connector-import.spec.ts`

```bash
grep -rl "external-datasets" src/ tests/ --include="*.ts" --include="*.tsx" \
  | xargs sed -i '' 's#external-datasets#connectors#g'
```

Re-run the grep afterward with zero expected hits; any file in the list
above that the `sed` did not touch (e.g. a multi-line URL template) needs a
manual fix.

- [ ] **Step 4: Run the Postgres connector e2e spec**

```bash
pnpm test:e2e postgres-connector-import.spec.ts
```

Expected: PASS, identical to its pre-rename result - this step proves the
rename changed no behavior, only the path.

- [ ] **Step 5: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename external-datasets edge function to connectors"
```

---

### Task 4: Add `'socrata'` to the `api_service` enum

**Files:**
- Modify: `supabase/schemas/00.enum.catalog_entries__open_data__api_service.sql`
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts:98`
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.ts:42`
- Generated: `supabase/migrations/`, `shared/types/database.types.ts`,
  `apps/desktop/migrations/`

- [ ] **Step 1: Widen the schema enum**

In `supabase/schemas/00.enum.catalog_entries__open_data__api_service.sql`,
change:

```sql
create type public.catalog_entries__open_data__api_service as enum('ckan');
```

to:

```sql
create type public.catalog_entries__open_data__api_service as enum('ckan', 'socrata');
```

and extend the docstring above it (currently explaining why this enum names
the protocol, not the host) to name Socrata as the second value, following
the existing comment's own reasoning rather than rewriting it.

- [ ] **Step 2: Widen the TypeScript union**

In `OpenDataCatalogEntry.types.ts`, change:

```ts
/** The API protocol an `api_resource` entry speaks, not the host serving it. */
export type OpenDataApiService = "ckan";
```

to:

```ts
/** The API protocol an `api_resource` entry speaks, not the host serving it. */
export type OpenDataApiService = "ckan" | "socrata";
```

- [ ] **Step 3: Widen the Zod schema**

In `OpenDataCatalogEntryParsers.ts`, change:

```ts
  api_service: z.enum(["ckan"]).nullable(),
```

to:

```ts
  api_service: z.enum(["ckan", "socrata"]).nullable(),
```

- [ ] **Step 4: Generate the migration**

```bash
ava supabase status   # confirm green/switched for this branch
pnpm db:reset
pnpm db:new-migration
```

Confirm the generated migration contains exactly one `ALTER TYPE
"public"."catalog_entries__open_data__api_service" ADD VALUE 'socrata'` (or
equivalent) and nothing else - no dropped objects, no unrelated churn. If it
contains anything else, stop and re-read `docs/rules/sql.md`'s migration
guidance before proceeding; do not hand-edit the generated file beyond the
two permitted edits that skill names (view churn removal, omitted ACL
statements).

- [ ] **Step 5: Regenerate types**

```bash
pnpm db:gen-types
```

Confirm `shared/types/database.types.ts`'s
`catalog_entries__open_data__api_service` enum now includes `"socrata"`.

- [ ] **Step 6: Regenerate the desktop SQLite mirror**

```bash
pnpm desktop:sqlite:gen-migrations
```

A SQLite enum add is a no-op by the existing precedent (SQLite has no enum
type; `catalog_entries__open_data`'s desktop mirror accepts any text in that
column already) - confirm the generator produces no new `.gen.sql` file for
this migration, or if it does, that the new file is empty of any
`api_service`-related statement. If the generator fails for an unrelated,
pre-existing reason (as it did once before, per
`2026-08-19-qetl-open-data-apis-design.md` section 6.6), do not hand-write a
`.gen.sql` file; report the blocker instead.

- [ ] **Step 7: Run the affected tests**

```bash
pnpm vitest run shared/models/catalog-entries/OpenDataCatalogEntry
```

- [ ] **Step 8: Commit**

```bash
git add supabase/schemas supabase/migrations shared/types/database.types.ts \
  shared/models/catalog-entries/OpenDataCatalogEntry apps/desktop/migrations
git commit -m "feat(open-data): add socrata to the api_service enum"
```

---

### Task 5: Add the write-back cache columns to `catalog_entries__open_data`

**Files:**
- Modify: `supabase/schemas/10.catalog_entries__open_data.sql`
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts`
- Modify: `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.ts`
- Test: `supabase/tests/database/permissions/catalog_entries_open_data_access.test.sql`
  (extended, not replaced)

- [ ] **Step 1: Add the columns**

In `supabase/schemas/10.catalog_entries__open_data.sql`, after the existing
`api_resource_format` column and before the `unique_parquet_file_pipeline`
constraint, add:

```sql
  -- Where this entry's cached copy lives in the `open-data-catalog` bucket,
  -- once one has been written. Null until the first successful fetch. Only
  -- ever set on an `api_resource` entry: a `pipeline_parquet` entry already
  -- has a stable Parquet object named by `parquet_file_name` and never needs
  -- a cache.
  cached_object_path text,
  -- The freshness token captured when the cache was last written. Compared
  -- against a live metadata read before serving the cache; never parsed.
  cached_source_version text,
  -- When the cache was last written. Informational only:
  -- cached_source_version is what correctness depends on.
  cached_at timestamptz,
```

- [ ] **Step 2: Extend the pipeline-row CHECK's negative half**

In the same file, the `catalog_entries__open_data__pipeline_access_complete`
constraint's `and` chain gains three more clauses, so a pipeline row can
never carry cache state either:

```sql
  constraint catalog_entries__open_data__pipeline_access_complete check (
    access_kind <> 'pipeline_parquet' or
    (
      parquet_file_name is not null and
      pipeline_name is not null and
      pipeline_run_id is not null and
      api_service is null and
      api_base_url is null and
      api_resource_id is null and
      api_resource_format is null and
      cached_object_path is null and
      cached_source_version is null and
      cached_at is null
    )
  ),
```

- [ ] **Step 3: Add the new cache-completeness constraint**

Immediately after `catalog_entries__open_data__api_access_complete` in the
same file:

```sql
  -- A cache is written atomically or not at all: either every column is set,
  -- or every column is null. There is no state where only one has a value.
  constraint catalog_entries__open_data__cache_complete check (
    (cached_object_path is null and cached_source_version is null and cached_at is null)
    or
    (cached_object_path is not null and cached_source_version is not null and cached_at is not null)
  ),
```

- [ ] **Step 4: Update the model type**

In `OpenDataCatalogEntry.types.ts`, add to `OpenDataCatalogEntryRead` (after
`apiResourceFormat`):

```ts
  /**
   * Where this entry's cached copy lives in the `open-data-catalog` bucket.
   * Undefined until the first successful fetch. Only ever set on an
   * `api_resource` entry.
   */
  cachedObjectPath: string | undefined;

  /**
   * The freshness token captured when the cache was last written. Compared
   * against a live metadata read, never parsed.
   */
  cachedSourceVersion: string | undefined;

  /** When the cache was last written. Informational only. */
  cachedAt: string | undefined;
```

- [ ] **Step 5: Update the Zod schema**

In `OpenDataCatalogEntryParsers.ts`'s `DBReadSchema`, add (after
`api_resource_format`):

```ts
  cached_object_path: z.string().nullable(),
  cached_source_version: z.string().nullable(),
  cached_at: z.iso.datetime({ offset: true }).nullable(),
```

- [ ] **Step 6: Generate the migration**

```bash
pnpm db:reset
pnpm db:new-migration
```

Confirm the generated migration adds exactly the three columns and the two
constraint changes (one `ALTER` on the existing pipeline-complete constraint,
one new `ADD CONSTRAINT` for cache-complete), each CHECK arriving as `not
valid` followed by a `validate constraint` pass (the pattern `db diff`
already produces for every CHECK in this codebase - if this pair is missing,
re-read rather than hand-complete it, per `supabase-declarative-schema`).

- [ ] **Step 7: Regenerate types**

```bash
pnpm db:gen-types
```

- [ ] **Step 8: Regenerate the desktop SQLite mirror**

```bash
pnpm desktop:sqlite:gen-migrations
```

Three new nullable `TEXT`/`TIMESTAMPTZ` columns on an existing table are a
plain `ALTER TABLE ADD COLUMN` on the Postgres side; confirm the generator
produces a real `.gen.sql` for this migration (unlike Task 4's enum add) and
that it is a SQLite table rebuild adding the three columns, following the
precedent `getManualMigrationBodyFromSourceFile.ts` already documents for
this exact kind of change. The two new CHECK constraints are not mirrored
(SQLite cannot `ADD CONSTRAINT`; the mirror receives only rows Postgres
already validated), matching how `access_kind`'s own CHECKs were handled.

- [ ] **Step 9: Write the pgTAP coverage**

Add to `supabase/tests/database/permissions/catalog_entries_open_data_access.test.sql`
(extend the existing file; do not create a second one):

Cache columns: all-null is valid on an `api_resource` row.

```sql
select lives_ok(
  $$
    insert into catalog_entries__open_data
      (id, display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format)
    values
      ('aaaaaaaa-0000-4000-8000-000000000101', 'Cache test, no cache yet',
       'Test Org', 'api_resource', 'ckan', 'https://data.example',
       'test-dataset', 'test-resource', 'CSV')
  $$,
  'An api_resource row with no cache columns set inserts'
);
```

Cache columns: all-set is valid.

```sql
select lives_ok(
  $$
    insert into catalog_entries__open_data
      (id, display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format,
       cached_object_path, cached_source_version, cached_at)
    values
      ('aaaaaaaa-0000-4000-8000-000000000102', 'Cache test, cached',
       'Test Org', 'api_resource', 'ckan', 'https://data.example',
       'test-dataset', 'test-resource-2', 'CSV',
       'aaaaaaaa-0000-4000-8000-000000000102.csv', 'ckan:hash:abc', now())
  $$,
  'An api_resource row with every cache column set inserts'
);
```

Cache columns: partially-set is rejected.

```sql
select throws_ok(
  $$
    insert into catalog_entries__open_data
      (id, display_name, external_organization_name, access_kind, api_service,
       api_base_url, external_dataset_id, api_resource_id, api_resource_format,
       cached_object_path)
    values
      ('aaaaaaaa-0000-4000-8000-000000000103', 'Cache test, partial',
       'Test Org', 'api_resource', 'ckan', 'https://data.example',
       'test-dataset', 'test-resource-3', 'CSV',
       'aaaaaaaa-0000-4000-8000-000000000103.csv')
  $$,
  '23514',
  null,
  'An api_resource row with only cached_object_path set is rejected'
);
```

A `pipeline_parquet` row cannot carry cache state.

```sql
select throws_ok(
  $$
    insert into catalog_entries__open_data
      (id, display_name, external_organization_name, access_kind,
       parquet_file_name, pipeline_name, pipeline_run_id, cached_object_path)
    values
      ('aaaaaaaa-0000-4000-8000-000000000104', 'Cache test, pipeline row',
       'Test Org', 'pipeline_parquet',
       'series.parquet', 'test-pipeline', 'run-1',
       'should-not-be-allowed.csv')
  $$,
  '23514',
  null,
  'A pipeline_parquet row with cached_object_path set is rejected'
);
```

- [ ] **Step 10: Run the pgTAP suite**

```bash
pnpm test:db
```

Expected: PASS, all four new assertions green, nothing else in the file
regressed.

- [ ] **Step 11: Run the model-layer tests**

```bash
pnpm vitest run shared/models/catalog-entries/OpenDataCatalogEntry
```

- [ ] **Step 12: Commit**

```bash
git add supabase/schemas supabase/migrations supabase/tests shared/types/database.types.ts \
  shared/models/catalog-entries/OpenDataCatalogEntry apps/desktop/migrations
git commit -m "feat(open-data): add write-back cache columns to catalog_entries__open_data"
```

---

### Task 6: Create the `open-data-catalog` storage bucket

**Files:**
- Create: `supabase/migrations/<timestamp>_STORAGE-open-data-catalog-bucket.sql`
  (hand-written, following the repo's existing `STORAGE-*.sql` convention -
  buckets are managed through migrations, not `supabase/schemas/`, the same
  split this repo already documents for Storage)

- [ ] **Step 1: Write the migration**

Name it with today's date stamp and the `STORAGE-` prefix, matching
`supabase/migrations/20260119164300_STORAGE-workspaces-bucket.sql`'s
convention:

```sql
-- Create bucket if not exists
insert into
  storage.buckets (
    id,
    name,
    public
  )
values
  (
    'open-data-catalog',
    'open-data-catalog',
    false
  )
on conflict (id) do nothing;

-- No policy grants `authenticated` or `anon` any access. The only reader or
-- writer of this bucket is the `open-data` edge function's service-role
-- client, which bypasses storage RLS entirely - the browser never learns
-- this bucket exists, the same way it never sees `vault.decrypted_secrets`.
```

- [ ] **Step 2: Apply it locally**

```bash
ava supabase status   # confirm green/switched for this branch
supabase db reset
```

(A hand-written migration is applied by a plain reset, not
`db:new-migration`, since there is no declarative schema to diff it against -
it is pure DML on `storage.buckets`, the same reasoning the
`supabase-declarative-schema` skill already gives for every other bucket
migration in this repo.)

- [ ] **Step 3: Write the pgTAP coverage**

New file, `supabase/tests/database/permissions/storage_open_data_catalog_bucket.test.sql`:

```sql
begin;
select plan(2);

select is(
  (select public from storage.buckets where id = 'open-data-catalog'),
  false,
  'The open-data-catalog bucket is private'
);

select results_eq(
  $$
    select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and qual like '%open-data-catalog%'
  $$,
  $$ values (0) $$,
  'No storage policy references the open-data-catalog bucket - service-role only'
);

select * from finish();
rollback;
```

- [ ] **Step 4: Run it**

```bash
pnpm test:db
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat(open-data): add the private open-data-catalog storage bucket"
```

---

### Task 7: `SocrataClient`

Mirrors `CkanClient`'s shape (`shared/connectors/open-data/CkanClient/`)
exactly: stateless, every call takes its base URL as an argument, reuses the
existing `OpenDataHttp` injection (`getJson`/`getBytes`) rather than
inventing a second transport type, since Socrata's metadata and data
endpoints are both plain CORS-open GETs - verified live against
`data.cityofnewyork.us` (section 1 of the spec).

**Files:**
- Create: `shared/connectors/open-data/SocrataClient/SocrataClient.ts`
- Create: `shared/connectors/open-data/SocrataClient/SocrataClient.types.ts`
- Create: `shared/connectors/open-data/SocrataClient/SocrataClient.schemas.ts`
- Create: `shared/connectors/open-data/SocrataClient/SocrataClient.test.ts`
- Create: `shared/connectors/open-data/buildSocrataSourceVersion.ts`
- Create: `shared/connectors/open-data/buildSocrataSourceVersion.test.ts`
- Modify: `shared/connectors/open-data/openDataErrors.ts` (new failure codes)

- [ ] **Step 1: Write the types**

```ts
// SocrataClient.types.ts
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/**
 * One Socrata "view" (dataset)'s metadata, from `/api/views/{id}.json`. Field
 * names are Socrata's own: this describes someone else's wire format rather
 * than an Avandar model.
 */
export type SocrataViewMetadata = {
  id: string;
  name: string;
  /** Unix seconds. When the view's rows last changed, Socrata's own clock. */
  rowsUpdatedAt: number | undefined;
  /** Unix seconds. When the view's metadata last changed. */
  viewLastModified: number | undefined;
};

/** Reads Socrata view metadata and resource rows. Stateless. */
export type SocrataClient = {
  /** Reads one view's metadata - the freshness token source. */
  getMetadata: (params: {
    baseUrl: string;
    socrataDatasetId: string;
  }) => Promise<SocrataViewMetadata>;

  /**
   * Reads one view's rows as CSV text, capped at `maxRows`. SODA serves CSV
   * natively from the same resource endpoint JSON comes from
   * (`/resource/{id}.csv`), so no JSON-to-CSV conversion is needed here,
   * unlike CKAN's datastore records case.
   */
  getRows: (params: {
    baseUrl: string;
    socrataDatasetId: string;
    maxRows: number;
  }) => Promise<string>;

  /** Reads one view's row count, checked against `maxRows` before fetching. */
  getRowCount: (params: {
    baseUrl: string;
    socrataDatasetId: string;
  }) => Promise<number>;
};
```

- [ ] **Step 2: Write the Zod schemas**

```ts
// SocrataClient.schemas.ts
import { z } from "zod";

export const SocrataViewMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  rowsUpdatedAt: z.number().optional(),
  viewLastModified: z.number().optional(),
});

/** `$select=count(*)` always returns one row shaped `{ count: "123" }`. */
export const SocrataCountResponseSchema = z.array(
  z.object({ count: z.string() }),
);
```

- [ ] **Step 3: Add the failure codes**

In `openDataErrors.ts`, add to the `OpenDataAcquisitionFailure` union (two
new members, alongside the existing CKAN-named ones, which stay unchanged):

```ts
  /** Socrata reported more rows than the caller's ceiling allows. */
  | {
      code: "socrata-too-large";
      socrataDatasetId: string;
      rowCount: number;
      maxRows: number;
    }
  /** The Socrata metadata or data request failed. */
  | { code: "socrata-unreachable"; socrataDatasetId: string },
```

and the matching cases in `_buildFailureMessage`:

```ts
    case "socrata-too-large":
      return `Socrata dataset '${failure.socrataDatasetId}' has ${failure.rowCount} rows, above the ${failure.maxRows} row limit.`;
    case "socrata-unreachable":
      return `Socrata dataset '${failure.socrataDatasetId}' could not be read.`;
```

- [ ] **Step 4: Write the failing tests**

```ts
// SocrataClient.test.ts
import { describe, expect, it, vi } from "vitest";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const BASE_URL = "https://data.cityofnewyork.us";
const DATASET_ID = "erm2-nwe9";

function _http(overrides: Partial<OpenDataHttp> = {}): OpenDataHttp {
  return {
    getJson: vi.fn(async () => {
      return {
        id: DATASET_ID,
        name: "311 Service Requests from 2020 to Present",
        rowsUpdatedAt: 1792114673,
        viewLastModified: 1767021900,
      };
    }),
    getBytes: vi.fn(async () => {
      return new TextEncoder().encode("a,b\n1,2\n") as Uint8Array<ArrayBuffer>;
    }),
    ...overrides,
  };
}

describe("SocrataClient.getMetadata", () => {
  it("requests the view metadata endpoint for the named dataset", async () => {
    const http = _http();

    await createSocrataClient(http).getMetadata({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${BASE_URL}/api/views/${DATASET_ID}.json`,
    );
  });

  it("returns the freshness fields", async () => {
    const http = _http();

    const metadata = await createSocrataClient(http).getMetadata({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
    });

    expect(metadata).toEqual({
      id: DATASET_ID,
      name: "311 Service Requests from 2020 to Present",
      rowsUpdatedAt: 1792114673,
      viewLastModified: 1767021900,
    });
  });

  it("tolerates a view with no rowsUpdatedAt", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return { id: DATASET_ID, name: "No freshness fields" };
      }),
    });

    const metadata = await createSocrataClient(http).getMetadata({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
    });

    expect(metadata.rowsUpdatedAt).toBeUndefined();
  });
});

describe("SocrataClient.getRowCount", () => {
  it("requests a count(*) select", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return [{ count: "22811427" }];
      }),
    });

    const count = await createSocrataClient(http).getRowCount({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${BASE_URL}/resource/${DATASET_ID}.json?%24select=count(*)`,
    );
    expect(count).toBe(22811427);
  });
});

describe("SocrataClient.getRows", () => {
  it("reads the .csv resource endpoint with a $limit", async () => {
    const http = _http();

    const csv = await createSocrataClient(http).getRows({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
      maxRows: 100000,
    });

    expect(http.getBytes).toHaveBeenCalledWith(
      `${BASE_URL}/resource/${DATASET_ID}.csv?%24limit=100000`,
    );
    expect(csv).toBe("a,b\n1,2\n");
  });

  it("raises socrata-unreachable when the byte read throws", async () => {
    const http = _http({
      getBytes: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    await expect(
      createSocrataClient(http).getRows({
        baseUrl: BASE_URL,
        socrataDatasetId: DATASET_ID,
        maxRows: 100000,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return OpenDataAcquisitionFailed.is(error, "socrata-unreachable");
    });
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `pnpm vitest run shared/connectors/open-data/SocrataClient`
Expected: FAIL with "Cannot find module" (`SocrataClient.ts` does not exist
yet)

- [ ] **Step 6: Implement `SocrataClient`**

```ts
// SocrataClient.ts
import {
  SocrataCountResponseSchema,
  SocrataViewMetadataSchema,
} from "$/connectors/open-data/SocrataClient/SocrataClient.schemas.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type {
  SocrataClient,
  SocrataViewMetadata,
} from "$/connectors/open-data/SocrataClient/SocrataClient.types.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

function _trimTrailingSlash(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * Reads Socrata view metadata and resource rows over an injected HTTP layer.
 *
 * Stateless, and every call takes its base URL as an argument, mirroring
 * `CkanClient` exactly: one client serves every Socrata-hosted portal, from
 * `data.cityofnewyork.us` to any other government deployment of the same
 * platform.
 */
export function createSocrataClient(http: Readonly<OpenDataHttp>): SocrataClient {
  return {
    getMetadata: async ({ baseUrl, socrataDatasetId }): Promise<SocrataViewMetadata> => {
      const root = _trimTrailingSlash(baseUrl);
      const url = `${root}/api/views/${socrataDatasetId}.json`;
      try {
        const body = await http.getJson(url);
        return SocrataViewMetadataSchema.parse(body);
      } catch (cause) {
        throw new OpenDataAcquisitionFailed(
          { code: "socrata-unreachable", socrataDatasetId },
          cause,
        );
      }
    },

    getRowCount: async ({ baseUrl, socrataDatasetId }): Promise<number> => {
      const root = _trimTrailingSlash(baseUrl);
      const url = `${root}/resource/${socrataDatasetId}.json?%24select=count(*)`;
      try {
        const body = await http.getJson(url);
        const [row] = SocrataCountResponseSchema.parse(body);
        return Number(row?.count ?? "0");
      } catch (cause) {
        throw new OpenDataAcquisitionFailed(
          { code: "socrata-unreachable", socrataDatasetId },
          cause,
        );
      }
    },

    getRows: async ({ baseUrl, socrataDatasetId, maxRows }): Promise<string> => {
      const root = _trimTrailingSlash(baseUrl);
      const url = `${root}/resource/${socrataDatasetId}.csv?%24limit=${maxRows}`;
      try {
        const bytes = await http.getBytes(url);
        return new TextDecoder().decode(bytes);
      } catch (cause) {
        throw new OpenDataAcquisitionFailed(
          { code: "socrata-unreachable", socrataDatasetId },
          cause,
        );
      }
    },
  };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run shared/connectors/open-data/SocrataClient`
Expected: PASS

- [ ] **Step 8: Write and run `buildSocrataSourceVersion`**

```ts
// buildSocrataSourceVersion.ts
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { SocrataViewMetadata } from "$/connectors/open-data/SocrataClient/SocrataClient.types.ts";

const ROWS_UPDATED_PREFIX = "socrata:rowsUpdatedAt:";
const VIEW_MODIFIED_PREFIX = "socrata:viewLastModified:";

/**
 * Builds an opaque change token for one Socrata view, or undefined when
 * neither freshness field is present.
 *
 * Prefers `rowsUpdatedAt`, which Socrata's own platform stamps when a row
 * changes - stronger evidence than `viewLastModified`, which also moves on a
 * metadata-only edit (a description typo fix), mirroring exactly why the
 * CKAN version builder prefers `hash` over `metadata_modified`.
 */
export function buildSocrataSourceVersion(
  metadata: Readonly<SocrataViewMetadata>,
): SourceVersion | undefined {
  if (metadata.rowsUpdatedAt !== undefined) {
    return `${ROWS_UPDATED_PREFIX}${metadata.rowsUpdatedAt}`;
  }
  if (metadata.viewLastModified !== undefined) {
    return `${VIEW_MODIFIED_PREFIX}${metadata.viewLastModified}`;
  }
  return undefined;
}
```

```ts
// buildSocrataSourceVersion.test.ts
import { describe, expect, it } from "vitest";
import { buildSocrataSourceVersion } from "$/connectors/open-data/buildSocrataSourceVersion.ts";

describe("buildSocrataSourceVersion", () => {
  it("prefers rowsUpdatedAt when present", () => {
    expect(
      buildSocrataSourceVersion({
        id: "x",
        name: "x",
        rowsUpdatedAt: 1792114673,
        viewLastModified: 1767021900,
      }),
    ).toBe("socrata:rowsUpdatedAt:1792114673");
  });

  it("falls back to viewLastModified when rowsUpdatedAt is absent", () => {
    expect(
      buildSocrataSourceVersion({
        id: "x",
        name: "x",
        rowsUpdatedAt: undefined,
        viewLastModified: 1767021900,
      }),
    ).toBe("socrata:viewLastModified:1767021900");
  });

  it("returns undefined when neither field is present", () => {
    expect(
      buildSocrataSourceVersion({ id: "x", name: "x", rowsUpdatedAt: undefined, viewLastModified: undefined }),
    ).toBeUndefined();
  });

  it("cannot collide with a viewLastModified-derived token sharing the same number", () => {
    const fromRows = buildSocrataSourceVersion({
      id: "x",
      name: "x",
      rowsUpdatedAt: 1767021900,
      viewLastModified: undefined,
    });
    const fromView = buildSocrataSourceVersion({
      id: "x",
      name: "x",
      rowsUpdatedAt: undefined,
      viewLastModified: 1767021900,
    });
    expect(fromRows).not.toBe(fromView);
  });
});
```

Run: `pnpm vitest run shared/connectors/open-data/buildSocrataSourceVersion.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add shared/connectors/open-data/SocrataClient shared/connectors/open-data/buildSocrataSourceVersion.ts \
  shared/connectors/open-data/buildSocrataSourceVersion.test.ts shared/connectors/open-data/openDataErrors.ts
git commit -m "feat(open-data): add SocrataClient and its source version builder"
```

---

### Task 8: `SocrataDiscoveryClient` - the metacatalog client

**Files:**
- Create: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.ts`
- Create: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts`
- Create: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.schemas.ts`
- Create: `shared/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.test.ts`

- [ ] **Step 1: Write the types**

```ts
// SocrataDiscoveryClient.types.ts
export type SocrataDiscoveryResult = {
  /** The dataset's 4x4 id, e.g. "erm2-nwe9". */
  datasetId: string;
  name: string;
  /** The portal domain this result lives on, e.g. "data.cityofnewyork.us". */
  domain: string;
};

export type SocrataDiscoveryClient = {
  /**
   * Searches Socrata's cross-portal Discovery API. `domains`, when given,
   * narrows to one portal (layer-0 "drive" search within it); omitted, it
   * searches every opted-in portal at once (drive discovery - "is there a
   * Chicago portal").
   */
  search: (params: {
    query: string;
    domains?: readonly string[];
    limit?: number;
  }) => Promise<SocrataDiscoveryResult[]>;
};
```

- [ ] **Step 2: Write the Zod schema**

```ts
// SocrataDiscoveryClient.schemas.ts
import { z } from "zod";

export const SocrataDiscoveryResponseSchema = z.object({
  results: z.array(
    z.object({
      resource: z.object({ id: z.string(), name: z.string() }),
      metadata: z.object({ domain: z.string() }),
    }),
  ),
});
```

- [ ] **Step 3: Write the failing tests**

```ts
// SocrataDiscoveryClient.test.ts
import { describe, expect, it, vi } from "vitest";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const DISCOVERY_BASE_URL = "https://api.us.socrata.com/api/catalog/v1";

function _http(overrides: Partial<OpenDataHttp> = {}): OpenDataHttp {
  return {
    getJson: vi.fn(async () => {
      return {
        results: [
          {
            resource: { id: "akvg-8vrb", name: "CDC Wastewater Data for Measles" },
            metadata: { domain: "data.cdc.gov" },
          },
        ],
      };
    }),
    getBytes: vi.fn(),
    ...overrides,
  };
}

describe("SocrataDiscoveryClient.search", () => {
  it("searches across every portal when no domain is given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({ query: "measles" });

    expect(http.getJson).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?q=measles`,
    );
  });

  it("narrows to one portal when a domain is given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      query: "measles",
      domains: ["data.cityofnewyork.us"],
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?q=measles&domains=data.cityofnewyork.us`,
    );
  });

  it("returns a flattened, typed result list", async () => {
    const http = _http();

    const results = await createSocrataDiscoveryClient(http).search({
      query: "measles",
    });

    expect(results).toEqual([
      { datasetId: "akvg-8vrb", name: "CDC Wastewater Data for Measles", domain: "data.cdc.gov" },
    ]);
  });

  it("passes a limit through when given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({ query: "measles", limit: 3 });

    expect(http.getJson).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?q=measles&limit=3`,
    );
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm vitest run shared/connectors/open-data/SocrataDiscoveryClient`
Expected: FAIL with "Cannot find module"

- [ ] **Step 5: Implement `SocrataDiscoveryClient`**

```ts
// SocrataDiscoveryClient.ts
import { SocrataDiscoveryResponseSchema } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.schemas.ts";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const DISCOVERY_BASE_URL = "https://api.us.socrata.com/api/catalog/v1";

export function createSocrataDiscoveryClient(
  http: Readonly<OpenDataHttp>,
): SocrataDiscoveryClient {
  return {
    search: async ({ query, domains, limit }): Promise<SocrataDiscoveryResult[]> => {
      const params = new URLSearchParams({ q: query });
      if (domains && domains.length > 0) {
        params.set("domains", domains.join(","));
      }
      if (limit !== undefined) {
        params.set("limit", String(limit));
      }
      const body = await http.getJson(`${DISCOVERY_BASE_URL}?${params.toString()}`);
      const parsed = SocrataDiscoveryResponseSchema.parse(body);
      return parsed.results.map((result) => {
        return {
          datasetId: result.resource.id,
          name: result.resource.name,
          domain: result.metadata.domain,
        };
      });
    },
  };
}
```

- [ ] **Step 6: Fix the query-string ordering if the test disagrees**

`URLSearchParams` preserves insertion order, so the three tests above should
pass with the implementation as written; run the suite and adjust only if a
specific assertion's expected order does not match (do not change the test's
expectations to match broken output - fix the implementation).

Run: `pnpm vitest run shared/connectors/open-data/SocrataDiscoveryClient`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add shared/connectors/open-data/SocrataDiscoveryClient
git commit -m "feat(open-data): add SocrataDiscoveryClient for live metacatalog search"
```

---

### Task 9: Extend `acquireOpenDataResource` to dispatch CKAN vs. Socrata

**Files:**
- Modify: `shared/connectors/open-data/acquireOpenDataResource.ts`
- Test: `shared/connectors/open-data/acquireOpenDataResource.test.ts` (extend
  the existing file)

- [ ] **Step 1: Read the current acquisition test file first**

Before editing, run `pnpm vitest run shared/connectors/open-data/acquireOpenDataResource.test.ts`
to confirm the existing CKAN-only suite is green, establishing the baseline
this task must not break.

- [ ] **Step 2: Write the new, failing Socrata test cases**

Add to the existing test file (do not create a second one):

```ts
describe("acquireOpenDataResource, api_service: socrata", () => {
  it("dispatches to SocrataClient and returns CSV content", async () => {
    const http: OpenDataHttp = {
      getJson: vi.fn(async (url: string) => {
        if (url.includes("/api/views/")) {
          return { id: "erm2-nwe9", name: "311", rowsUpdatedAt: 1792114673 };
        }
        return [{ count: "100" }];
      }),
      getBytes: vi.fn(async () => {
        return new TextEncoder().encode("a,b\n1,2\n") as Uint8Array<ArrayBuffer>;
      }),
    };
    const entry = {
      accessKind: "api_resource",
      apiService: "socrata",
      apiBaseUrl: "https://data.cityofnewyork.us",
      externalDatasetId: "erm2-nwe9",
      apiResourceId: "erm2-nwe9",
      apiResourceFormat: "CSV",
    } as unknown as OpenDataCatalogEntry.T;

    const acquisition = await acquireOpenDataResource({ entry, http });

    expect(acquisition.contentKind).toBe("csv");
    expect(new TextDecoder().decode(acquisition.bytes)).toBe("a,b\n1,2\n");
    expect(acquisition.sourceVersion).toBe("socrata:rowsUpdatedAt:1792114673");
  });

  it("refuses a Socrata dataset over the row ceiling before fetching", async () => {
    const http: OpenDataHttp = {
      getJson: vi.fn(async (url: string) => {
        if (url.includes("/api/views/")) {
          return { id: "erm2-nwe9", name: "311" };
        }
        return [{ count: "22811427" }];
      }),
      getBytes: vi.fn(),
    };
    const entry = {
      accessKind: "api_resource",
      apiService: "socrata",
      apiBaseUrl: "https://data.cityofnewyork.us",
      externalDatasetId: "erm2-nwe9",
      apiResourceId: "erm2-nwe9",
      apiResourceFormat: "CSV",
    } as unknown as OpenDataCatalogEntry.T;

    await expect(
      acquireOpenDataResource({ entry, http, maxRows: 1_000_000 }),
    ).rejects.toSatisfy((error: unknown) => {
      return OpenDataAcquisitionFailed.is(error, "socrata-too-large");
    });
    expect(http.getBytes).not.toHaveBeenCalled();
  });
});
```

(Exact fixture shape - `OpenDataCatalogEntry.T` vs. the entry shape
`acquireOpenDataResource` actually destructures via `OpenDataCatalogEntry.toAccess`
- must match whatever the existing CKAN tests in this same file already use
as their fixture; follow that file's own established pattern rather than the
sketch above if the two differ.)

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `pnpm vitest run shared/connectors/open-data/acquireOpenDataResource.test.ts`
Expected: FAIL (`apiService: "socrata"` is not yet handled)

- [ ] **Step 4: Rewrite `acquireOpenDataResource` to dispatch by `api_service`**

Replace the current body (which calls `createCkanClient` unconditionally)
with a `match` on `access.apiService`:

```ts
import { match } from "ts-pattern";
import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion.ts";
import { buildSocrataSourceVersion } from "$/connectors/open-data/buildSocrataSourceVersion.ts";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { getCkanResourceFromPackage } from "$/connectors/open-data/getCkanResourceFromPackage.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
// ...existing imports for OpenDataCatalogEntry, SourceVersion, OpenDataHttp...

const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_ROWS = 1_000_000;

async function _acquireCkanResource(
  access: Extract<OpenDataCatalogEntry.Access, { apiService: "ckan" }>,
  http: Readonly<OpenDataHttp>,
  maxBytes: number,
): Promise<OpenDataAcquisition> {
  const client = createCkanClient(http);
  const ckanPackage = await client.getPackage({
    baseUrl: access.apiBaseUrl,
    ckanDatasetId: access.externalDatasetId,
  });
  const resource = getCkanResourceFromPackage({
    ckanPackage,
    ckanResourceId: access.apiResourceId,
    baseUrl: access.apiBaseUrl,
    expectedFormat: access.expectedFormat,
    maxBytes,
  });
  return {
    contentKind: _toContentKind(resource.format),
    bytes: await client.getResourceBytes({
      ckanResourceId: resource.id,
      url: resource.url,
    }),
    sourceVersion: buildCkanSourceVersion(resource),
    datastoreActive: resource.datastore_active,
  };
}

async function _acquireSocrataResource(
  access: Extract<OpenDataCatalogEntry.Access, { apiService: "socrata" }>,
  http: Readonly<OpenDataHttp>,
  maxRows: number,
): Promise<OpenDataAcquisition> {
  const client = createSocrataClient(http);
  const metadata = await client.getMetadata({
    baseUrl: access.apiBaseUrl,
    socrataDatasetId: access.externalDatasetId,
  });
  const rowCount = await client.getRowCount({
    baseUrl: access.apiBaseUrl,
    socrataDatasetId: access.externalDatasetId,
  });
  if (rowCount > maxRows) {
    throw new OpenDataAcquisitionFailed({
      code: "socrata-too-large",
      socrataDatasetId: access.externalDatasetId,
      rowCount,
      maxRows,
    });
  }
  const csv = await client.getRows({
    baseUrl: access.apiBaseUrl,
    socrataDatasetId: access.externalDatasetId,
    maxRows,
  });
  return {
    contentKind: "csv",
    bytes: new TextEncoder().encode(csv) as Uint8Array<ArrayBuffer>,
    sourceVersion: buildSocrataSourceVersion(metadata),
    datastoreActive: false,
  };
}

export async function acquireOpenDataResource(params: {
  entry: Readonly<OpenDataCatalogEntry.T>;
  http: Readonly<OpenDataHttp>;
  maxBytes?: number;
  maxRows?: number;
}): Promise<OpenDataAcquisition> {
  const access = OpenDataCatalogEntry.toAccess(params.entry);
  if (!access || access.kind !== "api_resource") {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: params.entry.accessKind,
    });
  }

  return match(access)
    .with({ apiService: "ckan" }, (ckanAccess) => {
      return _acquireCkanResource(ckanAccess, params.http, params.maxBytes ?? DEFAULT_MAX_BYTES);
    })
    .with({ apiService: "socrata" }, (socrataAccess) => {
      return _acquireSocrataResource(socrataAccess, params.http, params.maxRows ?? DEFAULT_MAX_ROWS);
    })
    .exhaustive();
}
```

(`_toContentKind` is the existing helper already in this file; keep it
unchanged and reuse it for the CKAN branch only - Socrata's branch always
returns `"csv"` directly, since `getRows` only ever requests the `.csv`
resource format.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run shared/connectors/open-data/acquireOpenDataResource.test.ts`
Expected: PASS, every CKAN case still green alongside the new Socrata cases

- [ ] **Step 6: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 7: Commit**

```bash
git add shared/connectors/open-data/acquireOpenDataResource.ts shared/connectors/open-data/acquireOpenDataResource.test.ts
git commit -m "feat(open-data): dispatch acquireOpenDataResource by api_service (ckan or socrata)"
```

---

### Task 10: `AvandarSupabaseStorageClient`

**Files:**
- Create: `shared/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.ts`
- Create: `shared/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.types.ts`
- Create: `shared/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.test.ts`

- [ ] **Step 1: Write the types**

```ts
// AvandarSupabaseStorageClient.types.ts

/**
 * The one storage handle this client needs - a Supabase client's own
 * `.storage.from(bucket)` return shape, scoped to one specific bucket by the
 * caller rather than by this client, so this module never hardcodes a
 * bucket name string more than once.
 */
export type SupabaseStorageBucketHandle = {
  download: (path: string) => Promise<{ data: Blob | null; error: { message: string } | null }>;
  upload: (
    path: string,
    body: Blob,
    options: { contentType: string; upsert: boolean },
  ) => Promise<{ error: { message: string } | null }>;
  remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
};

export type AvandarSupabaseStorageClient = {
  downloadCachedResource: (objectPath: string) => Promise<Blob | undefined>;
  uploadCachedResource: (objectPath: string, blob: Blob) => Promise<void>;
  removeCachedResource: (objectPath: string) => Promise<void>;
};
```

- [ ] **Step 2: Write the failing tests**

```ts
// AvandarSupabaseStorageClient.test.ts
import { describe, expect, it, vi } from "vitest";
import { createAvandarSupabaseStorageClient } from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.ts";
import type { SupabaseStorageBucketHandle } from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.types.ts";

function _handle(overrides: Partial<SupabaseStorageBucketHandle> = {}): SupabaseStorageBucketHandle {
  return {
    download: vi.fn(async () => {
      return { data: new Blob(["cached"]), error: null };
    }),
    upload: vi.fn(async () => {
      return { error: null };
    }),
    remove: vi.fn(async () => {
      return { error: null };
    }),
    ...overrides,
  };
}

describe("AvandarSupabaseStorageClient.downloadCachedResource", () => {
  it("reads the object at the given path", async () => {
    const handle = _handle();

    const blob = await createAvandarSupabaseStorageClient(handle).downloadCachedResource(
      "aaaaaaaa.parquet",
    );

    expect(handle.download).toHaveBeenCalledWith("aaaaaaaa.parquet");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("returns undefined rather than throwing when the object is missing", async () => {
    const handle = _handle({
      download: vi.fn(async () => {
        return { data: null, error: { message: "not found" } };
      }),
    });

    const blob = await createAvandarSupabaseStorageClient(handle).downloadCachedResource(
      "missing.parquet",
    );

    expect(blob).toBeUndefined();
  });
});

describe("AvandarSupabaseStorageClient.uploadCachedResource", () => {
  it("uploads with upsert so a re-cache overwrites cleanly", async () => {
    const handle = _handle();
    const blob = new Blob(["bytes"]);

    await createAvandarSupabaseStorageClient(handle).uploadCachedResource(
      "aaaaaaaa.csv",
      blob,
    );

    expect(handle.upload).toHaveBeenCalledWith("aaaaaaaa.csv", blob, {
      contentType: "application/octet-stream",
      upsert: true,
    });
  });

  it("throws when the upload fails", async () => {
    const handle = _handle({
      upload: vi.fn(async () => {
        return { error: { message: "disk full" } };
      }),
    });

    await expect(
      createAvandarSupabaseStorageClient(handle).uploadCachedResource(
        "aaaaaaaa.csv",
        new Blob(["bytes"]),
      ),
    ).rejects.toThrow("disk full");
  });
});

describe("AvandarSupabaseStorageClient.removeCachedResource", () => {
  it("removes the object at the given path", async () => {
    const handle = _handle();

    await createAvandarSupabaseStorageClient(handle).removeCachedResource("aaaaaaaa.parquet");

    expect(handle.remove).toHaveBeenCalledWith(["aaaaaaaa.parquet"]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run shared/connectors/open-data/AvandarSupabaseStorageClient`
Expected: FAIL with "Cannot find module"

- [ ] **Step 4: Implement the client**

```ts
// AvandarSupabaseStorageClient.ts
import type {
  AvandarSupabaseStorageClient,
  SupabaseStorageBucketHandle,
} from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.types.ts";

/**
 * Reads and writes the Open Data Catalog's own cache objects, through an
 * injected storage handle already scoped to the `open-data-catalog` bucket.
 *
 * The caller supplies the handle (`SupabaseAdmin.storage.from("open-data-catalog")`
 * in the edge function this runs in today) rather than this module importing
 * a Supabase client itself, the same injection shape `CkanClient` already
 * uses for its HTTP layer - this keeps the module reachable from `shared/`
 * with no client singleton baked in.
 */
export function createAvandarSupabaseStorageClient(
  handle: Readonly<SupabaseStorageBucketHandle>,
): AvandarSupabaseStorageClient {
  return {
    downloadCachedResource: async (objectPath: string): Promise<Blob | undefined> => {
      const { data, error } = await handle.download(objectPath);
      if (error || !data) {
        return undefined;
      }
      return data;
    },

    uploadCachedResource: async (objectPath: string, blob: Blob): Promise<void> => {
      const { error } = await handle.upload(objectPath, blob, {
        contentType: "application/octet-stream",
        upsert: true,
      });
      if (error) {
        throw new Error(error.message);
      }
    },

    removeCachedResource: async (objectPath: string): Promise<void> => {
      const { error } = await handle.remove([objectPath]);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run shared/connectors/open-data/AvandarSupabaseStorageClient`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add shared/connectors/open-data/AvandarSupabaseStorageClient
git commit -m "feat(open-data): add AvandarSupabaseStorageClient for the catalog's write-back cache"
```

---

### Task 11: `acquireOpenDataResourceWithCache` - the orchestration function

**Files:**
- Create: `shared/connectors/open-data/acquireOpenDataResourceWithCache.ts`
- Create: `shared/connectors/open-data/acquireOpenDataResourceWithCache.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// acquireOpenDataResourceWithCache.test.ts
import { describe, expect, it, vi } from "vitest";
import { acquireOpenDataResourceWithCache } from "$/connectors/open-data/acquireOpenDataResourceWithCache.ts";
import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.ts";

const CKAN_ENTRY = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  accessKind: "api_resource",
  apiService: "ckan",
  apiBaseUrl: "https://data.humdata.org",
  externalDatasetId: "movement-range-maps",
  apiResourceId: "9da55974-adf5-4106-988c-d3c92333ea0a",
  apiResourceFormat: "CSV",
  cachedObjectPath: undefined,
  cachedSourceVersion: undefined,
  cachedAt: undefined,
} as unknown as OpenDataCatalogEntry.T;

describe("acquireOpenDataResourceWithCache", () => {
  it("fetches live and writes the cache when no cache exists yet", async () => {
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:abc");
    const acquireLive = vi.fn().mockResolvedValue({
      contentKind: "csv",
      bytes: new TextEncoder().encode("a,b\n1,2\n"),
      sourceVersion: "ckan:hash:abc",
    });
    const storage = {
      downloadCachedResource: vi.fn(),
      uploadCachedResource: vi.fn().mockResolvedValue(undefined),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn().mockResolvedValue(undefined);

    const result = await acquireOpenDataResourceWithCache({
      entry: CKAN_ENTRY,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(storage.downloadCachedResource).not.toHaveBeenCalled();
    expect(acquireLive).toHaveBeenCalledTimes(1);
    expect(storage.uploadCachedResource).toHaveBeenCalledWith(
      `${CKAN_ENTRY.id}.csv`,
      expect.any(Blob),
    );
    expect(updateCache).toHaveBeenCalledWith({
      catalogEntryId: CKAN_ENTRY.id,
      cachedObjectPath: `${CKAN_ENTRY.id}.csv`,
      cachedSourceVersion: "ckan:hash:abc",
    });
    expect(result.contentKind).toBe("csv");
  });

  it("serves the cache and skips the live fetch when the token is unchanged", async () => {
    const cachedEntry = {
      ...CKAN_ENTRY,
      cachedObjectPath: `${CKAN_ENTRY.id}.csv`,
      cachedSourceVersion: "ckan:hash:abc",
      cachedAt: "2026-10-01T00:00:00Z",
    };
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:abc");
    const acquireLive = vi.fn();
    const cachedBlob = new Blob(["a,b\n1,2\n"]);
    const storage = {
      downloadCachedResource: vi.fn().mockResolvedValue(cachedBlob),
      uploadCachedResource: vi.fn(),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn();

    const result = await acquireOpenDataResourceWithCache({
      entry: cachedEntry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(storage.downloadCachedResource).toHaveBeenCalledWith(`${CKAN_ENTRY.id}.csv`);
    expect(acquireLive).not.toHaveBeenCalled();
    expect(updateCache).not.toHaveBeenCalled();
    expect(result.bytes).toBeInstanceOf(Uint8Array);
  });

  it("re-fetches live and overwrites the cache when the token changed", async () => {
    const staleEntry = {
      ...CKAN_ENTRY,
      cachedObjectPath: `${CKAN_ENTRY.id}.csv`,
      cachedSourceVersion: "ckan:hash:old",
      cachedAt: "2026-09-01T00:00:00Z",
    };
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:new");
    const acquireLive = vi.fn().mockResolvedValue({
      contentKind: "csv",
      bytes: new TextEncoder().encode("a,b\n3,4\n"),
      sourceVersion: "ckan:hash:new",
    });
    const storage = {
      downloadCachedResource: vi.fn(),
      uploadCachedResource: vi.fn().mockResolvedValue(undefined),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn().mockResolvedValue(undefined);

    await acquireOpenDataResourceWithCache({
      entry: staleEntry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(storage.downloadCachedResource).not.toHaveBeenCalled();
    expect(acquireLive).toHaveBeenCalledTimes(1);
    expect(updateCache).toHaveBeenCalledWith({
      catalogEntryId: CKAN_ENTRY.id,
      cachedObjectPath: `${CKAN_ENTRY.id}.csv`,
      cachedSourceVersion: "ckan:hash:new",
    });
  });

  it("falls back to a live fetch when the cached object is missing despite a matching token", async () => {
    const cachedEntry = {
      ...CKAN_ENTRY,
      cachedObjectPath: `${CKAN_ENTRY.id}.csv`,
      cachedSourceVersion: "ckan:hash:abc",
      cachedAt: "2026-10-01T00:00:00Z",
    };
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:abc");
    const acquireLive = vi.fn().mockResolvedValue({
      contentKind: "csv",
      bytes: new TextEncoder().encode("a,b\n1,2\n"),
      sourceVersion: "ckan:hash:abc",
    });
    const storage = {
      downloadCachedResource: vi.fn().mockResolvedValue(undefined),
      uploadCachedResource: vi.fn().mockResolvedValue(undefined),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn().mockResolvedValue(undefined);

    await acquireOpenDataResourceWithCache({
      entry: cachedEntry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(acquireLive).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run shared/connectors/open-data/acquireOpenDataResourceWithCache.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the orchestration function**

```ts
// acquireOpenDataResourceWithCache.ts
import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.ts";
import type { AvandarSupabaseStorageClient } from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.types.ts";
import type { OpenDataAcquisition } from "$/connectors/open-data/acquireOpenDataResource.ts";

type UpdateCacheParams = {
  catalogEntryId: OpenDataCatalogEntry.Id;
  cachedObjectPath: string;
  cachedSourceVersion: string;
};

/**
 * Serves an `api_resource` entry from the Open Data Catalog's own cache when
 * a cheap freshness check says nothing changed, and fetches live (writing
 * the result back to the cache) otherwise.
 *
 * Every dependency is injected - the freshness check, the live fetch, the
 * storage client, and the catalog-entry update - so this function contains
 * only the cache-aside decision itself and nothing that reaches a network or
 * a database on its own. The one caller today is `OpenDataRoutes.ts`, which
 * supplies real implementations backed by `SupabaseAdmin`.
 */
export async function acquireOpenDataResourceWithCache(params: {
  entry: Readonly<OpenDataCatalogEntry.T>;
  /** Reads the live source's freshness token - one cheap metadata call. */
  readFreshnessToken: (entry: Readonly<OpenDataCatalogEntry.T>) => Promise<string>;
  /** Fetches the full resource live. Only called on a cache miss or a stale token. */
  acquireLive: (entry: Readonly<OpenDataCatalogEntry.T>) => Promise<OpenDataAcquisition>;
  storage: Readonly<AvandarSupabaseStorageClient>;
  updateCache: (params: UpdateCacheParams) => Promise<void>;
}): Promise<OpenDataAcquisition> {
  const { entry, readFreshnessToken, acquireLive, storage, updateCache } = params;

  const liveToken = await readFreshnessToken(entry);

  if (entry.cachedObjectPath && entry.cachedSourceVersion === liveToken) {
    const cachedBlob = await storage.downloadCachedResource(entry.cachedObjectPath);
    if (cachedBlob) {
      return {
        contentKind: _contentKindFromFormat(entry.apiResourceFormat),
        bytes: new Uint8Array(await cachedBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>,
        sourceVersion: liveToken,
        datastoreActive: false,
      };
    }
    // Falls through to a live fetch: the catalog entry claims a cache object
    // exists, but it is actually gone (deleted out of band). Treat this as a
    // miss rather than an error - the next successful write repairs it.
  }

  const acquisition = await acquireLive(entry);
  const objectPath = `${entry.id}.${acquisition.contentKind}`;
  await storage.uploadCachedResource(
    objectPath,
    new Blob([acquisition.bytes]),
  );
  if (acquisition.sourceVersion) {
    await updateCache({
      catalogEntryId: entry.id,
      cachedObjectPath: objectPath,
      cachedSourceVersion: acquisition.sourceVersion,
    });
  }
  return acquisition;
}

function _contentKindFromFormat(format: string | undefined): "csv" | "parquet" {
  return format?.toLowerCase() === "parquet" ? "parquet" : "csv";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run shared/connectors/open-data/acquireOpenDataResourceWithCache.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add shared/connectors/open-data/acquireOpenDataResourceWithCache.ts shared/connectors/open-data/acquireOpenDataResourceWithCache.test.ts
git commit -m "feat(open-data): add the cache-aside orchestration function"
```

---

### Task 12: Wire `OpenDataRoutes.ts` to the cache

No route-level HTTP test exists for this handler or for any sibling edge
function route today (verified: no `*Routes.test.ts` file exists anywhere
under `supabase/functions/`) - every edge function route in this codebase is
instead verified by unit-testing the functions it calls, plus a manual,
live end-to-end check for the route itself. This task follows that existing
precedent rather than inventing a new one: Tasks 10 and 11 already unit-test
`AvandarSupabaseStorageClient` and `acquireOpenDataResourceWithCache` in
isolation, this task's own step 4 unit-tests `readOpenDataFreshnessToken`,
and step 6 below is the manual live check, mirroring exactly the one
`2026-08-19-qetl-open-data-apis-design.md` section 12.5 already ran for this
same route's original build.

**Files:**
- Modify: `supabase/functions/open-data/OpenDataRoutes.ts`
- Create: `shared/connectors/open-data/readOpenDataFreshnessToken.ts`
- Create: `shared/connectors/open-data/readOpenDataFreshnessToken.test.ts`

- [ ] **Step 1: Confirm the baseline**

```bash
pnpm vitest run supabase/functions/open-data
pnpm type-check
```

Confirm green before changing anything.

- [ ] **Step 2: Read `OpenDataRoutes.ts` in full before editing it**

This file was read in an earlier part of this work (it is small, one route)
but re-read it now against the live repo state before writing Step 3's
diff, since Tasks 1-11 may have landed in separate sessions since then.

- [ ] **Step 3: Replace the direct `acquireOpenDataResource` call**

The current handler body:

```ts
      try {
        const acquisition = await acquireOpenDataResource({
          entry,
          http: createOpenDataHttp({ maxBytes: MAX_RESOURCE_BYTES }),
          maxBytes: MAX_RESOURCE_BYTES,
        });

        return new Response(acquisition.bytes as BodyInit, {
          // ...headers...
        });
      } catch (caught) {
        // ...
      }
```

becomes:

```ts
      try {
        const acquisition = await acquireOpenDataResourceWithCache({
          entry,
          readFreshnessToken: (readEntry) => {
            return readOpenDataFreshnessToken({
              entry: readEntry,
              http: createOpenDataHttp({ maxBytes: MAX_RESOURCE_BYTES }),
            });
          },
          acquireLive: (liveEntry) => {
            return acquireOpenDataResource({
              entry: liveEntry,
              http: createOpenDataHttp({ maxBytes: MAX_RESOURCE_BYTES }),
              maxBytes: MAX_RESOURCE_BYTES,
            });
          },
          storage: createAvandarSupabaseStorageClient(
            supabaseAdminClient.storage.from("open-data-catalog"),
          ),
          updateCache: async ({ catalogEntryId, cachedObjectPath, cachedSourceVersion }) => {
            const { error: updateError } = await supabaseAdminClient
              .from("catalog_entries__open_data")
              .update({
                cached_object_path: cachedObjectPath,
                cached_source_version: cachedSourceVersion,
                cached_at: new Date().toISOString(),
              })
              .eq("id", catalogEntryId);
            if (updateError) {
              throw updateError;
            }
          },
        });

        return new Response(acquisition.bytes as BodyInit, {
          // ...unchanged headers...
        });
      } catch (caught) {
        // ...unchanged...
      }
```

Where `supabaseAdminClient` is `SupabaseAdmin` from
`supabase/functions/_shared/supabase.ts`, imported alongside the route's
existing `supabaseClient` (the user-scoped client this route already reads
the catalog entry with) - the catalog read stays on the user-scoped client
exactly as today, since the catalog is `select`-granted to every
`authenticated` caller already; only the cache's own read/write and the
entry's cache-column update move to the service-role client.

- [ ] **Step 4: Add `readOpenDataFreshnessToken`**

A new small function, colocated in `shared/connectors/open-data/` (not in the
edge function itself, so it is reachable by a test with no network):

```ts
// shared/connectors/open-data/readOpenDataFreshnessToken.ts
import { match } from "ts-pattern";
import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion.ts";
import { buildSocrataSourceVersion } from "$/connectors/open-data/buildSocrataSourceVersion.ts";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/**
 * Reads one cheap, up-to-date freshness token for an `api_resource` entry,
 * without fetching its rows. For CKAN this is the same `package_show` call
 * acquisition needs anyway; for Socrata it is a separate, equally cheap
 * metadata call.
 */
export async function readOpenDataFreshnessToken(params: {
  entry: Readonly<OpenDataCatalogEntry.T>;
  http: Readonly<OpenDataHttp>;
}): Promise<string> {
  const access = OpenDataCatalogEntry.toAccess(params.entry);
  if (!access || access.kind !== "api_resource") {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: params.entry.accessKind,
    });
  }

  const token = await match(access)
    .with({ apiService: "ckan" }, async (ckanAccess) => {
      const ckanPackage = await createCkanClient(params.http).getPackage({
        baseUrl: ckanAccess.apiBaseUrl,
        ckanDatasetId: ckanAccess.externalDatasetId,
      });
      const resource = ckanPackage.resources.find((candidate) => {
        return candidate.id === ckanAccess.apiResourceId;
      });
      return resource ? buildCkanSourceVersion(resource) : undefined;
    })
    .with({ apiService: "socrata" }, async (socrataAccess) => {
      const metadata = await createSocrataClient(params.http).getMetadata({
        baseUrl: socrataAccess.apiBaseUrl,
        socrataDatasetId: socrataAccess.externalDatasetId,
      });
      return buildSocrataSourceVersion(metadata);
    })
    .exhaustive();

  if (token === undefined) {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: params.entry.accessKind,
    });
  }
  return token;
}
```

Add `readOpenDataFreshnessToken.test.ts` alongside it, covering: CKAN
resource-not-found yields `access-shape-invalid`; Socrata's token is read
without any call to `getRows`/`getResourceBytes` (the whole point of this
function - it must never fetch rows).

- [ ] **Step 5: Run every test touched by this task**

```bash
pnpm vitest run supabase/functions/open-data shared/connectors/open-data
```

Expected: PASS, the original CKAN-path tests from Step 1 still green

- [ ] **Step 6: Run the manual end-to-end check against live CKAN**

Reproduce the check `2026-08-19-qetl-open-data-apis-design.md` section 12.5
already ran, on a switched local stack, confirming the response is identical
in shape to before this task (same headers, same status codes for the same
refusal cases) and that a second request for the same catalog entry is
noticeably faster (served from the new bucket, not re-fetched from HDX).

**Known gap (as of this task's implementation):** this manual check was
attempted and blocked by a JWT-issuer mismatch between the edge-runtime
container and the host-exposed URL in this worktree's switched local
Supabase stack - a local-environment/tooling issue, not a defect in the
shipped code. All other verification for this plan (unit tests across every
task, `pnpm test:db`, `pnpm type-check`) is green. A human should either fix
that local-stack config and run this check, or run it from an unswitched or
differently-configured stack, before merging to develop.

- [ ] **Step 7: Type-check**

```bash
pnpm type-check
```

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/open-data shared/connectors/open-data
git commit -m "feat(open-data): wire the write-back cache into the open-data route"
```

---

## After all tasks: full verification

- [ ] Run the complete affected-area test suite:

```bash
pnpm vitest run shared/connectors shared/models/catalog-entries supabase/functions/open-data \
  supabase/functions/connectors src/clients/qetl
pnpm test:db
pnpm type-check
```

- [ ] Confirm `git log --oneline` shows one commit per task, in order, with
  no task's commit containing an unrelated file.

- [ ] Re-read `open-data-catalog-architecture.md` section 7 ("What this spec
  builds vs. what it does not") against what actually landed, and update the
  "In scope, built by this spec" list to past tense if anything's shape
  changed during implementation (e.g. a function name that moved during
  TDD) - the spec should describe the code as built once this plan is done,
  per this branch's own documentation convention.
