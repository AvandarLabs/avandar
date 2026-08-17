create table public.datasets__pdf_file (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Dataset this metadata belongs to
  dataset_id uuid not null unique references public.datasets (id) on update cascade on delete cascade,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Timestamp of when the dataset was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when this row was last updated.
  updated_at timestamptz not null default now(),
  -- Whether the parquet is available in cloud storage.
  is_in_cloud_storage boolean not null default false,
  -- Size of the source PDF in bytes
  size_in_bytes bigint not null,
  -- Whether the original PDF was retained. Always true for cloud-synced
  -- datasets. Recorded here so a client can tell whether re-extraction is
  -- possible without probing storage.
  has_original_file boolean not null default false,
  -- WHERE the extracted table physically sits, as one entry per page
  -- fragment. A table spanning pages 4-7 has four entries. Shape:
  --   [{ "page": 4, "bbox": [x0, y0, x1, y1] }, ...]
  --
  -- Deliberately NOT an ordinal index like "table 3". A sheet name is an
  -- identity Excel guarantees; a table ordinal is an output of our own
  -- detector, so improving detection could silently repoint a saved
  -- dataset at different data. Geometry is stable across detector
  -- versions.
  regions jsonb not null,
  -- Which signal produced this table.
  detection_mode public.datasets__pdf_detection_mode not null,
  -- Snapped grid line coordinates, so a re-parse reproduces the exact same
  -- cell boundaries. Null for `tagged`, where the structure tree supplies
  -- the grid directly.
  grid_x jsonb,
  grid_y jsonb,
  -- The page range the user limited detection to, if any. Inclusive, and
  -- zero-based to match `regions[].page`.
  --
  -- Two plain integers rather than an `int4range`, deliberately. We never
  -- range-query this column, and PostgREST hands a range back as its text
  -- form ("[4,9)"), which would mean writing and maintaining a codec for
  -- no benefit.
  page_range_start integer,
  page_range_end integer,
  -- Number of leading rows treated as header.
  header_rows integer not null default 1,
  -- Whether a value spanning several rows is repeated into each of them.
  fill_merged_cells boolean not null default true,
  -- Snapshot of what was extracted at import time, compared on re-parse to
  -- detect drift. Shape:
  --   { "headers": [...], "shape": [rowCount, colCount], "hash": "..." }
  fingerprint jsonb not null
);

-- Enable row level security
alter table public.datasets__pdf_file enable row level security;

-- Data API privileges.
--
-- REQUIRED, not optional. Supabase CLI 2.114.0 stopped auto-exposing new
-- tables in `public`, so a table without this grant is unreachable through
-- PostgREST no matter how correct its RLS is, and the failure is silent.
-- See the explanation in `supabase/schemas/99.grants.service_role.sql`.
grant
select
,
  insert,
update,
delete on table public.datasets__pdf_file to authenticated;

-- Policies
create policy "User can select datasets__pdf_file in their workspace" on public.datasets__pdf_file for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__pdf_file.dataset_id,
      'viewer'
    )
  );

create policy "User can insert datasets__pdf_file in their workspace" on public.datasets__pdf_file for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__pdf_file.dataset_id,
      'editor'
    )
  );

create policy "User can update datasets__pdf_file in their workspace" on public.datasets__pdf_file
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__pdf_file.dataset_id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__pdf_file.dataset_id,
      'editor'
    )
  );

create policy "User can delete datasets__pdf_file in their workspace" on public.datasets__pdf_file for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__pdf_file.dataset_id,
    'admin'
  )
);

/**
 * Trigger the `updated_at` update
 */
create trigger tr_datasets__pdf_file__set_updated_at before
update on public.datasets__pdf_file for each row
execute function public.util__set_updated_at ();
