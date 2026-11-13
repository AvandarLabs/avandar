/**
 * One dataset column bound to one dictionary entry. The entry's description
 * and the chosen code list explain the column. With `convert`, its values
 * are also translated when the dataset loads, through the live code list,
 * or through `pinned_pairs` for a dataset converted in place. Select-only
 * for signed-in users, who see the bindings of the datasets they can see.
 * Written by the apply RPCs, which replace a dataset's bindings whole.
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
  -- Convert only. Whether a `<column>_original` copy keeps the values as
  -- stored beside the converted column.
  keeps_original boolean not null default false,
  -- Convert only. How values no pair matches are resolved, as
  -- `[{ value, action, code? }]`: `action` is `keep`, `empty`, or `map`, and
  -- `code` names the pair a `map` uses.
  value_overrides jsonb not null default '[]'::jsonb,
  -- The pairs a dataset converted in place was given, in the shape of
  -- `data_dictionaries__code_lists.pairs`. Null follows the live code list.
  -- Also set when a live binding's dictionary, entry, or code list is
  -- deleted, so the column keeps converting the same way.
  pinned_pairs jsonb,
  -- Whether the pinned pairs were an ordered list. Null exactly when
  -- `pinned_pairs` is.
  pinned_is_ordered boolean,
  -- Convert only. The column's `data_type` before this binding set it,
  -- restored when the binding stops converting.
  replaced_data_type public.datasets__ava_data_type,
  -- Keeps the binding in its dataset's workspace.
  foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on update cascade on delete cascade,
  constraint dictionary_bindings__overrides_is_array check (jsonb_typeof(value_overrides) = 'array'),
  constraint dictionary_bindings__pinned_pairs_is_array check (
    pinned_pairs is null or
    jsonb_typeof(pinned_pairs) = 'array'
  ),
  constraint dictionary_bindings__pinned_order_with_pairs check (
    (pinned_pairs is null) = (pinned_is_ordered is null)
  ),
  -- A reference binding changes no value, so it carries no conversion.
  constraint dictionary_bindings__reference_is_plain check (
    mode = 'convert' or
    (
      not keeps_original and
      value_overrides = '[]'::jsonb and
      pinned_pairs is null and
      replaced_data_type is null
    )
  )
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
 * Pins each live convert binding in `p_binding_ids` to its code list's
 * current pairs and order, so a column converted through a linked dataset
 * keeps converting the same way when its list, entry, or dictionary goes
 * away. A binding already pinned, or with no list, is left as it is.
 * Called by the delete triggers below, before the cascade clears
 * `code_list_id`.
 */
create or replace function public.dataset_columns__dictionary_bindings__pin_live (p_binding_ids uuid[]) returns void language sql
set
  search_path = '' as $$
  update public.dataset_columns__dictionary_bindings b
  set
    pinned_pairs = cl.pairs,
    pinned_is_ordered = cl.is_ordered
  from public.data_dictionaries__code_lists cl
  where
    b.id = any (p_binding_ids) and
    b.mode = 'convert' and
    b.pinned_pairs is null and
    cl.id = b.code_list_id;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__pin_live (uuid[])
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Before a dictionary is deleted: removes its reference bindings and pins
 * its live convert bindings, so no linked dataset changes silently.
 * SECURITY DEFINER because the owner who deletes a dictionary may not edit
 * every dataset that uses it.
 */
create or replace function public.dataset_columns__dictionary_bindings__release_for_dictionary () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.dictionary_id = old.id and b.mode = 'reference';

  perform public.dataset_columns__dictionary_bindings__pin_live (
    array(
      select b.id
      from public.dataset_columns__dictionary_bindings b
      where b.dictionary_id = old.id
    )
  );

  return old;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__release_for_dictionary ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Before an entry is deleted, for example by a dictionary save that leaves
 * it out: removes its reference bindings and pins its live convert
 * bindings. SECURITY DEFINER for the same reason as
 * `dataset_columns__dictionary_bindings__release_for_dictionary`.
 */
create or replace function public.dataset_columns__dictionary_bindings__release_for_entry () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.entry_id = old.id and b.mode = 'reference';

  perform public.dataset_columns__dictionary_bindings__pin_live (
    array(
      select b.id
      from public.dataset_columns__dictionary_bindings b
      where b.entry_id = old.id
    )
  );

  return old;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__release_for_entry ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Before a code list is deleted: pins the live convert bindings that use
 * it. A reference binding keeps its entry, and `on delete set null` clears
 * its list. SECURITY DEFINER for the same reason as
 * `dataset_columns__dictionary_bindings__release_for_dictionary`.
 */
