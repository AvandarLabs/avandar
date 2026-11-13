/**
 * One dataset column bound to one dictionary entry. The entry's description
 * and the chosen code list explain the column. With `convert` its values
 * would also be translated when the dataset loads. Select-only for signed-in
 * users, who see the bindings of the datasets they can see. Written by
 * `rpc_dataset_columns__apply_dictionaries`, which replaces a dataset's
 * bindings whole.
 */
create table public.dataset_columns__dictionary_bindings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this binding belongs to, always its dataset's
  workspace_id uuid not null,
  -- Dataset the bound column belongs to
  dataset_id uuid not null,
  -- The bound column. A column has at most one binding.
  dataset_column_id uuid not null unique references public.dataset_columns (id) on update cascade on delete cascade,
  -- The dictionary the entry belongs to. Null once the dictionary is gone.
  dictionary_id uuid references public.data_dictionaries (id) on update cascade on delete set null,
  -- The bound entry. Null once the entry is gone.
  entry_id uuid references public.data_dictionaries__entries (id) on update cascade on delete set null,
  -- The entry's code list chosen for this column. Null for an entry with no
  -- codes, or once the code list is gone.
  code_list_id uuid references public.data_dictionaries__code_lists (id) on update cascade on delete set null,
  -- Whether the values are only explained or also converted
  mode public.dataset_columns__binding_mode not null default 'reference',
  -- Which side of each code pair the column holds
  direction public.dataset_columns__binding_direction not null default 'decode',
  -- The dictionary's version when this binding was written
  applied_dictionary_version integer not null,
  -- Timestamp of when the binding was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the binding was last updated
  updated_at timestamptz not null default now(),
  -- Keeps the binding in its dataset's workspace.
  foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on update cascade on delete cascade
);

alter table public.dataset_columns__dictionary_bindings enable row level security;

-- Signed-in users read only. Writes go through the apply RPC.
grant
select
  on table public.dataset_columns__dictionary_bindings to authenticated;

grant
select
,
  insert,
update,
delete on table public.dataset_columns__dictionary_bindings to service_role;

-- Bindings follow their dataset: a reader who cannot see a dataset never
-- sees its bindings, whatever their dictionary role.
create policy "Dataset viewers can select their columns' dictionary bindings" on public.dataset_columns__dictionary_bindings for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.dataset_columns__dictionary_bindings.dataset_id,
      'viewer'
    )
  );

/** Prevents a binding from being moved to another workspace. */
create or replace function public.dataset_columns__dictionary_bindings__keep_workspace_id () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'binding workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__keep_workspace_id ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Removes the reference bindings of a dictionary that is being deleted, so
 * no column keeps pointing at it. SECURITY DEFINER because the owner who
 * deletes a dictionary may not edit every dataset that uses it, and a
 * reference binding changes no data.
 */
create or replace function public.dataset_columns__dictionary_bindings__remove_for_dictionary () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.dictionary_id = old.id and b.mode = 'reference';

  return old;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__remove_for_dictionary ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Removes the reference bindings of an entry that is being deleted, for
 * example by a dictionary save that leaves it out. SECURITY DEFINER for the
 * same reason as `..._remove_for_dictionary`.
 */
create or replace function public.dataset_columns__dictionary_bindings__remove_for_entry () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.entry_id = old.id and b.mode = 'reference';

  return old;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__remove_for_entry ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__dataset_columns__dictionary_bindings__keep_workspace_id before
update of workspace_id on public.dataset_columns__dictionary_bindings for each row
execute function public.dataset_columns__dictionary_bindings__keep_workspace_id ();

create trigger tr__dataset_columns__dictionary_bindings__set_updated_at before
update on public.dataset_columns__dictionary_bindings for each row
execute function public.util__set_updated_at ();

create trigger tr__data_dictionaries__remove_reference_bindings before delete on public.data_dictionaries for each row
execute function public.dataset_columns__dictionary_bindings__remove_for_dictionary ();

create trigger tr__data_dictionaries__entries__remove_reference_bindings before delete on public.data_dictionaries__entries for each row
execute function public.dataset_columns__dictionary_bindings__remove_for_entry ();

create index idx_dataset_columns__dictionary_bindings__dataset_id on public.dataset_columns__dictionary_bindings (dataset_id);

create index idx_dataset_columns__dictionary_bindings__dictionary_id on public.dataset_columns__dictionary_bindings (dictionary_id);

create index idx_dataset_columns__dictionary_bindings__entry_id on public.dataset_columns__dictionary_bindings (entry_id);

create index idx_dataset_columns__dictionary_bindings__code_list_id on public.dataset_columns__dictionary_bindings (code_list_id);
