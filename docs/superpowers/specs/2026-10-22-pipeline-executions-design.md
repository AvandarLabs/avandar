# Pipeline executions: an audit trail of every pipeline command - design

- **Status:** Draft for review
- **Date:** 2026-10-22
- **Author:** pablo@avandarlabs.com
- **Branch:** `feat/demo/measles`
- **Builds on:** [`2026-10-21-etl-crawl-scopes-design.md`](2026-10-21-etl-crawl-scopes-design.md)
- **Packages touched:** `@avandar/etl` (`packages/node/etl`), `apps/pipeline-server`,
  `apps/ava-cli`, `scripts/runPipelineOnce.ts`, `supabase/schemas`

## 1. Summary

Nothing records what the pipeline commands did. A run prints a report and
forgets it; a reset or a prune leaves no trace at all. So there is no way to
answer "when did the NYC drive last run", "why did last night's HDX run take
three hours", or "who reset Socrata, and with which flags".

This design adds two tables that record **every pipeline command that reads a
source or changes the catalog**, from the CLI or the pipeline server:

| Table | One row per | Holds |
| --- | --- | --- |
| `pipeline_executions` | pipeline per command invocation | what ran, how it was invoked (exact argv or HTTP body), outcome, wall-clock and stage timings, totals, and the pipeline's catalog after it finished |
| `pipeline_execution_scopes` | drive × scope an execution worked on | window, checkpoints, outcome, wall-clock and stage timings, and the counts and sizes that explain them |

Running Socrata and HDX at the same time makes two execution rows. Each
Socrata drive is not its own execution: it is one or more scope rows under
the Socrata execution, which is also how the engine already crawls and
reports (`EtlRunReport.crawls`).

The tables are for audit and debugging only. Nothing in the app reads them.

## 2. Goals and non-goals

### Goals

- Record every `ava pipeline run`, `reset`, and `prune-retired-scopes`,
  local or through the server, including dry runs and cancelled confirmations.
- Keep the exact invocation (CLI argv, HTTP body) and the parsed arguments,
  with boolean flags for the modifiers worth filtering on.
- Time the whole execution and each drive × scope, broken into stages, with
  load split into its parts.
- Record denominators next to every duration: pages, datasets, listings,
  columns, and bytes, so a slow crawl can be explained by its size.
- Answer "when was drive X last run" with one indexed query.
- Never let recording fail or slow a pipeline command.

### Non-goals

- No UI, and no app (`authenticated`) access.
- No per-page rows. Page counts and per-crawl sums are enough to explain a
  slow crawl; a third table of hundreds of rows per crawl is not.
- No record of read-only commands: `ava pipeline list` and
  `GET /:pipelineName/scopes`.
- No record of the app's column type verification (it is not a pipeline
  command); its result shows up in the catalog-after counts.
- No retention policy. Rows are small; they are kept.

## 3. Vocabulary

| Term | Meaning |
| --- | --- |
| Execution | One pipeline command invocation for one pipeline: a run, a reset, or a prune. |
| Execution scope | One drive × scope an execution worked on: a crawl for a run, a pruned pair for a prune. |
| Stage | One part of a crawl's work, timed on its own (section 5.4). |
| Denominator | A count or size recorded next to a duration so the duration can be compared. |
| Catalog after | The pipeline's listings, counted when the execution finished. |

## 4. Current state

- `EtlEngine.run` creates the run id (`pipelineRunId`, a UUID) and returns
  `EtlRunReport`: one entry per crawl with drive, scope, window, counts,
  status, and error. Nothing is timed.
- A run reaches the engine one of two ways, and both end in the pipeline
  module's `run()` (`pipelines/<name>/run.ts`), which builds the engine:
  - `ava pipeline run <name>` sends `POST /:pipelineName/run` to the pipeline
    server, whose route calls `run()` in-process.
  - `ava pipeline run <name> --local` spawns `scripts/runPipelineOnce.ts`
    with `vite-node`, which calls `run()` and prints the report as its last
    stdout line.
- `ava pipeline reset` and `prune-retired-scopes` never reach the server.
  The CLI calls PostgREST directly with the service role key:
  `rpc_data_catalog_listings__prune_pipeline_scope` for a prune or a scope
  reset, and table deletes for a whole-pipeline reset.
