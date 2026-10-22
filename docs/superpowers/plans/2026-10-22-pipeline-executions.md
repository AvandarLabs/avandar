# Pipeline Executions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every pipeline command that reads a source or changes the catalog (run, reset, prune), with its exact invocation, outcome, stage timings, and the counts and sizes that explain those timings, in two service-role tables.

**Architecture:** Two tables, `pipeline_executions` (one row per pipeline per command) and `pipeline_execution_scopes` (one row per drive × scope it worked on), written only through three service-role functions that keep the execution's totals equal to the sum of its scope rows. `@avandar/etl` measures each crawl's stages and denominators with an injectable clock, returns them in its run report, and records through an optional `ExecutionStore` that never fails a run. The pipeline server and `scripts/runPipelineOnce.ts` hand the engine an invocation (argv, HTTP body, actor, host, git commit); the `ava` CLI records resets and prunes itself through the same functions.

**Tech Stack:** TypeScript, Node 22, Vitest, `@supabase/supabase-js`, Fastify, Acclimate (`ava` CLI), Postgres + pgTAP, Bun (desktop SQLite migration generator).

**Spec:** [`docs/superpowers/specs/2026-10-22-pipeline-executions-design.md`](../specs/2026-10-22-pipeline-executions-design.md).

---

## Ground rules for every task

Read these once. Every task assumes them.

1. **Worktree and database.** Work in `/Users/pablo/src/worktrees/avandar/feat/demo/measles`.
   Before any `pnpm db:*`, `pnpm test:db`, `supabase *`, or the `test:supabase`
   suite, run `ava supabase status` and confirm the first line reads
   `SWITCHED` (green). If `ava` says it is out of date, run
   `pnpm build:ava-cli` first. If the status is not green, stop and report
   BLOCKED. Never run those commands against the shared `avandar` stack.
2. **Never stage `supabase/config.toml`**, `.vscode/extensions.json`,
   `.env.development`, or `.env.development.edge`. Commit by path, never with
   `git add -A` or `git add .`.
3. **Red/green.** Every behavior step writes the failing test first, runs it to
   see the failure, then writes the code. Do not skip the red run.
4. **Code style** (from `CLAUDE.md` and `docs/rules/typescript.md`):
   - No em dashes anywhere, including comments. Use periods, colons, or ` - `.
   - Arrow functions use a block body with `return`, matching the codebase.
   - Always use braces on `if`. Use template literals for new strings.
   - JSDoc on every exported member. Comments describe the code as it is
     today, never this plan ("Task 7", "the plan").
   - Functions stay at or under 45 lines. Avoid `for`/`while`, except a
     `for await` over an async iterable or a loop that must call
     `iterator.next()` by hand, each with a `// Sequential on purpose: ...`
     comment saying why.
   - Code under `shared/` is also type-checked by Deno: import local files with
     their `.ts` extension, exactly like the files around it.
5. **Formatting.** Format only the files you changed:
   `pnpm exec oxfmt --ignore-path .oxfmtignore <ts files>` for TypeScript and
   `pnpm exec prettier --write <sql files>` for SQL. Never point a formatter
   at a directory: it reformats files you did not touch. Then run
   `pnpm exec eslint <ts files>`.
6. **Never write to a production or staging database.** Only the switched local
   stack (`127.0.0.1:55341` API, `127.0.0.1:55342` Postgres) is allowed.
7. **Commit messages** follow Conventional Commits and end with your own
   model's trailer, for example:

   ```text
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```

### Commands

| What | Command (from the repo root) |
| --- | --- |
| `@avandar/etl` unit tests | `pnpm --filter @avandar/etl exec vitest run <path relative to packages/node/etl>` |
| `@avandar/etl` Supabase suite | `pnpm --filter @avandar/etl test:supabase` |
| `@avandar/etl` types | `pnpm --filter @avandar/etl exec tsc --noEmit -p .` |
| pipeline-server tests | `pnpm --filter @avandar/pipeline-server exec vitest run <path relative to apps/pipeline-server>` |
| pipeline-server types | `pnpm --filter @avandar/pipeline-server exec tsc --noEmit -p .` |
| ava-cli tests | `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts <path relative to apps/ava-cli>` |
| ava-cli types | `pnpm exec tsc --noEmit -p tsconfig.node.json` |
| App, `shared/`, and `scripts/` types | `pnpm exec tsc --noEmit -p tsconfig.app.json` |
| Rebuild the `ava` binary after a CLI change | `pnpm build:ava-cli` |
| One pgTAP file | `supabase test db <path to .test.sql>` |
| All pgTAP and privilege checks | `pnpm test:db` |
| Lint one path | `pnpm exec eslint <path>` |

---

## Refinements to the spec

The plan makes these choices where the spec left room. Task 14 writes them
back into the spec as section 11.

1. **A run is recorded only when it carries an invocation.** Both real entry
   points always pass one: the pipeline server builds it from the request,
   and `scripts/runPipelineOnce.ts` reads it from `AVA_PIPELINE_INVOCATION`
   and falls back to its own argv. A test or script calling a pipeline's
   `run()` directly, with no invocation, is not recorded, so no row ever
   claims an origin it does not have.
2. **`setup_ms` on an execution** is the run's own setup (listing drives and
   scopes) plus the sum of its scope rows' `setup_ms` (reading checkpoints).
3. **Execution totals include `max_columns_per_listing`**, the widest listing
   across its scope rows.
4. **Prune scope rows.** Only retired pairs with something to prune get a
   row. A dry run records each as `succeeded` with the counts it would apply.
   A declined prune records each as `skipped` with the dry run's counts it
   showed. A real prune records each pair it pruned, with the counts it
   applied.
5. **A cancelled whole-pipeline reset** records zero deletions: the counts it
   showed were totals, not deletions. A cancelled `reset --scope` records the
   dry run's counts it showed, as the spec says.
6. **Reset and prune executions** get a random UUID as their id. Only a run's
   id doubles as its `pipeline_run_id`.
7. **`code_version` is always the executing code's commit.** The CLI's
   `X-Ava-Invocation` header carries only `cliArgv` and `actor`; the server
   uses its own `AVA_CODE_VERSION`. A local run and the CLI's reset and prune
   use `git rev-parse HEAD` in the repo they run from.
8. **Stage timing names** in TypeScript are `setupMs`, `extractMs`,
   `transformMs`, `loadReadMs`, `loadParquetBuildMs`, `loadParquetUploadMs`,
   `loadWriteMs`, and `checkpointWriteMs`; in SQL, their snake_case forms.
9. **Printed durations.** `ava pipeline run` prints a crawl's duration on its
   window line, not its counts line, which is already near 80 columns. The
   run's total and setup time print after the crawls.
10. **The CLI escapes its header.** `X-Ava-Invocation` is JSON with every
    non-ASCII character written as `\uXXXX`, since `fetch` rejects a header
    value outside Latin-1. `JSON.parse` reads it back unchanged.

---

## File map

| File | Task | Responsibility |
| --- | --- | --- |
| `supabase/schemas/00.enum.pipeline_executions__command.sql` | 1 | Enum: `run`, `reset`, `prune_retired_scopes` |
| `supabase/schemas/00.enum.pipeline_executions__run_mode.sql` | 1 | Enum: `full`, `incremental` |
| `supabase/schemas/00.enum.pipeline_executions__invoked_via.sql` | 1 | Enum: `cli_local`, `cli_server`, `http` |
| `supabase/schemas/00.enum.pipeline_executions__status.sql` | 1 | Enum: `running`, `succeeded`, `partially_failed`, `failed`, `cancelled` |
| `supabase/schemas/00.enum.pipeline_execution_scopes__status.sql` | 1 | Enum: `succeeded`, `failed`, `skipped` |
| `supabase/schemas/10.pipeline_executions.sql` | 1 | The executions table |
| `supabase/schemas/11.pipeline_execution_scopes.sql` | 1 | The scope rows table |
| `apps/desktop/sync/syncable-tables.ts` | 1 | Exclude both tables from the desktop mirror |
| `supabase/tests/database/permissions/exact_data_api_grants.test.sql` | 1 | Expect the new tables' service-role grants |
| `supabase/schemas/50.rpc_pipeline_executions__start.sql` | 2 | Insert a running execution |
| `supabase/schemas/50.rpc_pipeline_executions__record_scope.sql` | 2 | Insert a scope row and recompute totals |
| `supabase/schemas/50.rpc_pipeline_executions__finish.sql` | 2 | Close an execution and count the catalog after |
| `supabase/tests/database/pipeline_executions.test.sql` | 1, 2 | pgTAP for tables and functions |
| `packages/node/etl/src/stores/ExecutionStore.types.ts` | 3 | Execution types and the `ExecutionStore` contract |
| `packages/node/etl/src/stores/executionRecords/executionRecords.ts` | 3 | Zero values and the snake_case rows the functions take |
| `packages/node/etl/src/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore.ts` | 3 | Wraps a store so recording never throws |
| `packages/node/etl/src/stores/InMemoryExecutionStore/createInMemoryExecutionStore.ts` | 3 | Test store |
| `packages/node/etl/src/stores/SupabaseExecutionStore/createSupabaseExecutionStore.ts` | 4 | Calls the three functions |
| `packages/node/etl/src/EtlEngine/crawlMetrics/crawlMetrics.ts` | 5 | Clock, per-crawl stage timer and counters |
| `packages/node/etl/src/EtlEngine/crawlScope/crawlScope.ts` | 6 | Times stages, dates crawls, reports metrics |
| `packages/node/etl/src/EtlEngine/loadRelationsPage/loadRelationsPage.ts` | 6 | Times load parts, counts listings and columns |
| `packages/node/etl/src/EtlEngine/prepareParquetRelation/prepareParquetRelation.ts` | 6 | Times Parquet build and upload, counts bytes |
| `packages/node/etl/src/EtlEngine/recordRunExecution/createRunExecutionRecorder.ts` | 7 | Turns a run into execution records |
| `packages/node/etl/src/EtlEngine/createEtlEngine/createEtlEngine.ts` | 7 | Records each run |
| `apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination.ts` | 8 | Names the three functions |
| `apps/pipeline-server/src/routes/pipeline-name/buildServerRunInvocation/buildServerRunInvocation.ts` | 8 | Invocation from a server request |
| `apps/pipeline-server/pipelines/shared/readLocalRunInvocation/readLocalRunInvocation.ts` | 8 | Invocation for a local run |
| `apps/pipeline-server/Dockerfile` | 8 | `AVA_CODE_VERSION` build argument |
| `apps/pipeline-server/pipelines/hdx/*` | 9 | Source sizes and footer-read metrics |
| `apps/ava-cli/src/PipelineCli/buildCliInvocation/buildCliInvocation.ts` | 10 | argv, actor, host, commit |
| `apps/ava-cli/src/PipelineCli/PipelineRunReport/*` | 11 | Durations in the printed report |
| `apps/ava-cli/src/PipelineCli/sendRunPipelineRequest.ts`, `runPipelineLocal.ts`, `RunPipelineCli/RunPipelineCli.ts` | 10 | Send the invocation by header or environment |
| `apps/ava-cli/src/PipelineCli/ResetPipelineCli/pipelineListingsRest.ts` | 12 | `callPostgrestRpc` |
| `apps/ava-cli/src/PipelineCli/recordCliExecution/createPostgrestExecutionStore.ts` | 12 | An `ExecutionStore` over PostgREST |
| `apps/ava-cli/src/PipelineCli/recordCliExecution/runRecordedCliCommand.ts` | 12 | Runs a reset or prune and records it |
| `apps/ava-cli/src/PipelineCli/scopePruneCounts/scopePruneCounts.ts` | 12 | Prune counts as execution deletions |
| `apps/ava-cli/src/PipelineCli/ResetPipelineCli/ResetPipelineCli.ts` | 12 | Records resets |
| `apps/ava-cli/src/PipelineCli/PruneRetiredScopesCli/buildPruneExecutionScope.ts` | 13 | One pruned pair as a scope row |
| `apps/ava-cli/src/PipelineCli/PruneRetiredScopesCli/PruneRetiredScopesCli.ts` | 13 | Records prunes |
| Spec | 14 | Section 11, the planning refinements |


---

## Task 1: Execution tables

**Files:**
- Create: `supabase/schemas/00.enum.pipeline_executions__command.sql`
- Create: `supabase/schemas/00.enum.pipeline_executions__run_mode.sql`
- Create: `supabase/schemas/00.enum.pipeline_executions__invoked_via.sql`
- Create: `supabase/schemas/00.enum.pipeline_executions__status.sql`
- Create: `supabase/schemas/00.enum.pipeline_execution_scopes__status.sql`
- Create: `supabase/schemas/10.pipeline_executions.sql`
- Create: `supabase/schemas/11.pipeline_execution_scopes.sql`
- Create: `supabase/tests/database/pipeline_executions.test.sql`
- Modify: `apps/desktop/sync/syncable-tables.ts` (`EXCLUDED_TABLES`)
- Modify: `supabase/tests/database/permissions/exact_data_api_grants.test.sql`
- Generated: `supabase/migrations/<timestamp>_add_pipeline_executions.sql`,
  `apps/desktop/migrations/<timestamp>_add_pipeline_executions.gen.sql`,
  `shared/types/database.types.ts`

Load the `supabase-declarative-schema` skill before starting: it owns the
schema workflow. Task 2 adds the functions and its own migration.

- [ ] **Step 1: Write the enum files**

`supabase/schemas/00.enum.pipeline_executions__command.sql`:

```sql
/**
 * Which pipeline command an execution was.
 *
 * Enum values:
 *
 * `run` - `ava pipeline run`, locally or through the pipeline server.
 *
 * `reset` - `ava pipeline reset`, for the whole pipeline or one scope.
 *
 * `prune_retired_scopes` - `ava pipeline prune-retired-scopes`.
 */
create type public.pipeline_executions__command as enum('run', 'reset', 'prune_retired_scopes');
```

`supabase/schemas/00.enum.pipeline_executions__run_mode.sql`:

```sql
/**
 * How a pipeline run chose each crawl's lower bound.
 *
 * Enum values:
 *
 * `full` - From the start, or from `--since`.
 *
 * `incremental` - From each scope's checkpoint.
 */
create type public.pipeline_executions__run_mode as enum('full', 'incremental');
```

`supabase/schemas/00.enum.pipeline_executions__invoked_via.sql`:

```sql
/**
 * How a pipeline execution was started.
 *
 * Enum values:
 *
 * `cli_local` - The `ava` CLI ran it in its own process: `run --local`,
 *  `reset`, or `prune-retired-scopes`.
 *
 * `cli_server` - The `ava` CLI asked the pipeline server to run it.
 *
 * `http` - Any other caller of the pipeline server.
 */
create type public.pipeline_executions__invoked_via as enum('cli_local', 'cli_server', 'http');
```

`supabase/schemas/00.enum.pipeline_executions__status.sql`:

```sql
/**
 * Where a pipeline execution stands.
 *
 * Enum values:
 *
 * `running` - Started and not finished. A row left running long after it
 *  started belongs to a process that crashed or was killed.
 *
 * `succeeded` - Finished, and every crawl or step succeeded.
 *
 * `partially_failed` - A run where some crawls failed and some did not.
 *
 * `failed` - Every crawl failed, or the command threw.
 *
 * `cancelled` - The user declined a reset or prune at its confirmation.
 */
create type public.pipeline_executions__status as enum(
  'running',
  'succeeded',
  'partially_failed',
  'failed',
  'cancelled'
);
```

`supabase/schemas/00.enum.pipeline_execution_scopes__status.sql`:

```sql
/**
 * How one drive and scope of a pipeline execution ended.
 *
 * Enum values:
 *
 * `succeeded` - Crawled, or pruned, without error.
 *
 * `failed` - Failed partway; the row records what finished before.
 *
 * `skipped` - Not crawled, because the run's limit was already reached.
 */
create type public.pipeline_execution_scopes__status as enum('succeeded', 'failed', 'skipped');
```

- [ ] **Step 2: Write `supabase/schemas/10.pipeline_executions.sql`**

```sql
/**
 * One pipeline command for one pipeline: a run, a reset, or a prune. Written
 * only through `rpc_pipeline_executions__start`, `__record_scope`, and
 * `__finish`, with the service role, by `@avandar/etl` for runs and by the
 * `ava` CLI for resets and prunes. For audit and debugging: nothing in the
 * app reads it. A run's id is its `pipeline_run_id`, so listings and
 * checkpoints point back to the run that last wrote them.
 *
 * Totals are kept equal to the sum of the execution's
 * `pipeline_execution_scopes` rows by `__record_scope`. A reset, which has no
 * scope rows, writes its deletion totals through `__finish`.
 */
create table public.pipeline_executions (
  id uuid primary key default gen_random_uuid(),
  pipeline_name text not null,
  command public.pipeline_executions__command not null,
  -- Set exactly when `command` is `run`.
  run_mode public.pipeline_executions__run_mode,
  -- A reset or prune that only counted.
  is_dry_run boolean not null default false,
  -- `--scope` was given.
  is_scoped boolean not null default false,
  -- `--limit` was given.
  is_limited boolean not null default false,
  -- `--since` or `--until` was given.
  is_windowed boolean not null default false,
  invoked_via public.pipeline_executions__invoked_via not null,
  -- The CLI's argv after the binary, exactly as typed. Null for `http`.
  cli_argv text[],
  -- The JSON body the pipeline server received. Null unless it ran there.
  request_body jsonb,
  -- The parsed, validated options.
  arguments jsonb not null default '{}',
  -- `<OS user>@<hostname>` of the CLI that started it.
  actor text,
  -- Hostname of the process that executed it.
  host text,
  -- Git commit of the executing code, when known.
  code_version text,
  status public.pipeline_executions__status not null default 'running',
  -- The first error, for `failed` and `partially_failed`.
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms bigint generated always as (
    (extract(epoch from (finished_at - started_at)) * 1000)::bigint
  ) stored,
  -- Stage timings in milliseconds. `setup_ms` is the run's own setup plus
  -- its scope rows' `setup_ms`; every other stage sums the scope rows.
  setup_ms bigint not null default 0,
  extract_ms bigint not null default 0,
  transform_ms bigint not null default 0,
  load_read_ms bigint not null default 0,
  load_parquet_build_ms bigint not null default 0,
  load_parquet_upload_ms bigint not null default 0,
  load_write_ms bigint not null default 0,
  checkpoint_write_ms bigint not null default 0,
  -- Volume and width, summed over the scope rows.
  drive_count integer not null default 0,
  scope_count integer not null default 0,
  page_count integer not null default 0,
  datasets_fetched integer not null default 0,
  listings_considered integer not null default 0,
  listings_written integer not null default 0,
  listings_unchanged integer not null default 0,
  write_batches integer not null default 0,
  columns_considered integer not null default 0,
  columns_written integer not null default 0,
  max_columns_per_listing integer not null default 0,
  -- Sizes in bytes, summed over the scope rows.
  source_csv_bytes bigint not null default 0,
  parquet_bytes_written bigint not null default 0,
  parquet_rows_written bigint not null default 0,
  parquet_uploads_skipped integer not null default 0,
  -- Null when no scope row reported a source size.
  source_bytes_reported bigint,
  -- Deletions by a reset or prune.
  listings_deleted integer not null default 0,
  listings_kept_in_use integer not null default 0,
  listings_detached integer not null default 0,
  checkpoints_deleted integer not null default 0,
  workspace_datasets_deleted integer not null default 0,
  -- The pipeline's listings when the execution finished. Null while running.
  catalog_listings integer,
  catalog_prebuilt_listings integer,
  catalog_api_listings integer,
  catalog_verified_listings integer,
  catalog_unverified_listings integer,
  catalog_columns integer,
  created_at timestamptz not null default now(),
  -- Moves each time a scope row lands, so it doubles as a heartbeat.
  updated_at timestamptz not null default now(),
  constraint pipeline_executions__run_mode_only_on_runs check (
    (command = 'run') = (run_mode is not null)
  ),
  constraint pipeline_executions__finished_unless_running check (
    (status = 'running') = (finished_at is null)
  )
);

-- Recent executions of one pipeline.
create index pipeline_executions__pipeline_started on public.pipeline_executions (pipeline_name, started_at desc);

-- RLS on with no policies: only the service role, which bypasses RLS, ever
-- reaches this table.
alter table public.pipeline_executions enable row level security;

-- Data API privileges. Service role only.
grant
select
,
  insert,
update,
delete on table public.pipeline_executions to service_role;

create trigger tr__pipeline_executions__set_updated_at before
update on public.pipeline_executions for each row
execute function public.util__set_updated_at ();
```

- [ ] **Step 3: Write `supabase/schemas/11.pipeline_execution_scopes.sql`**

```sql
/**
 * One drive and scope a pipeline execution worked on: one crawl of a run,
 * or one pruned pair of a prune. Written only through
 * `rpc_pipeline_executions__record_scope`, with the service role. Holds the
 * crawl's outcome, stage timings, and the counts and sizes that explain
 * them. For audit and debugging: nothing in the app reads it.
 */
create table public.pipeline_execution_scopes (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.pipeline_executions (id) on delete cascade,
  -- Copied from the execution, so a drive's history needs no join.
  pipeline_name text not null,
  drive_key text not null,
  scope_key text not null,
  status public.pipeline_execution_scopes__status not null,
  error text,
  window_since timestamptz,
  window_until timestamptz,
  -- The scope's checkpoint when the crawl started and when it ended.
  checkpoint_before timestamptz,
  checkpoint_after timestamptz,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_ms bigint generated always as (
    (extract(epoch from (finished_at - started_at)) * 1000)::bigint
  ) stored,
  -- Stage timings in milliseconds, each summed over the crawl's pages.
  setup_ms bigint not null default 0,
  extract_ms bigint not null default 0,
  transform_ms bigint not null default 0,
  load_read_ms bigint not null default 0,
  load_parquet_build_ms bigint not null default 0,
  load_parquet_upload_ms bigint not null default 0,
  load_write_ms bigint not null default 0,
  checkpoint_write_ms bigint not null default 0,
  -- Volume.
  page_count integer not null default 0,
  datasets_fetched integer not null default 0,
  listings_considered integer not null default 0,
  listings_written integer not null default 0,
  listings_unchanged integer not null default 0,
  write_batches integer not null default 0,
  -- Width.
  columns_considered integer not null default 0,
  columns_written integer not null default 0,
  max_columns_per_listing integer not null default 0,
  avg_columns_per_listing numeric generated always as (
    columns_considered::numeric / nullif(listings_considered, 0)
  ) stored,
  -- Sizes in bytes. Prebuilt datasets only, except `source_bytes_reported`.
  source_csv_bytes bigint not null default 0,
  parquet_bytes_written bigint not null default 0,
  parquet_rows_written bigint not null default 0,
  parquet_uploads_skipped integer not null default 0,
  -- What the source reports for the relations considered. Null when it
  -- reported none.
  source_bytes_reported bigint,
  -- A prune's counts for this pair.
  listings_deleted integer not null default 0,
  listings_kept_in_use integer not null default 0,
  listings_detached integer not null default 0,
  checkpoints_deleted integer not null default 0,
  -- Counters and timers only one pipeline has, such as
  -- `hdx.parquet_footer_reads`.
  pipeline_metrics jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- When was this drive last crawled.
create index pipeline_execution_scopes__drive_started on public.pipeline_execution_scopes (pipeline_name, drive_key, started_at desc);

-- The foreign key, and an execution's scope rows.
create index pipeline_execution_scopes__execution on public.pipeline_execution_scopes (execution_id);

-- RLS on with no policies: only the service role, which bypasses RLS, ever
-- reaches this table.
alter table public.pipeline_execution_scopes enable row level security;

-- Data API privileges. Service role only.
grant
select
,
  insert,
update,
delete on table public.pipeline_execution_scopes to service_role;
```

- [ ] **Step 4: Exclude both tables from the desktop mirror**

In `apps/desktop/sync/syncable-tables.ts`, append to `EXCLUDED_TABLES`, after
`"pipeline_scope_checkpoints"`:

```ts
  // Pipeline execution history, written with the service role for audit and
  // debugging. Nothing the desktop renders.
  "pipeline_executions",
  "pipeline_execution_scopes",
```

- [ ] **Step 5: Write the failing table tests**

`supabase/tests/database/pipeline_executions.test.sql`. Task 2 extends this
file with the functions' tests; `plan()` grows then.

```sql
\set ON_ERROR_STOP on

-- Fixtures: none. Each test inserts what it reads, and the transaction is
-- rolled back. Pipeline names are `pgtap-fixture`-prefixed.

begin;

set search_path to extensions, public;

select plan(7);

-- ---------------------------------------------------------------------------
-- pipeline_executions
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, invoked_via)
    values ('pgtap-fixture', 'run', 'cli_local')$$,
  '23514',
  null,
  'a run needs a run mode'
);

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, run_mode, invoked_via)
    values ('pgtap-fixture', 'reset', 'full', 'cli_local')$$,
  '23514',
  null,
  'only a run has a run mode'
);

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, invoked_via, status)
    values ('pgtap-fixture', 'reset', 'cli_local', 'succeeded')$$,
  '23514',
  null,
  'a finished execution has a finish time'
);

insert into public.pipeline_executions
  (id, pipeline_name, command, invoked_via, status, started_at, finished_at)
values
  ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture', 'reset',
   'cli_local', 'succeeded', '2026-10-22T10:00:00Z', '2026-10-22T10:00:01.5Z');

select is(
  (
    select duration_ms
    from public.pipeline_executions
    where id = 'ea100001-0000-4000-8000-000000000001'::uuid
  ),
  1500::bigint,
  'duration_ms is the wall-clock milliseconds between start and finish'
);

-- ---------------------------------------------------------------------------
-- pipeline_execution_scopes
-- ---------------------------------------------------------------------------

insert into public.pipeline_execution_scopes
  (execution_id, pipeline_name, drive_key, scope_key, status, started_at,
   finished_at, listings_considered, columns_considered)
values
  ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture',
   'https://pgtap-fixture.invalid', 'all', 'succeeded',
   '2026-10-22T10:00:00Z', '2026-10-22T10:00:01Z', 4, 10),
  ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture',
   'https://pgtap-fixture.invalid', 'empty', 'skipped',
   '2026-10-22T10:00:01Z', '2026-10-22T10:00:01Z', 0, 0);

select results_eq(
  $$select scope_key, avg_columns_per_listing
    from public.pipeline_execution_scopes
    where execution_id = 'ea100001-0000-4000-8000-000000000001'::uuid
    order by scope_key$$,
  $$values ('all', 2.5::numeric), ('empty', null::numeric)$$,
  'avg_columns_per_listing divides columns by listings, and is null with no listings'
);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

select ok(
  not has_table_privilege('authenticated', 'public.pipeline_executions', 'select'),
  'a signed-in user cannot read pipeline executions'
);

select ok(
  not has_table_privilege('authenticated', 'public.pipeline_execution_scopes', 'select'),
  'a signed-in user cannot read pipeline execution scopes'
);

select * from finish();

rollback;
```

- [ ] **Step 6: Generate the migration and see the tests pass**

Check the switch first (ground rule 1). Then:

```bash
pnpm db:reset
pnpm db:new-migration add_pipeline_executions
pnpm db:gen-types
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
supabase test db supabase/tests/database/pipeline_executions.test.sql
```

Expected: the new migration creates the five types, two tables, three
indexes, and one trigger, and drops nothing; read it to confirm. The desktop
generator writes a `.gen.sql` that emits no schema-shape statements (both
tables are excluded) and `check-migrations` reports no drift. The pgTAP file
passes 7 of 7. If `db:reset` leaves no seeded users (it has happened on this
stack), that does not affect this task.

- [ ] **Step 7: Expect the new grants in the exact-grants matrix**

Run `pnpm test:db`. Expected: `exact_data_api_grants.test.sql` fails, listing
the service role's `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on
`pipeline_executions` and `pipeline_execution_scopes` as unexpected. Open that
file, find how `pipeline_scope_checkpoints` appears in its expected matrix, and
add the two new tables the same way (service role only, the same four
privileges, no grant option). Run `pnpm test:db` again. Expected: PASS.

