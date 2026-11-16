/**
 * A dataset represented by a lazily evaluated SQL query instead of stored raw
 * data, in the same sense a database view is. A QETL process materializes it:
 * it inspects the query, loads the dependencies it needs, and runs the query
 * against them.
 */
create table public.datasets__virtual (
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
  -- The query that was used to generate the dataset
  raw_sql text not null,
  -- True for a places dataset: `raw_sql` is a `VALUES` list of hand-placed
  -- sites that the map's "Add a place" tool rewrites on every edit.
  is_places boolean not null default false,
  -- The dataset a linked dataset reads, for the source's rail and a
  -- dictionary's Used by tab. Set only by
  -- `rpc_dataset_columns__apply_dictionaries_as_linked_dataset`. Null for
  -- any other virtual dataset, and once the source is deleted.
  linked_source_dataset_id uuid references public.datasets (id) on update cascade on delete set null
);

-- Enable row level security
alter table public.datasets__virtual enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.datasets__virtual to authenticated,
service_role;

-- Policies
create policy "User can select datasets__virtual in their workspace" on public.datasets__virtual for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__virtual.dataset_id,
      'viewer'
    )
  );

create policy "User can insert datasets__virtual in their workspace" on public.datasets__virtual for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__virtual.dataset_id,
      'editor'
    )
  );

create policy "User can update datasets__virtual in their workspace" on public.datasets__virtual
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__virtual.dataset_id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__virtual.dataset_id,
      'editor'
    )
  );

create policy "User can delete datasets__virtual in their workspace" on public.datasets__virtual for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__virtual.dataset_id,
    'admin'
  )
);

create trigger tr_datasets__virtual__set_updated_at before
update on public.datasets__virtual for each row
execute function public.util__set_updated_at ();

/**
 * Refuses a signed-in user setting or changing which dataset a linked
 * dataset reads. Only `rpc_dataset_columns__apply_dictionaries_as_linked_dataset`,
 * which runs as the function owner, sets it. A whole-row update that sends
 * the same value passes, so editing a virtual dataset's SQL still works.
 */
create or replace function public.datasets__virtual__guard_linked_source () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.linked_source_dataset_id is not null then
      raise exception 'a linked dataset''s source is managed'
        using errcode = '42501';
    end if;
  elsif new.linked_source_dataset_id is distinct from old.linked_source_dataset_id then
    raise exception 'a linked dataset''s source is managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE.
revoke
execute on function public.datasets__virtual__guard_linked_source ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__datasets__virtual__guard_linked_source before insert or
update of linked_source_dataset_id on public.datasets__virtual for each row
execute function public.datasets__virtual__guard_linked_source ();

-- A source's rail and delete confirmation list the linked datasets that
-- read it.
create index idx_datasets__virtual__linked_source_dataset_id on public.datasets__virtual (linked_source_dataset_id)
where
  linked_source_dataset_id is not null;