- The CLI's report schema (`PipelineRunReport.schemas.ts`) is a non-strict
  `z.object`, so a report with extra fields still parses in an older CLI.

## 5. Design

### 5.1 `pipeline_executions`

One row per pipeline per command invocation. Columns are grouped by purpose.
Counts are `integer`, except `columns_considered` and `columns_written`,
which sum over a whole catalog and are `bigint`. Byte sizes and milliseconds
are `bigint`, and every count and timing defaults to `0` so a sum never meets
a null.

**Identity and command**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | For a run, the engine's `pipelineRunId`, so `data_catalog_listings.pipeline_run_id` and `pipeline_scope_checkpoints.pipeline_run_id` point back to the run that wrote them. |
| `pipeline_name` | `text not null` | |
| `command` | enum `pipeline_executions__command`: `run`, `reset`, `prune_retired_scopes` | One enum, not one boolean per command: commands are mutually exclusive, and booleans would allow a row that is both a reset and a prune. |
| `run_mode` | enum `pipeline_executions__run_mode`: `full`, `incremental` | Set exactly when `command = 'run'` (check constraint). |
| `is_dry_run` | `boolean not null default false` | A prune or reset that only counted. |
| `is_scoped` | `boolean not null default false` | `--scope` was given. |
| `is_limited` | `boolean not null default false` | `--limit` was given. |
| `is_windowed` | `boolean not null default false` | `--since` or `--until` was given. |

**Invocation**

| Column | Type | Notes |
| --- | --- | --- |
| `invoked_via` | enum `pipeline_executions__invoked_via`: `cli_local`, `cli_server`, `http` | `cli_server` is the CLI calling the server; `http` is any other caller of the server. |
| `cli_argv` | `text[]` | The exact argv after the binary, e.g. `{pipeline,run,socrata,--incremental}`. An array, not a joined string, so quoting is never lost. Null for `http`. |
| `request_body` | `jsonb` | The exact JSON body the server received. Null unless the server ran it. |
| `arguments` | `jsonb not null default '{}'` | The parsed, validated options: `{ mode, since, until, limit, scopes }` for a run, `{ scope }` for a reset, `{ scope, dryRun }` for a prune. |
| `actor` | `text` | `<OS user>@<hostname>` of the CLI that started it. Null for `http`. |
| `host` | `text` | The hostname of the process that executed it: the CLI's machine, or the server's Fly machine. |
| `code_version` | `text` | The git commit the executing code was built from, when known (section 5.8). |

**Outcome**

| Column | Type | Notes |
| --- | --- | --- |
| `status` | enum `pipeline_executions__status`: `running`, `succeeded`, `partially_failed`, `failed`, `cancelled` | `partially_failed` is a run where some crawls failed and some did not: only a run can have it (a check constraint). `cancelled` is a reset or prune the user declined at the confirmation prompt: a run never has it (a check constraint). |
| `error` | `text` | The first error. Null unless `status` is `failed` or `partially_failed` (a check constraint). |
| `started_at` | `timestamptz not null default now()` | |
| `finished_at` | `timestamptz` | Null while `running`, and never before `started_at` (a check constraint). A row left `running` with no progress for 24 hours is a crashed or killed process, and the pipeline's next `start` marks it `failed` (section 5.6). |
| `duration_ms` | `bigint` generated from `finished_at - started_at` | Wall-clock. |
| `created_at`, `updated_at` | `timestamptz` | `updated_at` moves each time a scope row lands, so it doubles as a heartbeat for a long run. |

**Totals.** For a run, each is the sum over its scope rows, kept current by
the function that records a scope row (section 5.6). Reset writes them
directly, since it has no scope rows (section 5.7).

- Timings: `setup_ms` (listing drives and scopes, before any crawl) plus the
  sum of each scope stage in section 5.4.
- Volume: `drive_count`, `scope_count`, `page_count`, `datasets_fetched`,
  `listings_considered`, `listings_written`, `listings_unchanged`,
  `write_batches`.
- Width: `columns_considered`, `columns_written`.
- Size: `source_csv_bytes`, `parquet_bytes_written`, `parquet_rows_written`,
  `parquet_uploads_skipped`, `source_bytes_reported`.
