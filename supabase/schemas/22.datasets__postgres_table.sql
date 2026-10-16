/**
 * One row per Postgres table or view imported as an Avandar dataset - the
 * satellite half of the `datasets` / `datasets__<type>` split, the same
 * shape as `datasets__csv_file` or `datasets__google_sheets`. Reached
 * through `db_connections__postgres` (`connection_id`), which holds the
 * saved server connection this table is read through; `schema_name` and
 * `table_name` together identify the relation within that server.
 */
create table public.datasets__postgres_table (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Dataset this metadata belongs to
  dataset_id uuid not null unique references public.datasets (id) on update cascade on delete cascade,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The saved connection this dataset reads through. `restrict`, not
  -- `cascade`: deleting a connection with live datasets must be an
  -- explicit, informed action - the FK must not silently orphan a
  -- queryable dataset.
  connection_id uuid not null references public.db_connections (id) on update cascade on delete restrict,
  schema_name text not null,
  table_name text not null,
  relation_kind public.datasets__postgres_table_relation_kind not null,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable row level security
alter table public.datasets__postgres_table enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.datasets__postgres_table to authenticated,
service_role;

-- Policies
create policy "User can select datasets__postgres_table in their workspace" on public.datasets__postgres_table for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__postgres_table.dataset_id,
      'viewer'
    )
  );

create policy "User can insert datasets__postgres_table in their workspace" on public.datasets__postgres_table for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__postgres_table.dataset_id,
      'editor'
    )
  );

create policy "User can update datasets__postgres_table in their workspace" on public.datasets__postgres_table
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__postgres_table.dataset_id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__postgres_table.dataset_id,
      'editor'
    )
  );

create policy "User can delete datasets__postgres_table in their workspace" on public.datasets__postgres_table for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__postgres_table.dataset_id,
    'admin'
  )
);

create trigger tr_datasets__postgres_table__set_updated_at before
update on public.datasets__postgres_table for each row
execute function public.util__set_updated_at ();