- [ ] **Step 8: Format, then commit**

```bash
pnpm exec prettier --write supabase/schemas/00.enum.pipeline_executions__*.sql supabase/schemas/00.enum.pipeline_execution_scopes__status.sql supabase/schemas/10.pipeline_executions.sql supabase/schemas/11.pipeline_execution_scopes.sql supabase/tests/database/pipeline_executions.test.sql supabase/tests/database/permissions/exact_data_api_grants.test.sql
pnpm exec oxfmt --ignore-path .oxfmtignore apps/desktop/sync/syncable-tables.ts
git add supabase/schemas/00.enum.pipeline_executions__command.sql supabase/schemas/00.enum.pipeline_executions__run_mode.sql supabase/schemas/00.enum.pipeline_executions__invoked_via.sql supabase/schemas/00.enum.pipeline_executions__status.sql supabase/schemas/00.enum.pipeline_execution_scopes__status.sql supabase/schemas/10.pipeline_executions.sql supabase/schemas/11.pipeline_execution_scopes.sql supabase/tests/database/pipeline_executions.test.sql supabase/tests/database/permissions/exact_data_api_grants.test.sql apps/desktop/sync/syncable-tables.ts supabase/migrations/*_add_pipeline_executions.sql apps/desktop/migrations/*_add_pipeline_executions.gen.sql shared/types/database.types.ts
git commit -m "feat(db): add pipeline execution tables

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

If prettier changed a schema file after the migration was generated, confirm
`supabase db diff` reports nothing but the known analytics view churn before
committing.

---

## Task 2: Execution functions

**Files:**
- Create: `supabase/schemas/50.rpc_pipeline_executions__start.sql`
- Create: `supabase/schemas/50.rpc_pipeline_executions__record_scope.sql`
- Create: `supabase/schemas/50.rpc_pipeline_executions__finish.sql`
- Modify: `supabase/tests/database/pipeline_executions.test.sql`
- Generated: `supabase/migrations/<timestamp>_add_pipeline_execution_functions.sql`,
  its desktop `.gen.sql`, `shared/types/database.types.ts`

- [ ] **Step 1: Write the failing function tests**

In `supabase/tests/database/pipeline_executions.test.sql`, change
`select plan(7);` to `select plan(17);`, and insert this block just before the
`-- Privileges` banner:

```sql
-- ---------------------------------------------------------------------------
-- rpc_pipeline_executions__start
-- ---------------------------------------------------------------------------

select is(
  public.rpc_pipeline_executions__start(jsonb_build_object(
    'id', 'ea200001-0000-4000-8000-000000000001',
    'pipeline_name', 'pgtap-fixture-run',
    'command', 'run',
    'run_mode', 'incremental',
    'is_scoped', true,
    'invoked_via', 'cli_server',
    'cli_argv', jsonb_build_array('pipeline', 'run', 'pgtap-fixture-run', '--incremental'),
    'request_body', jsonb_build_object('incremental', true),
    'arguments', jsonb_build_object('mode', 'incremental'),
    'actor', 'pablo@laptop',
    'host', 'fly-machine',
    'code_version', 'abc123',
    'started_at', '2026-10-22T10:00:00Z'
  )),
  'ea200001-0000-4000-8000-000000000001'::uuid,
  'start returns the execution id'
);

select results_eq(
  $$select status::text, command::text, run_mode::text, is_scoped, cli_argv,
      request_body, actor, code_version
    from public.pipeline_executions
    where id = 'ea200001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('running', 'run', 'incremental', true,
      array['pipeline', 'run', 'pgtap-fixture-run', '--incremental'],
      '{"incremental": true}'::jsonb, 'pablo@laptop', 'abc123')$$,
  'start records a running execution with its invocation'
);

-- ---------------------------------------------------------------------------
-- rpc_pipeline_executions__record_scope
-- ---------------------------------------------------------------------------

select public.rpc_pipeline_executions__record_scope(
  'ea200001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'drive_key', 'https://a.pgtap-fixture.invalid', 'scope_key', 'all',
    'status', 'succeeded',
    'started_at', '2026-10-22T10:00:00Z', 'finished_at', '2026-10-22T10:00:02Z',
    'setup_ms', 5, 'extract_ms', 100, 'load_write_ms', 30,
    'page_count', 2, 'datasets_fetched', 10, 'listings_considered', 12,
    'listings_written', 8, 'columns_considered', 60, 'columns_written', 40,
    'max_columns_per_listing', 9, 'source_bytes_reported', 1000,
    'pipeline_metrics', jsonb_build_object('hdx.parquet_footer_reads', 1)
  )
);

select public.rpc_pipeline_executions__record_scope(
  'ea200001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'drive_key', 'https://a.pgtap-fixture.invalid', 'scope_key', 'category:health',
    'status', 'failed', 'error', 'source answered 500',
    'started_at', '2026-10-22T10:00:02Z', 'finished_at', '2026-10-22T10:00:03Z',
    'setup_ms', 3, 'extract_ms', 50,
    'page_count', 1, 'datasets_fetched', 5, 'listings_considered', 5,
    'listings_written', 5, 'columns_considered', 20, 'columns_written', 20,
    'max_columns_per_listing', 14
  )
);

select public.rpc_pipeline_executions__record_scope(
  'ea200001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'drive_key', 'https://b.pgtap-fixture.invalid', 'scope_key', 'all',
    'status', 'skipped',
    'started_at', '2026-10-22T10:00:03Z', 'finished_at', '2026-10-22T10:00:03Z'
  )
);

select results_eq(
  $$select drive_count, scope_count, setup_ms, extract_ms, load_write_ms,
      page_count, datasets_fetched, listings_considered, listings_written,
      columns_considered, columns_written, max_columns_per_listing,
      source_bytes_reported
    from public.pipeline_executions
    where id = 'ea200001-0000-4000-8000-000000000001'::uuid$$,
  $$values (2, 3, 8::bigint, 150::bigint, 30::bigint, 3, 15, 17, 13, 80, 60,
      14, 1000::bigint)$$,
  'record_scope keeps the totals equal to the sum of the scope rows'
);

select results_eq(
  $$select pipeline_name, status::text, error
    from public.pipeline_execution_scopes
    where execution_id = 'ea200001-0000-4000-8000-000000000001'::uuid
      and scope_key = 'category:health'$$,
  $$values ('pgtap-fixture-run', 'failed', 'source answered 500')$$,
  'record_scope copies the pipeline name and keeps the outcome'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__record_scope(
      'ea2000ff-0000-4000-8000-0000000000ff'::uuid,
      jsonb_build_object('drive_key', 'x', 'scope_key', 'all', 'status', 'succeeded',
        'started_at', now(), 'finished_at', now()))$$,
  'P0001',
  'Pipeline execution ea2000ff-0000-4000-8000-0000000000ff does not exist',
  'record_scope refuses an unknown execution'
);

-- ---------------------------------------------------------------------------
-- rpc_pipeline_executions__finish
-- ---------------------------------------------------------------------------

-- The pipeline's catalog: two prebuilt listings (one with two columns) and
-- one API listing with unverified column types.
insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind,
   parquet_file_name, pipeline_name, pipeline_run_id,
   date_column_type_last_verified)
values
  ('ea300001-0000-4000-8000-000000000001'::uuid, 'p1', 'Fixture Org',
   'pipeline_parquet', 'pgtap-fixture-1.parquet', 'pgtap-fixture-run', 'r',
   now()),
  ('ea300002-0000-4000-8000-000000000002'::uuid, 'p2', 'Fixture Org',
   'pipeline_parquet', 'pgtap-fixture-2.parquet', 'pgtap-fixture-run', 'r',
   now());

insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name)
values
  ('ea300003-0000-4000-8000-000000000003'::uuid, 'a1', 'Fixture Org',
   'api_resource', 'socrata', 'https://a.pgtap-fixture.invalid',
   'pgtap-fixture-a1', 'pgtap-fixture-a1', 'CSV', 'pgtap-fixture-run');

insert into public.data_catalog_listings__relation_columns
  (catalog_listing_id, column_name, display_order, original_data_type,
   cast_data_type)
values
  ('ea300001-0000-4000-8000-000000000001'::uuid, 'x', 0, 'BIGINT', 'BIGINT'),
  ('ea300001-0000-4000-8000-000000000001'::uuid, 'y', 1, 'VARCHAR', 'VARCHAR');

select public.rpc_pipeline_executions__finish(
  'ea200001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'status', 'partially_failed', 'error', 'source answered 500',
    'finished_at', '2026-10-22T10:00:04Z', 'setup_ms', 20
  )
);

select results_eq(
  $$select status::text, error, duration_ms, setup_ms, catalog_listings,
      catalog_prebuilt_listings, catalog_api_listings,
      catalog_verified_listings, catalog_unverified_listings, catalog_columns
    from public.pipeline_executions
    where id = 'ea200001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('partially_failed', 'source answered 500', 4000::bigint,
      28::bigint, 3, 2, 1, 2, 1, 2)$$,
  'finish closes the execution, adds the run''s own setup, and counts the catalog after'
);

select public.rpc_pipeline_executions__start(jsonb_build_object(
  'id', 'ea200002-0000-4000-8000-000000000002',
  'pipeline_name', 'pgtap-fixture-run', 'command', 'reset',
  'invoked_via', 'cli_local'
));

select public.rpc_pipeline_executions__finish(
  'ea200002-0000-4000-8000-000000000002'::uuid,
  jsonb_build_object(
    'status', 'succeeded', 'listings_deleted', 7, 'checkpoints_deleted', 2,
    'workspace_datasets_deleted', 1, 'listings_kept_in_use', 3
  )
);

select results_eq(
  $$select listings_deleted, checkpoints_deleted, workspace_datasets_deleted,
      listings_kept_in_use, finished_at is not null
    from public.pipeline_executions
    where id = 'ea200002-0000-4000-8000-000000000002'::uuid$$,
  $$values (7, 2, 1, 3, true)$$,
  'finish writes a reset''s deletion totals'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__finish(
      'ea200002-0000-4000-8000-000000000002'::uuid,
      jsonb_build_object('status', 'running'))$$,
  'P0001',
  'rpc_pipeline_executions__finish needs a final status',
  'finish refuses to leave an execution running'
);

select ok(
  not has_function_privilege('authenticated', 'public.rpc_pipeline_executions__start(jsonb)', 'execute'),
  'a signed-in user cannot start an execution'
);

select ok(
  has_function_privilege('service_role', 'public.rpc_pipeline_executions__finish(uuid, jsonb)', 'execute'),
  'the service role can finish an execution'
);
```

Run: `supabase test db supabase/tests/database/pipeline_executions.test.sql`.
Expected: FAIL, the functions do not exist yet.

- [ ] **Step 2: Write `supabase/schemas/50.rpc_pipeline_executions__start.sql`**

```sql
/**
 * Records that a pipeline command started: inserts its execution row as
 * `running`, with what ran and how it was invoked.
 *
 * @param p_execution A JSON object with `pipeline_executions` columns:
 *   `id` (optional; a run passes its `pipeline_run_id`), `pipeline_name`,
 *   `command`, `run_mode`, `is_dry_run`, `is_scoped`, `is_limited`,
 *   `is_windowed`, `invoked_via`, `cli_argv`, `request_body`, `arguments`,
 *   `actor`, `host`, `code_version`, and `started_at` (defaults to now).
 *
 * @returns The execution's id.
 */
create or replace function public.rpc_pipeline_executions__start (p_execution jsonb) returns uuid as $$
declare
  v_input public.pipeline_executions;
  v_id uuid;
