# EtlEngine: crawl scopes and per-scope checkpoints - design

- **Status:** Draft for review
- **Date:** 2026-10-21
- **Author:** pablo@avandarlabs.com
- **Branch:** `feat/demo/measles`
- **Builds on:** [`2026-10-20-etl-engine-supabase-load-and-incremental-runs-design.md`](2026-10-20-etl-engine-supabase-load-and-incremental-runs-design.md)
- **Packages touched:** `@avandar/etl` (`packages/node/etl`), `apps/pipeline-server`,
  `apps/ava-cli`, `shared/connectors/open-data`, `supabase/schemas`

## 1. Summary

An incremental run today resumes each drive from one high-water mark: the
newest `date_of_last_update` the listings table holds for that pipeline and
drive. That works as long as the set of things a pipeline indexes inside a
drive never changes. As soon as it grows, the mark is wrong for the new
part:

| Change | What one mark per drive does |
| --- | --- |
| HDX starts indexing XLSX next to CSV | XLSX resources inherit the CSV mark, so every XLSX file in a dataset not modified since is skipped forever. |
| A Socrata drive adds the "Education" category next to "Economy" | Older Education datasets fall below the Economy mark and are never crawled. |
| A new Socrata drive is added | Already works: the drive has no rows, so its mark is empty and it crawls from the start. |

This design makes the unit of crawling and resuming a **scope**: a named
slice of one drive, such as "the CSV resources on HDX" or "the Education
category on NYC". Each `(pipeline, drive, scope)` has its own **checkpoint**,
stored in a new table rather than derived from the listings. A scope with
no checkpoint crawls from the start on its own, so a plain
`ava pipeline run hdx --incremental` after adding an XLSX scope resumes CSV
from its checkpoint and backfills XLSX in full. No new flag is needed.

Each listing records which scopes produced it. That makes removing a scope
safe to clean up: a new `ava pipeline prune-retired-scopes` command deletes
the listings only retired scopes produced, after a dry run, and never
deletes a listing a workspace has added. `ava pipeline reset` gains
`--scope`.

HDX and Socrata are the test cases. HDX declares two scopes now,
`format:csv` and `format:parquet`, and XLSX, GeoParquet, shapefiles, and
PDFs each become one more scope once a reader for them exists. Socrata keeps
one scope per drive, `all`, and gains category and tag scopes for drives
that should index only part of a portal.

## 2. Goals and non-goals

### Goals

1. A pipeline declares, per drive, a list of scopes. A scope's meaning is
   pipeline-defined: a file format, a category, a tag, or anything a source
   can filter on.
2. Incremental runs resume each scope from its own checkpoint. A scope that
   has never been crawled crawls from the start, even in an incremental run.
3. Checkpoints are stored explicitly, so they record what was crawled, not
   only what was written. A scope that matched nothing still advances.
4. Every listing records the scopes that produced it, so a retired scope's
   listings can be found and removed without touching listings another
   scope still produces.
5. Removing a scope from the config never deletes anything by itself.
   Deletion is a separate command with a dry run, and it never deletes a
   listing a workspace uses.
6. Existing deployments move over without a full re-crawl: today's derived
   marks seed the first checkpoints.
7. The HDX and Socrata pipelines use scopes, and each scope pushes its
   filter to the source API where the API supports it.

### Non-goals

- Reading new file formats. XLSX, GeoParquet, shapefiles, and PDFs need
  readers in `acquireOpenDataResource` and their own column story first.
  This design only makes adding them a one-scope change.
- Relation columns for API listings (Socrata `columns_*`, HDX
  `fs_check_info` headers). That is separate work.
- Detecting datasets deleted upstream (section 10.2).
- Change Data Capture (section 10.3).
- Running two runs of one pipeline at the same time. That is unsupported
  today and stays unsupported.
- Pruning `pipeline_parquet` listings (WDI). Their rows have no drive key to
  attribute them to, and `ava pipeline reset` already covers that pipeline.

## 3. Vocabulary

This extends the vocabulary of the previous spec and of
[`connector-nomenclature.md`](../../measles-demo/connector-nomenclature.md).