- Deletion (reset and prune): `listings_deleted`, `listings_kept_in_use`,
  `listings_detached`, `checkpoints_deleted`, `workspace_datasets_deleted`.

**Catalog after.** Counted from `data_catalog_listings` for this
`pipeline_name` when the execution finishes, so a series of executions shows
how the catalog grew. Null while `running`.

| Column | Counts |
| --- | --- |
| `catalog_listings` | every listing |
| `catalog_prebuilt_listings` | `access_kind = 'pipeline_parquet'` |
| `catalog_api_listings` | `access_kind = 'api_resource'` (lazy-loaded) |
| `catalog_verified_listings` | `date_column_type_last_verified is not null` |
| `catalog_unverified_listings` | `date_column_type_last_verified is null` |
| `catalog_columns` | relation columns of those listings |

### 5.2 `pipeline_execution_scopes`

One row per drive × scope an execution worked on: each crawl of a run, each
pruned pair of a prune.

**Identity and outcome**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | |
| `execution_id` | `uuid not null` | With `pipeline_name`, a foreign key to `pipeline_executions (id, pipeline_name)` `on delete cascade`, which a unique constraint on that pair backs. |
| `pipeline_name` | `text not null` | Copied from the execution, so per-drive history needs no join. The composite foreign key keeps it equal to the execution's. |
| `drive_key` | `text not null` | |
| `scope_key` | `text not null` | |
| `status` | enum `pipeline_execution_scopes__status`: `succeeded`, `failed`, `skipped` | The engine's crawl statuses `ok`, `failed`, `skipped`. |
| `error` | `text` | |
| `window_since`, `window_until` | `timestamptz` | The crawl's window. |
| `checkpoint_before`, `checkpoint_after` | `timestamptz` | The scope's checkpoint when the crawl started and when it ended. |
| `started_at`, `finished_at` | `timestamptz not null` | `finished_at` is never before `started_at` (a check constraint). |
| `duration_ms` | `bigint` generated | Wall-clock. |

**Stage timings.** One `bigint` millisecond column per stage in section 5.4.

**Denominators**

| Column | Meaning |
| --- | --- |
| `page_count` | Pages the source returned. |
| `datasets_fetched` | Connections in the window: the engine's `connectionsFetched`. |
| `listings_considered` | Relations `transform` returned. |
| `listings_written`, `listings_unchanged` | As in the report. |
| `write_batches` | `upsertListingsWithColumns` calls. |
| `columns_considered` | Relation columns across every relation considered. |
| `columns_written` | Relation columns across the listings written. |
| `max_columns_per_listing` | The widest relation considered. |
| `avg_columns_per_listing` | `numeric`, generated as `columns_considered / nullif(listings_considered, 0)`, so it is always consistent with the two totals. |
| `source_csv_bytes` | Prebuilt only: bytes of the input CSVs converted. |
| `parquet_bytes_written` | Prebuilt only: bytes of the Parquet objects uploaded. |
| `parquet_rows_written` | Prebuilt only: rows in those objects. |
| `parquet_uploads_skipped` | Prebuilt only: objects not uploaded because their hash matched. |
| `source_bytes_reported` | Bytes the source reports for the relations considered, when it reports any (HDX does; Socrata does not). Null when no relation reported a size. |
| `listings_deleted`, `listings_kept_in_use`, `listings_detached`, `checkpoints_deleted` | Prune only: the prune function's counts for this pair. |
| `pipeline_metrics` | `jsonb not null default '{}'`: counters only one pipeline has (section 5.5). |

**Uniqueness.** An execution has at most one scope row per drive and scope
(a unique constraint on `(execution_id, drive_key, scope_key)`).

**Indexes.** `(pipeline_name, drive_key, started_at desc)` for "when was this
drive last run". The uniqueness constraint's leading `execution_id` serves the
foreign key.

**Writes.** Scope rows are insert-only: the service role has `select`,
`insert`, and `delete` (for cleanup scripts), and no `update`, since the
execution's totals are summed from them.

### 5.3 Example questions