begin
  if jsonb_typeof(p_execution) is distinct from 'object' then
    raise exception 'rpc_pipeline_executions__start needs a JSON object';
  end if;
  v_input := jsonb_populate_record(null::public.pipeline_executions, p_execution);

  insert into public.pipeline_executions (
    id,
    pipeline_name,
    command,
    run_mode,
    is_dry_run,
    is_scoped,
    is_limited,
    is_windowed,
    invoked_via,
    cli_argv,
    request_body,
    arguments,
    actor,
    host,
    code_version,
    started_at
  ) values (
    coalesce(v_input.id, gen_random_uuid()),
    v_input.pipeline_name,
    v_input.command,
    v_input.run_mode,
    coalesce(v_input.is_dry_run, false),
    coalesce(v_input.is_scoped, false),
    coalesce(v_input.is_limited, false),
    coalesce(v_input.is_windowed, false),
    v_input.invoked_via,
    v_input.cli_argv,
    v_input.request_body,
    coalesce(v_input.arguments, '{}'::jsonb),
    v_input.actor,
    v_input.host,
    v_input.code_version,
    coalesce(v_input.started_at, now())
  )
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: pipelines and the `ava` CLI record executions with
-- the service role key.
revoke
execute on function public.rpc_pipeline_executions__start (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_pipeline_executions__start (jsonb) to service_role;
```

- [ ] **Step 3: Write `supabase/schemas/50.rpc_pipeline_executions__record_scope.sql`**

```sql
/**
 * Records one drive and scope a pipeline execution worked on, and recomputes
 * the execution's totals from all of its scope rows, in one transaction, so
 * the totals always equal the sum of the rows. The execution's `setup_ms`
 * becomes the sum of its rows' `setup_ms`; `__finish` then adds the run's
 * own setup.
 *
 * @param p_execution_id The execution.
 * @param p_scope A JSON object with `pipeline_execution_scopes` columns,
 *   without `id`, `execution_id`, or `pipeline_name`. Timings and counts
 *   default to 0, `pipeline_metrics` to `{}`.
 *
 * @throws When the execution does not exist.
 */
create or replace function public.rpc_pipeline_executions__record_scope (
  p_execution_id uuid,
  p_scope jsonb
) returns void as $$
declare
  v_pipeline_name text;
  v_scope public.pipeline_execution_scopes;
begin
  select execution.pipeline_name into v_pipeline_name
  from public.pipeline_executions execution
  where execution.id = p_execution_id
  for update;

  if v_pipeline_name is null then
    raise exception 'Pipeline execution % does not exist', p_execution_id;
  end if;

  v_scope := jsonb_populate_record(null::public.pipeline_execution_scopes, p_scope);

  insert into public.pipeline_execution_scopes (
    execution_id, pipeline_name, drive_key, scope_key, status, error,
    window_since, window_until, checkpoint_before, checkpoint_after,
    started_at, finished_at,
    setup_ms, extract_ms, transform_ms, load_read_ms, load_parquet_build_ms,
    load_parquet_upload_ms, load_write_ms, checkpoint_write_ms,
    page_count, datasets_fetched, listings_considered, listings_written,
    listings_unchanged, write_batches, columns_considered, columns_written,
    max_columns_per_listing, source_csv_bytes, parquet_bytes_written,
    parquet_rows_written, parquet_uploads_skipped, source_bytes_reported,
    listings_deleted, listings_kept_in_use, listings_detached,
    checkpoints_deleted, pipeline_metrics
  ) values (
    p_execution_id, v_pipeline_name, v_scope.drive_key, v_scope.scope_key,
    v_scope.status, v_scope.error,
    v_scope.window_since, v_scope.window_until,
    v_scope.checkpoint_before, v_scope.checkpoint_after,
    v_scope.started_at, v_scope.finished_at,
    coalesce(v_scope.setup_ms, 0), coalesce(v_scope.extract_ms, 0),
    coalesce(v_scope.transform_ms, 0), coalesce(v_scope.load_read_ms, 0),
    coalesce(v_scope.load_parquet_build_ms, 0),
    coalesce(v_scope.load_parquet_upload_ms, 0),
    coalesce(v_scope.load_write_ms, 0), coalesce(v_scope.checkpoint_write_ms, 0),
    coalesce(v_scope.page_count, 0), coalesce(v_scope.datasets_fetched, 0),
    coalesce(v_scope.listings_considered, 0),
    coalesce(v_scope.listings_written, 0),
    coalesce(v_scope.listings_unchanged, 0), coalesce(v_scope.write_batches, 0),
    coalesce(v_scope.columns_considered, 0),
    coalesce(v_scope.columns_written, 0),
    coalesce(v_scope.max_columns_per_listing, 0),
    coalesce(v_scope.source_csv_bytes, 0),
    coalesce(v_scope.parquet_bytes_written, 0),
    coalesce(v_scope.parquet_rows_written, 0),
    coalesce(v_scope.parquet_uploads_skipped, 0),
    v_scope.source_bytes_reported,
    coalesce(v_scope.listings_deleted, 0),
    coalesce(v_scope.listings_kept_in_use, 0),
    coalesce(v_scope.listings_detached, 0),
    coalesce(v_scope.checkpoints_deleted, 0),
    coalesce(v_scope.pipeline_metrics, '{}'::jsonb)
  );

  update public.pipeline_executions execution
  set
    drive_count = totals.drive_count,
    scope_count = totals.scope_count,
    setup_ms = totals.setup_ms,
    extract_ms = totals.extract_ms,
    transform_ms = totals.transform_ms,
    load_read_ms = totals.load_read_ms,
    load_parquet_build_ms = totals.load_parquet_build_ms,
    load_parquet_upload_ms = totals.load_parquet_upload_ms,
    load_write_ms = totals.load_write_ms,
    checkpoint_write_ms = totals.checkpoint_write_ms,
    page_count = totals.page_count,
    datasets_fetched = totals.datasets_fetched,
    listings_considered = totals.listings_considered,
    listings_written = totals.listings_written,
    listings_unchanged = totals.listings_unchanged,
    write_batches = totals.write_batches,
    columns_considered = totals.columns_considered,
    columns_written = totals.columns_written,
    max_columns_per_listing = totals.max_columns_per_listing,
    source_csv_bytes = totals.source_csv_bytes,
    parquet_bytes_written = totals.parquet_bytes_written,
    parquet_rows_written = totals.parquet_rows_written,
    parquet_uploads_skipped = totals.parquet_uploads_skipped,
    source_bytes_reported = totals.source_bytes_reported,
    listings_deleted = totals.listings_deleted,
    listings_kept_in_use = totals.listings_kept_in_use,
    listings_detached = totals.listings_detached,
    checkpoints_deleted = totals.checkpoints_deleted
  from (
    select
      count(distinct scope.drive_key)::integer as drive_count,
      count(*)::integer as scope_count,
      sum(scope.setup_ms)::bigint as setup_ms,
      sum(scope.extract_ms)::bigint as extract_ms,
      sum(scope.transform_ms)::bigint as transform_ms,
      sum(scope.load_read_ms)::bigint as load_read_ms,
      sum(scope.load_parquet_build_ms)::bigint as load_parquet_build_ms,
      sum(scope.load_parquet_upload_ms)::bigint as load_parquet_upload_ms,
      sum(scope.load_write_ms)::bigint as load_write_ms,
      sum(scope.checkpoint_write_ms)::bigint as checkpoint_write_ms,
      sum(scope.page_count)::integer as page_count,
      sum(scope.datasets_fetched)::integer as datasets_fetched,
      sum(scope.listings_considered)::integer as listings_considered,
      sum(scope.listings_written)::integer as listings_written,
      sum(scope.listings_unchanged)::integer as listings_unchanged,
      sum(scope.write_batches)::integer as write_batches,
      sum(scope.columns_considered)::integer as columns_considered,
      sum(scope.columns_written)::integer as columns_written,
      max(scope.max_columns_per_listing)::integer as max_columns_per_listing,
      sum(scope.source_csv_bytes)::bigint as source_csv_bytes,
      sum(scope.parquet_bytes_written)::bigint as parquet_bytes_written,
      sum(scope.parquet_rows_written)::bigint as parquet_rows_written,
      sum(scope.parquet_uploads_skipped)::integer as parquet_uploads_skipped,
      sum(scope.source_bytes_reported)::bigint as source_bytes_reported,
      sum(scope.listings_deleted)::integer as listings_deleted,
      sum(scope.listings_kept_in_use)::integer as listings_kept_in_use,
      sum(scope.listings_detached)::integer as listings_detached,
      sum(scope.checkpoints_deleted)::integer as checkpoints_deleted
    from public.pipeline_execution_scopes scope
    where scope.execution_id = p_execution_id
  ) totals
  where execution.id = p_execution_id;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: pipelines and the `ava` CLI record executions with
-- the service role key.
revoke
execute on function public.rpc_pipeline_executions__record_scope (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_pipeline_executions__record_scope (uuid, jsonb) to service_role;
```

- [ ] **Step 4: Write `supabase/schemas/50.rpc_pipeline_executions__finish.sql`**

```sql
/**
 * Records that a pipeline command finished: sets its status, error, and
 * finish time, adds the run's own setup time to `setup_ms`, writes deletion
 * totals a reset passes (a prune's come from its scope rows and are kept
 * when the outcome omits them), and counts the pipeline's catalog as it now
 * stands.
 *
 * @param p_execution_id The execution.
 * @param p_outcome A JSON object with `status` (not `running`), and
 *   optionally `error`, `finished_at` (defaults to now), `setup_ms`,
 *   `listings_deleted`, `listings_kept_in_use`, `listings_detached`,
 *   `checkpoints_deleted`, and `workspace_datasets_deleted`.
 *
 * @throws When the execution does not exist, or the status is missing or
 *   `running`.
 */
create or replace function public.rpc_pipeline_executions__finish (
  p_execution_id uuid,
  p_outcome jsonb
) returns void as $$
declare
  v_pipeline_name text;
  v_outcome public.pipeline_executions;
begin
  select execution.pipeline_name into v_pipeline_name
  from public.pipeline_executions execution
  where execution.id = p_execution_id
  for update;

  if v_pipeline_name is null then
    raise exception 'Pipeline execution % does not exist', p_execution_id;
  end if;

  v_outcome := jsonb_populate_record(null::public.pipeline_executions, p_outcome);
  if v_outcome.status is null or v_outcome.status = 'running' then
    raise exception 'rpc_pipeline_executions__finish needs a final status';
  end if;

  update public.pipeline_executions execution
  set
    status = v_outcome.status,
    error = v_outcome.error,
    finished_at = coalesce(v_outcome.finished_at, now()),
    setup_ms = execution.setup_ms + coalesce(v_outcome.setup_ms, 0),
    listings_deleted = coalesce(v_outcome.listings_deleted, execution.listings_deleted),
    listings_kept_in_use = coalesce(v_outcome.listings_kept_in_use, execution.listings_kept_in_use),
    listings_detached = coalesce(v_outcome.listings_detached, execution.listings_detached),
    checkpoints_deleted = coalesce(v_outcome.checkpoints_deleted, execution.checkpoints_deleted),
    workspace_datasets_deleted = coalesce(
      v_outcome.workspace_datasets_deleted,
      execution.workspace_datasets_deleted
    ),
    catalog_listings = catalog.listings,
    catalog_prebuilt_listings = catalog.prebuilt_listings,
    catalog_api_listings = catalog.api_listings,
    catalog_verified_listings = catalog.verified_listings,
    catalog_unverified_listings = catalog.unverified_listings,
    catalog_columns = catalog_columns.columns
  from
    (
      select
        count(*)::integer as listings,
        (count(*) filter (where listing.access_kind = 'pipeline_parquet'))::integer as prebuilt_listings,
        (count(*) filter (where listing.access_kind = 'api_resource'))::integer as api_listings,
        (count(*) filter (where listing.date_column_type_last_verified is not null))::integer as verified_listings,
        (count(*) filter (where listing.date_column_type_last_verified is null))::integer as unverified_listings
      from public.data_catalog_listings listing
      where listing.pipeline_name = v_pipeline_name
    ) catalog,
    (
      select count(*)::integer as columns
      from public.data_catalog_listings__relation_columns relation_column
      join public.data_catalog_listings listing
        on listing.id = relation_column.catalog_listing_id
      where listing.pipeline_name = v_pipeline_name
    ) catalog_columns
  where execution.id = p_execution_id;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: pipelines and the `ava` CLI record executions with
-- the service role key.
revoke
execute on function public.rpc_pipeline_executions__finish (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_pipeline_executions__finish (uuid, jsonb) to service_role;
```

- [ ] **Step 5: Generate the migration and see the tests pass**

```bash
pnpm db:reset
pnpm db:new-migration add_pipeline_execution_functions
pnpm db:gen-types
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
supabase test db supabase/tests/database/pipeline_executions.test.sql
pnpm test:db
```

Expected: the migration creates the three functions with their grants and
drops nothing. The pgTAP file passes 17 of 17, and `pnpm test:db` passes
with the privilege reconcile reporting no surplus or missing privileges.

Then prove the totals test can fail: in the local database only, run
`create or replace` of `rpc_pipeline_executions__record_scope` with
`sum(scope.extract_ms)` changed to `max(scope.extract_ms)`, rerun the pgTAP
file, see "record_scope keeps the totals equal to the sum of the scope rows"
fail, then `pnpm db:reset` to restore it.

- [ ] **Step 6: Format, then commit**

```bash
pnpm exec prettier --write supabase/schemas/50.rpc_pipeline_executions__*.sql supabase/tests/database/pipeline_executions.test.sql
git add supabase/schemas/50.rpc_pipeline_executions__start.sql supabase/schemas/50.rpc_pipeline_executions__record_scope.sql supabase/schemas/50.rpc_pipeline_executions__finish.sql supabase/tests/database/pipeline_executions.test.sql supabase/migrations/*_add_pipeline_execution_functions.sql apps/desktop/migrations/*_add_pipeline_execution_functions.gen.sql shared/types/database.types.ts
git commit -m "feat(db): add functions that record pipeline executions

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 3: Execution types, rows, and the in-memory store

**Files:**
- Create: `packages/node/etl/src/stores/ExecutionStore.types.ts`
- Create: `packages/node/etl/src/stores/executionRecords/executionRecords.ts`
- Create: `packages/node/etl/src/stores/executionRecords/executionRecords.test.ts`
- Create: `packages/node/etl/src/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore.ts`
- Create: `packages/node/etl/src/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore.test.ts`
- Create: `packages/node/etl/src/stores/InMemoryExecutionStore/createInMemoryExecutionStore.ts`
- Modify: `packages/node/etl/src/index.ts`

This task is pure TypeScript: no engine behavior changes yet. Everything here
is free of Node-only imports, because the `ava` CLI imports it through the
`@etl/*` path alias (as it already imports `@etl/EtlEngine/etlScopes`).

- [ ] **Step 1: Write `ExecutionStore.types.ts`**

```ts
/** Which pipeline command an execution was. */
export type ExecutionCommand = "run" | "reset" | "prune_retired_scopes";

/** How an execution was started. */
export type ExecutionInvokedVia = "cli_local" | "cli_server" | "http";

/** How an execution ended. `running` is only ever stored, never passed. */
export type ExecutionFinalStatus =
  | "succeeded"
  | "partially_failed"
  | "failed"
  | "cancelled";

/** How one drive and scope of an execution ended. */
export type ExecutionScopeStatus = "succeeded" | "failed" | "skipped";

/** How a command was started, recorded as given. */
export type ExecutionInvocation = Readonly<{
  invokedVia: ExecutionInvokedVia;
  /** The CLI's argv after the binary, exactly as typed. */
  cliArgv?: readonly string[];
  /** The JSON body the pipeline server received. */
  requestBody?: unknown;
  /** `<OS user>@<hostname>` of the CLI that started it. */
  actor?: string;
  /** Hostname of the process that executed it. */
  host?: string;
  /** Git commit of the executing code. */
  codeVersion?: string;
}>;

/** An execution as it starts. */
export type ExecutionStart = Readonly<{
  /** A run passes its `pipelineRunId`. */
  id: string;
  pipelineName: string;
  command: ExecutionCommand;
  /** Set exactly when `command` is `run`. */
  runMode: "full" | "incremental" | undefined;
  isDryRun: boolean;
  isScoped: boolean;
  isLimited: boolean;
  isWindowed: boolean;
  /** The parsed, validated options. */
  arguments: Readonly<Record<string, unknown>>;
  invocation: ExecutionInvocation;
  startedAt: Date;
}>;

/**
 * Milliseconds a crawl spent in each stage, each summed over its pages.
 * Stages interleave page by page, so they do not add up to the crawl's
 * wall-clock time exactly.
 */
export type ExecutionStageTimings = Readonly<{
  /** Reading the checkpoint and resolving the window. */
  setupMs: number;
  /** Waiting on the source for each page. */
  extractMs: number;
  /** The pipeline's `transform` for every connection. */
  transformMs: number;
  /** Reading stored rows for the change check. */
  loadReadMs: number;
  /** Converting prebuilt CSVs to Parquet and summarizing them. */
  loadParquetBuildMs: number;
  /** Uploading Parquet objects. */
  loadParquetUploadMs: number;
  /** The transactions that save listings with their columns. */
  loadWriteMs: number;
  /** Writing the checkpoint after each page. */
  checkpointWriteMs: number;
}>;

/** The counts and sizes that explain a crawl's timings. */
export type ExecutionDenominators = Readonly<{
  pageCount: number;
  /** Connections in the window: the crawl's `connectionsFetched`. */
  datasetsFetched: number;
  /** Relations `transform` returned. */
  listingsConsidered: number;
  listingsWritten: number;
  listingsUnchanged: number;
  /** Calls that saved listings with their columns. */
  writeBatches: number;
  /** Relation columns across every relation considered. */
  columnsConsidered: number;
  /** Relation columns across the listings written. */
  columnsWritten: number;
  /** The widest relation considered. */
  maxColumnsPerListing: number;
  /** Bytes of the input CSVs converted to Parquet. */
  sourceCsvBytes: number;
  /** Bytes of the Parquet objects uploaded. */
  parquetBytesWritten: number;
  /** Rows in the Parquet objects uploaded. */
  parquetRowsWritten: number;
  /** Parquet objects not uploaded because their hash matched. */
  parquetUploadsSkipped: number;
  /** What the source reports, when it reports any size. */
  sourceBytesReported: number | undefined;
}>;

/** What removing a scope from a pipeline's listings did. */
export type ExecutionDeletionCounts = Readonly<{
  listingsDeleted: number;
  listingsKeptInUse: number;
  listingsDetached: number;
  checkpointsDeleted: number;
}>;

/** One drive and scope an execution worked on. */
export type ExecutionScope = Readonly<{
  driveKey: string;
  scopeKey: string;
  status: ExecutionScopeStatus;
  error: string | undefined;
  windowSince: Date | undefined;
  windowUntil: Date | undefined;
  checkpointBefore: Date | undefined;
  checkpointAfter: Date | undefined;
  startedAt: Date;
  finishedAt: Date;
  timings: ExecutionStageTimings;
  denominators: ExecutionDenominators;
  /** A prune's counts for this pair, or `undefined` for a crawl. */
  deletions: ExecutionDeletionCounts | undefined;
  /** Counters and timers only one pipeline has. */
  pipelineMetrics: Readonly<Record<string, number>>;
}>;

/** How an execution ended. */
export type ExecutionOutcome = Readonly<{
  status: ExecutionFinalStatus;
  error: string | undefined;
  finishedAt: Date;
  /** The execution's own setup, such as listing drives and scopes. */
  setupMs: number;
  /**
   * Deletions with no scope rows behind them, as a reset makes. Leave
   * undefined to keep the totals the scope rows add up to.
   */
  deletions:
    | (ExecutionDeletionCounts & Readonly<{ workspaceDatasetsDeleted: number }>)
    | undefined;
}>;

/** Where pipeline executions are recorded. */
export type ExecutionStore = Readonly<{
  /** Records that an execution started, as `running`. */
  start: (execution: ExecutionStart) => Promise<void>;
  /** Records one drive and scope of a started execution. */
  recordScope: (args: {
    executionId: string;
    scope: ExecutionScope;
  }) => Promise<void>;
  /** Records how a started execution ended. */
  finish: (args: {
    executionId: string;
    outcome: ExecutionOutcome;
  }) => Promise<void>;
}>;
```

- [ ] **Step 2: Write the failing row tests**

`packages/node/etl/src/stores/executionRecords/executionRecords.test.ts`:

```ts
import {
  buildExecutionOutcomeRow,
  buildExecutionScopeRow,
  buildExecutionStartRow,
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { describe, expect, it } from "vitest";
import type { ExecutionScope } from "@etl/stores/ExecutionStore.types";

const SCOPE: ExecutionScope = {
  driveKey: "https://data.humdata.org",
  scopeKey: "format:csv",
  status: "failed",
  error: "source answered 500",
  windowSince: new Date("2026-10-01T00:00:00.000Z"),
  windowUntil: undefined,
  checkpointBefore: undefined,
  checkpointAfter: new Date("2026-10-02T00:00:00.000Z"),
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
  finishedAt: new Date("2026-10-22T10:00:01.000Z"),
  timings: { ...NO_STAGE_TIMINGS, extractMs: 12, loadWriteMs: 3 },
  denominators: { ...NO_DENOMINATORS, pageCount: 2, sourceBytesReported: 99 },
  deletions: undefined,
  pipelineMetrics: { "hdx.parquet_footer_reads": 1 },
};

describe("executionRecords", () => {
  it("builds a start row in the functions' snake_case", () => {
    expect(
      buildExecutionStartRow({
        id: "run-1",
        pipelineName: "hdx",
        command: "run",
        runMode: "incremental",
        isDryRun: false,
        isScoped: true,
        isLimited: false,
        isWindowed: false,
        arguments: { mode: "incremental", scopes: ["format:csv"] },
        invocation: { invokedVia: "cli_server", cliArgv: ["pipeline", "run", "hdx"] },
        startedAt: new Date("2026-10-22T10:00:00.000Z"),
      }),
    ).toEqual({
      id: "run-1",
      pipeline_name: "hdx",
      command: "run",
      run_mode: "incremental",
      is_dry_run: false,
      is_scoped: true,
      is_limited: false,
      is_windowed: false,
      invoked_via: "cli_server",
      cli_argv: ["pipeline", "run", "hdx"],
      request_body: null,
      arguments: { mode: "incremental", scopes: ["format:csv"] },
      actor: null,
      host: null,
      code_version: null,
      started_at: "2026-10-22T10:00:00.000Z",
    });
  });

  it("builds a scope row with every timing and count, and null for what is unknown", () => {
    expect(buildExecutionScopeRow(SCOPE)).toMatchObject({
      drive_key: "https://data.humdata.org",
      scope_key: "format:csv",
      status: "failed",
      error: "source answered 500",
      window_since: "2026-10-01T00:00:00.000Z",
      window_until: null,
      checkpoint_before: null,
      checkpoint_after: "2026-10-02T00:00:00.000Z",
      extract_ms: 12,
      load_write_ms: 3,
      setup_ms: 0,
      page_count: 2,
      source_bytes_reported: 99,
      listings_deleted: 0,
      pipeline_metrics: { "hdx.parquet_footer_reads": 1 },
    });
  });

  it("leaves a scope's unknown source size null", () => {
    expect(
      buildExecutionScopeRow({
        ...SCOPE,
        denominators: NO_DENOMINATORS,
      }).source_bytes_reported,
    ).toBe(null);
  });

  it("omits an outcome's deletions when it has none, so the stored totals stay", () => {
    expect(
      buildExecutionOutcomeRow({
        status: "succeeded",
        error: undefined,
        finishedAt: new Date("2026-10-22T10:00:05.000Z"),
        setupMs: 20,
        deletions: undefined,
      }),
    ).toEqual({
      status: "succeeded",
      error: null,
      finished_at: "2026-10-22T10:00:05.000Z",
      setup_ms: 20,
    });
  });

  it("writes an outcome's deletions when it has them", () => {
    expect(
      buildExecutionOutcomeRow({
        status: "succeeded",
        error: undefined,
        finishedAt: new Date("2026-10-22T10:00:05.000Z"),
        setupMs: 0,
        deletions: {
          listingsDeleted: 7,
          listingsKeptInUse: 3,
          listingsDetached: 0,
          checkpointsDeleted: 2,
          workspaceDatasetsDeleted: 1,
        },
      }),
    ).toMatchObject({
      listings_deleted: 7,
      listings_kept_in_use: 3,
      listings_detached: 0,
      checkpoints_deleted: 2,
      workspace_datasets_deleted: 1,
    });
  });
});
```

Run: `pnpm --filter @avandar/etl exec vitest run src/stores/executionRecords`.
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write `executionRecords.ts`**

```ts
import type {
  ExecutionDeletionCounts,
  ExecutionDenominators,
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStageTimings,
  ExecutionStart,
} from "@etl/stores/ExecutionStore.types";

/** Stage timings of a crawl that did no work. */
export const NO_STAGE_TIMINGS: ExecutionStageTimings = {
  setupMs: 0,
  extractMs: 0,
  transformMs: 0,
  loadReadMs: 0,
  loadParquetBuildMs: 0,
  loadParquetUploadMs: 0,
  loadWriteMs: 0,
  checkpointWriteMs: 0,
};

/** Denominators of a crawl that did no work. */
export const NO_DENOMINATORS: ExecutionDenominators = {
  pageCount: 0,
  datasetsFetched: 0,
  listingsConsidered: 0,
  listingsWritten: 0,
  listingsUnchanged: 0,
  writeBatches: 0,
  columnsConsidered: 0,
  columnsWritten: 0,
  maxColumnsPerListing: 0,
  sourceCsvBytes: 0,
  parquetBytesWritten: 0,
  parquetRowsWritten: 0,
  parquetUploadsSkipped: 0,
  sourceBytesReported: undefined,
};

/** Deletions of a step that deleted nothing. */
export const NO_DELETIONS: ExecutionDeletionCounts = {
  listingsDeleted: 0,
  listingsKeptInUse: 0,
  listingsDetached: 0,
  checkpointsDeleted: 0,
};

function _toIsoOrNull(date: Date | undefined): string | null {
  return date === undefined ? null : date.toISOString();
}

/**
 * The JSON `rpc_pipeline_executions__start` takes, from an execution's start.
 */
export function buildExecutionStartRow(
  start: ExecutionStart,
): Record<string, unknown> {
  const { invocation } = start;
  return {
    id: start.id,
    pipeline_name: start.pipelineName,
    command: start.command,
    run_mode: start.runMode ?? null,
    is_dry_run: start.isDryRun,
    is_scoped: start.isScoped,
    is_limited: start.isLimited,
    is_windowed: start.isWindowed,
    invoked_via: invocation.invokedVia,
    cli_argv: invocation.cliArgv === undefined ? null : [...invocation.cliArgv],
    request_body: invocation.requestBody ?? null,
    arguments: start.arguments,
    actor: invocation.actor ?? null,
    host: invocation.host ?? null,
    code_version: invocation.codeVersion ?? null,
    started_at: start.startedAt.toISOString(),
  };
}

function _buildTimingColumns(
  timings: ExecutionStageTimings,
): Record<string, number> {
  return {
    setup_ms: timings.setupMs,
    extract_ms: timings.extractMs,
    transform_ms: timings.transformMs,
    load_read_ms: timings.loadReadMs,
    load_parquet_build_ms: timings.loadParquetBuildMs,
    load_parquet_upload_ms: timings.loadParquetUploadMs,
    load_write_ms: timings.loadWriteMs,
    checkpoint_write_ms: timings.checkpointWriteMs,
  };
}

function _buildDenominatorColumns(
  denominators: ExecutionDenominators,
): Record<string, number | null> {
  return {
    page_count: denominators.pageCount,
    datasets_fetched: denominators.datasetsFetched,
    listings_considered: denominators.listingsConsidered,
    listings_written: denominators.listingsWritten,
    listings_unchanged: denominators.listingsUnchanged,
    write_batches: denominators.writeBatches,
    columns_considered: denominators.columnsConsidered,
    columns_written: denominators.columnsWritten,
    max_columns_per_listing: denominators.maxColumnsPerListing,
    source_csv_bytes: denominators.sourceCsvBytes,
    parquet_bytes_written: denominators.parquetBytesWritten,
    parquet_rows_written: denominators.parquetRowsWritten,
    parquet_uploads_skipped: denominators.parquetUploadsSkipped,
    source_bytes_reported: denominators.sourceBytesReported ?? null,
  };
}

function _buildDeletionColumns(
  deletions: ExecutionDeletionCounts,
): Record<string, number> {
  return {
    listings_deleted: deletions.listingsDeleted,
    listings_kept_in_use: deletions.listingsKeptInUse,
    listings_detached: deletions.listingsDetached,
    checkpoints_deleted: deletions.checkpointsDeleted,
  };
}

/**
 * The JSON `rpc_pipeline_executions__record_scope` takes, from one drive and
 * scope of an execution.
 */
export function buildExecutionScopeRow(
  scope: ExecutionScope,
): Record<string, unknown> {
  return {
    drive_key: scope.driveKey,
    scope_key: scope.scopeKey,
    status: scope.status,
    error: scope.error ?? null,
    window_since: _toIsoOrNull(scope.windowSince),
    window_until: _toIsoOrNull(scope.windowUntil),
    checkpoint_before: _toIsoOrNull(scope.checkpointBefore),
    checkpoint_after: _toIsoOrNull(scope.checkpointAfter),
    started_at: scope.startedAt.toISOString(),
    finished_at: scope.finishedAt.toISOString(),
    ..._buildTimingColumns(scope.timings),
    ..._buildDenominatorColumns(scope.denominators),
    ..._buildDeletionColumns(scope.deletions ?? NO_DELETIONS),
    pipeline_metrics: scope.pipelineMetrics,
  };
}

/**
 * The JSON `rpc_pipeline_executions__finish` takes, from how an execution
 * ended. Deletions are left out when the outcome has none, so the function
 * keeps the totals the scope rows add up to.
 */
export function buildExecutionOutcomeRow(
  outcome: ExecutionOutcome,
): Record<string, unknown> {
  const { deletions } = outcome;
  return {
    status: outcome.status,
    error: outcome.error ?? null,
    finished_at: outcome.finishedAt.toISOString(),
    setup_ms: outcome.setupMs,
    ...(deletions === undefined
      ? {}
      : {
          ..._buildDeletionColumns(deletions),
          workspace_datasets_deleted: deletions.workspaceDatasetsDeleted,
        }),
  };
}
```

Run the tests again. Expected: PASS.

- [ ] **Step 4: Write the failing never-fatal tests**

`packages/node/etl/src/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore.test.ts`:

```ts
import { createNeverFatalExecutionStore } from "@etl/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore";
import { createInMemoryExecutionStore } from "@etl/stores/InMemoryExecutionStore/createInMemoryExecutionStore";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { describe, expect, it, vi } from "vitest";
import type {
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStart,
  ExecutionStore,
} from "@etl/stores/ExecutionStore.types";

const START: ExecutionStart = {
  id: "run-1",
  pipelineName: "hdx",
  command: "run",
  runMode: "full",
  isDryRun: false,
  isScoped: false,
  isLimited: false,
  isWindowed: false,
  arguments: {},
  invocation: { invokedVia: "cli_local" },
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
};

const SCOPE: ExecutionScope = {
  driveKey: "https://data.humdata.org",
  scopeKey: "format:csv",
  status: "succeeded",
  error: undefined,
  windowSince: undefined,
  windowUntil: undefined,
  checkpointBefore: undefined,
  checkpointAfter: undefined,
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
  finishedAt: new Date("2026-10-22T10:00:01.000Z"),
  timings: NO_STAGE_TIMINGS,
  denominators: NO_DENOMINATORS,
  deletions: undefined,
  pipelineMetrics: {},
};

const OUTCOME: ExecutionOutcome = {
  status: "succeeded",
  error: undefined,
  finishedAt: new Date("2026-10-22T10:00:02.000Z"),
  setupMs: 0,
  deletions: undefined,
};

function _failingStore(
  failing: ReadonlySet<keyof ExecutionStore>,
): ExecutionStore {
  const store = createInMemoryExecutionStore();
  return {
    start: async (execution) => {
      if (failing.has("start")) {
        throw new Error("start failed");
      }
      return store.start(execution);
    },
    recordScope: async (args) => {
      if (failing.has("recordScope")) {
        throw new Error("recordScope failed");
      }
      return store.recordScope(args);
    },
    finish: async (args) => {
      if (failing.has("finish")) {
        throw new Error("finish failed");
      }
      return store.finish(args);
    },
  };
}

describe("createNeverFatalExecutionStore", () => {
  it("passes every call through to a working store", async () => {
    const store = createInMemoryExecutionStore();
    const safe = createNeverFatalExecutionStore({ store, warn: vi.fn() });

    await safe.start(START);
    await safe.recordScope({ executionId: "run-1", scope: SCOPE });
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });

    expect(store.getExecutions()).toEqual([
      { start: START, scopes: [SCOPE], outcome: OUTCOME },
    ]);
  });

  it("warns instead of throwing when a call fails", async () => {
    const warn = vi.fn();
    const safe = createNeverFatalExecutionStore({
      store: _failingStore(new Set(["recordScope", "finish"])),
      warn,
    });

    await safe.start(START);
    await safe.recordScope({ executionId: "run-1", scope: SCOPE });
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain("recordScope failed");
  });

  it("skips scopes and finish after a failed start", async () => {
    const warn = vi.fn();
    const store = createInMemoryExecutionStore();
    const safe = createNeverFatalExecutionStore({
      store: {
        ...store,
        start: async () => {
          throw new Error("no table");
        },
      },
      warn,
    });

    await safe.start(START);
    await safe.recordScope({ executionId: "run-1", scope: SCOPE });
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });

    expect([warn.mock.calls.length, store.getExecutions()]).toEqual([1, []]);
  });

  it("records only the first finish", async () => {
    const store = createInMemoryExecutionStore();
    const safe = createNeverFatalExecutionStore({ store, warn: vi.fn() });

    await safe.start(START);
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });
    await safe.finish({
      executionId: "run-1",
      outcome: { ...OUTCOME, status: "failed", error: "later" },
    });

    expect(store.getExecutions()[0]?.outcome?.status).toBe("succeeded");
  });
});
```

Run: `pnpm --filter @avandar/etl exec vitest run src/stores/createNeverFatalExecutionStore`.
Expected: FAIL, the modules do not exist.

- [ ] **Step 5: Write the in-memory store**

`packages/node/etl/src/stores/InMemoryExecutionStore/createInMemoryExecutionStore.ts`:

```ts
import type {
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStart,
  ExecutionStore,
} from "@etl/stores/ExecutionStore.types";

/** One recorded execution, as an in-memory store holds it. */
export type InMemoryExecution = Readonly<{
  start: ExecutionStart;
  scopes: readonly ExecutionScope[];
  outcome: ExecutionOutcome | undefined;
}>;

/** An execution store held in memory, plus an accessor for asserting on it. */
export type InMemoryExecutionStore = ExecutionStore &
  Readonly<{
    /** Every recorded execution, in the order it started. */
    getExecutions: () => readonly InMemoryExecution[];
  }>;

/**
 * Creates an execution store that keeps executions in memory, for testing
 * the engine or a CLI command without Supabase. Like the database
 * functions, it refuses a scope or finish for an execution that never
 * started.
 */
export function createInMemoryExecutionStore(): InMemoryExecutionStore {
  const executionsById = new Map<string, InMemoryExecution>();

  function _requireExecution(executionId: string): InMemoryExecution {
    const execution = executionsById.get(executionId);
    if (execution === undefined) {
      throw new Error(`Pipeline execution ${executionId} does not exist`);
    }
    return execution;
  }

  return {
    start: async (start) => {
      executionsById.set(start.id, { start, scopes: [], outcome: undefined });
    },
    recordScope: async ({ executionId, scope }) => {
      const execution = _requireExecution(executionId);
      executionsById.set(executionId, {
        ...execution,
        scopes: [...execution.scopes, scope],
      });
    },
    finish: async ({ executionId, outcome }) => {
      const execution = _requireExecution(executionId);
      executionsById.set(executionId, { ...execution, outcome });
    },
    getExecutions: () => {
      return [...executionsById.values()];
    },
  };
}
```

- [ ] **Step 6: Write the never-fatal wrapper**

`packages/node/etl/src/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore.ts`:

```ts
import type { ExecutionStore } from "@etl/stores/ExecutionStore.types";

function _describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Wraps an execution store so recording can never fail or stop the command
 * it records: each failed call is passed to `warn` and swallowed. A failed
 * `start` turns the rest into no-ops, since there is no row to add to, and
 * only the first `finish` is recorded.
 *
 * @param args.store - The store to record through.
 * @param args.warn - Told about each failure, such as `console.warn`.
 */