create or replace function public.dataset_columns__dictionary_bindings__pin_for_code_list () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  perform public.dataset_columns__dictionary_bindings__pin_live (
    array(
      select b.id
      from public.dataset_columns__dictionary_bindings b
      where b.code_list_id = old.id
    )
  );

  return old;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__pin_for_code_list ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * The `data_type` a convert binding gives its column: `varchar` for
 * decoded labels, and for encoded codes `bigint` when every code is a
 * whole number of at most 18 digits (spaces around it ignored), `varchar`
 * otherwise. An empty list outputs `varchar`. `ColumnConversion` follows
 * the same rule, so the view and the stored type always agree.
 *
 * @param p_direction Which side of each pair the column holds as stored.
 * @param p_pairs The pairs, in the shape of
 *   `data_dictionaries__code_lists.pairs`.
 */
create or replace function public.dataset_columns__dictionary_bindings__get_output_data_type (
  p_direction public.dataset_columns__binding_direction,
  p_pairs jsonb
) returns public.datasets__ava_data_type language sql immutable
set
  search_path = '' as $$
  select
    case
      when p_direction = 'encode' and coalesce(
        (
          select bool_and(btrim(p.pair ->> 'code') ~ '^-?[0-9]{1,18}$')
          from jsonb_array_elements(coalesce(p_pairs, '[]'::jsonb)) as p (pair)
        ),
        false
      ) then 'bigint'::public.datasets__ava_data_type
      else 'varchar'::public.datasets__ava_data_type
    end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__get_output_data_type (
  public.dataset_columns__binding_direction,
  jsonb
)
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Re-derives the `data_type` of every column with a live convert binding
 * on one of `p_code_list_ids`, after those lists changed. Called by the
 * dictionary save and by an apply that adds values to a list. A pinned
 * binding's column keeps its type until Re-apply.
 */
create or replace function public.dataset_columns__dictionary_bindings__sync_live_types (p_code_list_ids uuid[]) returns void language sql
set
  search_path = '' as $$
  update public.dataset_columns dc
  set data_type = t.data_type
  from (
    select
      b.dataset_column_id,
      public.dataset_columns__dictionary_bindings__get_output_data_type (b.direction, cl.pairs) as data_type
    from public.dataset_columns__dictionary_bindings b
    join public.data_dictionaries__code_lists cl on cl.id = b.code_list_id
    where
      b.code_list_id = any (p_code_list_ids) and
      b.mode = 'convert' and
      b.pinned_pairs is null
  ) as t
  where dc.id = t.dataset_column_id and dc.data_type is distinct from t.data_type;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__sync_live_types (uuid[])
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * The reference bindings whose code list a dictionary save is about to
 * delete: lists of `p_dictionary_id` that `p_code_lists` leaves out. Read
 * before the save writes, because the delete clears `code_list_id`.
 */
create or replace function public.dataset_columns__dictionary_bindings__find_repointable (
  p_dictionary_id uuid,
  p_code_lists jsonb
) returns uuid[] language sql stable
set
  search_path = '' as $$
  select coalesce(array_agg(b.id), '{}'::uuid[])
  from public.dataset_columns__dictionary_bindings b
  join public.data_dictionaries__code_lists cl on cl.id = b.code_list_id
  where
    cl.dictionary_id = p_dictionary_id and
    b.mode = 'reference' and
    not exists (
      select 1
      from jsonb_to_recordset(p_code_lists) as l (id uuid)
      where l.id = cl.id
    );
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__find_repointable (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Points each reference binding in `p_binding_ids` that lost its code list
 * at its entry's code list, when the entry has exactly one. A binding whose
 * entry has several lists keeps none until a dictionary is applied again,
 * since only the data can say which list fits.
 */
create or replace function public.dataset_columns__dictionary_bindings__repoint_reference (p_binding_ids uuid[]) returns void language sql
set
  search_path = '' as $$
  update public.dataset_columns__dictionary_bindings b
  set code_list_id = ec.code_list_id
  from public.data_dictionaries__entry_codings ec
  where
    b.id = any (p_binding_ids) and
    b.mode = 'reference' and
    b.code_list_id is null and
    ec.entry_id = b.entry_id and
    (
      select count(*)
      from public.data_dictionaries__entry_codings c
      where c.entry_id = b.entry_id
    ) = 1;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__repoint_reference (uuid[])
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Checks that the caller can edit `p_dataset_id` and read dictionaries in
 * its workspace, then locks the dataset so two writes to its bindings run
 * one at a time, and returns its workspace. A missing dataset and a
 * forbidden one raise the same error, so no binding RPC can be used to
 * probe for dataset ids. Called first by every binding RPC.
 */
create or replace function public.dataset_columns__dictionary_bindings__authorize (p_dataset_id uuid) returns uuid language plpgsql
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
begin
  select ds.workspace_id
  into v_workspace_id
  from public.datasets ds
  where ds.id = p_dataset_id;

  if v_workspace_id is null or not public.util__auth_user_can_access_resource (
    'dataset'::public.resource_type,
    p_dataset_id,
    'editor'::public.role_level
  ) then
    raise exception 'Only an editor of this dataset can apply dictionaries to it'
      using errcode = '42501', hint = 'dataset_editor_required';
  end if;

  if not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ) then
    raise exception 'Only Data Sources viewers can read dictionaries'
      using errcode = '42501', hint = 'dictionary_viewer_required';
  end if;

  perform 1 from public.datasets where id = p_dataset_id for no key update;

  if not found then
    raise exception 'Only an editor of this dataset can apply dictionaries to it'
      using errcode = '42501', hint = 'dataset_editor_required';
  end if;

  return v_workspace_id;