```sql
-- When was each Socrata drive last crawled, and did it succeed?
select distinct on (drive_key) drive_key, started_at, status
from pipeline_execution_scopes
where pipeline_name = 'socrata'
order by drive_key, started_at desc;

-- Which HDX crawls were slowest per listing, and how wide were they?
select drive_key, scope_key, started_at, duration_ms, listings_considered,
  avg_columns_per_listing, extract_ms, transform_ms, load_write_ms,
  duration_ms::numeric / nullif(listings_considered, 0) as ms_per_listing
from pipeline_execution_scopes
where pipeline_name = 'hdx' and status = 'succeeded'
order by ms_per_listing desc nulls last
limit 20;

-- How much time does WDI spend building Parquet per megabyte?
select started_at, load_parquet_build_ms,
  load_parquet_build_ms / nullif(source_csv_bytes / 1e6, 0) as ms_per_mb
from pipeline_execution_scopes
where pipeline_name = 'world-bank__wdi'
order by started_at desc;

-- Who has reset a pipeline, how, and when?
select pipeline_name, started_at, actor, cli_argv, status, listings_deleted
from pipeline_executions
where command = 'reset'
order by started_at desc;
```

### 5.4 Stages

A crawl interleaves its stages page by page: fetch page 1, transform it, load
it, write the checkpoint, fetch page 2. So each stage's time is the sum of
its durations across the crawl's pages, measured with a monotonic clock, and
only `duration_ms` is wall-clock. The stages do not add up to `duration_ms`
exactly; the difference is the engine's own bookkeeping.

| Stage column | Covers | Where it is measured |
| --- | --- | --- |
| `setup_ms` | Reading the scope's checkpoint and resolving its window | `crawlScope` before the first page |
| `extract_ms` | Waiting on `extract` for each page, including the source's network time | Around each `next()` of the extract iterator |
| `transform_ms` | `transform` for every connection on the page, including a pipeline's own reads such as HDX Parquet footers | `_transformConnections` |
| `load_read_ms` | Reading stored rows for the change check | `_readStoredRowsByKey` |
| `load_parquet_build_ms` | Converting each prebuilt relation's CSV to Parquet and summarizing it | `prepareParquetRelation`, conversion and summary |
| `load_parquet_upload_ms` | Uploading each Parquet object | `prepareParquetRelation`, `objects.upload` |
| `load_write_ms` | The `upsertListingsWithColumns` transactions | `_writeChangedRelations` |
| `checkpoint_write_ms` | Writing the checkpoint after each page | `advanceCrawlCheckpoint` |

The execution row adds its own `setup_ms`: listing drives and resolving their
scopes, before any crawl starts. Each other execution timing is the sum of
the scope rows' timings.

### 5.5 Engine changes

The engine is the only place that sees each stage start and end, so it
measures. It still knows nothing about Supabase: it reports what it measured
and writes through an optional store, the same pattern as listings, objects,
and checkpoints.

- **Measurement.** `crawlScope` and `loadRelationsPage` accumulate stage
  times and denominators into a per-crawl `EtlCrawlMetrics` object. The clock
  is injectable (`EtlEngineConfig.clock`, defaulting to `performance.now` and
  `Date`) so tests can drive it.
- **Report.** Each `EtlCrawlReport` gains `startedAt`, `finishedAt`,
  `checkpointBefore`, `checkpointAfter`, and `metrics` (stage timings,
  denominators, pipeline metrics). `EtlRunReport` gains `startedAt`,
  `finishedAt`, and `setupMs`. Old CLIs ignore the new fields.
- **Sizes from sources.** `RelationDescription` gains an optional
  `sourceSizeBytes`. The engine sums it into `source_bytes_reported`. The HDX
  pipeline sets it from the CKAN resource's `size`.
- **Pipeline metrics.** `extract` and `transform` receive a `metrics` handle
  with `increment(name, by?)` and `time(name, work)`, collected per crawl
  into `pipeline_metrics`. HDX records `hdx.parquet_footer_reads` and
  `hdx.parquet_footer_read_ms`; Socrata records nothing yet.
- **Recording.** `EtlStores` gains an optional `executions:
  ExecutionStore`, with `start`, `recordScope`, and `finish`. `run()` calls
  `start` right after its up-front option check (`_assertCanRun`), so an
  invocation rejected there never ran and is not recorded; `recordScope` as
  each crawl ends; and `finish` before it resolves or rejects. A requested
  scope no drive declares is only found after listing drives, so that run
  is recorded as `failed`. A Supabase implementation
  calls the functions in section 5.6; an in-memory one serves tests.