| Term | Meaning |
| --- | --- |
| **Scope** | A named slice of one drive that a pipeline crawls and resumes independently. It is not a layer of the connector model: it filters connections (layer 2) and relations (layer 3) inside one drive (layer 1). |
| **Scope key** | A scope's stable identity, such as `format:csv` or `category:education`. Unique within one drive. Changing what a scope selects means giving it a new key (section 5.2). |
| **Crawl** | One oldest-first pass over one `(drive, scope)`. The unit a run report counts. |
| **Checkpoint** | The stored high-water mark of one `(pipeline, drive, scope)`: every connection in that scope with a source timestamp before it has been loaded. Replaces the high-water mark derived from the listings table. |
| **Live scope** | A scope the pipeline's code declares today. |
| **Retired scope** | A `(drive, scope)` that has a checkpoint or listings but is no longer declared. A removed drive retires all of its scopes. |

## 4. Current state

| Area | Today |
| --- | --- |
| High-water mark | `ListingsStore.readHighWaterMark`: `max(date_of_last_update)` over the pipeline's rows for one `api_base_url`, ignoring future dates. Index `data_catalog_listings__pipeline_drive_last_update` exists for it. `EtlIncrementalConfig.readHighWaterMark` can override it; no pipeline does. |
| Crawl unit | One crawl per drive, in `listDrives` order (`crawlDrive`). |
| HDX filter | None at the source. `package_search` returns every dataset (28,356), and `makeApiResourceRelationsFromCkanPackage` keeps hosted CSV and Parquet resources (`READABLE_FORMATS`). |
| Socrata filter | None. One drive, NYC, indexed whole. The Discovery API pages at most 10,000 results per query. |
| Run report | One entry per drive. |
| `ava pipeline reset` | Deletes the pipeline's listings by `pipeline_name`, after a prompt. Listings a workspace uses are kept or deleted with their datasets, the user's choice. |
| A row's origin | `pipeline_name`, `pipeline_run_id`, `api_base_url`. Nothing says which part of a drive produced a row. |

### What the source APIs support

Verified with live requests on 2026-10-21.

| | HDX `package_search` | Socrata Discovery API |
| --- | --- | --- |
| Filter by resource format | `fq=+res_format:"CSV"` (13,548 datasets), `+res_format:"Parquet"` (3). **Case-sensitive**: `"csv"` matches 0. Values are HDX's facet labels. | Not applicable |
| Filter by category or tag | `fq=+tags:...`, `+groups:...`, `+organization:...` | `categories=Education` and `tags=doe`, **only with `search_context=<domain>`** (without it, 0 results). Repeating a parameter ORs the values: Education 582 plus Health 70 gives 652. |
| Combined with the existing order | Yes, `fq` clauses AND together | Yes, with `order=updatedAt ASC` |

## 5. Design

### 5.1 Declaring scopes

A scope is any object with a `key`. A pipeline adds its own fields for
whatever its `extract` and `transform` need.

```ts
/** One slice of a drive that is crawled and resumed independently. */
export type EtlScope = Readonly<{ key: string }>;

/** The one scope a pipeline has when it declares none. */
export const ETL_DEFAULT_SCOPE: EtlScope = { key: "all" };

export type EtlEngineConfig<TDrive, TConnection, TScope extends EtlScope = EtlScope> =
  EtlDestination &
    Readonly<{
      // ...unchanged fields...
      /** The drive's scopes, crawled in order. Omit for one scope, `all`. */
      listScopes?: (drive: TDrive) => PromisedOrValue<readonly TScope[]>;
      extract: (args: {
        drive: TDrive;
        scope: TScope;
        window: EtlRunWindow;
        pipelineRunId: EtlPipelineRunId;
      }) => AsyncIterable<readonly TConnection[]>;
      transform: (args: {
        drive: TDrive;
        scope: TScope;
        connection: TConnection;
        pipelineRunId: EtlPipelineRunId;
      }) => PromisedOrValue<readonly Relation[]>;
    }>;
```

A scope has two jobs, and the pipeline does both:

- **`extract` narrows what is fetched.** It passes the scope's filter to the
  source when the source supports one. This is an optimization: the CSV
  scope's full crawl reads about 13,500 HDX datasets instead of 28,356.
- **`transform` narrows what is written.** This is the correctness half. A
  dataset with both a CSV and an XLSX resource appears in both scopes'
  crawls, and each crawl must emit only its own scope's relations.

Validation, per drive, before any crawl of that drive:

- A scope key matches `^[a-z0-9][a-z0-9._:@-]{0,63}$`. Keys are stored in a
  `text[]` and appear in PostgREST array filters, where commas, braces, and
  quotes would need escaping.
- Keys are unique within a drive.
- A `listScopes` that throws, or returns an invalid or repeated key, fails
  that drive. The report gets one failed entry for the drive with scope key
  `listScopes`, the same way a failing `getDriveKey` is reported today as
  `listDrives[i]`.

