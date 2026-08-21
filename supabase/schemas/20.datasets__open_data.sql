-- This represents an open data dataset that has been added to a workspace.
create table public.datasets__open_data (
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
  -- Catalog entry this dataset belongs to
  catalog_entry_id uuid not null references public.catalog_entries__open_data (id) on update cascade on delete cascade
);

-- Enable row level security
alter table public.datasets__open_data enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.datasets__open_data to authenticated,
service_role;

-- Policies
create policy "User can select datasets__open_data in their workspace" on public.datasets__open_data for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__open_data.dataset_id,
      'viewer'
    )
  );

create policy "User can insert datasets__open_data in their workspace" on public.datasets__open_data for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__open_data.dataset_id,
      'editor'
    )
  );

create policy "User can update datasets__open_data in their workspace" on public.datasets__open_data
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__open_data.dataset_id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__open_data.dataset_id,
      'editor'
    )
  );

create policy "User can delete datasets__open_data in their workspace" on public.datasets__open_data for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__open_data.dataset_id,
    'admin'
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_datasets__open_data__set_updated_at before
update on public.datasets__open_data for each row
execute function public.util__set_updated_at ();