- **Invocation.** `EtlRunOptions` gains an optional `invocation`: `invokedVia`,
  `cliArgv`, `requestBody`, `actor`, `host`, and `codeVersion`. The engine
  passes it to `start` untouched.
- **Never fatal.** A failed `start`, `recordScope`, or `finish` is logged
  with `console.warn` and otherwise ignored: the run goes on and reports as
  it would have. Recording must not be the reason a crawl fails or a
  checkpoint does not move. A run whose `start` failed skips the other two.

### 5.6 Database functions

Three `service_role`-only functions, so a writer never assembles the rows
itself and the totals are always the sum of the scope rows.

| Function | Does |
| --- | --- |
| `rpc_pipeline_executions__start(p_execution jsonb)` | First marks the same pipeline's abandoned executions `failed`: any still `running` whose `updated_at` is more than 24 hours old, with the error `Abandoned: no progress for 24 hours` and `finished_at` set to that `updated_at`, its last progress (or `started_at`, if a caller set it later). Then inserts the execution row as `running`, with its identity, command, flags, and invocation. Returns its id. |
| `rpc_pipeline_executions__record_scope(p_execution_id uuid, p_scope jsonb)` | Inserts one scope row and recomputes the execution's totals from all its scope rows, in one transaction. Refuses an execution that already finished, and a repeated drive and scope. |
| `rpc_pipeline_executions__finish(p_execution_id uuid, p_outcome jsonb)` | Sets status, error, `finished_at`, the execution-level `setup_ms`, and any directly written totals (reset), and counts the catalog after from `data_catalog_listings`. Refuses an execution that already finished. Refuses the four per-scope deletion counts (`listings_deleted`, `listings_kept_in_use`, `listings_detached`, `checkpoints_deleted`) when the execution has scope rows, since those totals come from the scope rows; `workspace_datasets_deleted` stays allowed. |

All three reject any JSON key they do not accept, and an argument that is not
a JSON object, so a misspelled key fails instead of recording zero. Each
checks its keys against a fixed list, so a column added to a table later is
refused until the function writes it, rather than accepted and dropped.

`updated_at` moves each time `record_scope` lands a scope row, so it is the
execution's heartbeat; that is what the 24-hour abandonment rule reads.

Errors use distinct SQLSTATEs so a caller can tell them apart:

| SQLSTATE | Meaning |
| --- | --- |
| `P0001` | Argument validation: not an object, an unknown key, a missing or `running` final status, or deletion totals for an execution with scope rows. Also a repeated drive and scope. |
| `PE001` | The execution already finished. |
| `PE002` | The execution does not exist. |

Class `PE` is neither a SQL standard class nor one Postgres defines, and
PostgREST reads a custom status only from class `PT`, so it returns these as
the error's `code` unchanged. `P0002` was not used because Postgres already
means it as `no_data_found` from `select into strict`.

`data_catalog_listings__pipeline_drive_last_update` already indexes
`pipeline_name`, so the catalog-after counts read only the pipeline's own
listings.

### 5.7 Reset and prune

The CLI records these itself, through the same three functions, since they
never reach the server.

| Command | Execution row | Scope rows |
| --- | --- | --- |
| `prune-retired-scopes` | `command = 'prune_retired_scopes'`, `is_dry_run`, `is_scoped` | One per pruned drive × scope pair, with that pair's prune counts |
| `reset` (whole pipeline) | `command = 'reset'`; totals `listings_deleted`, `checkpoints_deleted`, `workspace_datasets_deleted`, `listings_kept_in_use` written by `finish` | None: the delete is by `pipeline_name`, not per scope |
| `reset --scope` | `command = 'reset'`, `is_scoped`; the prune function's counts written by `finish` | None: one prune call covers every drive |

A dry run is `succeeded` with `is_dry_run`. A declined confirmation is
`cancelled`, with the dry run's counts it showed. A command that throws is
`failed` with the error.

### 5.8 Invocation details per path

