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
  -- WHAT was extracted and WHERE it physically sits. One entry per region;
  -- a dataset built from a map plus a KPI row has two. Shape:
  --   [{
  --      "id": "r1",
  --      "label": "Deaths by state",
  --      "shape": "labelled_graphic",
  --      "detectionMode": "manual",
  --      "fragments": [{ "page": 0, "bbox": [x0, y0, x1, y1] }],
  --      "options": { ... shape-specific ... }
  --    }, ...]
  --
  -- Deliberately NOT an ordinal index like "table 3". A sheet name is an
  -- identity Excel guarantees; a table ordinal is an output of our own
  -- detector, so improving detection could silently repoint a saved dataset
  -- at different data. Geometry is stable across detector versions.
  --
  -- Per-region settings (grid coordinates, header row count, merged-cell
  -- fill, ambiguity threshold) live in `options` rather than as columns,
  -- because a dataset can now hold regions of different shapes for which
  -- those settings mean different things or nothing at all.
  regions jsonb not null,
  -- How several regions combine. See the enum's comment.
  output_mode public.datasets__pdf_output_mode not null default 'natural',
  -- Which model produced any model-extracted rows, or null when the rows came
  -- from rules alone.
  --
  -- A column rather than an inference: the workspace keeps a privacy log, so
  -- "did a model see this document" must be answerable from the dataset row.
  llm_model text,
  -- The page range the user limited detection to, if any. Inclusive, and
  -- zero-based to match `regions[].fragments[].page`.
  --
  -- Two plain integers rather than an `int4range`, deliberately. We never
  -- range-query this column, and PostgREST hands a range back as its text
  -- form ("[4,9)"), which would mean writing and maintaining a codec for
  -- no benefit.
  page_range_start integer,
  page_range_end integer,
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
--
-- `service_role` is granted here for the same reason it is on
-- `datasets__xlsx_file`: server-side callers (edge functions, admin tooling,
-- the E2E supabase admin helpers) bypass RLS and need table-level access.
-- Omitting it also made the declared state disagree with the state the
-- creating migration actually applied, so every `db diff` produced revokes
-- that would have stripped service_role from this table.
grant
select
,
  insert,
update,
delete on table public.datasets__pdf_file to authenticated,
service_role;

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