end;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__authorize (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Sets the `data_type` of every converted column of one dataset to what
 * its conversion outputs, reading the pinned pairs or the live list.
 * Called by the apply and re-apply RPCs after they write.
 */
create or replace function public.dataset_columns__dictionary_bindings__set_types (p_dataset_id uuid) returns void language sql
set
  search_path = '' as $$
  update public.dataset_columns dc
  set data_type = t.data_type
  from (
    select
      b.dataset_column_id,
      public.dataset_columns__dictionary_bindings__get_output_data_type (
        b.direction,
        coalesce(b.pinned_pairs, cl.pairs)
      ) as data_type
    from public.dataset_columns__dictionary_bindings b
    left join public.data_dictionaries__code_lists cl on cl.id = b.code_list_id
    where
      b.dataset_id = p_dataset_id and
      b.mode = 'convert' and
      (b.pinned_pairs is not null or cl.id is not null)
  ) as t
  where dc.id = t.dataset_column_id and dc.data_type is distinct from t.data_type;
$$;

revoke
execute on function public.dataset_columns__dictionary_bindings__set_types (uuid)
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

create trigger tr__data_dictionaries__release_bindings before delete on public.data_dictionaries for each row
execute function public.dataset_columns__dictionary_bindings__release_for_dictionary ();

create trigger tr__data_dictionaries__entries__release_bindings before delete on public.data_dictionaries__entries for each row
execute function public.dataset_columns__dictionary_bindings__release_for_entry ();

create trigger tr__data_dictionaries__code_lists__pin_bindings before delete on public.data_dictionaries__code_lists for each row
execute function public.dataset_columns__dictionary_bindings__pin_for_code_list ();

create index idx_dataset_columns__dictionary_bindings__dataset_id on public.dataset_columns__dictionary_bindings (dataset_id);

create index idx_dataset_columns__dictionary_bindings__dictionary_id on public.dataset_columns__dictionary_bindings (dictionary_id);

create index idx_dataset_columns__dictionary_bindings__entry_id on public.dataset_columns__dictionary_bindings (entry_id);

create index idx_dataset_columns__dictionary_bindings__code_list_id on public.dataset_columns__dictionary_bindings (code_list_id);

-- Declared here rather than with the column in `20.dataset_columns.sql`,
-- because the bindings table it names is created in this file.
alter table public.dataset_columns
add constraint dataset_columns_dictionary_binding_id_fkey foreign key (dictionary_binding_id) references public.dataset_columns__dictionary_bindings (id) on update cascade on delete cascade;

/**
 * Whether the signed-in user can view a dataset with a live convert binding
 * that reads `p_code_list_id`. A linked dataset converts through its code
 * list each time it loads, so anyone who may view it must read that list,
 * Data Sources role or not. A reference binding changes no value, and a
 * pinned binding carries its own pairs, so neither opens a list.
 *
 * SECURITY DEFINER so the lookup reads bindings directly instead of through
 * their own select policy, which would run the same dataset check again
 * for every binding. The dataset check itself still runs as the caller's
 * `auth.uid()`.
 *
 * @param p_code_list_id The code list a policy is deciding on.
 */
create or replace function public.util__auth_user_can_read_code_list_through_binding (p_code_list_id uuid) returns boolean language sql security definer stable
set
  search_path = '' as $$
  select exists (
    select 1
    from public.dataset_columns__dictionary_bindings b
    where
      b.code_list_id = p_code_list_id and
      b.mode = 'convert' and
      b.pinned_pairs is null and
      public.util__auth_user_can_access_resource (
        'dataset'::public.resource_type,
        b.dataset_id,
        'viewer'::public.role_level
      )
  );
$$;

-- `authenticated` only: a policy expression is evaluated as the calling
-- role, and the policy below is `to authenticated`.
revoke
execute on function public.util__auth_user_can_read_code_list_through_binding (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.util__auth_user_can_read_code_list_through_binding (uuid) to authenticated;

-- A linked dataset converts through its live code list when it loads, so
-- a viewer of that dataset reads the list even without a Data Sources
-- role. Declared here, not with the table at 20, because it names the
-- bindings table. Policies are permissive, so this widens the Data Sources
-- viewer policy and never narrows it.
create policy "Linked dataset viewers can select their code lists" on public.data_dictionaries__code_lists for
select
  to authenticated using (
    public.util__auth_user_can_read_code_list_through_binding (public.data_dictionaries__code_lists.id)
  );