### 5.2 Scope keys are explicit and versioned

The key is the scope's identity. When a scope's meaning changes, for
example the CSV scope starts accepting `text/csv` resources it used to skip,
the pipeline renames it (`format:csv` to `format:csv@2`). The renamed scope
has no checkpoint, so it crawls from the start. The old key becomes retired,
and pruning it moves its listings to the new key (section 5.7).

The engine does not fingerprint a scope's definition. A fingerprint would
also change on a harmless refactor and quietly start a 36,000-listing
backfill. Renaming is a deliberate act a reviewer can see in a diff.

### 5.3 Checkpoints

New table `public.pipeline_scope_checkpoints` (section 5.9):

| Column | Type | Meaning |
| --- | --- | --- |
| `pipeline_name` | `text not null` | As on listings |
| `drive_key` | `text not null` | `getDriveKey(drive)`, the same value as `api_base_url` |
| `scope_key` | `text not null` | |
| `high_water_mark` | `timestamptz not null` | |
| `pipeline_run_id` | `text not null` | The run that last advanced it |
| `created_at`, `updated_at` | `timestamptz` | |

Primary key `(pipeline_name, drive_key, scope_key)`.

**Meaning.** A checkpoint `M` says: every connection in this scope with a
source timestamp before `M` has been loaded. Connections at exactly `M` may
not all have been, because a page can end in the middle of a run of equal
timestamps. The window's `since` is inclusive, so the next crawl starts at
`M` and fetches them again. The repeats that were already written are
caught by the change check, as today.

**Reading.** Before a crawl, the engine reads the scope's checkpoint. The
window follows the same rule as today, with the checkpoint in place of the
derived mark:

```
since = options.since ?? (options.mode === "incremental" ? checkpoint : undefined)
```

**Advancing.** After each page has been loaded (rows, then relation
columns), the engine writes the checkpoint, so a killed run resumes from
the last finished page. The rules:

1. The new value is the newest connection timestamp on the page that is not
   later than the run's `syncedAt`. A future-dated connection is a bad
   source timestamp and must not push the checkpoint past real changes.
   This is the same rule the derived mark follows today.
2. A checkpoint never moves backward. The engine keeps the current value in
   memory for the crawl and writes only when the new value is later.
3. A checkpoint advances only when the crawl's coverage is contiguous with
   it: when `window.since` is undefined (a crawl from the start), or when
   the stored checkpoint exists and `window.since` is not later than it. An
   explicit `--since` later than the checkpoint leaves a gap, so that crawl
   leaves the checkpoint alone, and with no checkpoint it does not create
   one. This fixes the caveat in section 10, item 16 of the previous spec:
   today a later `--since` moves the derived mark past the gap.
4. A page with no connections writes nothing.
5. Full runs advance checkpoints too, under the same rules. A full crawl from
   the start covers everything.
6. A pipeline without `incremental` config (WDI) has no connection
   timestamps and writes no checkpoints.

The checkpoint write comes after the page's rows, never before. A crash
between the two re-crawls one page, and the change check absorbs the
repeats.

**Why stored, not derived.** A derived mark can only say what was written.
With scopes, that breaks in two ways. When a scope's filter matches nothing
for a long stretch, its derived mark stays empty and every run crawls the
scope from the start. And when one relation belongs to two scopes, its row
cannot say which scope's mark it advances. A stored checkpoint records what
was crawled.

### 5.4 Run flow

`run(options)` changes as follows. Everything not listed is unchanged.

1. `_assertCanRun` validates `options.scopes` (non-empty array of valid keys
   when present) along with the existing checks.
2. `listDrives()`, then for each drive, in order, `listScopes(drive)` (or
   `[ETL_DEFAULT_SCOPE]`) and validation (section 5.1).
3. When `options.scopes` is set, keep only those keys. A requested key that
   no drive declares throws `EtlRunOptionsError` before any crawl. A drive
   that declares none of the requested keys is left out of the report.
4. For each drive, for each kept scope, in declaration order: one crawl.
   `limit` counts connections across all crawls, as it counts across drives
   today.
5. A crawl is today's drive crawl with the scope threaded through:
   checkpoint read, window, `extract({ drive, scope, ... })`, per-page
   `transform({ drive, scope, connection, ... })`, load, checkpoint advance.
   Repeats are deduped per crawl, as they are per drive today.
6. `EtlRunFailedError` is thrown when every crawl failed.