export function createNeverFatalExecutionStore(args: {
  store: ExecutionStore;
  warn: (message: string) => void;
}): ExecutionStore {
  const { store, warn } = args;
  let isStarted = false;
  let isFinished = false;
  return {
    start: async (execution) => {
      try {
        await store.start(execution);
        isStarted = true;
      } catch (error: unknown) {
        warn(
          `Could not record the start of pipeline execution ${execution.id}, so it is not recorded: ${_describeError(error)}`,
        );
      }
    },
    recordScope: async (scopeArgs) => {
      if (!isStarted || isFinished) {
        return;
      }
      try {
        await store.recordScope(scopeArgs);
      } catch (error: unknown) {
        warn(
          `Could not record ${scopeArgs.scope.driveKey} [${scopeArgs.scope.scopeKey}] of pipeline execution ${scopeArgs.executionId}: ${_describeError(error)}`,
        );
      }
    },
    finish: async (finishArgs) => {
      if (!isStarted || isFinished) {
        return;
      }
      isFinished = true;
      try {
        await store.finish(finishArgs);
      } catch (error: unknown) {
        warn(
          `Could not record the end of pipeline execution ${finishArgs.executionId}: ${_describeError(error)}`,
        );
      }
    },
  };
}
```

Run the never-fatal tests. Expected: PASS.

- [ ] **Step 7: Export from the package**

In `packages/node/etl/src/index.ts`, add (keeping the file's grouping of type
and value exports):

```ts
export type {
  ExecutionCommand,
  ExecutionDeletionCounts,
  ExecutionDenominators,
  ExecutionFinalStatus,
  ExecutionInvocation,
  ExecutionInvokedVia,
  ExecutionOutcome,
  ExecutionScope,
  ExecutionScopeStatus,
  ExecutionStageTimings,
  ExecutionStart,
  ExecutionStore,
} from "@etl/stores/ExecutionStore.types";
export {
  buildExecutionOutcomeRow,
  buildExecutionScopeRow,
  buildExecutionStartRow,
  NO_DELETIONS,
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
export { createNeverFatalExecutionStore } from "@etl/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore";
export {
  createInMemoryExecutionStore,
  type InMemoryExecution,
  type InMemoryExecutionStore,
} from "@etl/stores/InMemoryExecutionStore/createInMemoryExecutionStore";
```

- [ ] **Step 8: Check, format, commit**

```bash
pnpm --filter @avandar/etl exec vitest run src/stores
pnpm --filter @avandar/etl exec tsc --noEmit -p .
pnpm exec oxfmt --ignore-path .oxfmtignore packages/node/etl/src/stores/ExecutionStore.types.ts packages/node/etl/src/stores/executionRecords/executionRecords.ts packages/node/etl/src/stores/executionRecords/executionRecords.test.ts packages/node/etl/src/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore.ts packages/node/etl/src/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore.test.ts packages/node/etl/src/stores/InMemoryExecutionStore/createInMemoryExecutionStore.ts packages/node/etl/src/index.ts
pnpm exec eslint packages/node/etl/src/stores packages/node/etl/src/index.ts
git add packages/node/etl/src/stores/ExecutionStore.types.ts packages/node/etl/src/stores/executionRecords packages/node/etl/src/stores/createNeverFatalExecutionStore packages/node/etl/src/stores/InMemoryExecutionStore packages/node/etl/src/index.ts
git commit -m "feat(etl): add execution store types and a never-fatal wrapper

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 4: Supabase execution store

**Files:**
- Create: `packages/node/etl/src/stores/SupabaseExecutionStore/createSupabaseExecutionStore.ts`
- Create: `packages/node/etl/src/stores/SupabaseExecutionStore/createSupabaseExecutionStore.supabase.test.ts`
- Modify: `packages/node/etl/src/index.ts`

Needs Task 2's functions in the local database.

- [ ] **Step 1: Write the failing Supabase test**

`createSupabaseExecutionStore.supabase.test.ts` (it runs in the
`test:supabase` suite, like `createSupabaseCheckpointStore.supabase.test.ts`;
copy that file's client setup):

```ts
import { randomUUID } from "node:crypto";
import { createSupabaseExecutionStore } from "@etl/stores/SupabaseExecutionStore/createSupabaseExecutionStore";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

const PIPELINE_NAME = `etl-fixture-${randomUUID()}`;

const client = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);

const store = createSupabaseExecutionStore({
  client,
  functions: {
    start: "rpc_pipeline_executions__start",
    recordScope: "rpc_pipeline_executions__record_scope",
    finish: "rpc_pipeline_executions__finish",
  },
});

afterEach(async () => {
  const { error } = await client
    .from("pipeline_executions")
    .delete()
    .eq("pipeline_name", PIPELINE_NAME);
  expect(error).toBeNull();
});

describe("createSupabaseExecutionStore", () => {
  it("records a run's start, a scope, and its finish", async () => {
    const id = randomUUID();
    await store.start({
      id,
      pipelineName: PIPELINE_NAME,
      command: "run",
      runMode: "full",
      isDryRun: false,
      isScoped: false,
      isLimited: true,
      isWindowed: false,
      arguments: { mode: "full", limit: 5 },
      invocation: { invokedVia: "cli_local", cliArgv: ["pipeline", "run"] },
      startedAt: new Date("2026-10-22T10:00:00.000Z"),
    });
    await store.recordScope({
      executionId: id,
      scope: {
        driveKey: "https://etl-fixture.invalid",
        scopeKey: "all",
        status: "succeeded",
        error: undefined,
        windowSince: undefined,
        windowUntil: undefined,
        checkpointBefore: undefined,
        checkpointAfter: undefined,
        startedAt: new Date("2026-10-22T10:00:00.000Z"),
        finishedAt: new Date("2026-10-22T10:00:01.000Z"),
        timings: { ...NO_STAGE_TIMINGS, extractMs: 40 },
        denominators: { ...NO_DENOMINATORS, pageCount: 3 },
        deletions: undefined,
        pipelineMetrics: {},
      },
    });
    await store.finish({
      executionId: id,
      outcome: {
        status: "succeeded",
        error: undefined,
        finishedAt: new Date("2026-10-22T10:00:02.000Z"),
        setupMs: 5,
        deletions: undefined,
      },
    });

    const { data } = await client
      .from("pipeline_executions")
      .select("status, is_limited, extract_ms, page_count, setup_ms, duration_ms")
      .eq("id", id)
      .single();
    expect(data).toEqual({
      status: "succeeded",
      is_limited: true,
      extract_ms: 40,
      page_count: 3,
      setup_ms: 5,
      duration_ms: 2000,
    });
  });

  it("names the function in the error when a call fails", async () => {
    await expect(
      store.finish({
        executionId: randomUUID(),
        outcome: {
          status: "succeeded",
          error: undefined,
          finishedAt: new Date(),
          setupMs: 0,
          deletions: undefined,
        },
      }),
    ).rejects.toThrow("rpc_pipeline_executions__finish");
  });
});
```

Run: `pnpm --filter @avandar/etl test:supabase src/stores/SupabaseExecutionStore`.
Expected: FAIL, the module does not exist.

- [ ] **Step 2: Write the store**

```ts
import {
  buildExecutionOutcomeRow,
  buildExecutionScopeRow,
  buildExecutionStartRow,
} from "@etl/stores/executionRecords/executionRecords";
import { throwOnSupabaseError } from "@etl/stores/throwOnSupabaseError/throwOnSupabaseError";
import type { ExecutionStore } from "@etl/stores/ExecutionStore.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The database functions that record executions. */
export type ExecutionFunctions = Readonly<{
  /** Such as `rpc_pipeline_executions__start`. */
  start: string;
  /** Such as `rpc_pipeline_executions__record_scope`. */
  recordScope: string;
  /** Such as `rpc_pipeline_executions__finish`. */
  finish: string;
}>;

export type SupabaseExecutionStoreOptions = Readonly<{
  /** A service-role client: only the service role may call the functions. */
  client: SupabaseClient;
  functions: ExecutionFunctions;
}>;

/**
 * Creates an execution store over the three database functions. Every
 * method throws with the function's name and Supabase's message when a
 * call fails; wrap the store with `createNeverFatalExecutionStore` so a
 * failure never stops the command it records.
 *
 * @param options - The client and the function names.
 * @returns The store.
 */
export function createSupabaseExecutionStore(
  options: SupabaseExecutionStoreOptions,
): ExecutionStore {
  const { client, functions } = options;
  return {
    start: async (execution) => {
      const { error } = await client.rpc(functions.start, {
        p_execution: buildExecutionStartRow(execution),
      });
      throwOnSupabaseError({ error, action: `calling ${functions.start}` });
    },
    recordScope: async ({ executionId, scope }) => {
      const { error } = await client.rpc(functions.recordScope, {
        p_execution_id: executionId,
        p_scope: buildExecutionScopeRow(scope),
      });
      throwOnSupabaseError({
        error,
        action: `calling ${functions.recordScope}`,
      });
    },
    finish: async ({ executionId, outcome }) => {
      const { error } = await client.rpc(functions.finish, {
        p_execution_id: executionId,
        p_outcome: buildExecutionOutcomeRow(outcome),
      });
      throwOnSupabaseError({ error, action: `calling ${functions.finish}` });
    },
  };
}
```

Run the Supabase test again. Expected: PASS.

- [ ] **Step 3: Export, check, commit**

In `packages/node/etl/src/index.ts`, add:

```ts
export {
  createSupabaseExecutionStore,
  type ExecutionFunctions,
  type SupabaseExecutionStoreOptions,
} from "@etl/stores/SupabaseExecutionStore/createSupabaseExecutionStore";
```

```bash
pnpm --filter @avandar/etl test:supabase
pnpm --filter @avandar/etl exec tsc --noEmit -p .
pnpm exec oxfmt --ignore-path .oxfmtignore packages/node/etl/src/stores/SupabaseExecutionStore/createSupabaseExecutionStore.ts packages/node/etl/src/stores/SupabaseExecutionStore/createSupabaseExecutionStore.supabase.test.ts packages/node/etl/src/index.ts
pnpm exec eslint packages/node/etl/src/stores/SupabaseExecutionStore packages/node/etl/src/index.ts
git add packages/node/etl/src/stores/SupabaseExecutionStore packages/node/etl/src/index.ts
git commit -m "feat(etl): record executions through the Supabase functions

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 5: Crawl metrics recorder

**Files:**
- Modify: `packages/node/etl/src/EtlEngine/EtlEngine.types.ts`
- Create: `packages/node/etl/src/EtlEngine/crawlMetrics/crawlMetrics.ts`
- Create: `packages/node/etl/src/EtlEngine/crawlMetrics/crawlMetrics.test.ts`
- Modify: `packages/node/etl/src/index.ts`

- [ ] **Step 1: Add the public types**

In `EtlEngine.types.ts`, add this import next to the existing store import:

```ts
import type {
  ExecutionDenominators,
  ExecutionStageTimings,
} from "@etl/stores/ExecutionStore.types";
```

and add after `PromisedOrValue`:

```ts
/** Reads the time, for timing stages and dating crawls. */
export type EtlClock = Readonly<{
  /** The current date and time. */
  now: () => Date;
  /** Milliseconds from an arbitrary origin that never goes backwards. */
  monotonicMs: () => number;
}>;

/**
 * A pipeline's own counters and timers, collected per crawl into the
 * crawl's `pipelineMetrics`. Name them `<pipeline>.<what>`, such as
 * `hdx.parquet_footer_reads`.
 */
export type EtlPipelineMetrics = Readonly<{
  /** Adds `by` (default 1) to a counter. */
  increment: (name: string, by?: number) => void;
  /** Runs `work` and adds how long it took, in milliseconds, to a timer. */
  time: <T>(name: string, work: () => Promise<T>) => Promise<T>;
}>;

/** Everything one crawl measured. */
export type EtlCrawlMetrics = Readonly<{
  timings: ExecutionStageTimings;
  denominators: ExecutionDenominators;
  pipelineMetrics: Readonly<Record<string, number>>;
}>;
```

- [ ] **Step 2: Write the failing recorder tests**

`packages/node/etl/src/EtlEngine/crawlMetrics/crawlMetrics.test.ts`:

```ts
import { createCrawlMetricsRecorder } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import { describe, expect, it } from "vitest";
import type { EtlClock } from "@etl/EtlEngine/EtlEngine.types";

/** A clock whose monotonic time moves `stepMs` each time it is read. */
function _tickingClock(stepMs: number): EtlClock {
  let elapsedMs = 0;
  return {
    now: () => {
      return new Date(Date.UTC(2026, 9, 22) + elapsedMs);
    },
    monotonicMs: () => {
      elapsedMs += stepMs;
      return elapsedMs;
    },
  };
}

const NO_CRAWL_COUNTS = {
  connectionsFetched: 0,
  relationsWritten: 0,
  relationsUnchanged: 0,
};

describe("createCrawlMetricsRecorder", () => {
  it("adds each timed stage's elapsed milliseconds to that stage", async () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(5));

    await metrics.time("extractMs", async () => {});
    await metrics.time("extractMs", async () => {});
    await metrics.time("loadWriteMs", async () => {});

    const { timings } = metrics.snapshot(NO_CRAWL_COUNTS);
    expect([timings.extractMs, timings.loadWriteMs, timings.setupMs]).toEqual([
      10, 5, 0,
    ]);
  });

  it("still times a stage whose work throws, and rethrows", async () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(5));

    await expect(
      metrics.time("transformMs", async () => {
        throw new Error("transform failed");
      }),
    ).rejects.toThrow("transform failed");

    expect(metrics.snapshot(NO_CRAWL_COUNTS).timings.transformMs).toBe(5);
  });

  it("counts denominators, the widest listing, and source sizes", () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(1));

    metrics.count("pageCount", 1);
    metrics.count("pageCount", 1);
    metrics.observeListingWidth(4);
    metrics.observeListingWidth(9);
    metrics.observeListingWidth(2);
    metrics.addSourceBytes(100);
    metrics.addSourceBytes(50);

    expect(metrics.snapshot(NO_CRAWL_COUNTS).denominators).toMatchObject({
      pageCount: 2,
      maxColumnsPerListing: 9,
      sourceBytesReported: 150,
    });
  });

  it("leaves the source size unknown when nothing reported one", () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(1));

    expect(
      metrics.snapshot(NO_CRAWL_COUNTS).denominators.sourceBytesReported,
    ).toBe(undefined);
  });

  it("completes the denominators with the crawl's own counts", () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(1));

    expect(
      metrics.snapshot({
        connectionsFetched: 12,
        relationsWritten: 7,
        relationsUnchanged: 5,
      }).denominators,
    ).toMatchObject({
      datasetsFetched: 12,
      listingsWritten: 7,
      listingsUnchanged: 5,
    });
  });

  it("collects a pipeline's own counters and timers", async () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(3));

    metrics.pipelineMetrics.increment("hdx.parquet_footer_reads");
    metrics.pipelineMetrics.increment("hdx.parquet_footer_reads", 2);
    await metrics.pipelineMetrics.time("hdx.parquet_footer_read_ms", async () => {});

    expect(metrics.snapshot(NO_CRAWL_COUNTS).pipelineMetrics).toEqual({
      "hdx.parquet_footer_reads": 3,
      "hdx.parquet_footer_read_ms": 3,
    });
  });

  it("rounds fractional milliseconds, as the database stores whole ones", async () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(0.6));

    await metrics.time("extractMs", async () => {});

    expect(metrics.snapshot(NO_CRAWL_COUNTS).timings.extractMs).toBe(1);
  });
});
```

Run: `pnpm --filter @avandar/etl exec vitest run src/EtlEngine/crawlMetrics`.
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write `crawlMetrics.ts`**

```ts
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import type {
  EtlClock,
  EtlCrawlMetrics,
  EtlPipelineMetrics,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  ExecutionDenominators,
  ExecutionStageTimings,
} from "@etl/stores/ExecutionStore.types";

/** The clock the engine reads unless a config replaces it. */
export const SYSTEM_CLOCK: EtlClock = {
  now: () => {
    return new Date();
  },
  monotonicMs: () => {
    return performance.now();
  },
};

/** The metrics of a crawl that did no work. */
export const NO_CRAWL_METRICS: EtlCrawlMetrics = {
  timings: NO_STAGE_TIMINGS,
  denominators: NO_DENOMINATORS,
  pipelineMetrics: {},
};

/** One timed stage of a crawl. */
export type EtlStage = keyof ExecutionStageTimings;

/**
 * A denominator the recorder counts by adding to it. The crawl's own counts
 * (fetched, written, unchanged) come from its progress instead.
 */
export type CountedDenominator = Exclude<
  keyof ExecutionDenominators,
  | "datasetsFetched"
  | "listingsWritten"
  | "listingsUnchanged"
  | "maxColumnsPerListing"
  | "sourceBytesReported"
>;

/** The crawl's own counts, which complete a snapshot's denominators. */
export type CrawlCounts = Readonly<{
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
}>;

/** Accumulates one crawl's timings and denominators as it runs. */
export type CrawlMetricsRecorder = Readonly<{
  /** Runs `work` and adds how long it took to `stage`, even if it throws. */
  time: <T>(stage: EtlStage, work: () => Promise<T>) => Promise<T>;
  count: (denominator: CountedDenominator, by: number) => void;
  /** Keeps the widest listing's column count. */
  observeListingWidth: (columnCount: number) => void;
  /** Adds a size the source reported for one relation. */
  addSourceBytes: (bytes: number) => void;
  /** Handed to the pipeline's `extract` and `transform`. */
  pipelineMetrics: EtlPipelineMetrics;
  /** Everything recorded so far, completed with the crawl's own counts. */
  snapshot: (counts: CrawlCounts) => EtlCrawlMetrics;
}>;

async function _timed<T>(args: {
  clock: EtlClock;
  work: () => Promise<T>;
  onElapsed: (elapsedMs: number) => void;
}): Promise<T> {
  const startMs = args.clock.monotonicMs();
  try {
    return await args.work();
  } finally {
    args.onElapsed(args.clock.monotonicMs() - startMs);
  }
}

function _roundValues<TKey extends string>(
  values: Readonly<Record<TKey, number>>,
): Record<TKey, number> {
  return Object.fromEntries(
    Object.entries<number>(values).map(([key, value]) => {
      return [key, Math.round(value)];
    }),
  ) as Record<TKey, number>;
}

function _createPipelineMetrics(
  clock: EtlClock,
  values: Record<string, number>,
): EtlPipelineMetrics {
  const add = (name: string, by: number): void => {
    values[name] = (values[name] ?? 0) + by;
  };
  return {
    increment: (name, by = 1) => {
      add(name, by);
    },
    time: (name, work) => {
      return _timed({
        clock,
        work,
        onElapsed: (elapsedMs) => {
          add(name, elapsedMs);
        },
      });
    },
  };
}

/**
 * Creates a recorder for one crawl's timings and denominators. Stage times
 * are read from `clock.monotonicMs`, summed per stage, and rounded to whole
 * milliseconds in each snapshot.
 *
 * @param clock - The engine's clock.
 */
export function createCrawlMetricsRecorder(
  clock: EtlClock,
): CrawlMetricsRecorder {
  const timings: Record<EtlStage, number> = { ...NO_STAGE_TIMINGS };
  const counts: Record<CountedDenominator, number> = {
    pageCount: 0,
    listingsConsidered: 0,
    writeBatches: 0,
    columnsConsidered: 0,
    columnsWritten: 0,
    sourceCsvBytes: 0,
    parquetBytesWritten: 0,
    parquetRowsWritten: 0,
    parquetUploadsSkipped: 0,
  };
  const widest = { columnCount: 0 };
  const reported: { bytes: number | undefined } = { bytes: undefined };
  const pipelineValues: Record<string, number> = {};
  return {
    time: (stage, work) => {
      return _timed({
        clock,
        work,
        onElapsed: (elapsedMs) => {
          timings[stage] += elapsedMs;
        },
      });
    },
    count: (denominator, by) => {
      counts[denominator] += by;
    },
    observeListingWidth: (columnCount) => {
      widest.columnCount = Math.max(widest.columnCount, columnCount);
    },
    addSourceBytes: (bytes) => {
      reported.bytes = (reported.bytes ?? 0) + bytes;
    },
    pipelineMetrics: _createPipelineMetrics(clock, pipelineValues),
    snapshot: (crawlCounts) => {
      return {
        timings: _roundValues(timings),
        denominators: {
          ...counts,
          datasetsFetched: crawlCounts.connectionsFetched,
          listingsWritten: crawlCounts.relationsWritten,
          listingsUnchanged: crawlCounts.relationsUnchanged,
          maxColumnsPerListing: widest.columnCount,
          sourceBytesReported: reported.bytes,
        },
        pipelineMetrics: _roundValues(pipelineValues),
      };
    },
  };
}
```

Run the tests again. Expected: PASS.

- [ ] **Step 4: Export, check, commit**

In `index.ts`, add `EtlClock`, `EtlCrawlMetrics`, and `EtlPipelineMetrics` to
the `export type { ... } from "@etl/EtlEngine/EtlEngine.types"` list, and:

```ts
export {
  NO_CRAWL_METRICS,
  SYSTEM_CLOCK,
} from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
```

```bash
pnpm --filter @avandar/etl exec vitest run src/EtlEngine/crawlMetrics
pnpm --filter @avandar/etl exec tsc --noEmit -p .
pnpm exec oxfmt --ignore-path .oxfmtignore packages/node/etl/src/EtlEngine/crawlMetrics/crawlMetrics.ts packages/node/etl/src/EtlEngine/crawlMetrics/crawlMetrics.test.ts packages/node/etl/src/EtlEngine/EtlEngine.types.ts packages/node/etl/src/index.ts
pnpm exec eslint packages/node/etl/src/EtlEngine/crawlMetrics packages/node/etl/src/EtlEngine/EtlEngine.types.ts packages/node/etl/src/index.ts
git add packages/node/etl/src/EtlEngine/crawlMetrics packages/node/etl/src/EtlEngine/EtlEngine.types.ts packages/node/etl/src/index.ts
git commit -m "feat(etl): add a per-crawl metrics recorder with an injectable clock

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 6: Measure every crawl

**Files:**
- Modify: `packages/node/etl/src/EtlEngine/EtlEngine.types.ts`
- Modify: `packages/node/etl/src/EtlEngine/crawlScope/crawlScope.ts`
- Modify: `packages/node/etl/src/EtlEngine/loadRelationsPage/loadRelationsPage.ts`
- Modify: `packages/node/etl/src/EtlEngine/prepareParquetRelation/prepareParquetRelation.ts`
- Modify: `packages/node/etl/src/EtlEngine/createEtlEngine/createEtlEngine.ts`
- Tests: `loadRelationsPage.test.ts`, `prepareParquetRelation.test.ts`,
  `createEtlEngine.test.ts`, and the report fixtures listed in Step 9

The report grows here; recording comes in Task 7.

- [ ] **Step 1: Extend the types**

In `EtlEngine.types.ts`:

1. Add to `RelationDescription`, after `coverageEndDate`:

   ```ts
     /**
      * The size in bytes the source reports for this relation's data, such
      * as a CKAN resource's `size`. Summed into the crawl's
      * `sourceBytesReported`.
      */
     sourceSizeBytes?: number;
   ```

2. Add to `EtlEngineConfig`, after `stores?`:

   ```ts
       /** Replaces the system clock, for tests. */
       clock?: EtlClock;
   ```

3. Add `metrics: EtlPipelineMetrics;` to the argument objects of both
   `extract` and `transform`, after `pipelineRunId`, with the comment
   `/** Counters and timers this pipeline adds to the crawl's metrics. */`.

4. Add to `EtlCrawlReport`, after `error?`:

   ```ts
     /** When the crawl started and ended. */
     startedAt: Date;
     finishedAt: Date;
     /** The scope's checkpoint when the crawl started and when it ended. */
     checkpointBefore: Date | undefined;
     checkpointAfter: Date | undefined;
     /** The crawl's stage timings and the denominators that explain them. */
     metrics: EtlCrawlMetrics;
   ```

Run `pnpm --filter @avandar/etl exec tsc --noEmit -p .`. Expected: errors in
`crawlScope.ts` and in tests building reports. The next steps fix them.

- [ ] **Step 2: Write the failing load-page tests**

In `loadRelationsPage.test.ts`:

1. Import `createCrawlMetricsRecorder`, `SYSTEM_CLOCK` from
   `@etl/EtlEngine/crawlMetrics/crawlMetrics` and the type `EtlClock`.
2. In `_context`, add `metrics: createCrawlMetricsRecorder(SYSTEM_CLOCK),`
   before `...overrides`.
3. Add these tests inside `describe("loadRelationsPage", ...)`:

```ts
  it("counts the listings and columns it considered and wrote, the widest listing, and source sizes", async () => {
    const listings = createInMemoryListingsStore();
    const metrics = createCrawlMetricsRecorder(SYSTEM_CLOCK);
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: [_apiRelation(1, { columns: [COLUMN_A] })],
      context: _context(stores),
    });

    await loadRelationsPage({
      relations: [
        _apiRelation(1, { columns: [COLUMN_A] }),
        _apiRelation(2, {
          columns: [COLUMN_A, COLUMN_B],
          sourceSizeBytes: 300,
        }),
      ],
      context: _context(stores, { metrics }),
    });

    expect(
      metrics.snapshot({
        connectionsFetched: 0,
        relationsWritten: 0,
        relationsUnchanged: 0,
      }).denominators,
    ).toMatchObject({
      listingsConsidered: 2,
      columnsConsidered: 3,
      columnsWritten: 2,
      maxColumnsPerListing: 2,
      writeBatches: 1,
      sourceBytesReported: 300,
    });
  });

  it("times reading stored rows and each write batch", async () => {
    let elapsedMs = 0;
    const tickingClock: EtlClock = {
      now: () => {
        return new Date(elapsedMs);
      },
      monotonicMs: () => {
        elapsedMs += 1;
        return elapsedMs;
      },
    };
    const metrics = createCrawlMetricsRecorder(tickingClock);

    await loadRelationsPage({
      relations: [_apiRelation(1)],
      context: _context(
        { listings: createInMemoryListingsStore(), objects: undefined },
        { metrics },
      ),
    });

    const { timings } = metrics.snapshot({
      connectionsFetched: 0,
      relationsWritten: 0,
      relationsUnchanged: 0,
    });
    expect([timings.loadReadMs > 0, timings.loadWriteMs > 0]).toEqual([
      true,
      true,
    ]);
  });
```

Run: `pnpm --filter @avandar/etl exec vitest run src/EtlEngine/loadRelationsPage`.
Expected: FAIL (type errors on `metrics` and `sourceSizeBytes`, then wrong
counts).

- [ ] **Step 3: Instrument `loadRelationsPage.ts`**

1. Import `CrawlMetricsRecorder` (type) from
   `@etl/EtlEngine/crawlMetrics/crawlMetrics`.
2. Add to `LoadRelationsPageContext`:

   ```ts
     /** The crawl's metrics, which this page's reads and writes add to. */
     metrics: CrawlMetricsRecorder;
   ```

3. In `_buildRowAndColumns`, pass `metrics: context.metrics,` to
   `prepareParquetRelation` (Step 5 adds the parameter).
4. Add after `_prepareRelation`:

   ```ts
   function _countConsidered(args: {
     relations: readonly Relation[];
     preparedRelations: readonly _PreparedRelation[];
     metrics: CrawlMetricsRecorder;
   }): void {
     const { metrics } = args;
     metrics.count("listingsConsidered", args.preparedRelations.length);
     args.preparedRelations.forEach(({ columns }) => {
       metrics.count("columnsConsidered", columns.length);
       metrics.observeListingWidth(columns.length);
     });
     args.relations.forEach((relation) => {
       if (relation.sourceSizeBytes !== undefined) {
         metrics.addSourceBytes(relation.sourceSizeBytes);
       }
     });
   }
   ```

5. Replace `_writeChangedRelations` with:

   ```ts
   async function _writeChangedRelations(args: {
     changedRelations: readonly _PreparedRelation[];
     listings: ListingsStore;
     metrics: CrawlMetricsRecorder;
   }): Promise<void> {
     const { metrics } = args;
     args.changedRelations.forEach(({ columns }) => {
       metrics.count("columnsWritten", columns.length);
     });
     // Sequential on purpose: batches go oldest connection first, so a failure
     // partway leaves an oldest-first prefix of the page written.
     await promiseMapSequential(
       _splitIntoWriteBatches(args.changedRelations),
       (batch) => {
         metrics.count("writeBatches", 1);
         return metrics.time("loadWriteMs", () => {
           return args.listings.upsertListingsWithColumns(
             batch.map(({ row, columns }) => {
               return { row, columns };
             }),
           );
         });
       },
     );
   }
   ```

6. In `loadRelationsPage`, time the read and count what was considered:

   ```ts
     const storedByKey = await context.metrics.time("loadReadMs", () => {
       return _readStoredRowsByKey({
         rows: relationsWithRows.map(({ row }) => {
           return row;
         }),
         listings: context.stores.listings,
       });
     });
     const preparedRelations = await promiseMapSequential(
       relationsWithRows,
       (relationWithRow) => {
         return _prepareRelation({ relationWithRow, storedByKey, context });
       },
     );
     _countConsidered({
       relations: args.relations,
       preparedRelations,
       metrics: context.metrics,
     });
   ```

   and pass `metrics: context.metrics` to `_writeChangedRelations`. Add to the
   function's JSDoc: "Adds the page's load timings and denominators to
   `context.metrics`."

Run the load-page tests. Expected: they fail only on `prepareParquetRelation`
not taking `metrics` yet (a type error); Step 5 fixes that.

- [ ] **Step 4: Write the failing Parquet tests**

In `prepareParquetRelation.test.ts`:

1. Import `createCrawlMetricsRecorder` and `SYSTEM_CLOCK` from
   `@etl/EtlEngine/crawlMetrics/crawlMetrics`, and `stat` from
   `node:fs/promises`.
2. Give `_prepare` an optional `metrics?: CrawlMetricsRecorder` argument
   (import the type), and pass
   `metrics: args.metrics ?? createCrawlMetricsRecorder(SYSTEM_CLOCK),` to
   `prepareParquetRelation`.
3. Add:

```ts
  it("counts the CSV's bytes and the uploaded Parquet's bytes and rows", async () => {
    const metrics = createCrawlMetricsRecorder(SYSTEM_CLOCK);
    const objects = createInMemoryObjectStore();

    await _prepare({ objects, metrics });

    const { denominators } = metrics.snapshot({
      connectionsFetched: 0,
      relationsWritten: 0,
      relationsUnchanged: 0,
    });
    expect([
      denominators.sourceCsvBytes,
      denominators.parquetBytesWritten > 0,
      denominators.parquetRowsWritten,
      denominators.parquetUploadsSkipped,
    ]).toEqual([(await stat(csvPath)).size, true, 2, 0]);
  });

  it("counts a skipped upload and no bytes written", async () => {
    const first = await _prepare({});
    const metrics = createCrawlMetricsRecorder(SYSTEM_CLOCK);

    await _prepare({ stored: { ...first.row, id: "listing-1" }, metrics });

    const { denominators } = metrics.snapshot({
      connectionsFetched: 0,
      relationsWritten: 0,
      relationsUnchanged: 0,
    });
    expect([
      denominators.parquetUploadsSkipped,
      denominators.parquetBytesWritten,
    ]).toEqual([1, 0]);
  });
```

Run: `pnpm --filter @avandar/etl exec vitest run src/EtlEngine/prepareParquetRelation`.
Expected: FAIL.

- [ ] **Step 5: Instrument `prepareParquetRelation.ts`**

1. Import `stat` with the existing `node:fs/promises` import, and the
   `CrawlMetricsRecorder` type.
2. Add `metrics: CrawlMetricsRecorder;` to `_PrepareParquetRelationArgs`, with
   the comment `/** The crawl's metrics: build and upload times and sizes. */`.
3. Add:

   ```ts
   /**
    * Builds the Parquet file, timed as the crawl's Parquet build, and counts
    * the input CSV's size.
    */
   async function _buildParquetFileTimed(
     args: _PrepareParquetRelationArgs,
   ): Promise<_ParquetFile> {
     return args.metrics.time("loadParquetBuildMs", async () => {
       const csvStat = await stat(args.relation.csvPath);
       args.metrics.count("sourceCsvBytes", csvStat.size);
       return _buildParquetFile(args);
     });
   }

   /**
    * Uploads the object unless the stored row already records it, timing the
    * upload and counting its bytes and rows, or counting the skip.
    */
   async function _uploadUnlessCurrent(args: {
     prepareArgs: _PrepareParquetRelationArgs;
     objects: ObjectStore;
     parquet: _ParquetFile;
     storagePath: string;
     metadata: Readonly<Record<string, unknown>>;
   }): Promise<void> {
     const { metrics, stored } = args.prepareArgs;
     if (_isStoredObjectCurrent({ stored, metadata: args.metadata })) {
       metrics.count("parquetUploadsSkipped", 1);
       return;
     }
     await metrics.time("loadParquetUploadMs", () => {
       return args.objects.upload({
         path: args.storagePath,
         bytes: args.parquet.bytes,
         contentType: PARQUET_CONTENT_TYPE,
       });
     });
     metrics.count("parquetBytesWritten", args.parquet.bytes.byteLength);
     metrics.count("parquetRowsWritten", args.parquet.rowCount);
   }
   ```

4. In `prepareParquetRelation`, replace `await _buildParquetFile(args)` with
   `await _buildParquetFileTimed(args)`, and replace the
   `if (!_isStoredObjectCurrent(...)) { await objects.upload(...) }` block with:

   ```ts
     await _uploadUnlessCurrent({
       prepareArgs: args,
       objects,
       parquet,
       storagePath,
       metadata,
     });
   ```

Run the Parquet tests and the load-page tests. Expected: PASS.

- [ ] **Step 6: Write the failing crawl tests**

In `createEtlEngine.test.ts`:

1. Import `EtlClock` (type) and `NO_CRAWL_METRICS` from the engine.
2. Add a `clock?: EtlClock` argument to `_config` and spread
   `...(args.clock === undefined ? {} : { clock: args.clock }),` into the
   returned config.
3. Add this helper after `_crawlsOf`:

   ```ts
   /** A clock whose monotonic time moves 1 ms each time it is read. */
   function _tickingClock(): EtlClock {
     let elapsedMs = 0;
     return {
       now: () => {
         return new Date(Date.UTC(2026, 9, 22) + elapsedMs);
       },
       monotonicMs: () => {
         elapsedMs += 1;
         return elapsedMs;
       },
     };
   }
   ```

4. Fix `it("reports each drive's window, counts, and newest timestamp")`: its
   expected crawl gains

   ```ts
               startedAt: expect.any(Date),
               finishedAt: expect.any(Date),
               checkpointBefore: undefined,
               checkpointAfter: undefined,
               metrics: expect.objectContaining({
                 denominators: expect.objectContaining({ pageCount: 1 }),
               }),
   ```

   Both checkpoints are `undefined`: with `since` set and no stored
   checkpoint, `isCrawlContiguousWithCheckpoint` is false, so the crawl never
   advances one.

5. Add a new `describe("metrics", ...)` block:

