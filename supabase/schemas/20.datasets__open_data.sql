/** An open data dataset that has been added to a workspace. */
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
  -- Catalog listing this dataset was adopted from
  catalog_listing_id uuid not null references public.data_catalog_listings (id) on update cascade on delete cascade
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

create trigger tr_datasets__open_data__set_updated_at before
update on public.datasets__open_data for each row
execute function public.util__set_updated_at ();

/**
 * Refuses to add a workspace dataset from a catalog listing whose relation
 * column types were never verified against the source's real data. Until
 * they are, the listing's columns are text at best, and possibly names the
 * source does not have, so the dataset would start with the wrong columns.
 * The app verifies a listing's types before it adds it.
 */
create or replace function public.datasets__open_data__assert_listing_column_types_verified () returns trigger as $$
begin
  if exists (
    select 1
    from public.data_catalog_listings listing
    where
      listing.id = new.catalog_listing_id and
      listing.date_column_type_last_verified is null
  ) then
    raise exception 'Catalog listing % has unverified column types, so it cannot be added to a workspace yet', new.catalog_listing_id;
  end if;
  return new;
end;
$$ language plpgsql security invoker
set
  search_path = '';

-- A trigger function is checked for EXECUTE when the trigger is created, not
-- when it fires, so no role needs a grant.
revoke
execute on function public.datasets__open_data__assert_listing_column_types_verified ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr_datasets__open_data__assert_listing_column_types_verified before insert or
update of catalog_listing_id on public.datasets__open_data for each row
execute function public.datasets__open_data__assert_listing_column_types_verified ();
