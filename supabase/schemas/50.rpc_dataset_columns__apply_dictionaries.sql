/**
 * Replaces every dictionary binding of one dataset with the given set in
 * one transaction and returns how many the dataset has now. An empty set
 * removes them all.
 *
 * SECURITY DEFINER because bindings are select-only for signed-in users:
 * this function is their only write path. Before it reads anything else it
 * checks that the caller can edit the dataset and can read dictionaries in
 * the dataset's own workspace, and it refuses any column, entry, or code
 * list from another dataset, dictionary, or workspace. It accepts
 * `reference` bindings only, since nothing converts values at load time
 * yet. Every refusal raises with a stable `hint` the client maps to copy.
 *
 * @param p_dataset_id The dataset whose bindings are replaced.
 * @param p_bindings The full set, as `[{ dataset_column_id, dictionary_id,
 *   entry_id, code_list_id, mode, direction }]`.
 * @returns How many bindings the dataset has after the apply.
 */
create or replace function public.rpc_dataset_columns__apply_dictionaries (p_dataset_id uuid, p_bindings jsonb) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_bindings jsonb := coalesce(p_bindings, '[]'::jsonb);
  v_count integer;
begin
  -- Read without a lock: the caller has not been authorized yet.
  select ds.workspace_id
  into v_workspace_id
  from public.datasets ds
  where ds.id = p_dataset_id;

  -- A missing dataset and a forbidden one raise the same error, so the
  -- function cannot be used to probe for dataset ids.
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

  -- Two applies to one dataset run one at a time.
  perform 1 from public.datasets where id = p_dataset_id for update;

  perform public.dataset_columns__check_bindings (p_dataset_id, v_workspace_id, v_bindings);
  perform public.dataset_columns__write_bindings (p_dataset_id, v_workspace_id, v_bindings);

  select count(*)::integer
  into v_count
  from public.dataset_columns__dictionary_bindings b
  where b.dataset_id = p_dataset_id;

  return v_count;
end;
$$;

/**
 * Raises with a stable hint when a set of bindings cannot be written to a
 * dataset: a malformed payload, a column listed twice, a mode other than
 * `reference`, a column from another dataset, an entry outside its
 * dictionary or the dataset's workspace, or a code list the entry does not
 * use. Called only by `rpc_dataset_columns__apply_dictionaries`.
 */
create or replace function public.dataset_columns__check_bindings (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_bindings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if jsonb_typeof(p_bindings) is distinct from 'array' or exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (
      dataset_column_id uuid, dictionary_id uuid, entry_id uuid, mode text, direction text
    )
    where
      b.dataset_column_id is null or
      b.dictionary_id is null or
      b.entry_id is null or
      b.mode is null or
      b.mode not in (select unnest(enum_range(null::public.dataset_columns__binding_mode))::text) or
      b.direction is null or
      b.direction not in (select unnest(enum_range(null::public.dataset_columns__binding_direction))::text)
  ) then
    raise exception 'Bindings must be an array of complete bindings'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dataset_column_id uuid)
    group by b.dataset_column_id
    having count(*) > 1
  ) then
    raise exception 'A column appears more than once'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (mode text)
    where b.mode <> 'reference'
  ) then
    raise exception 'Only reference bindings can be applied'
      using errcode = '0A000', hint = 'binding_mode_unsupported';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dataset_column_id uuid)
    left join public.dataset_columns dc on dc.id = b.dataset_column_id
    where dc.id is null or dc.dataset_id <> p_dataset_id
  ) then
    raise exception 'Every column must belong to this dataset'
      using errcode = '23514', hint = 'column_not_in_dataset';
  end if;

  perform public.dataset_columns__check_binding_entries (p_workspace_id, p_bindings);
end;
$$;

/**
 * Raises with a stable hint when a binding's entry is not in its dictionary
 * and the dataset's workspace, or its code list is not one the entry uses.
 * Called only by `dataset_columns__check_bindings`.
 */
create or replace function public.dataset_columns__check_binding_entries (p_workspace_id uuid, p_bindings jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dictionary_id uuid, entry_id uuid)
    left join public.data_dictionaries__entries en on
      en.id = b.entry_id and
      en.dictionary_id = b.dictionary_id and
      en.workspace_id = p_workspace_id
    where en.id is null
  ) then
    raise exception 'Every entry must belong to its dictionary in this workspace'
      using errcode = '23514', hint = 'entry_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (entry_id uuid, code_list_id uuid)
    where
      b.code_list_id is not null and
      not exists (
        select 1
        from public.data_dictionaries__entry_codings ec
        where ec.entry_id = b.entry_id and ec.code_list_id = b.code_list_id
      )
  ) then
    raise exception 'A binding''s code list must be one its entry uses'
      using errcode = '23514', hint = 'code_list_not_in_entry';
  end if;
end;
$$;

/**
 * Deletes a dataset's bindings that the new set leaves out and upserts the
 * rest, recording each dictionary's current version. Called only by
 * `rpc_dataset_columns__apply_dictionaries` after its checks pass.
 */
create or replace function public.dataset_columns__write_bindings (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_bindings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where
    b.dataset_id = p_dataset_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_bindings) as n (dataset_column_id uuid)
      where n.dataset_column_id = b.dataset_column_id
    );

  insert into public.dataset_columns__dictionary_bindings (
    workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id,
    code_list_id, mode, direction, applied_dictionary_version
  )
  select
    p_workspace_id, p_dataset_id, n.dataset_column_id, n.dictionary_id, n.entry_id,
    n.code_list_id, n.mode::public.dataset_columns__binding_mode,
    n.direction::public.dataset_columns__binding_direction, d.version
  from jsonb_to_recordset(p_bindings) as n (
    dataset_column_id uuid, dictionary_id uuid, entry_id uuid,
    code_list_id uuid, mode text, direction text
  )
  join public.data_dictionaries d on d.id = n.dictionary_id
  on conflict (dataset_column_id) do update
  set
    dictionary_id = excluded.dictionary_id,
    entry_id = excluded.entry_id,
    code_list_id = excluded.code_list_id,
    mode = excluded.mode,
    direction = excluded.direction,
    applied_dictionary_version = excluded.applied_dictionary_version;
end;
$$;

revoke
execute on function public.rpc_dataset_columns__apply_dictionaries (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks dataset edit rights itself.
grant
execute on function public.rpc_dataset_columns__apply_dictionaries (uuid, jsonb) to authenticated;

-- The helpers run inside the SECURITY DEFINER apply and are never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.dataset_columns__check_bindings (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__check_binding_entries (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__write_bindings (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;
