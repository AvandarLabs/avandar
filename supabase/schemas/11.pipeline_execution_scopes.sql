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
    (
      extract(
        epoch
        from
          (finished_at - started_at)
      ) * 1000
    )::bigint
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
  created_at timestamptz not null default now(),
  -- One row per drive and scope per execution, so a retried write cannot
  -- double the execution's totals. Also indexes the foreign key.
  constraint pipeline_execution_scopes__one_per_scope unique (execution_id, drive_key, scope_key),
  constraint pipeline_execution_scopes__finishes_after_start check (finished_at >= started_at)
);

-- When was this drive last crawled.
create index pipeline_execution_scopes__drive_started on public.pipeline_execution_scopes (
  pipeline_name,
  drive_key,
  started_at desc
);

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