| Path | `invoked_via` | `cli_argv` | `request_body` | `actor` | `host` | `code_version` |
| --- | --- | --- | --- | --- | --- | --- |
| `ava pipeline run --local` | `cli_local` | the CLI's argv, passed to `runPipelineOnce.ts` in the `AVA_PIPELINE_INVOCATION` environment variable | null | from the CLI | the CLI's machine | `git rev-parse HEAD` in the repo |
| `ava pipeline run` (server) | `cli_server` | from the `X-Ava-Invocation` header the CLI sends | the body the server received | from the header | the server's machine | `AVA_CODE_VERSION` on the server |
| Anything else calling the server | `http` | null | the body | null | the server's machine | `AVA_CODE_VERSION` |
| `ava pipeline reset`, `prune-retired-scopes` | `cli_local` | the CLI's argv | null | from the CLI | the CLI's machine | `git rev-parse HEAD` |

The pipeline server's Dockerfile gains an `AVA_CODE_VERSION` build argument,
exposed as an environment variable; a deploy passes
`--build-arg AVA_CODE_VERSION=$(git rev-parse HEAD)`. When it is unset,
`code_version` is null. The `X-Ava-Invocation` header holds JSON with the
argv and actor, with every non-ASCII character escaped; the server records its
own `AVA_CODE_VERSION`, the commit that executed the run. Authorization headers and secrets are never
recorded.

### 5.9 CLI output

`ava pipeline run` prints each crawl's duration on its window line, and the
run's total duration at the end. Nothing else changes in the CLI's output.

### 5.10 Schema

- Enums, each in its own `00.enum.*.sql` file.
- `10.pipeline_executions.sql`, next to `10.pipeline_scope_checkpoints.sql`,
  and `11.pipeline_execution_scopes.sql`, which references it. RLS enabled,
  no policies, and grants to `service_role` only.
- The three functions in `50.rpc_pipeline_executions__*.sql`, `service_role`
  only.
- No desktop mirror: `apps/desktop/sync/syncable-tables.ts` excludes both
  tables, as it excludes `pipeline_scope_checkpoints`.
- One generated migration (`pnpm db:new-migration`).

## 6. Data flow

```text
ava pipeline run socrata --incremental
  -> CLI builds invocation { argv, actor, codeVersion }
  -> POST /socrata/run  (X-Ava-Invocation header)   or   runPipelineOnce (env)
  -> pipelines/socrata/run.ts  run({ ...options, invocation })
  -> EtlEngine.run
       executions.start            -> pipeline_executions row, running
       list drives and scopes      (setup_ms)
       for each drive x scope:
         crawlScope                (stages and denominators per page)
         executions.recordScope    -> pipeline_execution_scopes row, totals refreshed
       executions.finish           -> status, finished_at, catalog after
  -> report (with timings) back to the CLI, which prints durations
```

## 7. Error handling

| Failure | Result |
| --- | --- |
| Recording fails (missing migration, network, permissions) | Logged with `console.warn`; the command runs and reports normally. |
| Every crawl fails | `failed`, with the first error; scope rows record each failure. |
| Some crawls fail | `partially_failed`. |
| The process is killed mid-run | The row stays `running` with the scopes recorded so far until the pipeline's next `start`, which marks it `failed` with `Abandoned: no progress for 24 hours` once its `updated_at` is more than 24 hours old, finished at that `updated_at`. |
| Invalid options caught up front (mode, limit, missing stores) | Rejected before `start`; not recorded. |
| A requested scope no drive declares | Found after listing drives; recorded as `failed`. |

## 8. Testing

- **Engine:** with an injected clock and an in-memory execution store,
  a run records start, one scope per crawl with stage timings and
  denominators, and finish with the right status. Recording failures do not
  fail a run. `sourceSizeBytes` and pipeline metrics are summed per crawl.
- **Stores:** the Supabase execution store against the switched local stack.
- **Database (pgTAP):** totals equal the sum of scope rows after each
  `record_scope`; catalog-after counts; generated `duration_ms` and
  `avg_columns_per_listing`; the `run_mode` check; `service_role`-only
  access.
- **Pipeline server:** the route passes the request body and the
  `X-Ava-Invocation` header through as the invocation.
- **CLI:** run forwards the invocation by header and by environment; reset and
  prune record executions for confirmed, dry-run, cancelled, and failed
  paths; durations print.
