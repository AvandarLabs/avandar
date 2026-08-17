create type public.datasets__source_type as enum(
  'csv_file',
  'google_sheets',
  'virtual',
  'open_data',
  'xlsx_file'
);

create table public.datasets (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp of when the dataset was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when this row was last updated.
  updated_at timestamptz not null default now(),
  -- User id of the owner. We cannot delete users that still own
  -- datasets.
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- User profile id of the owner for this workspace. We cannot
  -- remove users from a workspace if they still own datasets.
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The date the last time this dataset's raw data was sync'd with its source.
  -- This is nullable because, for online datasets (e.g. a Google Sheet), we
  -- may have created the dataset object, but still not loaded its data, in
  -- which case the dataset has never been sync'd yet.
  date_of_last_sync timestamptz,
  -- Name of the dataset
  name text not null,
  -- The source of the dataset. E.g. "csv_file", "xlsx_file", etc
  source_type public.datasets__source_type not null,
  -- Description of the dataset
  description text,
  -- When true, tag-based app roles do not apply; shares still can
  is_restricted boolean not null default false
);

-- Enable row level security
-- RLS and policies: `17.rls.datasets.sql`.
alter table public.datasets enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.datasets to authenticated;

/** Prevents a dataset from being reassigned to another workspace. */
create or replace function public.datasets__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'dataset workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tr__datasets__prevent_workspace_id_change before
update of workspace_id on public.datasets for each row
execute function public.datasets__prevent_workspace_id_change ();

-- Trigger the `updated_at` update
create trigger tr_datasets__set_updated_at before
update on public.datasets for each row
execute function public.util__set_updated_at ();

create index idx_datasets__workspace_owner on public.datasets (workspace_id, owner_id);
