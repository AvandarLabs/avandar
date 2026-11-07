/**
 * One drive a drive-index pipeline crawls, such as the NYC Open Data
 * portal, and what each organization level is called on it. Written by
 * `@avandar/etl` with the service role before it crawls the drive. Read by
 * the catalog to label a listing's `organization1_name` through
 * `organization4_name`.
 */
create table public.data_catalog_drives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The pipeline, as `data_catalog_listings.pipeline_name` names it.
  pipeline_name text not null,
  -- The drive, as the pipeline keys it: its base URL, the same value as
  -- `pipeline_scope_checkpoints.drive_key` and, on an API listing,
  -- `data_catalog_listings.api_base_url`.
  drive_key text not null,
  -- What each organization level is called on this drive, such as `City`
  -- and `Agency`. Null for a level the drive does not use.
  organization1_label text,
  organization2_label text,
  organization3_label text,
  organization4_label text,
  constraint data_catalog_drives__pipeline_drive_unique unique (
    pipeline_name,
    drive_key
  )
);

alter table public.data_catalog_drives enable row level security;

-- Data API privileges.
--
-- Read-only for users: drives are written by the pipelines.
grant
select
  on table public.data_catalog_drives to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_catalog_drives to service_role;

create policy "User can select open data catalog drives" on public.data_catalog_drives for
select
  to authenticated using (true);

create trigger tr__data_catalog_drives__set_updated_at before
update on public.data_catalog_drives for each row
execute function public.util__set_updated_at ();