- **Manual:** small `--limit` runs of Socrata, HDX, and WDI, a scope reset,
  and a dry-run prune on the switched local stack; then the example queries
  in section 5.3 return sensible rows.

## 9. Decisions

| Decision | Chosen | Over |
| --- | --- | --- |
| Drive tracking | Child rows per drive × scope | A drive array (no per-drive outcome or timing); child rows per drive (scopes merged) |
| Summary counts | What the execution did, and the catalog after | Either alone |
| Commands recorded | Data-touching commands, including dry runs and cancellations | Also read-only listing |
| Timing detail | Stages per crawl, load split into four parts | Four stages only; totals only |
| Command shape | One `command` enum, booleans only for combinable modifiers | One boolean per command |
| Who measures | The engine, through an optional store | A wrapper around the pipeline module (cannot see stages) |
| Totals | Recomputed from scope rows by the database | Summed by the writer |
| Recording failures | Logged, never fatal | Failing the command |

## 10. Follow-ups

- A command such as `ava pipeline executions <name>` to print recent
  executions, if querying SQL directly becomes tedious.
- Per-page timings, if a crawl's sums ever stop being enough to explain it.

## 11. Refinements made while planning

| # | Refinement |
| --- | --- |
| 1 | A run is recorded only when it carries an invocation. The pipeline server and `scripts/runPipelineOnce.ts` always pass one; a test or script calling a pipeline's `run()` directly is not recorded. |
| 2 | An execution's `setup_ms` is its own setup (listing drives and scopes) plus its scope rows' `setup_ms` (reading checkpoints). |
| 3 | Execution totals include `max_columns_per_listing`, the widest listing across its scope rows. |
| 4 | A prune records a scope row only for a retired pair with something to prune: `succeeded` with the counts it would apply in a dry run, `skipped` with the dry run's counts when declined, and `succeeded` with the applied counts when pruned. |
| 5 | A declined whole-pipeline reset records zero deletions, since the counts it showed were totals. A declined `reset --scope` records the dry run's counts. |
| 6 | Reset and prune executions get a random id. Only a run's id is also its `pipeline_run_id`. |
| 7 | `code_version` is always the commit of the code that executed the command. |
| 8 | Stage timings are `setupMs`, `extractMs`, `transformMs`, `loadReadMs`, `loadParquetBuildMs`, `loadParquetUploadMs`, `loadWriteMs`, and `checkpointWriteMs` in TypeScript, and their snake_case forms in SQL. |
| 9 | A crawl's printed duration sits on its window line, which has room within 80 columns. |
| 10 | The CLI escapes non-ASCII characters in `X-Ava-Invocation`, since `fetch` rejects a header value outside Latin-1. |
| 11 | Each execution has at most one scope row per drive and scope (a unique constraint); a repeated `record_scope` fails with a clear error and the never-fatal store only warns. |
| 12 | Both tables check that `finished_at` is not before `started_at`. |
| 13 | The three functions reject any JSON key they do not accept, and a non-object argument, so a typo fails instead of recording zero. |
| 14 | `record_scope` and `finish` refuse an execution that already finished, and `finish` refuses the four per-scope deletion counts when the execution has scope rows (`workspace_datasets_deleted` stays allowed), so totals always equal the sum of the scope rows. |
| 15 | `start` marks the same pipeline's executions that are still `running` with no progress (`updated_at`) for 24 hours as `failed`, with `Abandoned: no progress for 24 hours`, finished at their `updated_at`. |
| 16 | Check constraints: only a run is `partially_failed`, a run is never `cancelled`, and `error` is null unless the status is `failed` or `partially_failed`. |
| 17 | The execution's `columns_considered` and `columns_written` are `bigint`. The scope rows' stay `integer`: one crawl's counts fit, and `avg_columns_per_listing` is generated from them, which blocks a type change. |
| 18 | "Already finished" raises `PE001` and "does not exist" `PE002`; argument validation keeps `P0001` (section 5.6). |
| 19 | A scope row's `(execution_id, pipeline_name)` is a foreign key to the execution's, so the copied pipeline name cannot disagree. |
| 20 | Scope rows are insert-only: the service role has no `update` on them. |