**Cost of overlap.** A connection that matches two scopes is fetched and
transformed in both crawls. Its relations differ when the scopes split by
relation (HDX formats). They coincide when the scopes split by connection
and overlap (a Socrata dataset tagged both `economy` and `education`). Then
the second crawl's write only adds its key to the row (section 5.5).

**Socrata's 10,000-result cap** applies per query, so per crawl. A drive too
large for one crawl can be split into category scopes. This is a side
benefit, not a goal.

### 5.5 Scope keys on listings

New column `data_catalog_listings.pipeline_scope_keys text[] not null default '{}'`.

- **Writing.** `loadRelationsPage` already reads the stored rows matching a
  page before writing. For each relation, the row's keys are the stored
  row's keys, in their stored order, plus the current scope's key appended
  if missing. A new row gets `[scopeKey]`.
- **Change check.** `pipeline_scope_keys` is compared like any other
  contract column. A row already listing the current scope compares equal
  and is left alone. A row produced by another scope differs by one key, so
  it is written once to record the new scope. Without this, the second
  scope's crawl would see the row as unchanged and never claim it, and
  pruning the first scope would delete a row the second still produces.
- **`pipeline_parquet` rows** (WDI) get `["all"]`, for uniformity. Nothing
  reads it yet.

`ListingRowValues` and `StoredListingRow` gain `pipeline_scope_keys:
readonly string[]`, and the Supabase store selects and writes it.

### 5.6 Engine API changes

| Change | Detail |
| --- | --- |
| `EtlScope`, `ETL_DEFAULT_SCOPE` | New, exported |
| `EtlEngineConfig` | Third type parameter `TScope`; `listScopes?`; `scope` passed to `extract` and `transform` |
| `EtlIncrementalConfig.readHighWaterMark` | Removed. No pipeline uses it, and its derived default is gone. |
| `EtlOutput.checkpointsTable` | New, `string`. Required when the config has `incremental`. A Supabase-backed engine without it throws at the start of `run`, like a missing `supabase.url`. |
| `EtlStores.checkpoints` | New `CheckpointStore`, required when the config has `incremental` |
| `CheckpointStore` | `read({ pipelineName, driveKey, scopeKey }) => Promise<Date \| undefined>` and `write({ pipelineName, driveKey, scopeKey, highWaterMark, pipelineRunId }) => Promise<void>` (an upsert). Supabase and in-memory implementations. |
| `ListingsStore.readHighWaterMark` | Removed |
| `EtlRunOptions.scopes` | New, `readonly string[]`, optional |
| `EtlRunReport.drives` | Replaced by `crawls: readonly EtlCrawlReport[]`. `EtlCrawlReport` is today's `EtlDriveReport` plus `scopeKey: string`. |
| `EtlEngineInstance.listScopes()` | New. Resolves to `readonly { driveKey: string; scopeKeys: readonly string[] }[]` by calling `listDrives`, `getDriveKey`, and `listScopes`, with the same validation, without crawling. Prune and reset use it to tell live scopes from retired ones. Throws on any invalid drive or scope, because a partial list would make live scopes look retired. |

### 5.7 Retired scopes, prune, and reset

**Default.** Removing a scope from the code only stops crawling it. Its
checkpoint and listings stay. The run report does not mention it.

**Finding live scopes.** The CLI asks the pipeline for its live scopes:

- By default from the pipeline server, through a new
  `GET /:pipelineName/scopes` route that returns `engine.listScopes()`. The
  CLI reads the server URL and the database credentials from the same env
  file (`.env.development`, or the `--staging`/`--prod` one), so it compares
  the server's scopes against that same environment's database.
- With `--local`, from this checkout's code, through a new script,
  `scripts/listPipelineScopes.ts`. `--local` is refused
  unless the target is the development database, because a checkout can be
  behind or ahead of what a deployed server crawls.

Each pipeline's `run.ts` exports `listScopes()` next to `run()`, and the
route and the script call it the same way `run` is called today.

**Retired** means: a `(drive_key, scope_key)` for this pipeline that has a
checkpoint row or appears in a listing's `pipeline_scope_keys` (on rows
with that `api_base_url`), and is not in `listScopes()`.

**`ava pipeline prune-retired-scopes <name> [--scope <key>] [--dry-run] [--local]`**

1. Announce the target database, with the production warning `reset`
   already prints.
2. Read live scopes, then find retired `(drive, scope)` pairs. `--scope`
   narrows to one key. An empty result prints that nothing is retired and
   exits 0.
