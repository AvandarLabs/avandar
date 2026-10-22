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
    (
      extract(
        epoch
        from
          (finished_at - started_at)
      ) * 1000
    )::bigint
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
