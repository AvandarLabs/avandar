/**
 * One column of a crosswalk's combined dataset: its name, position, type,
 * and the dictionary entry that governs it, if any. A governed column's
 * values are translated through the entry's code lists. Select-only for
 * signed-in users; written by `rpc_crosswalks__save`.
 */
create table public.crosswalks__columns (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this column belongs to, always its crosswalk's
  workspace_id uuid not null,
  -- Crosswalk this column belongs to
  crosswalk_id uuid not null,
  -- Timestamp of when the column was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the column was last updated
  updated_at timestamptz not null default now(),
  -- The column's name in the combined dataset, unique per crosswalk
  -- ignoring case, and stored trimmed
  name text not null,
  -- Display and output order within the crosswalk, ascending from 0
  position integer not null,
  -- The column's type in the combined dataset
  data_type public.datasets__ava_data_type not null,
  -- The dictionary entry that governs this column. Null for a column no
  -- entry governs, and once the entry is deleted.
  entry_id uuid references public.data_dictionaries__entries (id) on update cascade on delete set null,
  -- Lets mappings use a composite foreign key that keeps them in this
  -- column's crosswalk.
  unique (id, crosswalk_id),
  foreign key (crosswalk_id, workspace_id) references public.crosswalks (id, workspace_id) on update cascade on delete cascade,
  constraint crosswalks__columns__name_not_blank check (btrim(name) <> ''),
  -- Keeps the unique index on `lower(name)` equal to one on
  -- `lower(btrim(name))`, which the SQLite mirror could not build.
  constraint crosswalks__columns__name_trimmed check (name = btrim(name))
);

alter table public.crosswalks__columns enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.crosswalks__columns to authenticated;

grant
select
,
  insert,
update,
delete on table public.crosswalks__columns to service_role;

create policy "Data Sources viewers can select crosswalk columns" on public.crosswalks__columns for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.crosswalks__columns.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__crosswalks__columns__set_updated_at before
update on public.crosswalks__columns for each row
execute function public.util__set_updated_at ();

-- One name per crosswalk ignoring case, as DuckDB compares column names.
create unique index crosswalks__columns__name_unique on public.crosswalks__columns (crosswalk_id, lower(name));

-- Deleting an entry finds the columns it governs through this index.
create index idx_crosswalks__columns__entry_id on public.crosswalks__columns (entry_id);