3. For each pair, a dry run through the RPC below prints: listings that
   would be deleted, listings that would be kept because a workspace uses
   them, and listings that would only lose the key because a live scope
   still produces them.
4. `--dry-run` stops there.
5. Otherwise, one confirmation prompt (`promptToConfirmReset`, which needs a
   terminal), then the RPC for real, pair by pair, printing what each did.

This uses reset's interactive confirmation instead of a `--confirm` flag,
because reset already sets that pattern and a prompt cannot be scripted by
accident.

**RPC `rpc_data_catalog_listings__prune_pipeline_scope(p_pipeline_name, p_scope_key, p_drive_key, p_is_dry_run)`**,
granted to `service_role` only. `p_drive_key` may be null, meaning every
drive. In one transaction, over rows with that `pipeline_name` and
`api_base_url = p_drive_key` (or any `api_base_url` when it is null) whose
keys contain `p_scope_key`:

| Row | Effect |
| --- | --- |
| Has other scope keys | `array_remove` the retired key (counted as detached) |
| Only this key, used by a workspace (`datasets__open_data.catalog_listing_id`) | Untouched, key kept, so a later prune reports it again and re-adding the scope reclaims it (counted as kept) |
| Only this key, unused | Deleted (counted as deleted) |

Then it deletes the `(pipeline, drive, scope)` checkpoint, so re-adding the
scope later backfills it in full. It returns
`(listings_deleted, listings_kept_in_use, listings_detached, checkpoints_deleted)`,
where `checkpoints_deleted` is a count, since a null drive can delete
several.
With `p_is_dry_run`, it computes the same counts and changes nothing.

Workspace protection matters because `datasets__open_data.catalog_listing_id`
is `on delete cascade`: deleting the listing would silently remove each
workspace dataset's link to its source.

**`ava pipeline reset <name> [--scope <key>]`**

- **Without `--scope`:** as today, plus it deletes the pipeline's
  checkpoints **first**, before any listing. This order is required: if
  listings were deleted and the checkpoint delete then failed, the next
  incremental run would trust the stale checkpoint and skip everything. In
  the other order, a failure only costs a full re-crawl.
- **With `--scope`:** works on that key across every drive, live or
  retired. It asks reset's existing question about listings workspaces use.
  If the user chooses to delete them, the CLI deletes those workspace
  datasets first, as reset does today. Then it calls the prune RPC once,
  with a null drive key, meaning every drive. The listings the workspaces used are no longer in use by then, so
  the RPC deletes them.

### 5.8 Pipelines

**HDX.**

```ts
export type HdxScope = EtlScope & Readonly<{ resourceFormat: string }>;

export const HDX_SCOPES: readonly HdxScope[] = [
  { key: "format:csv", resourceFormat: "CSV" },
  { key: "format:parquet", resourceFormat: "Parquet" },
];
```

- `resourceFormat` is HDX's facet label, exactly, because the `res_format`
  filter is case-sensitive.
- `CkanDiscoveryClient.searchDatasets` gains `resourceFormats?: readonly
  string[]`. It adds the `fq` clause `+res_format:("CSV")`, joined with `OR`
  for several values, ANDed with the existing time and keyset clauses. Each
  value must match `^[A-Za-z0-9 ._-]+$`, or the call throws, so a value can
  never break out of its quotes.
- `extractHdxDatasets` passes `[scope.resourceFormat]`.
- `makeApiResourceRelationsFromCkanPackage` gains `resourceFormat` and keeps
  a resource when `isReadableCkanResource` holds and its format matches,
  case-insensitively.
- A full HDX crawl becomes about 136 pages for CSV plus one for Parquet,
  down from about 284 today.
- **Adding XLSX later** means adding the reader and the format to
  `READABLE_FORMATS`, then one line in `HDX_SCOPES`. The next incremental
  run backfills every XLSX resource.

**Socrata.**

```ts
export type SocrataScope = EtlScope &
  Readonly<{ categories?: readonly string[]; tags?: readonly string[] }>;

export type ConfiguredDrive = {
  baseUrl: string;
  organizationName: string;
  /** Omit to index the whole portal as one scope, `all`. */
  scopes?: readonly SocrataScope[];
};
```

- `listScopes` returns `drive.scopes ?? [ETL_DEFAULT_SCOPE]`. NYC keeps the
  default.
- `SocrataDiscoveryClient.search` gains `searchContext`, `categories`, and
  `tags`. It repeats a parameter for each value (the API ORs them), and it
  sets `search_context` to the drive's host whenever `categories` or `tags`
  is set, without which the API matches nothing.
