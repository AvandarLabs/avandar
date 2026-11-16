/**
 * How far each incremental pipeline crawl has loaded: one row per pipeline,
 * drive, and scope. Every connection in that scope with a source timestamp
 * before `high_water_mark` has been loaded, so the next incremental crawl of
 * the scope starts there. Written by `@avandar/etl` and cleared by the `ava`
 * CLI, both with the service role. Nothing in the app reads it.
 */
create table public.pipeline_scope_checkpoints (
  -- The pipeline, as `data_catalog_listings.pipeline_name` names it.
  pipeline_name text not null,
  -- The drive, as the pipeline keys it. For an API drive this is the same
  -- value as `data_catalog_listings.api_base_url`.
  drive_key text not null,
  -- The scope's key, unique within one drive.
  scope_key text not null,
  -- The newest source timestamp this scope's crawls have loaded up to.
  high_water_mark timestamptz not null,
  -- The run that last advanced this checkpoint.
  pipeline_run_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pipeline_name, drive_key, scope_key)
);

-- RLS on with no policies: only the service role, which bypasses RLS, ever
-- reaches this table.
alter table public.pipeline_scope_checkpoints enable row level security;

-- Data API privileges. Service role only.
grant
select
,
  insert,
update,
delete on table public.pipeline_scope_checkpoints to service_role;

create trigger tr__pipeline_scope_checkpoints__set_updated_at before
update on public.pipeline_scope_checkpoints for each row
execute function public.util__set_updated_at ();