```ts
  describe("metrics", () => {
    it("times each crawl's stages and dates it", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)], [_connection("c2", 2)]])],
          recorder: _recorder(),
          stores: _stores(),
          clock: _tickingClock(),
        }),
        { mode: "incremental" },
      );

      const [crawl] = report.crawls;
      const timings = crawl?.metrics.timings;
      expect([
        timings !== undefined && timings.setupMs > 0,
        timings !== undefined && timings.extractMs > 0,
        timings !== undefined && timings.transformMs > 0,
        timings !== undefined && timings.loadWriteMs > 0,
        timings !== undefined && timings.checkpointWriteMs > 0,
        crawl !== undefined &&
          crawl.finishedAt.getTime() > crawl.startedAt.getTime(),
      ]).toEqual([true, true, true, true, true, true]);
    });

    it("counts pages, datasets, and listings, and records the checkpoint before and after", async () => {
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 0)],
      });
      const listings = createInMemoryListingsStore();
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("c1", 1, 2)], [_connection("c2", 2)]]),
          ],
          recorder: _recorder(),
          stores: _stores(listings, checkpoints),
        }),
        { mode: "incremental" },
      );

      const [crawl] = report.crawls;
      expect([
        crawl?.metrics.denominators.pageCount,
        crawl?.metrics.denominators.datasetsFetched,
        crawl?.metrics.denominators.listingsConsidered,
        crawl?.metrics.denominators.listingsWritten,
        crawl?.checkpointBefore,
        crawl?.checkpointAfter,
      ]).toEqual([2, 2, 3, 3, _at(0), _at(2)]);
    });

    it("collects the pipeline's own metrics from transform", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1), _connection("c2", 2)]])],
          recorder: _recorder(),
          stores: _stores(),
          transform: ({ connection, metrics }) => {
            metrics.increment("fake.transforms");
            return _relationsFor(connection);
          },
        }),
      );

      expect(report.crawls[0]?.metrics.pipelineMetrics).toEqual({
        "fake.transforms": 2,
      });
    });

    it("reports zero metrics for a crawl skipped by the limit", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(),
        }),
        { mode: "full", limit: 1 },
      );

      expect(report.crawls[1]).toMatchObject({
        status: "skipped",
        metrics: NO_CRAWL_METRICS,
      });
    });
  });
```

Run: `pnpm --filter @avandar/etl exec vitest run src/EtlEngine/createEtlEngine`.
Expected: FAIL.

- [ ] **Step 7: Instrument `crawlScope.ts`**

1. Imports: add
   `import { createCrawlMetricsRecorder, NO_CRAWL_METRICS } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";`,
   `import type { CrawlMetricsRecorder } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";`,
   and `EtlClock`, `EtlCrawlMetrics` to the `EtlEngine.types` type import.
2. Add `clock: EtlClock;` to `CrawlScopeArgs`, after `syncedAt`, with the
   comment `/** Dates the crawl and times its stages. */`.
3. Add `metrics: CrawlMetricsRecorder;` to `_PagesArgs`, with the comment
   `/** The crawl's metrics recorder. */`.
4. Replace `_CrawlResultArgs`, `_buildCrawlResult`, and
   `buildUncrawledCrawlResult` with:

   ```ts
   type _CrawlResultArgs = Readonly<{
     driveKey: string;
     scopeKey: string;
     window: EtlRunWindow;
     counts: _CrawlCounts;
     outcome: CrawlOutcome;
     startedAt: Date;
     finishedAt: Date;
     checkpointBefore: Date | undefined;
     checkpointAfter: Date | undefined;
     metrics: EtlCrawlMetrics;
   }>;

   function _buildCrawlResult(args: _CrawlResultArgs): CrawlScopeResult {
     const { counts, outcome } = args;
     const base = {
       driveKey: args.driveKey,
       scopeKey: args.scopeKey,
       window: args.window,
       connectionsFetched: counts.connectionsFetched,
       relationsWritten: counts.relationsWritten,
       relationsUnchanged: counts.relationsUnchanged,
       newestTimestamp: counts.newestTimestamp,
       startedAt: args.startedAt,
       finishedAt: args.finishedAt,
       checkpointBefore: args.checkpointBefore,
       checkpointAfter: args.checkpointAfter,
       metrics: args.metrics,
     };
     if (outcome.status !== "failed") {
       return { report: { ...base, status: outcome.status } };
     }
     const { error } = outcome;
     return {
       report: {
         ...base,
         status: "failed",
         error: error instanceof Error ? error.message : String(error),
       },
       error,
     };
   }

   /**
    * The result for a crawl that never got as far as fetching a page: one
    * skipped for the limit, one whose checkpoint could not be read, or a drive
    * that failed before its scopes were known. It reports zero metrics.
    *
    * @param args.driveKey - The drive, or `listDrives[<index>]`.
    * @param args.scopeKey - The scope, or `ETL_UNLISTED_SCOPE_KEY`.
    * @param args.options - The run's options, for the reported window.
    * @param args.outcome - Skipped, or failed with what was thrown.
    * @param args.startedAt - When the crawl was reached.
    * @param args.finishedAt - When it was given up.
    * @returns The result, with zero counts.
    */
   export function buildUncrawledCrawlResult(args: {
     driveKey: string;
     scopeKey: string;
     options: EtlRunOptions;
     outcome: CrawlOutcome;
     startedAt: Date;
     finishedAt: Date;
   }): CrawlScopeResult {
     return _buildCrawlResult({
       driveKey: args.driveKey,
       scopeKey: args.scopeKey,
       // With no checkpoint read, the window is the run's own bounds.
       window: resolveRunWindow({
         options: args.options,
         checkpoint: undefined,
       }),
       counts: NO_CRAWL_COUNTS,
       outcome: args.outcome,
       startedAt: args.startedAt,
       finishedAt: args.finishedAt,
       checkpointBefore: undefined,
       checkpointAfter: undefined,
       metrics: NO_CRAWL_METRICS,
     });
   }
   ```

5. In `_transformConnections`, pass `metrics: args.metrics.pipelineMetrics,`
   to `config.transform`. In `_buildLoadContext`, add
   `metrics: args.metrics,`.
6. In `_loadPage`, time the transform:

   ```ts
     const relations = await args.metrics.time("transformMs", () => {
       return _transformConnections({ ...args, connections });
     });
     const loaded = await loadRelationsPage({
       relations,
       context: _buildLoadContext(args),
     });
   ```

7. Add before `_crawlPages`:

   ```ts
   /**
    * Yields the extract's pages, timing each wait for the next page as the
    * crawl's extract stage and counting the pages. Closes the extract's
    * iterator when the crawl stops early, as `for await` would.
    */
   async function* _timePages<TConnection>(args: {
     pages: AsyncIterable<readonly TConnection[]>;
     metrics: CrawlMetricsRecorder;
   }): AsyncGenerator<readonly TConnection[]> {
     const iterator = args.pages[Symbol.asyncIterator]();
     try {
       // Sequential on purpose: each `next()` is timed on its own, which a
       // `for await` over the extract cannot do.
       while (true) {
         const next = await args.metrics.time("extractMs", () => {
           return iterator.next();
         });
         if (next.done === true) {
           return;
         }
         args.metrics.count("pageCount", 1);
         yield next.value;
       }
     } finally {
       await iterator.return?.();
     }
   }
   ```

8. In `_crawlPages`, wrap the extract and time the checkpoint write:

   ```ts
       const pages = _timePages({
         pages: args.config.extract({
           drive: args.drive,
           scope: args.scope,
           window: args.window,
           pipelineRunId: args.pipelineRunId,
           metrics: args.metrics.pipelineMetrics,
         }),
         metrics: args.metrics,
       });
   ```

   and

   ```ts
         const checkpoint = await args.metrics.time("checkpointWriteMs", () => {
           return advanceCrawlCheckpoint({
             checkpoint: progress.checkpoint,
             pageTimestamps: loaded.pageTimestamps,
             syncedAt: args.syncedAt,
             pipelineRunId: args.pipelineRunId,
           });
         });
   ```

9. Replace `crawlScope` with:

   ```ts
   export async function crawlScope<TDrive, TConnection, TScope extends EtlScope>(
     args: CrawlScopeArgs<TDrive, TConnection, TScope>,
   ): Promise<CrawlScopeResult> {
     const { driveKey, options, clock } = args;
     const scopeKey = args.scope.key;
     const startedAt = clock.now();
     if (args.remaining <= 0) {
       return buildUncrawledCrawlResult({
         driveKey,
         scopeKey,
         options,
         outcome: { status: "skipped" },
         startedAt,
         finishedAt: startedAt,
       });
     }
     const metrics = createCrawlMetricsRecorder(clock);
     try {
       const start = await metrics.time("setupMs", () => {
         return _readScopeStart(args);
       });
       const { progress, outcome } = await _crawlPages({
         ...args,
         window: start.window,
         startCheckpoint: start.checkpoint,
         metrics,
       });
       return _buildCrawlResult({
         driveKey,
         scopeKey,
         window: start.window,
         counts: progress,
         outcome,
         startedAt,
         finishedAt: clock.now(),
         checkpointBefore: start.checkpoint?.current,
         checkpointAfter: progress.checkpoint?.current,
         metrics: metrics.snapshot(progress),
       });
     } catch (error: unknown) {
       // _crawlPages reports its own failures, so only reading the checkpoint
       // lands here.
       return buildUncrawledCrawlResult({
         driveKey,
         scopeKey,
         options,
         outcome: { status: "failed", error },
         startedAt,
         finishedAt: clock.now(),
       });
     }
   }
   ```

   Update its JSDoc: add "Dates the crawl, times its stages, and reports its
   metrics."

- [ ] **Step 8: Pass the clock through `createEtlEngine.ts`**

1. Import `SYSTEM_CLOCK` from `@etl/EtlEngine/crawlMetrics/crawlMetrics` and
   the `EtlClock` type.
2. Add `clock: EtlClock;` to `_CrawlTasksArgs`.
3. In `_runCrawlTask`, pass `clock: args.clock` to `crawlScope`, and give the
   unlisted-drive `buildUncrawledCrawlResult` call
   `startedAt: args.clock.now(), finishedAt: args.clock.now(),`.
4. In `run`, pass `clock: config.clock ?? SYSTEM_CLOCK,` to `_crawlInOrder`.

Run the engine suite:
`pnpm --filter @avandar/etl exec vitest run` and
`pnpm --filter @avandar/etl exec tsc --noEmit -p .`. Expected: PASS.

- [ ] **Step 9: Fix report fixtures elsewhere**

`EtlCrawlReport` now requires five more fields, so typed report literals in
other packages fail to type-check. Run
`pnpm --filter @avandar/pipeline-server exec tsc --noEmit -p .` and fix each
crawl literal it names (expect
`src/routes/pipeline-name/registerPipelineRoutes.test.ts`,
`pipelines/shared/runPipelineAndPrintReport/runPipelineAndPrintReport.test.ts`,
and any other it lists) by adding:

```ts
      startedAt: new Date("2026-10-22T10:00:00.000Z"),
      finishedAt: new Date("2026-10-22T10:00:01.000Z"),
      checkpointBefore: undefined,
      checkpointAfter: undefined,
      metrics: NO_CRAWL_METRICS,
```

importing `NO_CRAWL_METRICS` from `@avandar/etl`. If a test compares printed
or serialized output, update its expected value to match. Then:

```bash
pnpm --filter @avandar/pipeline-server exec tsc --noEmit -p .
pnpm --filter @avandar/pipeline-server exec vitest run
```

Expected: PASS.

- [ ] **Step 10: Format, lint, commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore <every .ts file you changed>
pnpm exec eslint <every .ts file you changed>
git add <every file you changed, by path>
git commit -m "feat(etl): time each crawl's stages and count what they worked on

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 7: Record each run

**Files:**
- Modify: `packages/node/etl/src/EtlEngine/EtlEngine.types.ts`
- Create: `packages/node/etl/src/EtlEngine/recordRunExecution/createRunExecutionRecorder.ts`
- Create: `packages/node/etl/src/EtlEngine/recordRunExecution/createRunExecutionRecorder.test.ts`
- Modify: `packages/node/etl/src/EtlEngine/createEtlEngine/createEtlEngine.ts`
- Modify: `packages/node/etl/src/EtlEngine/createEtlEngine/createEtlEngine.test.ts`
- Modify: `packages/node/etl/README.md`, `packages/node/etl/src/index.ts`
- Fix: run-report fixtures in `apps/pipeline-server` (Step 8)

- [ ] **Step 1: Extend the types**

In `EtlEngine.types.ts`:

1. Import the types `ExecutionInvocation` and `ExecutionStore` from
   `@etl/stores/ExecutionStore.types`, and `ExecutionFunctions` from
   `@etl/stores/SupabaseExecutionStore/createSupabaseExecutionStore`.
2. Add to `EtlRunOptions`:

   ```ts
     /**
      * How the run was started, recorded with it. A run without one, such as
      * a test or script calling a pipeline's `run()` directly, is not
      * recorded.
      */
     invocation?: ExecutionInvocation;
   ```

3. Add to `EtlOutput`:

   ```ts
     /**
      * The database functions that record each run, such as
      * `rpc_pipeline_executions__start`. Omit to record nothing.
      */
     executionFunctions?: ExecutionFunctions;
   ```

4. Add to `EtlStores`:

   ```ts
     /** Where runs are recorded. Omit to record nothing. */
     executions?: ExecutionStore;
   ```

5. Add to `EtlRunReport`, after `crawls`:

   ```ts
     /** When the run started and ended. */
     startedAt: Date;
     finishedAt: Date;
     /** Milliseconds listing drives and their scopes, before any crawl. */
     setupMs: number;
   ```

- [ ] **Step 2: Write the failing recorder tests**

`createRunExecutionRecorder.test.ts`:

```ts
import { NO_CRAWL_METRICS } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import {
  buildRunExecutionStart,
  createRunExecutionRecorder,
  getRunExecutionStatus,
} from "@etl/EtlEngine/recordRunExecution/createRunExecutionRecorder";
import { createInMemoryExecutionStore } from "@etl/stores/InMemoryExecutionStore/createInMemoryExecutionStore";
import { describe, expect, it } from "vitest";
import type {
  EtlCrawlReport,
  EtlPipelineRunId,
} from "@etl/EtlEngine/EtlEngine.types";

const RUN_ID = "00000000-0000-4000-8000-000000000001" as EtlPipelineRunId;
const STARTED_AT = new Date("2026-10-22T10:00:00.000Z");

function _crawl(overrides: Partial<EtlCrawlReport> = {}): EtlCrawlReport {
  return {
    driveKey: "https://data.cityofnewyork.us",
    scopeKey: "all",
    window: { since: undefined, until: undefined },
    connectionsFetched: 3,
    relationsWritten: 2,
    relationsUnchanged: 1,
    newestTimestamp: undefined,
    status: "ok",
    startedAt: STARTED_AT,
    finishedAt: new Date("2026-10-22T10:00:01.000Z"),
    checkpointBefore: undefined,
    checkpointAfter: undefined,
    metrics: NO_CRAWL_METRICS,
    ...overrides,
  };
}

describe("buildRunExecutionStart", () => {
  it("records the run's mode, flags, and parsed arguments", () => {
    expect(
      buildRunExecutionStart({
        pipelineName: "socrata",
        pipelineRunId: RUN_ID,
        startedAt: STARTED_AT,
        invocation: { invokedVia: "cli_local" },
        options: {
          mode: "incremental",
          until: new Date("2026-10-21T00:00:00.000Z"),
          limit: 5,
          scopes: ["all"],
        },
      }),
    ).toMatchObject({
      id: RUN_ID,
      command: "run",
      runMode: "incremental",
      isDryRun: false,
      isScoped: true,
      isLimited: true,
      isWindowed: true,
      arguments: {
        mode: "incremental",
        until: "2026-10-21T00:00:00.000Z",
        limit: 5,
        scopes: ["all"],
      },
    });
  });
});

describe("getRunExecutionStatus", () => {
  it.each([
    ["succeeded", [_crawl(), _crawl({ status: "skipped" })], undefined],
    [
      "partially_failed",
      [_crawl(), _crawl({ status: "failed", error: "boom" })],
      "boom",
    ],
    [
      "failed",
      [
        _crawl({ status: "failed", error: "first" }),
        _crawl({ status: "failed", error: "second" }),
      ],
      "first",
    ],
    ["succeeded", [], undefined],
  ] as const)("is %s, with the first error", (status, crawls, error) => {
    expect(getRunExecutionStatus(crawls)).toEqual({ status, error });
  });
});

describe("createRunExecutionRecorder", () => {
  it("records nothing without an invocation", async () => {
    const store = createInMemoryExecutionStore();
    const recorder = createRunExecutionRecorder({
      store,
      pipelineName: "socrata",
      pipelineRunId: RUN_ID,
      options: { mode: "full" },
      startedAt: STARTED_AT,
    });

    await recorder.start();
    await recorder.recordCrawl(_crawl());

    expect(store.getExecutions()).toEqual([]);
  });

  it("records each crawl as a scope, with its outcome and metrics", async () => {
    const store = createInMemoryExecutionStore();
    const recorder = createRunExecutionRecorder({
      store,
      pipelineName: "socrata",
      pipelineRunId: RUN_ID,
      options: { mode: "full", invocation: { invokedVia: "http" } },
      startedAt: STARTED_AT,
    });

    await recorder.start();
    await recorder.recordCrawl(
      _crawl({ status: "failed", error: "source answered 500" }),
    );

    expect(store.getExecutions()[0]?.scopes[0]).toMatchObject({
      driveKey: "https://data.cityofnewyork.us",
      scopeKey: "all",
      status: "failed",
      error: "source answered 500",
      deletions: undefined,
      timings: NO_CRAWL_METRICS.timings,
    });
  });
});
```

Run: `pnpm --filter @avandar/etl exec vitest run src/EtlEngine/recordRunExecution`.
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write `createRunExecutionRecorder.ts`**

```ts
import { createNeverFatalExecutionStore } from "@etl/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore";
import type {
  EtlCrawlReport,
  EtlCrawlStatus,
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunReport,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  ExecutionFinalStatus,
  ExecutionInvocation,
  ExecutionScope,
  ExecutionScopeStatus,
  ExecutionStart,
  ExecutionStore,
} from "@etl/stores/ExecutionStore.types";

/** Records one run as it goes. Every method resolves, even when recording fails. */
export type RunExecutionRecorder = Readonly<{
  start: () => Promise<void>;
  /** Records one finished crawl. */
  recordCrawl: (crawl: EtlCrawlReport) => Promise<void>;
  /** Records how the run ended, from its report. */
  finishWithReport: (report: EtlRunReport) => Promise<void>;
  /** Records a run that threw before it had a report. */
  finishWithError: (args: {
    error: unknown;
    finishedAt: Date;
    setupMs: number;
  }) => Promise<void>;
}>;

const NO_RECORDING: RunExecutionRecorder = {
  start: async () => {},
  recordCrawl: async () => {},
  finishWithReport: async () => {},
  finishWithError: async () => {},
};

const SCOPE_STATUS_BY_CRAWL_STATUS: Readonly<
  Record<EtlCrawlStatus, ExecutionScopeStatus>
> = {
  ok: "succeeded",
  failed: "failed",
  skipped: "skipped",
};

/** The run's options as the execution records them: ISO dates, set keys only. */
function _buildRunArguments(
  options: EtlRunOptions,
): Readonly<Record<string, unknown>> {
  return {
    mode: options.mode,
    ...(options.since === undefined
      ? {}
      : { since: options.since.toISOString() }),
    ...(options.until === undefined
      ? {}
      : { until: options.until.toISOString() }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
    ...(options.scopes === undefined ? {} : { scopes: [...options.scopes] }),
  };
}

/**
 * How a run's execution starts: the run's id, mode, flags, and parsed
 * options.
 */
export function buildRunExecutionStart(args: {
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  options: EtlRunOptions;
  invocation: ExecutionInvocation;
  startedAt: Date;
}): ExecutionStart {
  const { options } = args;
  return {
    id: args.pipelineRunId,
    pipelineName: args.pipelineName,
    command: "run",
    runMode: options.mode,
    isDryRun: false,
    isScoped: options.scopes !== undefined,
    isLimited: options.limit !== undefined,
    isWindowed: options.since !== undefined || options.until !== undefined,
    arguments: _buildRunArguments(options),
    invocation: args.invocation,
    startedAt: args.startedAt,
  };
}

/** One crawl, as an execution scope. */
export function buildExecutionScopeFromCrawl(
  crawl: EtlCrawlReport,
): ExecutionScope {
  return {
    driveKey: crawl.driveKey,
    scopeKey: crawl.scopeKey,
    status: SCOPE_STATUS_BY_CRAWL_STATUS[crawl.status],
    error: crawl.error,
    windowSince: crawl.window.since,
    windowUntil: crawl.window.until,
    checkpointBefore: crawl.checkpointBefore,
    checkpointAfter: crawl.checkpointAfter,
    startedAt: crawl.startedAt,
    finishedAt: crawl.finishedAt,
    timings: crawl.metrics.timings,
    denominators: crawl.metrics.denominators,
    deletions: undefined,
    pipelineMetrics: crawl.metrics.pipelineMetrics,
  };
}

/**
 * A run's final status: `failed` when every crawl failed, `partially_failed`
 * when some did, otherwise `succeeded`. The error is the first failed
 * crawl's.
 */
export function getRunExecutionStatus(
  crawls: readonly EtlCrawlReport[],
): Readonly<{ status: ExecutionFinalStatus; error: string | undefined }> {
  const failedCrawls = crawls.filter((crawl) => {
    return crawl.status === "failed";
  });
  if (failedCrawls.length === 0) {
    return { status: "succeeded", error: undefined };
  }
  return {
    status:
      failedCrawls.length === crawls.length ? "failed" : "partially_failed",
    error: failedCrawls[0]?.error,
  };
}

/**
 * Creates the recorder for one run. It records nothing when there is no
 * store or the run has no invocation. Recording never throws: a failure is
 * passed to `warn` (default `console.warn`), and after a failed start the
 * rest is skipped.
 */
export function createRunExecutionRecorder(args: {
  store: ExecutionStore | undefined;
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  options: EtlRunOptions;
  startedAt: Date;
  warn?: (message: string) => void;
}): RunExecutionRecorder {
  const { invocation } = args.options;
  if (args.store === undefined || invocation === undefined) {
    return NO_RECORDING;
  }
  const store = createNeverFatalExecutionStore({
    store: args.store,
    warn:
      args.warn ??
      ((message) => {
        console.warn(message);
      }),
  });
  const executionId = args.pipelineRunId;
  return {
    start: () => {
      return store.start(buildRunExecutionStart({ ...args, invocation }));
    },
    recordCrawl: (crawl) => {
      return store.recordScope({
        executionId,
        scope: buildExecutionScopeFromCrawl(crawl),
      });
    },
    finishWithReport: (report) => {
      return store.finish({
        executionId,
        outcome: {
          ...getRunExecutionStatus(report.crawls),
          finishedAt: report.finishedAt,
          setupMs: report.setupMs,
          deletions: undefined,
        },
      });
    },
    finishWithError: ({ error, finishedAt, setupMs }) => {
      return store.finish({
        executionId,
        outcome: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          finishedAt,
          setupMs,
          deletions: undefined,
        },
      });
    },
  };
}
```

Run the recorder tests. Expected: PASS.

- [ ] **Step 4: Write the failing engine tests**

In `createEtlEngine.test.ts`, import `createInMemoryExecutionStore`, and add:

```ts
  describe("recording", () => {
    const INVOCATION = {
      invokedVia: "cli_local",
      cliArgv: ["pipeline", "run", "fake-pipeline"],
    } as const;

    function _recordingStores(
      executions = createInMemoryExecutionStore(),
    ): EtlStores {
      return { ..._stores(), executions };
    }

    it("records the run's start, one scope per crawl, and its finish", async () => {
      const executions = createInMemoryExecutionStore();
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _recordingStores(executions),
        }),
        { mode: "full", invocation: INVOCATION },
      );

      const [execution] = executions.getExecutions();
      expect([
        execution?.start.id,
        execution?.start.invocation,
        execution?.scopes.map((scope) => {
          return [scope.driveKey, scope.status];
        }),
        execution?.outcome?.status,
      ]).toEqual([
        report.pipelineRunId,
        INVOCATION,
        [
          ["a", "succeeded"],
          ["b", "succeeded"],
        ],
        "succeeded",
      ]);
    });

    it("records partially_failed when some crawls fail", async () => {
      const executions = createInMemoryExecutionStore();
      await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]], 0),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _recordingStores(executions),
        }),
        { mode: "full", invocation: INVOCATION },
      );

      expect(executions.getExecutions()[0]?.outcome).toMatchObject({
        status: "partially_failed",
        error: "a failed",
      });
    });

    it("records failed, and still rejects, when every crawl fails", async () => {
      const executions = createInMemoryExecutionStore();
      await _runFailure(
        _config({
          drives: [_drive("a", [[_connection("a1", 1)]], 0)],
          recorder: _recorder(),
          stores: _recordingStores(executions),
        }),
        { mode: "full", invocation: INVOCATION },
      );

      expect(executions.getExecutions()[0]?.outcome?.status).toBe("failed");
    });

    it("records failed when a requested scope does not exist", async () => {
      const executions = createInMemoryExecutionStore();
      await expect(
        _run(
          _config({
            drives: [_drive("a", [[]])],
            recorder: _recorder(),
            stores: _recordingStores(executions),
          }),
          { mode: "full", scopes: ["nope"], invocation: INVOCATION },
        ),
      ).rejects.toThrow(EtlRunOptionsError);

      expect(executions.getExecutions()[0]?.outcome?.status).toBe("failed");
    });

    it("does not record a run rejected before it starts", async () => {
      const executions = createInMemoryExecutionStore();
      await expect(
        _run(
          _config({
            drives: [_drive("a", [[]])],
            recorder: _recorder(),
            stores: _recordingStores(executions),
            isIncremental: false,
          }),
          { mode: "incremental", invocation: INVOCATION },
        ),
      ).rejects.toThrow(EtlRunOptionsError);

      expect(executions.getExecutions()).toEqual([]);
    });

    it("does not record a run without an invocation", async () => {
      const executions = createInMemoryExecutionStore();
      await _run(
        _config({
          drives: [_drive("a", [[_connection("a1", 1)]])],
          recorder: _recorder(),
          stores: _recordingStores(executions),
        }),
      );

      expect(executions.getExecutions()).toEqual([]);
    });

    it("runs and reports normally when recording fails", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const failing = {
        ...createInMemoryExecutionStore(),
        start: async () => {
          throw new Error("no such function");
        },
      };

      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("a1", 1)]])],
          recorder: _recorder(),
          stores: { ..._stores(), executions: failing },
        }),
        { mode: "full", invocation: INVOCATION },
      );

      expect([report.crawls[0]?.status, warn.mock.calls.length]).toEqual([
        "ok",
        1,
      ]);
      warn.mockRestore();
    });

    it("reports when the run started and finished, and its setup time", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("a1", 1)]])],
          recorder: _recorder(),
          stores: _stores(),
          clock: _tickingClock(),
        }),
      );

      expect([
        report.finishedAt.getTime() > report.startedAt.getTime(),
        report.setupMs > 0,
      ]).toEqual([true, true]);
    });
  });
```

Add `vi` to the `vitest` import. Also extend the expected report in
`it("reports each drive's window, counts, and newest timestamp")` with
`startedAt: expect.any(Date), finishedAt: expect.any(Date), setupMs: expect.any(Number),`.

Run: `pnpm --filter @avandar/etl exec vitest run src/EtlEngine/createEtlEngine`.
Expected: FAIL.

- [ ] **Step 5: Record runs in `createEtlEngine.ts`**

1. Imports: `createRunExecutionRecorder` and its `RunExecutionRecorder` type
   from `@etl/EtlEngine/recordRunExecution/createRunExecutionRecorder`,
   `createSupabaseExecutionStore` from
   `@etl/stores/SupabaseExecutionStore/createSupabaseExecutionStore`, and the
   `EtlCrawlReport` type.