- `transform` is unchanged. A Socrata scope filters whole datasets, so the
  source filter is the whole filter.
- Switching a drive from `all` to category scopes retires `all`. Pruning it
  then deletes the datasets outside the new categories and detaches the
  rest. That is the intended effect.

**WDI.** No `listScopes`, no `incremental`. It gets the default scope in
its report and `["all"]` on its rows, and writes no checkpoints.

### 5.9 Schema change

Declarative schema files, with a generated migration:

- `supabase/schemas/10.pipeline_scope_checkpoints.sql`: the table (section
  5.3), RLS enabled with no policies, all privileges for `service_role`,
  nothing for `authenticated` or `anon`. Only pipelines and the CLI read
  it, both with the service role. An `updated_at` trigger like the other
  tables.
- `supabase/schemas/10.data_catalog_listings.sql`: add
  `pipeline_scope_keys`. Keep index
  `data_catalog_listings__pipeline_drive_last_update`: the prune and list
  RPCs and the checkpoint seed all filter on `pipeline_name` and
  `api_base_url`.
- `supabase/schemas/50.rpc_data_catalog_listings__prune_pipeline_scope.sql`:
  the RPC, `security invoker`, `execute` granted to `service_role` only.
- `supabase/schemas/50.rpc_data_catalog_listings__list_pipeline_scopes.sql`:
  the RPC that lists a pipeline's stored drive and scope pairs, with the
  same security and grants.

A hand-written data migration after it moves existing data over:

1. **Listing scope keys.** Rows with `pipeline_name = 'socrata'` get
   `{all}`. Rows with `pipeline_name = 'hdx'` get `{format:csv}` when
   `api_resource_format = 'CSV'`, and `{format:parquet}` when it is
   `PARQUET`. Other `pipeline_name` rows (WDI) get `{all}`. Rows with no
   `pipeline_name` stay `{}`.
2. **Seed checkpoints.** For each `(pipeline_name, api_base_url)` of
   `socrata` and `hdx`, insert the derived mark today's code would compute:
   `max(date_of_last_update)` no later than `now()`. Socrata gets scope
   `all`. HDX gets the same value for both `format:csv` and
   `format:parquet`, because today's unscoped crawl covered both formats up
   to that mark. `pipeline_run_id` is `'migration:seed-scope-checkpoints'`.
   A drive with no rows gets no checkpoint and crawls from the start.

The data migration names these scope keys as literals, so the code must
match. A pipeline-server test pins `HDX_SCOPES` keys to
`["format:csv", "format:parquet"]` and the Socrata default to `all`, with a
comment pointing at the migration.

**Deploy order.** The migrations must land before the new pipeline server:
the new server writes `pipeline_scope_keys` and reads checkpoints. The
previous spec's two migrations are still undeployed, so all four go out
together, in order. A run by the old server between the migration and the
new server's deploy writes rows with `{}` keys and advances no checkpoint.
The first new run re-crawls from the seeded checkpoint and claims those
rows through the change check.

### 5.10 CLI and pipeline server

- `ava pipeline run <name> --scope <key>[,<key>...]`. Comma-separated,
  because the strict argument parser rejects a repeated flag and scope keys
  cannot contain commas. The server body gains `scopes: string[]`, and the
  body schema still rejects unknown keys. An unknown scope is a 400 with
  `EtlRunOptionsError`'s message.
- The report table gains a Scope column: one row per crawl.
  `PipelineRunReport.schemas.ts` follows the `crawls` shape. The CLI and the
  server are released together, as the previous spec already assumes.
- `GET /:pipelineName/scopes` (section 5.7), with the same server-secret
  auth as `run`.
- `ava pipeline reset --scope` and `ava pipeline prune-retired-scopes`
  (section 5.7).
- Help text for `--since` drops the gap caveat, since a later `--since` no
  longer moves a checkpoint.

## 6. Data flow

```
run(options)
  listDrives()
  for each drive:
    listScopes(drive)  -> validate keys
    for each scope (filtered by options.scopes):
      checkpoint = checkpoints.read(pipeline, driveKey, scopeKey)
      window     = since ?? (incremental ? checkpoint : undefined)
      for each page of extract({ drive, scope, window }):
        select connections (window, dedupe, limit)
        relations = transform({ drive, scope, connection }) for each
        loadRelationsPage   # stored keys + scopeKey, change check, upsert, columns
        checkpoints.write   # newest timestamp <= syncedAt, only if contiguous and later
  report { crawls: [...] }
```

## 7. Error handling

