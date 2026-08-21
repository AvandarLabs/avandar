create table public.datasets__xlsx_file (
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
  -- Whether the dataset is available in cloud storage.
  -- When a dataset is uploaded to the Supabase storage, we set this to true.
  -- When a dataset is deleted from the Supabase storage (or has not yet
  -- finished uploading), we set this to false.
  is_in_cloud_storage boolean not null default false,
  -- Size of the spreadsheet file in bytes
  size_in_bytes bigint not null,
  -- Number of rows to skip at the start of the imported worksheet
  rows_to_skip integer not null default 0,
  -- Name of the worksheet that was read. Nullable when the default sheet was
  -- used (e.g. first sheet).
  sheet_name text,
  -- Whether the worksheet has a header row
  has_header boolean not null default true,
  -- Date format hint used when parsing cells. Nullable.
  date_format text,
  -- Timestamp format hint used when parsing cells. Nullable.
  timestamp_format text
);

-- Enable row level security
alter table public.datasets__xlsx_file enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.datasets__xlsx_file to authenticated,
service_role;

-- Policies
create policy "User can select datasets__xlsx_file in their workspace" on public.datasets__xlsx_file for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__xlsx_file.dataset_id,
      'viewer'
    )
  );

create policy "User can insert datasets__xlsx_file in their workspace" on public.datasets__xlsx_file for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__xlsx_file.dataset_id,
      'editor'
    )
  );

create policy "User can update datasets__xlsx_file in their workspace" on public.datasets__xlsx_file
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__xlsx_file.dataset_id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__xlsx_file.dataset_id,
      'editor'
    )
  );

create policy "User can delete datasets__xlsx_file in their workspace" on public.datasets__xlsx_file for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__xlsx_file.dataset_id,
    'admin'
  )
);

/**
 * Trigger the `updated_at` update
 */
create trigger tr_datasets__xlsx_file__set_updated_at before
update on public.datasets__xlsx_file for each row
execute function public.util__set_updated_at ();