2. In `_createSupabaseStores`, add to the returned object:

   ```ts
       executions:
         output.executionFunctions === undefined
           ? undefined
           : createSupabaseExecutionStore({
               client,
               functions: output.executionFunctions,
             }),
   ```

3. Add `onCrawled: (crawl: EtlCrawlReport) => Promise<void>;` to
   `_CrawlTasksArgs`, and in `_crawlInOrder`'s reducer, after computing
   `result`:

   ```ts
         // Recorded as each crawl ends, so a long run's progress is visible
         // and a crash keeps the crawls that finished.
         await args.onCrawled(result.report);
   ```

4. Replace `_finishRun` with:

   ```ts
   function _buildRunReport(args: {
     pipelineRunId: EtlPipelineRunId;
     mode: EtlRunMode;
     results: readonly CrawlScopeResult[];
     startedAt: Date;
     finishedAt: Date;
     setupMs: number;
   }): EtlRunReport {
     return {
       pipelineRunId: args.pipelineRunId,
       mode: args.mode,
       crawls: args.results.map((result) => {
         return result.report;
       }),
       startedAt: args.startedAt,
       finishedAt: args.finishedAt,
       setupMs: args.setupMs,
     };
   }

   /**
    * @throws EtlRunFailedError, carrying the report, when every crawl failed.
    */
   function _throwWhenEveryCrawlFailed(args: {
     report: EtlRunReport;
     results: readonly CrawlScopeResult[];
   }): void {
     const { results } = args;
     const isEveryCrawlFailed =
       results.length > 0 &&
       results.every((result) => {
         return result.report.status === "failed";
       });
     if (isEveryCrawlFailed) {
       throw new EtlRunFailedError({
         report: args.report,
         errors: results.map((result) => {
           return result.error;
         }),
       });
     }
   }
   ```

5. Add the recorded run body:

   ```ts
   type _RecordedRunArgs<TDrive, TConnection, TScope extends EtlScope> =
     Readonly<{
       config: EtlEngineConfig<TDrive, TConnection, TScope>;
       options: EtlRunOptions;
       stores: EtlStores;
       clock: EtlClock;
       pipelineRunId: EtlPipelineRunId;
       startedAt: Date;
       execution: RunExecutionRecorder;
     }>;

   /**
    * Lists drives and scopes, crawls them, and builds the report, recording
    * each crawl as it ends and the run's outcome before resolving or
    * rejecting.
    */
   async function _runRecorded<TDrive, TConnection, TScope extends EtlScope>(
     args: _RecordedRunArgs<TDrive, TConnection, TScope>,
   ): Promise<EtlRunReport> {
     const { config, clock, execution } = args;
     const setupStartMs = clock.monotonicMs();
     let setupMs = 0;
     try {
       const resolvedDrives = selectRequestedScopes({
         pipelineName: config.name,
         resolvedDrives: await resolveDriveScopes({
           config,
           drives: await config.listDrives(),
         }),
         requestedScopeKeys: args.options.scopes,
       });
       setupMs = Math.round(clock.monotonicMs() - setupStartMs);
       const results = await _crawlInOrder({
         config,
         tasks: _buildCrawlTasks(resolvedDrives),
         options: args.options,
         pipelineRunId: args.pipelineRunId,
         stores: args.stores,
         syncedAt: args.startedAt,
         clock,
         onCrawled: execution.recordCrawl,
       });
       const report = _buildRunReport({
         pipelineRunId: args.pipelineRunId,
         mode: args.options.mode,
         results,
         startedAt: args.startedAt,
         finishedAt: clock.now(),
         setupMs,
       });
       await execution.finishWithReport(report);
       _throwWhenEveryCrawlFailed({ report, results });
       return report;
     } catch (error: unknown) {
       // A no-op when the report was already recorded.
       await execution.finishWithError({
         error,
         finishedAt: clock.now(),
         setupMs,
       });
       throw error;
     }
   }
   ```

6. Replace `run` in `createEtlEngine` with:

   ```ts
       run: async (options) => {
         _assertCanRun({ config, options });
         const stores = _resolveStores(config);
         const clock = config.clock ?? SYSTEM_CLOCK;
         const pipelineRunId = randomUUID() as EtlPipelineRunId;
         const startedAt = clock.now();
         const execution = createRunExecutionRecorder({
           store: stores.executions,
           pipelineName: config.name,
           pipelineRunId,
           options,
           startedAt,
         });
         await execution.start();
         return _runRecorded({
           config,
           options,
           stores,
           clock,
           pipelineRunId,
           startedAt,
           execution,
         });
       },
   ```

   Note `syncedAt` is now the run's `startedAt`, read from the clock, so a
   test clock controls `date_of_last_sync` too. Update the `createEtlEngine`
   JSDoc: "Each run with an invocation and an execution store is recorded:
   its start, each crawl as it ends, and its outcome. Recording never fails
   a run."

7. Update `EtlEngineInstance.run`'s JSDoc `@throws` list: unchanged, but add
   "A run that throws after it started is recorded as failed."

Run the engine suite and type-check:
`pnpm --filter @avandar/etl exec vitest run` and
`pnpm --filter @avandar/etl exec tsc --noEmit -p .`. Expected: PASS.

- [ ] **Step 6: Export**

In `index.ts`, add:

```ts
export {
  buildExecutionScopeFromCrawl,
  buildRunExecutionStart,
  createRunExecutionRecorder,
  getRunExecutionStatus,
  type RunExecutionRecorder,
} from "@etl/EtlEngine/recordRunExecution/createRunExecutionRecorder";
```

- [ ] **Step 7: Document it in `packages/node/etl/README.md`**

Add a section after "Output contract":

```markdown
## Execution recording

A run is recorded when its options carry an `invocation` (how it was started)
and the engine has an execution store: `output.executionFunctions` names the
three Supabase functions, or `stores.executions` replaces them in tests.

- `start` inserts the execution as `running` with its id (the run's
  `pipelineRunId`), mode, flags (`isScoped`, `isLimited`, `isWindowed`),
  parsed options, and invocation.
- `recordScope` records each crawl as it ends: its window, checkpoints,
  outcome, and `metrics`.
- `finish` records the outcome: `succeeded`, `partially_failed`, or
  `failed`, with the first error.

Recording never fails a run: a failed call is logged with `console.warn`,
and after a failed start the rest is skipped.

Every crawl report carries `startedAt`, `finishedAt`, `checkpointBefore`,
`checkpointAfter`, and `metrics`:

| Field | Holds |
| --- | --- |
| `metrics.timings` | Milliseconds in each stage, summed over pages: `setupMs`, `extractMs`, `transformMs`, `loadReadMs`, `loadParquetBuildMs`, `loadParquetUploadMs`, `loadWriteMs`, `checkpointWriteMs` |
| `metrics.denominators` | Pages, datasets, listings considered and written, write batches, columns considered and written, the widest listing, CSV and Parquet bytes and rows, and the source's reported bytes |
| `metrics.pipelineMetrics` | What `extract` and `transform` recorded through their `metrics` argument |

Stages interleave page by page, so their sum is not the crawl's wall-clock
time. `EtlEngineConfig.clock` replaces the system clock in tests.
```

- [ ] **Step 8: Fix run-report fixtures elsewhere**

`EtlRunReport` now requires `startedAt`, `finishedAt`, and `setupMs`. Run
`pnpm --filter @avandar/pipeline-server exec tsc --noEmit -p .` and add to
each run-report literal it names:

```ts
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
  finishedAt: new Date("2026-10-22T10:00:02.000Z"),
  setupMs: 0,
```

Then `pnpm --filter @avandar/pipeline-server exec vitest run`. Expected: PASS.

- [ ] **Step 9: Format, lint, commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore <every .ts file you changed>
pnpm exec eslint <every .ts file you changed>
git add <every file you changed, by path>
git commit -m "feat(etl): record each run's start, crawls, and outcome

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 8: Pipeline server and local runs record

**Files:**
- Modify: `apps/pipeline-server/pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination.ts`
- Create: `apps/pipeline-server/src/routes/pipeline-name/buildServerRunInvocation/buildServerRunInvocation.ts` and `.test.ts`
- Modify: `apps/pipeline-server/src/routes/pipeline-name/registerPipelineRoutes.ts` and `.test.ts`
- Modify: `apps/pipeline-server/src/routes/pipeline-name/run/run.ts` and `run.test.ts`
- Create: `apps/pipeline-server/pipelines/shared/readLocalRunInvocation/readLocalRunInvocation.ts` and `.test.ts`
- Modify: `scripts/runPipelineOnce.ts`
- Modify: `apps/pipeline-server/Dockerfile`
- Modify: `apps/pipeline-server/README.md`

- [ ] **Step 1: Name the functions in the destination**

In `getPipelineEtlDestination.ts`, add to `output`:

```ts
      executionFunctions: {
        start: "rpc_pipeline_executions__start",
        recordScope: "rpc_pipeline_executions__record_scope",
        finish: "rpc_pipeline_executions__finish",
      },
```

and add "and records each run through the pipeline execution functions" to
its JSDoc. Every pipeline now records any run that carries an invocation.

- [ ] **Step 2: Write the failing server invocation tests**

`buildServerRunInvocation.test.ts`:

```ts
import { buildServerRunInvocation } from "@pipeline-server/routes/pipeline-name/buildServerRunInvocation/buildServerRunInvocation";
import { describe, expect, it } from "vitest";

describe("buildServerRunInvocation", () => {
  it("records a CLI caller's argv and actor, with the server's host and commit", () => {
    expect(
      buildServerRunInvocation({
        invocationHeader: JSON.stringify({
          cliArgv: ["pipeline", "run", "hdx", "--incremental"],
          actor: "pablo@laptop",
          codeVersion: "the-cli-commit",
        }),
        requestBody: { incremental: true },
        host: "fly-machine",
        codeVersion: "server-commit",
      }),
    ).toEqual({
      invokedVia: "cli_server",
      cliArgv: ["pipeline", "run", "hdx", "--incremental"],
      actor: "pablo@laptop",
      requestBody: { incremental: true },
      host: "fly-machine",
      codeVersion: "server-commit",
    });
  });

  it.each([
    ["no header", undefined],
    ["a header that is not JSON", "not json"],
    ["a header whose argv is not a list of strings", JSON.stringify({ cliArgv: [1] })],
  ])("records any other caller as http, for %s", (_label, header) => {
    expect(
      buildServerRunInvocation({
        invocationHeader: header,
        requestBody: {},
        host: "fly-machine",
        codeVersion: undefined,
      }),
    ).toEqual({
      invokedVia: "http",
      requestBody: {},
      host: "fly-machine",
    });
  });
});
```

Run: `pnpm --filter @avandar/pipeline-server exec vitest run src/routes/pipeline-name/buildServerRunInvocation`.
Expected: FAIL.

- [ ] **Step 3: Write `buildServerRunInvocation.ts`**

```ts
import type { ExecutionInvocation } from "@avandar/etl";

/** The header the `ava` CLI sends its invocation in, as JSON. */
export const INVOCATION_HEADER = "x-ava-invocation";

type _CliInvocationHeader = Readonly<{
  cliArgv: readonly string[];
  actor: string | undefined;
}>;

function _isStringList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => {
      return typeof entry === "string";
    })
  );
}

/**
 * Reads the CLI's invocation header: its argv and actor. Any other field,
 * such as the CLI's own commit, is ignored, since `code_version` records the
 * code that executed the run.
 */
function _readCliInvocationHeader(
  header: unknown,
): _CliInvocationHeader | undefined {
  if (typeof header !== "string") {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(header);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }
  const { cliArgv, actor } = parsed as Record<string, unknown>;
  if (!_isStringList(cliArgv)) {
    return undefined;
  }
  return { cliArgv, actor: typeof actor === "string" ? actor : undefined };
}

/**
 * How a server run was started: `cli_server` with the CLI's argv and actor
 * when the request carries a valid `X-Ava-Invocation` header, otherwise
 * `http`. Both record the body the server received, the server's host, and
 * its commit. Authorization is never recorded.
 *
 * @param args.invocationHeader - The `X-Ava-Invocation` header, if sent.
 * @param args.requestBody - The body as received (`{}` when none was sent).
 * @param args.host - The server's hostname.
 * @param args.codeVersion - The server's commit, from `AVA_CODE_VERSION`.
 */
export function buildServerRunInvocation(args: {
  invocationHeader: unknown;
  requestBody: unknown;
  host: string;
  codeVersion: string | undefined;
}): ExecutionInvocation {
  const cli = _readCliInvocationHeader(args.invocationHeader);
  return {
    invokedVia: cli === undefined ? "http" : "cli_server",
    ...(cli === undefined ? {} : { cliArgv: cli.cliArgv }),
    ...(cli?.actor === undefined ? {} : { actor: cli.actor }),
    requestBody: args.requestBody,
    host: args.host,
    ...(args.codeVersion === undefined ? {} : { codeVersion: args.codeVersion }),
  };
}
```

Run the tests again. Expected: PASS.

- [ ] **Step 4: Pass the invocation through the route**

1. In `registerPipelineRoutes.test.ts`, every `toHaveBeenCalledWith` on
   `run` now also receives `invocation`. Change each to include
   `invocation: expect.objectContaining({ invokedVia: "http" })`, and add:

   ```ts
     it("passes the CLI's invocation and the request body to the run", async () => {
       server = await _createServer();

       await server.inject({
         method: "POST",
         url: "/example-pipeline/run",
         headers: {
           authorization: AUTH_HEADER,
           "x-ava-invocation": JSON.stringify({
             cliArgv: ["pipeline", "run", "example-pipeline"],
             actor: "pablo@laptop",
           }),
         },
         payload: { limit: 5 },
       });

       expect(vi.mocked(run).mock.calls[0]?.[0].invocation).toMatchObject({
         invokedVia: "cli_server",
         cliArgv: ["pipeline", "run", "example-pipeline"],
         actor: "pablo@laptop",
         requestBody: { limit: 5 },
       });
     });
   ```

   Run the route tests. Expected: FAIL.

2. In `registerPipelineRoutes.ts`, import `hostname` from `node:os`,
   `getOptionalEnvVar` from `@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar`,
   and `buildServerRunInvocation`, `INVOCATION_HEADER` from the new module.
   In `_runPipeline`, pass to `run`:

   ```ts
       const report = await run({
         pipelineName: request.params.pipelineName,
         ...options,
         invocation: buildServerRunInvocation({
           invocationHeader: request.headers[INVOCATION_HEADER],
           requestBody: request.body ?? {},
           host: hostname(),
           codeVersion: getOptionalEnvVar("AVA_CODE_VERSION"),
         }),
       });
   ```

   Add to the route's JSDoc: "Each run is recorded with the request body, the
   CLI's `X-Ava-Invocation` header when present, and the server's host and
   `AVA_CODE_VERSION`."

3. In `run/run.ts`, pass the invocation on:

   ```ts
     const { mode, since, until, limit, scopes, invocation } = options;
     return await (pipelineModule as PipelineRunModule).run({
       mode,
       since,
       until,
       limit,
       ...(scopes === undefined ? {} : { scopes }),
       ...(invocation === undefined ? {} : { invocation }),
     });
   ```

   In `run.test.ts`, copy the existing "passes scopes to the pipeline module's
   run" test as "passes the invocation to the pipeline module's run", passing
   `invocation: { invokedVia: "http" }` and expecting it in the module's call.

Run: `pnpm --filter @avandar/pipeline-server exec vitest run src/routes`.
Expected: PASS.

- [ ] **Step 5: Write the failing local invocation tests**

`readLocalRunInvocation.test.ts`:

```ts
import { readLocalRunInvocation } from "@pipelines/shared/readLocalRunInvocation/readLocalRunInvocation";
import { describe, expect, it } from "vitest";

describe("readLocalRunInvocation", () => {
  it("reads the CLI's invocation from the environment", () => {
    expect(
      readLocalRunInvocation({
        environmentValue: JSON.stringify({
          cliArgv: ["pipeline", "run", "hdx", "--local"],
          actor: "pablo@laptop",
          host: "laptop",
          codeVersion: "abc123",
        }),
        fallbackArgv: ["hdx"],
        fallbackHost: "other-host",
      }),
    ).toEqual({
      invokedVia: "cli_local",
      cliArgv: ["pipeline", "run", "hdx", "--local"],
      actor: "pablo@laptop",
      host: "laptop",
      codeVersion: "abc123",
    });
  });

  it.each([
    ["no environment value", undefined],
    ["a value that is not JSON", "nope"],
  ])("falls back to the script's own argv and host for %s", (_label, value) => {
    expect(
      readLocalRunInvocation({
        environmentValue: value,
        fallbackArgv: ["hdx", "--incremental"],
        fallbackHost: "laptop",
      }),
    ).toEqual({
      invokedVia: "cli_local",
      cliArgv: ["hdx", "--incremental"],
      host: "laptop",
    });
  });
});
```

Run: `pnpm --filter @avandar/pipeline-server exec vitest run pipelines/shared/readLocalRunInvocation`.
Expected: FAIL.

- [ ] **Step 6: Write `readLocalRunInvocation.ts`**

```ts
import type { ExecutionInvocation } from "@avandar/etl";

/** The variable the `ava` CLI passes a local run's invocation in, as JSON. */
export const LOCAL_RUN_INVOCATION_ENV = "AVA_PIPELINE_INVOCATION";

function _readOptionalString(
  record: Record<string, unknown>,
  key: string,
): Readonly<Record<string, string>> {
  const value = record[key];
  return typeof value === "string" ? { [key]: value } : {};
}

/**
 * How a local run was started. The `ava` CLI passes its argv, actor, host,
 * and commit as JSON in `AVA_PIPELINE_INVOCATION`; without a readable value,
 * such as when `scripts/runPipelineOnce.ts` is run by hand, the script's own
 * argv and host are recorded instead.
 *
 * @param args.environmentValue - `AVA_PIPELINE_INVOCATION`, if set.
 * @param args.fallbackArgv - The script's own argv.
 * @param args.fallbackHost - This machine's hostname.
 */
export function readLocalRunInvocation(args: {
  environmentValue: string | undefined;
  fallbackArgv: readonly string[];
  fallbackHost: string;
}): ExecutionInvocation {
  const fallback: ExecutionInvocation = {
    invokedVia: "cli_local",
    cliArgv: args.fallbackArgv,
    host: args.fallbackHost,
  };
  if (args.environmentValue === undefined) {
    return fallback;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.environmentValue);
  } catch {
    return fallback;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return fallback;
  }
  const record = parsed as Record<string, unknown>;
  const { cliArgv } = record;
  const isArgvList =
    Array.isArray(cliArgv) &&
    cliArgv.every((entry) => {
      return typeof entry === "string";
    });
  return {
    invokedVia: "cli_local",
    cliArgv: isArgvList ? (cliArgv as string[]) : args.fallbackArgv,
    ..._readOptionalString(record, "actor"),
    host: typeof record.host === "string" ? record.host : args.fallbackHost,
    ..._readOptionalString(record, "codeVersion"),
  };
}
```

Run the tests again. Expected: PASS.

- [ ] **Step 7: Use it in `scripts/runPipelineOnce.ts`**

Import `hostname` from `node:os` and `LOCAL_RUN_INVOCATION_ENV`,
`readLocalRunInvocation` from
`@pipelines/shared/readLocalRunInvocation/readLocalRunInvocation`. In `main`,
after `options` is parsed and the env file is loaded, replace
`await _runPipeline(run, options);` with:

```ts
  await _runPipeline(run, {
    ...options,
    invocation: readLocalRunInvocation({
      environmentValue: process.env[LOCAL_RUN_INVOCATION_ENV],
      fallbackArgv: process.argv.slice(2),
      fallbackHost: hostname(),
    }),
  });
```

- [ ] **Step 8: Bake the commit into the server image**

In `apps/pipeline-server/Dockerfile`, in the runner stage, after the
`WORKDIR /avandar/apps/pipeline-server` line:

```dockerfile
# The git commit this image was built from, recorded with every run. Pass it
# with `--build-arg AVA_CODE_VERSION=$(git rev-parse HEAD)`; unset, runs
# record no commit.
ARG AVA_CODE_VERSION
ENV AVA_CODE_VERSION=${AVA_CODE_VERSION}
```

- [ ] **Step 9: Document it in `apps/pipeline-server/README.md`**

Add a section "Execution history" after the scope paragraphs:

````markdown
## Execution history

Every `ava pipeline run`, `reset`, and `prune-retired-scopes` is recorded in
`pipeline_executions` (one row per command per pipeline) and
`pipeline_execution_scopes` (one row per drive and scope it worked on), with
the exact argv or HTTP body, the outcome, stage timings, and the counts and
sizes behind them. Nothing in the app reads them; query them directly:

```sql
-- When was each Socrata drive last crawled, and did it succeed?
select distinct on (drive_key) drive_key, started_at, status
from pipeline_execution_scopes
where pipeline_name = 'socrata'
order by drive_key, started_at desc;
```

Deploys should pass the commit, so server runs record it:
`fly deploy --config apps/pipeline-server/fly.production.toml --build-arg AVA_CODE_VERSION=$(git rev-parse HEAD)`.
````

Also add `--build-arg AVA_CODE_VERSION=$(git rev-parse HEAD)` to the
README's existing `fly deploy --config apps/pipeline-server/fly.production.toml`
command.

- [ ] **Step 10: Check, format, commit**

```bash
pnpm --filter @avandar/pipeline-server exec tsc --noEmit -p .
pnpm --filter @avandar/pipeline-server exec vitest run
pnpm exec oxfmt --ignore-path .oxfmtignore <every .ts file you changed>
pnpm exec eslint <every .ts file you changed>
git add <every file you changed, by path>
git commit -m "feat(pipelines): record server and local runs with their invocation

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 9: HDX reports sizes and footer reads

**Files:**
- Modify: `apps/pipeline-server/pipelines/hdx/makeApiResourceRelationsFromCkanPackage/makeApiResourceRelationsFromCkanPackage.ts` and `.test.ts`
- Modify: `apps/pipeline-server/pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns.ts` and `.test.ts`
- Modify: `apps/pipeline-server/pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine.ts`

- [ ] **Step 1: Write the failing tests**

1. In `readHdxResourceColumns.test.ts`, add a metrics fake and pass it to
   every `readHdxResourceColumns` call (`metrics: _metrics().metrics`):

   ```ts
   function _metrics() {
     const values: Record<string, number> = {};
     const metrics: EtlPipelineMetrics = {
       increment: (name, by = 1) => {
         values[name] = (values[name] ?? 0) + by;
       },
       time: async (name, work) => {
         values[name] = (values[name] ?? 0) + 1;
         return work();
       },
     };
     return { metrics, values };
   }
   ```

   (import the `EtlPipelineMetrics` type from `@avandar/etl`), and add:

   ```ts
     it("counts and times each Parquet footer read", async () => {
       const { metrics, values } = _metrics();

       await readHdxResourceColumns({
         resource: _resource(undefined),
         readFileColumns: async () => {
           return SNIFFED;
         },
         metrics,
       });

       expect(values).toEqual({
         "hdx.parquet_footer_reads": 1,
         "hdx.parquet_footer_read_ms": 1,
       });
     });

     it("reads no footer, and records no metric, for headers HDX recorded", async () => {
       const { metrics, values } = _metrics();

       await readHdxResourceColumns({
         resource: _resource(["adm1"]),
         readFileColumns: async () => {
           return SNIFFED;
         },
         metrics,
       });

       expect(values).toEqual({});
     });
   ```

2. In `makeApiResourceRelationsFromCkanPackage.test.ts`, pass
   `metrics: _metrics().metrics` (the same helper) to every call, and add:

   ```ts
     it("reports the size CKAN records for each resource", async () => {
       const relations = await makeApiResourceRelationsFromCkanPackage({
         drive: CKAN_DRIVE,
         ckanPackage: _packageWithOneCsv({
           fileHeaders: ["adm1"],
           size: 4096,
         }),
         resourceFormat: "CSV",
         readFileColumns: _readSniffedColumns,
         metrics: _metrics().metrics,
       });

       expect(relations[0]?.sourceSizeBytes).toBe(4096);
     });
   ```

Run: `pnpm --filter @avandar/pipeline-server exec vitest run pipelines/hdx`.
Expected: FAIL.

- [ ] **Step 2: Record them**

1. `readHdxResourceColumns.ts`: add `metrics: EtlPipelineMetrics;` to its
   argument (type import from `@avandar/etl`), and replace the Parquet read
   with:

   ```ts
     args.metrics.increment("hdx.parquet_footer_reads");
     const fileColumns = await args.metrics.time(
       "hdx.parquet_footer_read_ms",
       () => {
         return args.readFileColumns(args.resource);
       },
     );
   ```

   Add to its JSDoc: "Counts and times each footer read in `metrics`, as
   `hdx.parquet_footer_reads` and `hdx.parquet_footer_read_ms`."

2. `makeApiResourceRelationsFromCkanPackage.ts`: add
   `metrics: EtlPipelineMetrics;` to `params`, pass `metrics: params.metrics`
   to `readHdxResourceColumns`, and add to each relation:

   ```ts
           ...(resource.size === undefined
             ? {}
             : { sourceSizeBytes: resource.size }),
   ```

   Add to its JSDoc: "Each relation reports the resource's `size` as
   `sourceSizeBytes` when CKAN records one."

3. `createHdxEtlEngine.ts`: in `transform`, take `metrics` from the arguments
   and pass it on:
   `transform: ({ drive: current, scope, connection, metrics }) => {` and
   `metrics,` in the `makeApiResourceRelationsFromCkanPackage` call.

Run the HDX tests and the server type-check. Expected: PASS.

- [ ] **Step 3: Format, commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore <every .ts file you changed>
pnpm exec eslint <every .ts file you changed>
git add <every file you changed, by path>
git commit -m "feat(pipelines): report HDX resource sizes and Parquet footer reads

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 10: The CLI sends its invocation

**Files:**
- Create: `apps/ava-cli/src/PipelineCli/buildCliInvocation/buildCliInvocation.ts` and `.test.ts`
- Modify: `apps/ava-cli/src/PipelineCli/sendRunPipelineRequest.ts` and `.test.ts`
- Modify: `apps/ava-cli/src/PipelineCli/runPipelineLocal.ts` and `.test.ts`
- Modify: `apps/ava-cli/src/PipelineCli/RunPipelineCli/RunPipelineCli.ts` and `.test.ts`

- [ ] **Step 1: Write the failing invocation tests**

`buildCliInvocation.test.ts`:

```ts
import { hostname, tmpdir, userInfo } from "node:os";
import {
  buildCliInvocation,
  readGitCommit,
} from "@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation";
import { describe, expect, it } from "vitest";

describe("buildCliInvocation", () => {
  it("records the argv after the binary, the OS user and host, and this checkout's commit", () => {
    expect(buildCliInvocation(["pipeline", "reset", "hdx"])).toEqual({
      cliArgv: ["pipeline", "reset", "hdx"],
      actor: `${userInfo().username}@${hostname()}`,
      host: hostname(),
      codeVersion: expect.stringMatching(/^[0-9a-f]{40}$/),
    });
  });
});

describe("readGitCommit", () => {
  it("is undefined outside a git checkout", () => {
    expect(readGitCommit(tmpdir())).toBeUndefined();
  });
});
```

Run: `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/buildCliInvocation`.
Expected: FAIL, the module does not exist.

- [ ] **Step 2: Write `buildCliInvocation.ts`**

```ts
import { spawnSync } from "node:child_process";
import { hostname, userInfo } from "node:os";
import { findAvandarRepoRoot } from "@ava-cli/PipelineCli/runPipelineLocal";

/** How the CLI was started, as every pipeline execution it starts records it. */
export type CliInvocation = Readonly<{
  /** The argv after the binary, exactly as typed. */
  cliArgv: readonly string[];
  /** `<OS user>@<hostname>`. */
  actor: string;
  host: string;
  /** The commit checked out where the CLI runs, when it runs in a checkout. */
  codeVersion?: string;
}>;

function _readUsername(): string {
  try {
    return userInfo().username;
  } catch {
    // `userInfo` throws for a user with no passwd entry, as in some
    // containers.
    return "unknown";
  }
}

/**
 * The commit checked out in `directory`, or `undefined` when it is not a git
 * checkout or git is not installed.
 */
export function readGitCommit(directory: string): string | undefined {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: directory,
    encoding: "utf8",
  });
  const commit = result.status === 0 ? result.stdout.trim() : "";
  return commit === "" ? undefined : commit;
}

