create type public.datasets__source_type as enum(
  'csv_file',
  'google_sheets',
  'virtual',
  'open_data',
  'xlsx_file',
  'pdf_file',
  'postgres_table'
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
  is_restricted boolean not null default false,
  -- The target of a `datasets__<type>` table's `(dataset_id, workspace_id)`
  -- foreign key, which keeps that row's workspace equal to its dataset's.
  constraint datasets__id_workspace_id_key unique (id, workspace_id)
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
delete on table public.datasets to authenticated,
service_role;

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

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.datasets__prevent_workspace_id_change ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__datasets__prevent_workspace_id_change before
update of workspace_id on public.datasets for each row
execute function public.datasets__prevent_workspace_id_change ();

create trigger tr_datasets__set_updated_at before
update on public.datasets for each row
execute function public.util__set_updated_at ();

/**
 * Whether a dataset is backed by a Postgres table. `security definer` so a
 * policy or trigger asking about a dataset gets the true answer even when the
 * caller's own `datasets` policy hides the row: a guard that read "hidden" as
 * "not Postgres" would wave the caller through.
 */
create or replace function public.datasets__is_postgres_table (p_dataset_id uuid) returns boolean language sql security definer stable
set
  search_path = '' as $$
  select exists (
    select 1
    from public.datasets
    where id = p_dataset_id and source_type = 'postgres_table'
  );
$$;

-- Both Data API roles fire the `dataset_columns` trigger that calls it, which
-- runs it as the role that made the change.
revoke
execute on function public.datasets__is_postgres_table (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.datasets__is_postgres_table (uuid) to authenticated,
service_role;

/**
 * Whether the caller may add a column to a dataset, as far as its source is
 * concerned: always for a dataset no Postgres table backs, and for a
 * Postgres-backed one only as a `data_sources` editor in the dataset's own
 * workspace, since its rows route reads exactly its columns from that table.
 * `security definer` for the same reason as `datasets__is_postgres_table`.
 */
create or replace function public.datasets__auth_user_may_add_column (p_dataset_id uuid) returns boolean language sql security definer stable
set
  search_path = '' as $$
  select coalesce(
    (
      select
        d.source_type <> 'postgres_table' or
        public.util__auth_user_meets_min_app_role (
          d.workspace_id,
          'data_sources',
          'editor'
        )
      from public.datasets d
      where d.id = p_dataset_id
    ),
    false
  );
$$;

-- `authenticated` evaluates it inside the `dataset_columns` insert policy.
revoke
execute on function public.datasets__auth_user_may_add_column (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.datasets__auth_user_may_add_column (uuid) to authenticated;

/**
 * Prevents a dataset from changing its source type. What a dataset reads,
 * and which guards protect that, follows from its source type, so editing
 * the dataset must never be a way to switch them off.
 */
create or replace function public.datasets__prevent_source_type_change () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if new.source_type is distinct from old.source_type then
    raise exception 'dataset source_type cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.datasets__prevent_source_type_change ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__datasets__prevent_source_type_change before
update of source_type on public.datasets for each row
execute function public.datasets__prevent_source_type_change ();

create index idx_datasets__workspace_owner on public.datasets (workspace_id, owner_id);