| Case | Behavior |
| --- | --- |
| `listScopes` throws, or returns an invalid or repeated key | That drive fails, with one report entry, scope key `listScopes`. Other drives run. |
| `--scope` names a key no drive declares | `EtlRunOptionsError` before any crawl (400 on the server) |
| Checkpoint read fails | That crawl fails before fetching. A pipeline with incremental config reads every crawl's checkpoint on every run, so this fails the crawl in a full run too. |
| Checkpoint write fails | That crawl fails. Rows already written stay, and the next run re-crawls from the last stored checkpoint. |
| Incremental config without `checkpointsTable` | `run` throws before listing drives |
| `listScopes()` for prune hits an invalid drive or scope | Throws, and prune stops before reading or deleting anything |
| Prune RPC fails partway through its pairs | Each pair is its own transaction. Finished pairs stay done, the failing pair changed nothing, and re-running prune picks up the rest. |
| `--local` prune against staging or production | Refused before reading anything |

## 8. Testing

Red/green, per `docs/rules/testing.md`. Ids for the plan to reference.

### 8.1 `@avandar/etl` engine

- **S1** No `listScopes`: one crawl per drive with scope `all`, and rows get `["all"]`.
- **S2** Two scopes: crawled in order. Each `extract` and `transform` receives its scope. The report has one entry per crawl.
- **S3** Incremental run where scope A has a checkpoint and scope B has none: A's window starts at its checkpoint and B's has no lower bound.
- **S4** A checkpoint advances after each page to the newest timestamp on the page. A killed crawl resumes from the last finished page.
- **S5** A future-dated connection does not move the checkpoint past `syncedAt`.
- **S6** An explicit `since` later than the checkpoint does not advance it, and with no checkpoint does not create one. A `since` at or before the checkpoint does advance it.
- **S7** The checkpoint never moves backward, including on a `--since` earlier than it.
- **S8** A full run advances checkpoints. A pipeline without `incremental` writes none.
- **S9** A connection in two scopes that yields the same relation: the row ends with both keys after two crawls. The second crawl writes the row once and is unchanged on a rerun.
- **S10** A stored row's keys keep their order, so a row already listing the scope compares unchanged.
- **S11** Invalid key, repeated key, or throwing `listScopes`: that drive fails, and others run.
- **S12** `options.scopes` keeps only the named scopes. An unknown key throws `EtlRunOptionsError` before any `extract`.
- **S13** `limit` counts across crawls.
- **S14** `listScopes()` returns live scopes without calling `extract`, and throws on any invalid drive or scope.
- **S15** Every crawl failed: `EtlRunFailedError` carrying the `crawls` report.
- **S16** Checkpoint write failure fails the crawl, and the rows already written stay.

### 8.2 Stores

- In-memory and Supabase `CheckpointStore`: read of a missing checkpoint, write then read, overwrite.
- Supabase listings store round-trips `pipeline_scope_keys`.

### 8.3 Database

pgTAP:
- `pipeline_scope_checkpoints` privileges: `service_role` all, `authenticated` and `anon` none.
- Prune RPC: detaches shared rows, keeps rows workspaces use with their key, deletes the rest, deletes the checkpoint, and changes nothing on a dry run with the same counts. Not executable by `authenticated`.
- `pipeline_scope_keys` defaults to `{}`.

Migration upgrade replay (`supabase/migration-upgrade-tests/`): a prelude with Socrata, HDX CSV, HDX Parquet, WDI, and legacy null-pipeline rows, plus a future-dated row. Assertions on the keys each row gets and on the seeded checkpoints, including that the future date is ignored.

### 8.4 Connector clients

- CKAN `searchDatasets` builds `+res_format:("CSV" OR "Parquet")` ANDed with the time clause, and rejects an unsafe format value.
- Socrata `search` repeats `categories` and `tags` and sets `search_context`.

### 8.5 Pipeline server

- HDX: each scope's `extract` passes its format, `transform` emits only that format, and `HDX_SCOPES` keys are pinned (section 5.9).
- Socrata: a drive with scopes passes each scope's filters, and a drive without scopes uses `all`.
- `GET /:pipelineName/scopes` returns live scopes and requires the secret.
- `run` accepts `scopes`, rejects unknown keys with 400, and returns `crawls`.

### 8.6 CLI

- `--scope` parsing, comma lists, and invalid keys.
- Report printing with the Scope column.
- Reset deletes checkpoints before listings, and stops if that fails.
- `reset --scope`: in-use prompt, datasets deleted first when chosen, then the RPC per drive.
- Prune: dry run prints the counts and changes nothing. A real run prompts, then calls the RPC per pair. `--local` is refused for staging and production. Nothing retired exits 0.