/**
 * How this CLI process was started: its argv, who ran it where, and the
 * commit of the checkout it runs in.
 *
 * @param cliArgv - The argv after the binary. Defaults to this process's.
 */
export function buildCliInvocation(
  cliArgv: readonly string[] = process.argv.slice(2),
): CliInvocation {
  const host = hostname();
  const codeVersion = readGitCommit(findAvandarRepoRoot() ?? process.cwd());
  return {
    cliArgv,
    actor: `${_readUsername()}@${host}`,
    host,
    ...(codeVersion === undefined ? {} : { codeVersion }),
  };
}
```

Run the tests again. Expected: PASS.

- [ ] **Step 3: Write the failing request and local-run tests**

1. In `sendRunPipelineRequest.test.ts`, add:

   ```ts
     it("sends the CLI's argv and actor in X-Ava-Invocation, as ASCII JSON", async () => {
       const fetchMock = vi.fn(async () => {
         return new Response(JSON.stringify(REPORT), { status: 200 });
       });
       vi.stubGlobal("fetch", fetchMock);

       await sendRunPipelineRequest({
         pipelineName: "hdx",
         runOptions: {},
         invocation: {
           cliArgv: ["pipeline", "run", "hdx", "--since", "café"],
           actor: "pablo@laptop",
           host: "laptop",
           codeVersion: "abc123",
         },
       });

       const init = (fetchMock.mock.calls[0] as unknown[] | undefined)?.[1] as
         | { headers: Record<string, string> }
         | undefined;
       const header = init?.headers["x-ava-invocation"] ?? "";
       expect([header, JSON.parse(header)]).toEqual([
         '{"cliArgv":["pipeline","run","hdx","--since","caf\\u00e9"],"actor":"pablo@laptop"}',
         {
           cliArgv: ["pipeline", "run", "hdx", "--since", "café"],
           actor: "pablo@laptop",
         },
       ]);
     });
   ```

2. In `runPipelineLocal.test.ts`, add `import type { SpawnSyncOptions } from "node:child_process";` and:

   ```ts
     it("passes the invocation to the runner in AVA_PIPELINE_INVOCATION", () => {
       const invocation = {
         cliArgv: ["pipeline", "run", "hdx", "--local"],
         actor: "pablo@laptop",
         host: "laptop",
         codeVersion: "abc123",
       };

       runPipelineLocal({
         pipelineName: "hdx",
         repoRoot: "/repo",
         runOptions: {},
         invocation,
       });

       const spawnOptions = vi.mocked(spawnSync).mock.calls[0]?.[2] as
         | SpawnSyncOptions
         | undefined;
       expect(
         JSON.parse(spawnOptions?.env?.AVA_PIPELINE_INVOCATION ?? ""),
       ).toEqual(invocation);
     });
   ```

Run: `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/sendRunPipelineRequest.test.ts src/PipelineCli/runPipelineLocal.test.ts`.
Expected: FAIL.

- [ ] **Step 4: Send the invocation**

1. `sendRunPipelineRequest.ts`: import the `CliInvocation` type from
   `@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation`, and add:

   ```ts
   /** The header the pipeline server reads a CLI run's invocation from. */
   const _INVOCATION_HEADER = "x-ava-invocation";

   /**
    * JSON with every character outside printable ASCII written as `\uXXXX`.
    * `fetch` rejects a header value outside Latin-1, and `JSON.parse` reads
    * the escapes back unchanged.
    */
   function _toAsciiJson(value: unknown): string {
     return JSON.stringify(value).replace(/[\u007f-￿]/g, (character) => {
       return `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
     });
   }
   ```

   Add `invocationHeader: string | undefined;` to `_postRunRequest`'s
   arguments, and to its headers:

   ```ts
           ...(args.invocationHeader === undefined
             ? {}
             : { [_INVOCATION_HEADER]: args.invocationHeader }),
   ```

   Add `invocation?: CliInvocation;` to `sendRunPipelineRequest`'s options,
   with `@param options.invocation - Sent in X-Ava-Invocation, so the server
   records the CLI's argv and actor with the run. Only those two: the server
   records its own host and commit.` and pass:

   ```ts
         invocationHeader:
           options.invocation === undefined
             ? undefined
             : _toAsciiJson({
                 cliArgv: options.invocation.cliArgv,
                 actor: options.invocation.actor,
               }),
   ```

2. `runPipelineLocal.ts`: import the `CliInvocation` type, and add:

   ```ts
   /** The variable `scripts/runPipelineOnce.ts` reads the invocation from. */
   const _INVOCATION_ENV = "AVA_PIPELINE_INVOCATION";
   ```

   Add `invocation?: CliInvocation;` to `runPipelineLocal`'s options, and to
   the `spawnSync` options object:

   ```ts
         ...(options.invocation === undefined
           ? {}
           : {
               env: {
                 ...process.env,
                 [_INVOCATION_ENV]: JSON.stringify(options.invocation),
               },
             }),
   ```

   Update its JSDoc: "With `invocation`, the run is recorded with the CLI's
   argv, actor, host, and commit."

Run the two test files again. Expected: PASS.

- [ ] **Step 5: Write the failing command tests**

In `RunPipelineCli.test.ts`:

1. Mock the invocation, after the existing `vi.mock` of `runPipelineLocal`:

   ```ts
   const { INVOCATION } = vi.hoisted(() => {
     return {
       INVOCATION: {
         cliArgv: ["pipeline", "run", "hdx"],
         actor: "pablo@laptop",
         host: "laptop",
         codeVersion: "abc123",
       },
     };
   });

   vi.mock("@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation", () => {
     return {
       buildCliInvocation: vi.fn(() => {
         return INVOCATION;
       }),
     };
   });
   ```

2. Add `invocation: INVOCATION,` to each of the three
   `expect(vi.mocked(runPipelineLocal)).toHaveBeenCalledWith({...})`
   expectations ("passes the limit to a local run", "passes since to a local
   run", "passes scopes to a local run").

3. Add:

   ```ts
     it("sends the CLI's argv and actor to the server", async () => {
       const fetchMock = _mockFetch(async () => {
         return new Response(JSON.stringify(REPORT), { status: 200 });
       });

       const { runPipelineCommand } = await import("./RunPipelineCli");
       await runPipelineCommand({ name: "hdx", local: false });

       expect(
         JSON.parse(fetchMock.mock.calls[0]?.[1]?.headers?.["x-ava-invocation"] ?? ""),
       ).toEqual({ cliArgv: ["pipeline", "run", "hdx"], actor: "pablo@laptop" });
     });
   ```

Run: `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/RunPipelineCli`.
Expected: FAIL.

- [ ] **Step 6: Build the invocation once per command**

In `RunPipelineCli.ts`:

1. Import `buildCliInvocation` and the `CliInvocation` type.
2. Add `invocation: CliInvocation;` to `_runLocally`'s arguments and pass
   `invocation: args.invocation` to `runPipelineLocal`.
3. In `runPipelineCommand`, after `_assertOneLowerBound(runOptions);`:

   ```ts
       const invocation = buildCliInvocation();
   ```

   and pass `invocation` to both `_runLocally({ name, runOptions, invocation })`
   and `sendRunPipelineRequest({ pipelineName: name, runOptions, invocation })`.
4. Add to its JSDoc: "The run is recorded with how the CLI was invoked."

- [ ] **Step 7: Check, format, commit**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec oxfmt --ignore-path .oxfmtignore <every .ts file you changed>
pnpm exec eslint <every .ts file you changed>
git add <every file you changed, by path>
git commit -m "feat(ava-cli): send the CLI's invocation with every pipeline run

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 11: Print durations

**Files:**
- Modify: `apps/ava-cli/src/PipelineCli/PipelineRunReport/PipelineRunReport.schemas.ts` and `.test.ts`
- Modify: `apps/ava-cli/src/PipelineCli/PipelineRunReport/printPipelineRunReport.ts` and `.test.ts`

- [ ] **Step 1: Write the failing schema test**

In `PipelineRunReport.schemas.test.ts`, add:

```ts
  it("reads the run's and each crawl's times when sent, and a report without them", () => {
    const timed = PipelineRunReportSchema.parse(
      JSON.parse(
        JSON.stringify({
          ...ENGINE_REPORT,
          startedAt: new Date("2026-10-22T10:00:00Z"),
          finishedAt: new Date("2026-10-22T10:00:05Z"),
          setupMs: 120,
          crawls: [
            {
              ...ENGINE_REPORT.crawls[0],
              startedAt: new Date("2026-10-22T10:00:00Z"),
              finishedAt: new Date("2026-10-22T10:00:04Z"),
            },
          ],
        }),
      ),
    );

    expect([
      timed.setupMs,
      timed.finishedAt,
      timed.crawls[0]?.startedAt,
      PipelineRunReportSchema.safeParse(
        JSON.parse(JSON.stringify(ENGINE_REPORT)),
      ).success,
    ]).toEqual([120, "2026-10-22T10:00:05.000Z", "2026-10-22T10:00:00.000Z", true]);
  });
```

Run: `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/PipelineRunReport`.
Expected: FAIL.

- [ ] **Step 2: Accept the times**

In `PipelineRunReport.schemas.ts`, add to the crawl object:

```ts
      startedAt: _TimestampSchema.optional(),
      finishedAt: _TimestampSchema.optional(),
```

and to the report object, after `crawls`:

```ts
  startedAt: _TimestampSchema.optional(),
  finishedAt: _TimestampSchema.optional(),
  setupMs: z.number().optional(),
```

Add to the schema's JSDoc: "Times are optional, so a report from a server
that predates them still prints."

Run the schema test. Expected: PASS.

- [ ] **Step 3: Write the failing printer tests**

In `printPipelineRunReport.test.ts`, import `formatDuration` too, and add:

```ts
describe("formatDuration", () => {
  it.each([
    [850, "850 ms"],
    [1200, "1.2 s"],
    [245_000, "4 min 05 s"],
  ])("formats %s ms as %s", (durationMs, expected) => {
    expect(formatDuration(durationMs)).toBe(expected);
  });
});
```

and inside `describe("printPipelineRunReport", ...)`:

```ts
  it("prints how long a crawl took on its window line", () => {
    printPipelineRunReport(
      _report([
        {
          ...DRIVE,
          startedAt: "2026-10-22T10:00:00.000Z",
          finishedAt: "2026-10-22T10:00:01.200Z",
        },
      ]),
    );

    expect(_logs()).toContain("2026-10-01T00:00:00.000Z to now, took 1.2 s");
  });

  it("prints the run's total time and its setup after the crawls", () => {
    printPipelineRunReport({
      ..._report([DRIVE]),
      startedAt: "2026-10-22T10:00:00.000Z",
      finishedAt: "2026-10-22T10:04:05.000Z",
      setupMs: 850,
    });

    expect(_logs()).toContain(
      "Took 4 min 05 s (850 ms listing drives and scopes).",
    );
  });

  it("prints no duration for a report without times", () => {
    printPipelineRunReport(_report([DRIVE]));

    expect(_logs()).not.toMatch(/took/i);
  });

  it("keeps a full window with an hour-long duration within 80 columns", () => {
    printPipelineRunReport(
      _report([
        {
          ...DRIVE,
          window: {
            since: "2026-10-01T00:00:00.000Z",
            until: "2026-10-20T00:00:00.000Z",
          },
          startedAt: "2026-10-22T10:00:00.000Z",
          finishedAt: "2026-10-22T10:59:59.000Z",
        },
      ]),
    );

    const lineLengths = _logs()
      .replace(/\|\w+\|/g, "")
      .split("\n")
      .map((line) => {
        return line.length;
      });
    expect(Math.max(...lineLengths)).toBeLessThanOrEqual(80);
  });
```

Run the printer tests. Expected: FAIL.

- [ ] **Step 4: Print them**

In `printPipelineRunReport.ts`:

```ts
/** A duration such as `850 ms`, `12.3 s`, or `4 min 05 s`. */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)} s`;
  }
  const totalSeconds = Math.round(durationMs / 1000);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${Math.floor(totalSeconds / 60)} min ${seconds} s`;
}

/**
 * Milliseconds between two ISO 8601 timestamps, or `undefined` unless both
 * are set.
 */
function _getDurationMs(
  startedAt: string | undefined,
  finishedAt: string | undefined,
): number | undefined {
  if (startedAt === undefined || finishedAt === undefined) {
    return undefined;
  }
  return Date.parse(finishedAt) - Date.parse(startedAt);
}

/**
 * Prints how long the run took, and how much of that went to listing drives
 * and scopes, when the report says.
 */
function _printRunDuration(report: PipelineRunReport): void {
  const durationMs = _getDurationMs(report.startedAt, report.finishedAt);
  if (durationMs === undefined) {
    return;
  }
  const setupNote =
    report.setupMs === undefined
      ? ""
      : ` (${formatDuration(report.setupMs)} listing drives and scopes)`;
  printInfo(`Took ${formatDuration(durationMs)}${setupNote}.`);
}
```

In `_formatCrawl`, compute

```ts
  const durationMs = _getDurationMs(crawl.startedAt, crawl.finishedAt);
  const tookNote =
    durationMs === undefined ? "" : `, took ${formatDuration(durationMs)}`;
```

and change the window line to `` `${_DETAIL_INDENT}${since} to ${until}${tookNote}` ``.
Update its JSDoc: "...then its window and how long it took, its counts...".

In `printPipelineRunReport`, after `report.crawls.forEach(_printCrawl);`, add
`_printRunDuration(report);`, and add "then the run's total time" to its
JSDoc.

Run the printer tests. Expected: PASS.

- [ ] **Step 5: Check, format, commit**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec oxfmt --ignore-path .oxfmtignore <every .ts file you changed>
pnpm exec eslint <every .ts file you changed>
git add <every file you changed, by path>
git commit -m "feat(ava-cli): print how long each crawl and run took

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 12: Record resets

**Files:**
- Modify: `apps/ava-cli/src/PipelineCli/ResetPipelineCli/pipelineListingsRest.ts`
- Create: `apps/ava-cli/src/PipelineCli/recordCliExecution/createPostgrestExecutionStore.ts`
- Create: `apps/ava-cli/src/PipelineCli/recordCliExecution/runRecordedCliCommand.ts` and `.test.ts`
- Modify: `apps/ava-cli/src/PipelineCli/scopePruneCounts/scopePruneCounts.ts` and `.test.ts`
- Modify: `apps/ava-cli/src/PipelineCli/ResetPipelineCli/ResetPipelineCli.ts` and `.test.ts`

The CLI records resets and prunes itself, against the database it changes
(local, `--staging`, or `--prod`), through the same three functions. It
imports the row builders and the never-fatal wrapper from `@avandar/etl`
through the `@etl/*` alias, which only pulls in pure TypeScript.

- [ ] **Step 1: Write the failing recorder tests**

`runRecordedCliCommand.test.ts`:

```ts
import { runRecordedCliCommand } from "@ava-cli/PipelineCli/recordCliExecution/runRecordedCliCommand";
import { Acclimate } from "@avandar/acclimate";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionScope } from "@etl/stores/ExecutionStore.types";

const TARGET = { apiUrl: "http://127.0.0.1:54321", secretKey: "sb_secret_test" };

const START = {
  pipelineName: "hdx",
  command: "prune_retired_scopes",
  isDryRun: true,
  isScoped: false,
  arguments: { dryRun: true },
} as const;

const SCOPE: ExecutionScope = {
  driveKey: "https://data.humdata.org",
  scopeKey: "format:parquet",
  status: "succeeded",
  error: undefined,
  windowSince: undefined,
  windowUntil: undefined,
  checkpointBefore: undefined,
  checkpointAfter: undefined,
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
  finishedAt: new Date("2026-10-22T10:00:01.000Z"),
  timings: NO_STAGE_TIMINGS,
  denominators: NO_DENOMINATORS,
  deletions: {
    listingsDeleted: 2,
    listingsKeptInUse: 0,
    listingsDetached: 1,
    checkpointsDeleted: 1,
  },
  pipelineMetrics: {},
};

type _RpcCall = Readonly<{
  functionName: string;
  body: Record<string, unknown>;
}>;

/** Stubs PostgREST's RPC endpoint, answering every call with `status`. */
function _stubRpcs(status = 204): _RpcCall[] {
  const calls: _RpcCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { body?: string }) => {
      calls.push({
        functionName: new URL(input).pathname.replace("/rest/v1/rpc/", ""),
        body: JSON.parse(init?.body ?? "{}") as Record<string, unknown>,
      });
      return new Response(status === 204 ? null : "no such function", {
        status,
      });
    }),
  );
  return calls;
}

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return logCalls.flat().join("\n");
}

describe("runRecordedCliCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records the start, each scope, and the outcome, under one id", async () => {
    const calls = _stubRpcs();

    await runRecordedCliCommand({
      target: TARGET,
      start: START,
      work: async (recordScope) => {
        await recordScope(SCOPE);
        return { status: "succeeded" };
      },
    });

    const executionId = (calls[0]?.body.p_execution as { id: string }).id;
    expect(
      calls.map((call) => {
        return [call.functionName, call.body.p_execution_id ?? executionId];
      }),
    ).toEqual([
      ["rpc_pipeline_executions__start", executionId],
      ["rpc_pipeline_executions__record_scope", executionId],
      ["rpc_pipeline_executions__finish", executionId],
    ]);
  });

  it("records the command, its flags, and how the CLI was invoked", async () => {
    const calls = _stubRpcs();

    await runRecordedCliCommand({
      target: TARGET,
      start: START,
      work: async () => {
        return { status: "succeeded" };
      },
    });

    expect(calls[0]?.body.p_execution).toMatchObject({
      pipeline_name: "hdx",
      command: "prune_retired_scopes",
      run_mode: null,
      is_dry_run: true,
      is_scoped: false,
      is_limited: false,
      is_windowed: false,
      arguments: { dryRun: true },
      invoked_via: "cli_local",
      cli_argv: expect.any(Array),
      request_body: null,
      actor: expect.stringContaining("@"),
    });
  });

  it("records the outcome and deletions the command resolves to", async () => {
    const calls = _stubRpcs();

    await runRecordedCliCommand({
      target: TARGET,
      start: START,
      work: async () => {
        return {
          status: "cancelled",
          deletions: {
            listingsDeleted: 7,
            listingsKeptInUse: 3,
            listingsDetached: 0,
            checkpointsDeleted: 2,
            workspaceDatasetsDeleted: 1,
          },
        };
      },
    });

    expect(calls[1]?.body.p_outcome).toMatchObject({
      status: "cancelled",
      error: null,
      listings_deleted: 7,
      workspace_datasets_deleted: 1,
    });
  });

  it("records failed with the error, and rethrows it", async () => {
    const calls = _stubRpcs();

    await expect(
      runRecordedCliCommand({
        target: TARGET,
        start: START,
        work: async () => {
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow("boom");

    expect(calls[1]?.body.p_outcome).toMatchObject({
      status: "failed",
      error: "boom",
    });
  });

  it("warns and still runs the command when recording fails", async () => {
    _stubRpcs(404);
    const work = vi.fn(async () => {
      return { status: "succeeded" } as const;
    });

    await runRecordedCliCommand({ target: TARGET, start: START, work });

    expect([work.mock.calls.length, _getCombinedLogs()]).toEqual([
      1,
      expect.stringContaining("Could not record the start"),
    ]);
  });
});
```

Run: `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/recordCliExecution`.
Expected: FAIL, the module does not exist.

- [ ] **Step 2: Add `callPostgrestRpc`**

In `pipelineListingsRest.ts`, after `listStoredScopes`:

```ts
/**
 * Calls a database function through PostgREST with a JSON body, throwing on
 * a non-2xx answer.
 *
 * @param options.functionName - Such as `rpc_pipeline_executions__start`.
 */
export async function callPostgrestRpc(options: {
  target: PostgrestTarget;
  functionName: string;
  body: Readonly<Record<string, unknown>>;
}): Promise<Response> {
  return await _sendPostgrestRequest({
    target: options.target,
    method: "POST",
    table: `rpc/${options.functionName}`,
    params: {},
    body: options.body,
  });
}
```

- [ ] **Step 3: Write `createPostgrestExecutionStore.ts`**

```ts
import { callPostgrestRpc } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import {
  buildExecutionOutcomeRow,
  buildExecutionScopeRow,
  buildExecutionStartRow,
} from "@etl/stores/executionRecords/executionRecords";
import type { PostgrestTarget } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type { ExecutionStore } from "@etl/stores/ExecutionStore.types";

/** The database functions that record pipeline executions. */
const _EXECUTION_FUNCTIONS = {
  start: "rpc_pipeline_executions__start",
  recordScope: "rpc_pipeline_executions__record_scope",
  finish: "rpc_pipeline_executions__finish",
} as const;

/**
 * Creates an execution store over PostgREST, for the commands the CLI runs
 * itself. Each method throws when Supabase rejects the call; wrap the store
 * with `createNeverFatalExecutionStore`.
 *
 * @param target - The database to record in. Its key must be the service
 * role's: only the service role may call the functions.
 */
export function createPostgrestExecutionStore(
  target: PostgrestTarget,
): ExecutionStore {
  return {
    start: async (execution) => {
      await callPostgrestRpc({
        target,
        functionName: _EXECUTION_FUNCTIONS.start,
        body: { p_execution: buildExecutionStartRow(execution) },
      });
    },
    recordScope: async ({ executionId, scope }) => {
      await callPostgrestRpc({
        target,
        functionName: _EXECUTION_FUNCTIONS.recordScope,
        body: {
          p_execution_id: executionId,
          p_scope: buildExecutionScopeRow(scope),
        },
      });
    },
    finish: async ({ executionId, outcome }) => {
      await callPostgrestRpc({
        target,
        functionName: _EXECUTION_FUNCTIONS.finish,
        body: {
          p_execution_id: executionId,
          p_outcome: buildExecutionOutcomeRow(outcome),
        },
      });
    },
  };
}
```

- [ ] **Step 4: Write `runRecordedCliCommand.ts`**

```ts
import { randomUUID } from "node:crypto";
import { buildCliInvocation } from "@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation";
import { createPostgrestExecutionStore } from "@ava-cli/PipelineCli/recordCliExecution/createPostgrestExecutionStore";
import { printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import { createNeverFatalExecutionStore } from "@etl/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore";
import type { PostgrestTarget } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type {
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStart,
} from "@etl/stores/ExecutionStore.types";

/** What a CLI command's execution records about it, besides its invocation. */
export type CliExecutionStart = Pick<
  ExecutionStart,
  "pipelineName" | "command" | "isDryRun" | "isScoped" | "arguments"
>;

/** How a CLI command that did not throw ended. */
export type CliCommandResult = Readonly<{
  status: "succeeded" | "cancelled";
  /**
   * What a reset deleted, or showed it would. Leave out for a command whose
   * scope rows carry its counts, or that deleted nothing.
   */
  deletions?: ExecutionOutcome["deletions"];
}>;

/** Records one drive and scope a CLI command worked on. */
export type RecordCliScope = (scope: ExecutionScope) => Promise<void>;

function _describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs a reset or prune and records it as a pipeline execution, in the
 * database it changes: its start, each scope `work` records, and how it
 * ended. A command that throws is recorded as `failed`, and the error is
 * rethrown. Recording never fails the command: a failed call is printed as a
 * warning.
 *
 * @param args.target - The database the command changes.
 * @param args.start - The command, its flags, and its parsed options.
 * @param args.work - The command itself.
 */
export async function runRecordedCliCommand(args: {
  target: PostgrestTarget;
  start: CliExecutionStart;
  work: (recordScope: RecordCliScope) => Promise<CliCommandResult>;
}): Promise<void> {
  const store = createNeverFatalExecutionStore({
    store: createPostgrestExecutionStore(args.target),
    warn: printWarn,
  });
  const executionId = randomUUID();
  await store.start({
    ...args.start,
    id: executionId,
    runMode: undefined,
    isLimited: false,
    isWindowed: false,
    invocation: { invokedVia: "cli_local", ...buildCliInvocation() },
    startedAt: new Date(),
  });
  const finish = (outcome: Omit<ExecutionOutcome, "finishedAt" | "setupMs">) => {
    return store.finish({
      executionId,
      outcome: { ...outcome, finishedAt: new Date(), setupMs: 0 },
    });
  };
  try {
    const result = await args.work((scope) => {
      return store.recordScope({ executionId, scope });
    });
    await finish({ ...result, error: undefined, deletions: result.deletions });
  } catch (error: unknown) {
    await finish({ status: "failed", error: _describeError(error), deletions: undefined });
    throw error;
  }
}
```

Run the recorder tests. Expected: PASS.

- [ ] **Step 5: Convert prune counts**

In `scopePruneCounts.test.ts`, add:

```ts
describe("scopePruneCountsToDeletionCounts", () => {
  it("names a prune's counts as an execution records them", () => {
    expect(
      scopePruneCountsToDeletionCounts({
        listings_deleted: 1,
        listings_kept_in_use: 2,
        listings_detached: 3,
        checkpoints_deleted: 4,
      }),
    ).toEqual({
      listingsDeleted: 1,
      listingsKeptInUse: 2,
      listingsDetached: 3,
      checkpointsDeleted: 4,
    });
  });
});
```

(add `scopePruneCountsToDeletionCounts` to its import). Run it, see it fail,
then add to `scopePruneCounts.ts`:

```ts
/** A prune's counts, as a pipeline execution records them. */
export function scopePruneCountsToDeletionCounts(
  counts: ScopePruneCounts,
): ExecutionDeletionCounts {
  return {
    listingsDeleted: counts.listings_deleted,
    listingsKeptInUse: counts.listings_kept_in_use,
    listingsDetached: counts.listings_detached,
    checkpointsDeleted: counts.checkpoints_deleted,
  };
}
```

with `import type { ExecutionDeletionCounts } from "@etl/stores/ExecutionStore.types";`.
Run it again. Expected: PASS.

- [ ] **Step 6: Write the failing reset tests**

In `ResetPipelineCli.test.ts`:

1. Add helpers after `_getDeletes`:

   ```ts
   const PRUNE_RPC = "rpc/rpc_data_catalog_listings__prune_pipeline_scope";

   function _getPruneCalls(
     requests: readonly RecordedRequest[],
   ): RecordedRequest[] {
     return requests.filter((request) => {
       return request.table === PRUNE_RPC;
     });
   }

   /** The body the reset sent to one of the execution functions. */
   function _getExecutionBody(
     requests: readonly RecordedRequest[],
     step: "start" | "finish",
   ): Record<string, unknown> | undefined {
     return requests.find((request) => {
       return request.table === `rpc/rpc_pipeline_executions__${step}`;
     })?.body as Record<string, unknown> | undefined;
   }
   ```

2. The recording adds POSTs, so the three tests that filter
   `request.method === "POST"` ("changes nothing when the scope has nothing
   to prune", "prunes the scope on every drive once confirmed", "changes
   nothing when the reset is declined" in the scope block) now use
   `_getPruneCalls(requests)` instead.

3. Add to the top-level `describe`:

   ```ts
     it("records a confirmed reset with what it deleted", async () => {
       const requests = _mockPostgrest({
         listingCount: 3,
         checkpointCount: 2,
         inUseRows: [IN_USE_ROW],
       });

       await resetPipelineCommand({ name: "socrata" });

       expect([
         _getExecutionBody(requests, "start")?.p_execution,
         _getExecutionBody(requests, "finish")?.p_outcome,
       ]).toEqual([
         expect.objectContaining({
           pipeline_name: "socrata",
           command: "reset",
           is_dry_run: false,
           is_scoped: false,
           arguments: {},
           invoked_via: "cli_local",
         }),
         expect.objectContaining({
           status: "succeeded",
           listings_deleted: 3,
           listings_kept_in_use: 1,
           listings_detached: 0,
           checkpoints_deleted: 2,
           workspace_datasets_deleted: 0,
         }),
       ]);
     });

     it("records a declined reset as cancelled, with no deletions", async () => {
       vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
       const requests = _mockPostgrest({ listingCount: 3 });

       await resetPipelineCommand({ name: "socrata" });

       expect(_getExecutionBody(requests, "finish")?.p_outcome).toEqual({
         status: "cancelled",
         error: null,
         finished_at: expect.any(String),
         setup_ms: 0,
       });
     });

     it("records a reset with nothing to delete as succeeded", async () => {
       const requests = _mockPostgrest({ listingCount: 0 });

       await resetPipelineCommand({ name: "socrata" });

       expect(_getExecutionBody(requests, "finish")?.p_outcome).toMatchObject({
         status: "succeeded",
       });
     });

     it("records a failed reset with its error", async () => {
       const requests = _mockPostgrest({
         listingCount: 3,
         inUseRows: Array.from({ length: 1000 }, (_, index) => {
           return { ...IN_USE_ROW, dataset_id: `dataset-${index}` };
         }),
       });

       await expect(resetPipelineCommand({ name: "socrata" })).rejects.toThrow();

       expect(_getExecutionBody(requests, "finish")?.p_outcome).toMatchObject({
         status: "failed",
         error: expect.stringContaining("1000-row limit"),
       });
     });
   ```

4. Add to the `--scope` `describe`:

   ```ts
       it("records a scope reset with the counts it applied", async () => {
         const requests = _mockPostgrest({
           listingCount: 0,
           pruneCounts: { ...NO_PRUNE, listings_deleted: 3, checkpoints_deleted: 1 },
         });

         await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

         expect([
           _getExecutionBody(requests, "start")?.p_execution,
           _getExecutionBody(requests, "finish")?.p_outcome,
         ]).toEqual([
           expect.objectContaining({
             is_scoped: true,
             arguments: { scope: "format:parquet" },
           }),
           expect.objectContaining({
             status: "succeeded",
             listings_deleted: 3,
             checkpoints_deleted: 1,
             workspace_datasets_deleted: 0,
           }),
         ]);
       });

       it("records a declined scope reset as cancelled, with the counts it showed", async () => {
         vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
         const requests = _mockPostgrest({
           listingCount: 0,
           pruneCounts: { ...NO_PRUNE, listings_deleted: 3 },
         });

         await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

         expect(_getExecutionBody(requests, "finish")?.p_outcome).toMatchObject({
           status: "cancelled",
           listings_deleted: 3,
         });
       });
   ```

Run: `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/ResetPipelineCli`.
Expected: the new tests FAIL; the three updated ones PASS.

- [ ] **Step 7: Record resets**

In `ResetPipelineCli.ts`:

1. Imports: `runRecordedCliCommand` and the `CliCommandResult` type from
   `@ava-cli/PipelineCli/recordCliExecution/runRecordedCliCommand`;
   `scopePruneCountsToDeletionCounts` from the scope-prune-counts module;
   the `ExecutionOutcome` type from `@etl/stores/ExecutionStore.types`; and
   `ScopePruneCounts` to the existing type import from
   `pipelineListingsRest`.

2. Add:

   ```ts
   /** What a reset deleted. */
   type _ResetDeletions = NonNullable<ExecutionOutcome["deletions"]>;

   /** A scope reset's prune counts and deleted workspace datasets. */
   function _toResetDeletions(
     counts: ScopePruneCounts,
     workspaceDatasetsDeleted: number,
   ): _ResetDeletions {
     return {
       ...scopePruneCountsToDeletionCounts(counts),
       workspaceDatasetsDeleted,
     };
   }
   ```

3. `_deleteChosenRows` resolves to its counts. Change its return type to
   `Promise<Readonly<{ listingsDeleted: number; listingsKeptInUse: number; workspaceDatasetsDeleted: number }>>`,
   its JSDoc to "Deletes what the user chose, reports how much was deleted,
   and resolves to the counts.", and end it with:

   ```ts
     return {
       listingsDeleted: deletedCount,
       listingsKeptInUse: keepListingIds.length,
       workspaceDatasetsDeleted: datasetIds.length,
     };
   ```

4. Move the deleting half of `_resetWholePipeline` into its own function, so
   both stay under 45 lines:

   ```ts
   /**
    * Deletes a pipeline's checkpoints, then the listings and workspace
    * datasets the user chooses, and resolves to what was deleted.
    */
   async function _deleteWholePipeline(options: {
     name: string;
     target: PostgrestTarget;
     filter: ListingFilter;
   }): Promise<_ResetDeletions> {
     const { name, target, filter } = options;
     const inUseListings = await findInUseListings({ target, filter });
     const { datasetIds, keepListingIds } =
       inUseListings.length === 0
         ? { datasetIds: [], keepListingIds: [] }
         : await _resolveInUseListings(inUseListings);
     // Checkpoints go first. If a later delete failed with the checkpoints
     // still there, the next incremental run would resume past listings that
     // are gone and never write them again. Without a checkpoint it only
     // crawls from the start.
     const checkpointsDeleted = await deleteCheckpoints({
       target,
       pipelineName: name,
     });
     const deleted = await _deleteChosenRows({
       name,
       target,
       filter,
       datasetIds,
       keepListingIds,
     });
     return { ...deleted, listingsDetached: 0, checkpointsDeleted };
   }
   ```

   Replace `_resetWholePipeline` with:

   ```ts
   /**
    * Deletes every listing and checkpoint of one pipeline, after asking. Asks
    * again what to do when workspaces already use some of those listings.
    * Resolves to how the reset ended and what it deleted.
    */
   async function _resetWholePipeline(options: {
     name: string;
     target: PostgrestTarget;
   }): Promise<CliCommandResult> {
     const { name, target } = options;
     const filter = buildListingFilterFromPipeline(name);
     const [listingCount, checkpointCount] = await Promise.all([
       countListings({ target, filter }),
       countCheckpoints({ target, pipelineName: name }),
     ]);
     if (listingCount === 0 && checkpointCount === 0) {
       printSuccess(`No ${name} listings or checkpoints to delete.`);
       return { status: "succeeded" };
     }
     const isConfirmed = await promptToConfirmReset(
       `Delete all ${listingCount} ${name} listing(s) and ${checkpointCount} checkpoint(s)?`,
     );
     if (!isConfirmed) {
       printInfo("Reset cancelled. Nothing was deleted.");
       // The counts it showed were totals, not deletions, so none are
       // recorded.
       return { status: "cancelled" };
     }
     return {
       status: "succeeded",
       deletions: await _deleteWholePipeline({ name, target, filter }),
     };
   }
   ```

5. Replace `_deleteScopeDatasetsIfChosen` with:

   ```ts
   /**
    * Asks what to do with the workspace datasets added from listings only
    * `scope` produces, deletes them when the user chooses to, and resolves to
    * how many were deleted.
    */
   async function _deleteScopeDatasetsIfChosen(options: {
     name: string;
     scope: string;
     target: PostgrestTarget;
   }): Promise<number> {
     const { name, scope, target } = options;
     // Only listings this scope alone produces can be deleted, so only their
     // workspace datasets are asked about.
     const inUseListings = await findInUseListings({
       target,
       filter: {
         ...buildListingFilterFromPipeline(name),
         pipeline_scope_keys: `eq.{${scope}}`,
       },
     });
     if (inUseListings.length === 0) {
       return 0;
     }
     const { datasetIds } = await _resolveInUseListings(inUseListings);
     if (datasetIds.length > 0) {
       await deleteDatasets({ target, datasetIds });
     }
     return datasetIds.length;
   }
   ```

6. Replace `_resetScope` with:

   ```ts
   /**
    * Removes one scope from a pipeline's listings and checkpoints on every
    * drive, after showing a dry run's counts and asking. Resolves to how the
    * reset ended and what it deleted, or for a declined one, what it showed.
    */
   async function _resetScope(options: {
     name: string;
     scope: string;
     target: PostgrestTarget;
   }): Promise<CliCommandResult> {
     const { name, scope, target } = options;
     const pruneArgs = {
       target,
       pipelineName: name,
       scopeKey: scope,
       driveKey: undefined,
     };
     const planned = await pruneScope({ ...pruneArgs, isDryRun: true });
     if (isScopePruneEmpty(planned)) {
       printSuccess(`No ${name} listings or checkpoints have the scope ${scope}.`);
       return { status: "succeeded" };
     }
     printInfo(`Resetting ${scope} would ${describeScopePruneCounts(planned)}.`);
     const isConfirmed = await promptToConfirmReset(
       `Remove the scope ${scope} from ${name}?`,
     );
     if (!isConfirmed) {
       printInfo("Reset cancelled. Nothing was deleted.");
       return { status: "cancelled", deletions: _toResetDeletions(planned, 0) };
     }
     const workspaceDatasetsDeleted =
       planned.listings_kept_in_use > 0
         ? await _deleteScopeDatasetsIfChosen({ name, scope, target })
         : 0;
     const pruned = await pruneScope({ ...pruneArgs, isDryRun: false });
     printSuccess(`Reset ${scope} of ${name}: ${describeScopePruneCounts(pruned)}.`);
     return {
       status: "succeeded",
       deletions: _toResetDeletions(pruned, workspaceDatasetsDeleted),
     };
   }
   ```

7. In `resetPipelineCommand`, replace the `if (scope === undefined) ... else
   ...` with:

   ```ts
       await runRecordedCliCommand({
         target,
         start: {
           pipelineName: name,
           command: "reset",
           isDryRun: false,
           isScoped: scope !== undefined,
           arguments: scope === undefined ? {} : { scope },
         },
         work: () => {
           return scope === undefined
             ? _resetWholePipeline({ name, target })
             : _resetScope({ name, scope, target });
         },
       });
   ```

   Add "Records the reset in `pipeline_executions`, including a declined
   one." to its JSDoc, and append " Records each reset in the database's
   pipeline_executions table." to the `ResetPipelineCli` description.

Run the reset tests. Expected: PASS.

- [ ] **Step 8: Check, format, commit**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec oxfmt --ignore-path .oxfmtignore <every .ts file you changed>
pnpm exec eslint <every .ts file you changed>
git add <every file you changed, by path>
git commit -m "feat(ava-cli): record pipeline resets as executions

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 13: Record prunes

**Files:**
- Create: `apps/ava-cli/src/PipelineCli/PruneRetiredScopesCli/buildPruneExecutionScope.ts` and `.test.ts`
- Modify: `apps/ava-cli/src/PipelineCli/PruneRetiredScopesCli/PruneRetiredScopesCli.ts` and `.test.ts`

- [ ] **Step 1: Write the failing scope-row test**

`buildPruneExecutionScope.test.ts`:

```ts
import { buildPruneExecutionScope } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/buildPruneExecutionScope";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { describe, expect, it } from "vitest";

describe("buildPruneExecutionScope", () => {
  it("records a pruned pair's counts, with no crawl timings or denominators", () => {
    expect(
      buildPruneExecutionScope({
        driveKey: "https://data.humdata.org",
        scopeKey: "format:parquet",
        counts: {
          listings_deleted: 2,
          listings_kept_in_use: 0,
          listings_detached: 1,
          checkpoints_deleted: 1,
        },
        status: "skipped",
        startedAt: new Date("2026-10-22T10:00:00.000Z"),
        finishedAt: new Date("2026-10-22T10:00:01.000Z"),
      }),
    ).toEqual({
      driveKey: "https://data.humdata.org",
      scopeKey: "format:parquet",
      status: "skipped",
      error: undefined,
      windowSince: undefined,
      windowUntil: undefined,
      checkpointBefore: undefined,
      checkpointAfter: undefined,
      startedAt: new Date("2026-10-22T10:00:00.000Z"),
      finishedAt: new Date("2026-10-22T10:00:01.000Z"),
      timings: NO_STAGE_TIMINGS,
      denominators: NO_DENOMINATORS,
      deletions: {
        listingsDeleted: 2,
        listingsKeptInUse: 0,
        listingsDetached: 1,
        checkpointsDeleted: 1,
      },
      pipelineMetrics: {},
    });
  });
});
```

Run: `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/PruneRetiredScopesCli/buildPruneExecutionScope.test.ts`.
Expected: FAIL.

- [ ] **Step 2: Write `buildPruneExecutionScope.ts`**

```ts
import { scopePruneCountsToDeletionCounts } from "@ava-cli/PipelineCli/scopePruneCounts/scopePruneCounts";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import type { ScopePruneCounts } from "@ava-cli/PipelineCli/ResetPipelineCli/pipelineListingsRest";
import type {
  ExecutionScope,
  ExecutionScopeStatus,
} from "@etl/stores/ExecutionStore.types";

/**
 * One drive and scope of a prune, as its execution records it: the prune's
 * counts, with the zero timings and denominators of a step that crawled
 * nothing.
 *
 * @param args.status - `succeeded` for a pair pruned or dry-run, `skipped`
 * for one a declined prune left alone.
 */
export function buildPruneExecutionScope(args: {
  driveKey: string;
  scopeKey: string;
  counts: ScopePruneCounts;
  status: ExecutionScopeStatus;
  startedAt: Date;
  finishedAt: Date;
}): ExecutionScope {
  return {
    driveKey: args.driveKey,
    scopeKey: args.scopeKey,
    status: args.status,
    error: undefined,
    windowSince: undefined,
    windowUntil: undefined,
    checkpointBefore: undefined,
    checkpointAfter: undefined,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    timings: NO_STAGE_TIMINGS,
    denominators: NO_DENOMINATORS,
    deletions: scopePruneCountsToDeletionCounts(args.counts),
    pipelineMetrics: {},
  };
}
```

Run the test again. Expected: PASS.

- [ ] **Step 3: Write the failing prune tests**

In `PruneRetiredScopesCli.test.ts`, add after `_pruneCalls`:

```ts
/** The bodies the prune sent to one of the execution functions. */
function _executionBodies(
  posts: readonly RecordedPost[],
  step: "start" | "record_scope" | "finish",
): Array<Record<string, unknown>> {
  return posts
    .filter((post) => {
      return post.table === `rpc/rpc_pipeline_executions__${step}`;
    })
    .map((post) => {
      return post.body as Record<string, unknown>;
    });
}
```

and these tests:

```ts
  it("records a dry run, with each retired scope's counts", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: true, local: false });

    expect([
      _executionBodies(posts, "start")[0]?.p_execution,
      _executionBodies(posts, "record_scope").map((body) => {
        return body.p_scope;
      }),
      _executionBodies(posts, "finish")[0]?.p_outcome,
    ]).toEqual([
      expect.objectContaining({
        command: "prune_retired_scopes",
        is_dry_run: true,
        is_scoped: false,
        arguments: { dryRun: true },
      }),
      [
        expect.objectContaining({
          drive_key: RETIRED.drive_key,
          scope_key: RETIRED.scope_key,
          status: "succeeded",
          listings_deleted: 2,
          listings_detached: 1,
          checkpoints_deleted: 1,
        }),
      ],
      expect.objectContaining({ status: "succeeded" }),
    ]);
  });

  it("records each scope it pruned, after pruning it", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED, OTHER_RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false });

    expect([
      posts
        .map((post) => {
          return post.table;
        })
        .filter((table) => {
          return table !== LIST_RPC;
        })
        .slice(-5),
      _executionBodies(posts, "finish")[0]?.p_outcome,
    ]).toEqual([
      [
        PRUNE_RPC,
        "rpc/rpc_pipeline_executions__record_scope",
        PRUNE_RPC,
        "rpc/rpc_pipeline_executions__record_scope",
        "rpc/rpc_pipeline_executions__finish",
      ],
      expect.objectContaining({ status: "succeeded" }),
    ]);
  });

  it("records a declined prune as cancelled, its retired scopes as skipped", async () => {
    vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false });

    // The outcome carries no deletions: the scope rows carry the counts, and
    // the database adds them up into the execution's totals.
    const outcome = _executionBodies(posts, "finish")[0]?.p_outcome;
    expect([
      _executionBodies(posts, "record_scope").map((body) => {
        return (body.p_scope as { status: string }).status;
      }),
      outcome,
      outcome,
    ]).toEqual([
      ["skipped"],
      expect.objectContaining({ status: "cancelled" }),
      expect.not.objectContaining({ listings_deleted: expect.anything() }),
    ]);
  });

  it("records a failed prune with its error", async () => {
    vi.mocked(fetchLivePipelineScopes).mockRejectedValueOnce(
      new Error("server down"),
    );
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await expect(
      pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false }),
    ).rejects.toThrow("server down");

    expect(_executionBodies(posts, "finish")[0]?.p_outcome).toMatchObject({
      status: "failed",
      error: "server down",
    });
  });
```

Run: `pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli/PruneRetiredScopesCli`.
Expected: the new tests FAIL; the existing ones still PASS.

- [ ] **Step 4: Record prunes**

In `PruneRetiredScopesCli.ts`:

1. Imports: `buildPruneExecutionScope`; `runRecordedCliCommand` and the
   `CliCommandResult` and `RecordCliScope` types from
   `@ava-cli/PipelineCli/recordCliExecution/runRecordedCliCommand`; the
   `ExecutionScopeStatus` type from `@etl/stores/ExecutionStore.types`.

2. Give each plan the time its dry run took, and name the command's options:

   ```ts
   type _PlannedPrune = RetiredScope &
     Readonly<{ counts: ScopePruneCounts; startedAt: Date; finishedAt: Date }>;

   type _PruneOptions = Readonly<{
     name: string;
     scope?: string;
     isDryRun: boolean;
     local: boolean;
   }>;
   ```

   In `_planPrunes`, time each dry run:

   ```ts
     const plans = await promiseMapSequential(args.retired, async (pair) => {
       const startedAt = new Date();
       const counts = await _pruneOne({
         target: args.target,
         name: args.name,
         retired: pair,
         isDryRun: true,
       });
       return { ...pair, counts, startedAt, finishedAt: new Date() };
     });
   ```

3. Record each real prune as it finishes. `_pruneAll` takes
   `recordScope: RecordCliScope` and becomes:

   ```ts
   async function _pruneAll(args: {
     target: PostgrestTarget;
     name: string;
     plans: readonly _PlannedPrune[];
     recordScope: RecordCliScope;
   }): Promise<void> {
     // Sequential on purpose: each prune is its own transaction, so a failure
     // leaves the earlier ones done and a rerun picks up the rest.
     await promiseMapSequential(args.plans, async (plan) => {
       const startedAt = new Date();
       const counts = await _pruneOne({
         target: args.target,
         name: args.name,
         retired: plan,
         isDryRun: false,
       });
       await args.recordScope(
         buildPruneExecutionScope({
           ...plan,
           counts,
           status: "succeeded",
           startedAt,
           finishedAt: new Date(),
         }),
       );
       printSuccess(`Pruned ${_formatPrune({ ...plan, counts })}`);
     });
   }
   ```

4. Add:

   ```ts
   /** Records each plan as a scope of the execution, with its dry run's counts. */
   async function _recordPlans(args: {
     plans: readonly _PlannedPrune[];
     status: ExecutionScopeStatus;
     recordScope: RecordCliScope;
   }): Promise<void> {
     // Sequential on purpose: scope rows are recorded in the printed order.
     await promiseMapSequential(args.plans, (plan) => {
       return args.recordScope(
         buildPruneExecutionScope({ ...plan, status: args.status }),
       );
     });
   }

   /**
    * Finds the pipeline's retired scopes and dry-runs each prune, printing
    * what it would do. Resolves to the ones with something to prune.
    */
   async function _findPrunePlans(args: {
     target: PostgrestTarget;
     options: _PruneOptions;
   }): Promise<_PlannedPrune[]> {
     const { target, options } = args;
     const { name } = options;
     const [live, stored] = await Promise.all([
       fetchLivePipelineScopes({ pipelineName: name, local: options.local }),
       listStoredScopes({ target, pipelineName: name }),
     ]);
     const retired = findRetiredScopes({ stored, live, scopeKey: options.scope });
     if (retired.length === 0) {
       printSuccess(`The ${name} pipeline has no retired scopes.`);
       return [];
     }
     const plans = await _planPrunes({ target, name, retired });
     if (plans.length === 0) {
       printSuccess(`The ${name} pipeline's retired scopes have nothing to prune.`);
     }
     return plans;
   }

   /**
    * Plans each retired scope's prune and, unless it is a dry run, prunes
    * them after a confirmation. Records each planned or pruned scope.
    */
   async function _pruneRetiredScopes(args: {
     target: PostgrestTarget;
     options: _PruneOptions;
     recordScope: RecordCliScope;
   }): Promise<CliCommandResult> {
     const { target, options, recordScope } = args;
     const plans = await _findPrunePlans({ target, options });
     if (plans.length === 0) {
       return { status: "succeeded" };
     }
     if (options.isDryRun) {
       printInfo("Dry run: nothing was changed.");
       await _recordPlans({ plans, status: "succeeded", recordScope });
       return { status: "succeeded" };
     }
     const isConfirmed = await promptToConfirmReset(
       `Prune ${plans.length} retired scope(s) of ${options.name}?`,
     );
     if (!isConfirmed) {
       printInfo("Prune cancelled. Nothing was changed.");
       await _recordPlans({ plans, status: "skipped", recordScope });
       return { status: "cancelled" };
     }
     await _pruneAll({ target, name: options.name, plans, recordScope });
     return { status: "succeeded" };
   }
   ```

5. `pruneRetiredScopesCommand` takes `options: _PruneOptions`, and its `try`
   becomes:

   ```ts
       if (options.scope !== undefined) {
         assertValidScopeKey(options.scope);
       }
       _assertLocalOnlyInDevelopment(options.local);
       const target = getPostgrestTarget();
       announcePostgrestTarget(target);
       await runRecordedCliCommand({
         target,
         start: {
           pipelineName: name,
           command: "prune_retired_scopes",
           isDryRun: options.isDryRun,
           isScoped: options.scope !== undefined,
           arguments: {
             ...(options.scope === undefined ? {} : { scope: options.scope }),
             dryRun: options.isDryRun,
           },
         },
         work: (recordScope) => {
           return _pruneRetiredScopes({ target, options, recordScope });
         },
       });
   ```

   Add "Records the prune in `pipeline_executions`, including a dry run or a
   declined one." to its JSDoc, and append " Records each prune, including
   a dry run, in the database's pipeline_executions table." to the
   `PruneRetiredScopesCli` description.

Run the prune tests. Expected: PASS.

- [ ] **Step 5: Check, format, commit**

```bash
pnpm --filter @avandar/ava-cli exec vitest run -c vitest.config.ts src/PipelineCli
pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec oxfmt --ignore-path .oxfmtignore <every .ts file you changed>
pnpm exec eslint <every .ts file you changed>
git add <every file you changed, by path>
git commit -m "feat(ava-cli): record retired-scope prunes as executions

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 14: Write the refinements back into the spec

**Files:**
- Modify: `docs/superpowers/specs/2026-10-22-pipeline-executions-design.md`

- [ ] **Step 1: Correct the two sections the refinements change**

1. Section 5.8: replace "The `X-Ava-Invocation` header holds JSON with the
   argv, actor, and code version." with "The `X-Ava-Invocation` header holds
   JSON with the argv and actor, with every non-ASCII character escaped; the
   server records its own `AVA_CODE_VERSION`, the commit that executed the
   run."
2. Section 5.9: replace "prints each crawl's duration next to its counts"
   with "prints each crawl's duration on its window line".

- [ ] **Step 2: Add section 11**

Append:

```markdown
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
```

- [ ] **Step 3: Refresh the Downloads copy and commit**

```bash
cp docs/superpowers/specs/2026-10-22-pipeline-executions-design.md ~/Downloads/avandar_demo-measles/pipeline-executions/
markdown-to-pdf ~/Downloads/avandar_demo-measles/pipeline-executions/2026-10-22-pipeline-executions-design.md --out ~/Downloads/avandar_demo-measles/pipeline-executions/2026-10-22-pipeline-executions-design.pdf
git add docs/superpowers/specs/2026-10-22-pipeline-executions-design.md
git commit -m "docs(etl): record the pipeline executions planning refinements

Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Task 15: Verify on the switched local stack

No code changes. **Every run here is small (`--limit`) and local.** Never
run a full crawl, and never pass `--staging` or `--prod`.

- [ ] **Step 1: Check the stack and rebuild the CLI**

```bash
ava supabase status   # first line must read SWITCHED (green); otherwise stop
pnpm build:ava-cli
```

Confirm the local database has the new tables:

```bash
psql postgresql://postgres:postgres@127.0.0.1:55342/postgres -c '\d pipeline_executions'
```

- [ ] **Step 2: Small local runs of each pipeline**

```bash
ava pipeline run socrata --local --limit 3
ava pipeline run hdx --local --limit 3 --scope format:csv
ava pipeline run world-bank__wdi --local --limit 1
```

Expected: each prints its crawls with `took ...` on the window line and a
final `Took ... (... listing drives and scopes).` line.

- [ ] **Step 3: One run through the server**

In a second terminal, `pnpm dev:pipeline-server`. Then:

```bash
ava pipeline run socrata --limit 2
```

Expected: the same output. Stop the server afterwards.

- [ ] **Step 4: A dry-run prune and a declined scope reset**

```bash
ava pipeline prune-retired-scopes hdx --local --dry-run
printf 'n\n' | ava pipeline reset hdx --scope format:parquet
```

If the reset prompt cannot read piped input, do not answer it any other
way: report that step as skipped, and leave it for the user to run.

- [ ] **Step 5: Query the records**

```bash
psql postgresql://postgres:postgres@127.0.0.1:55342/postgres
```

```sql
-- Every command just run, newest first.
select command, pipeline_name, run_mode, invoked_via, is_dry_run, is_limited,
  status, cli_argv, actor, code_version, duration_ms, setup_ms,
  listings_written, columns_written, listings_deleted
from pipeline_executions
order by started_at desc
limit 10;

-- Totals equal the sum of their scope rows. Expect no rows.
select e.id, e.listings_written, sum(s.listings_written)
from pipeline_executions e
join pipeline_execution_scopes s on s.execution_id = e.id
group by e.id, e.listings_written
having e.listings_written <> sum(s.listings_written);

-- Stage timings and denominators per crawl.
select pipeline_name, drive_key, scope_key, duration_ms, extract_ms,
  transform_ms, load_read_ms, load_parquet_build_ms, load_parquet_upload_ms,
  load_write_ms, checkpoint_write_ms, page_count, listings_considered,
  avg_columns_per_listing, parquet_bytes_written, source_bytes_reported,
  pipeline_metrics
from pipeline_execution_scopes
order by started_at desc
limit 20;
```

Then run the four example queries in spec section 5.3.

Expected:
- three `cli_local` runs and one `cli_server` run, all `succeeded` with
  `is_limited` true, `cli_argv` as typed, and a 40-character `code_version`
  on the local runs (the server's is null unless `AVA_CODE_VERSION` is set);
- the WDI scope row has non-zero `load_parquet_build_ms` and
  `parquet_bytes_written`;
- HDX scope rows have `source_bytes_reported` and, when a Parquet resource
  had no headers, `hdx.parquet_footer_reads` in `pipeline_metrics`;
- a `prune_retired_scopes` row with `is_dry_run` true, and a `reset` row with
  `is_scoped` true and `cancelled` (if Step 4's reset ran);
- the totals query returns no rows.

Report each expectation that does not hold, with the query output.

- [ ] **Step 6: Leave the stack switched**

Do not run `ava supabase restore`. Tell the user they run it when they finish
validating the branch.