### 8.7 Manual verification against the switched local stack

Only against this worktree's switched local Supabase.

- **M1** Apply migrations on the current local data (36,683 HDX and 20 Socrata rows). Keys and checkpoints are seeded, and `ava pipeline run hdx --incremental` resumes both HDX scopes from the seeded checkpoint rather than crawling from the start.
- **M2** Delete only the `format:parquet` checkpoint, then run incremental: Parquet crawls from the start and CSV resumes.
- **M3** On a local-only edit (not committed), add a Socrata NYC scope `category:education` next to `all`. Education backfills in full, and its rows gain the second key.
- **M4** On a local-only edit, rename `format:parquet` to `format:parquet@2` and run. The new scope backfills and the old one is retired. `prune-retired-scopes hdx --dry-run` reports it. A real prune detaches and deletes as reported, and keeps a listing added to a workspace through the app first.
- **M5** `reset socrata --scope category:education` removes only that key's effect. A full `reset socrata` clears checkpoints, and the next incremental run crawls from the start.

## 9. Decisions

Accepted in discussion on 2026-10-20 and 2026-10-21:

1. Per-scope checkpoints in a new table, not marks derived from listings.
2. Scope keys are explicit and versioned. No automatic fingerprint.
3. A removed scope's listings are kept by default. Deletion is a separate,
   dry-run-first command, `prune-retired-scopes`, never a flag on `run`.
4. Prune never deletes a listing a workspace uses.

Taken by default in this spec:

5. A pipeline without scopes has one scope, `all`.
6. Scopes are declared per drive (`listScopes(drive)`), so two drives of one
   pipeline can slice differently.
7. Prune confirms with reset's interactive prompt rather than a `--confirm`
   flag.
8. Prune reads live scopes from the same environment's pipeline
   server. `--local` is development-only.
9. `run --scope` takes a comma-separated list.
10. The derived high-water mark, its store method, and its override hook
    are removed rather than kept as a fallback. Its index is kept, because
    the prune and list RPCs and the checkpoint seed filter on
    `pipeline_name` and `api_base_url` (see 5.9).

## 10. Follow-ups

1. **Relation columns for API listings.** Socrata `columns_*` and HDX
   `fs_check_info` headers, so Socrata and HDX listings can be added to a
   workspace at all. Open decisions: HDX types, the HXL tag row, and
   whether XLSX is in scope.
2. **Upstream deletions.** A full run records `last_seen_at` on every
   listing it encounters. After a clean full crawl of a scope, its listings
   not seen go through the prune path: dry run, delete, workspace
   protection. It also covers a resource removed from a dataset that still
   exists.
3. **Change Data Capture for database connections.** If large Postgres
   connections ever need their data copied into Avandar storage for
   performance, CDC (logical replication) would keep that copy in sync.
   Needs scoping when that need appears. It does not apply to the
   open-data pipelines, whose sources expose no change log.

## 11. Refinements made while planning

1. The prune RPC takes `(p_pipeline_name, p_scope_key, p_drive_key,
   p_is_dry_run)`. `p_drive_key` may be null for every drive, which is how
   `ava pipeline reset --scope` prunes in one call, and it returns
   `checkpoints_deleted` as a count.
2. A second RPC, `rpc_data_catalog_listings__list_pipeline_scopes`, returns
   a pipeline's distinct stored drive and scope pairs, so prune never reads
   every listing.
3. `data_catalog_listings__pipeline_drive_last_update` is kept: the RPCs and
   the checkpoint seed filter on `pipeline_name` and `api_base_url`.
4. `--local` live scopes come from `scripts/listPipelineScopes.ts`, not a
   mode of `runPipelineOnce.ts`.
5. A drive that fails before its scopes are known, including when its key
   cannot be read or it declares no scopes, has one report entry with scope
   key `listScopes`.
6. `pipeline_scope_checkpoints` is excluded from the desktop SQLite mirror.
7. The app's listing model carries `pipelineScopeKeys`.
8. `ava pipeline reset` deletes checkpoints even when the pipeline has no
   listings.

### Known limits

- A run that names a scope declared only by a drive whose `listScopes`
  failed is rejected with `EtlRunOptionsError` ("has no scope"), so the
  server answers 400, not 500.
- A failed checkpoint read fails the crawl in a full run too, which is
  broader than before, when a full run never read the derived mark.
