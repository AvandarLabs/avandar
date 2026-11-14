/**
 * Creates a crosswalk's combined dataset, when it has none, or updates
 * it: its name, `raw_sql`, its columns reconciled by name ignoring case,
 * and the reference bindings of its governed columns, replaced whole.
 * Records `compiled_at` and `compiled_code_lists` on the crosswalk.
 * Returns the combined dataset's id.
 *
 * SECURITY DEFINER because bindings are select-only for signed-in users
 * and the crosswalk's managed columns are refused to them. It checks Data
 * Sources editor on the crosswalk before it reads anything else, then
 * refuses when a dataset it stacks is one the caller cannot view (the SQL
 * would be written without it), then workspace admin to create a dataset, as any import needs, or editor
 * rights on the dataset to update it. A refusal at any point, including
 * after the dataset row was written, rolls the whole save back.
 *
 * @param p_crosswalk_id The crosswalk whose combined dataset this is.
 * @param p_dataset_id The combined dataset's id: a new id chosen by the
 *   caller when creating, the crosswalk's `output_dataset_id` when
 *   updating.
 * @param p_dataset_name The combined dataset's name.
 * @param p_raw_sql The compiled SQL that stacks every mapped dataset.
 * @param p_columns The columns in output order, as `[{ name, data_type }]`.
 * @param p_bindings The governed columns' bindings, as `[{ column_name,
 *   dictionary_id, entry_id, code_list_id, direction }]`.
 * @param p_compiled_code_lists The code lists the SQL embedded, as
 *   `[{ code_list_id, fingerprint }]`.
 * @returns The combined dataset's id.
 */
create or replace function public.rpc_crosswalks__save_combined_dataset (
  p_crosswalk_id uuid,
  p_dataset_id uuid,
  p_dataset_name text,
  p_raw_sql text,
  p_columns jsonb,
  p_bindings jsonb,
  p_compiled_code_lists jsonb
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_output_dataset_id uuid;
begin
  v_workspace_id := public.crosswalks__authorize (p_crosswalk_id);

  perform public.crosswalks__check_members_viewable (p_crosswalk_id);

  if coalesce(btrim(p_dataset_name), '') = '' then
    raise exception 'The combined dataset needs a name'
      using errcode = '23514', hint = 'combined_dataset_name_required';
  end if;

  perform public.crosswalks__check_combined_payload (p_columns, p_bindings, p_compiled_code_lists);
  perform public.crosswalks__check_combined_bindings (v_workspace_id, p_columns, p_bindings);

  select c.output_dataset_id
  into v_output_dataset_id
  from public.crosswalks c
  where c.id = p_crosswalk_id;

  if v_output_dataset_id is null then
    perform public.crosswalks__create_combined_dataset (v_workspace_id, p_dataset_id, btrim(p_dataset_name), p_raw_sql, p_columns);
  else
    perform public.crosswalks__update_combined_dataset (
      v_workspace_id, v_output_dataset_id, p_dataset_id, btrim(p_dataset_name), p_raw_sql, p_columns
    );
  end if;

  perform public.crosswalks__write_combined_bindings (v_workspace_id, p_dataset_id, p_bindings);

  update public.crosswalks
  set
    output_dataset_id = p_dataset_id,
    compiled_at = now(),
    compiled_code_lists = p_compiled_code_lists
  where id = p_crosswalk_id;

  return p_dataset_id;
end;
$$;

/**
 * Raises `crosswalk_has_unreadable_datasets` when a layout that is not
 * skipped holds a dataset the caller cannot view. Such a dataset is not in
 * the SQL the caller compiled, so saving it would overwrite the combined
 * dataset without that member.
 */
create or replace function public.crosswalks__check_members_viewable (p_crosswalk_id uuid) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from public.crosswalks__datasets cd
    join public.crosswalks__layouts l on l.id = cd.layout_id and l.crosswalk_id = cd.crosswalk_id
    where
      cd.crosswalk_id = p_crosswalk_id and
      l.status <> 'skipped' and
      not public.util__auth_user_can_access_resource (
        'dataset'::public.resource_type,
        cd.dataset_id,
        'viewer'::public.role_level
      )
  ) then
    raise exception 'This crosswalk combines a dataset you cannot open, so you cannot update the combined dataset'
      using errcode = '42501', hint = 'crosswalk_has_unreadable_datasets';
  end if;
end;
$$;

/**
 * Raises `combined_columns_invalid` unless the three sets are arrays, the
 * columns are at least one `{ name, data_type }` with a non-blank name, a
 * known type, and no two names equal ignoring case and surrounding spaces,
 * and the bindings and code lists are well formed. Runs before anything
 * casts the payload.
 */
create or replace function public.crosswalks__check_combined_payload (
  p_columns jsonb,
  p_bindings jsonb,
  p_compiled_code_lists jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if
    jsonb_typeof(p_columns) is distinct from 'array' or
    jsonb_typeof(p_bindings) is distinct from 'array' or
    jsonb_typeof(p_compiled_code_lists) is distinct from 'array'
  then
    raise exception 'Columns, bindings, and code lists must be arrays'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;

  -- Only now are the three sets known to be arrays.
  if jsonb_array_length(p_columns) = 0 or exists (
    select 1
    from jsonb_array_elements(p_columns) as e (col)
    where
      jsonb_typeof(e.col -> 'name') is distinct from 'string' or
      btrim(coalesce(e.col ->> 'name', '')) = '' or
      coalesce(e.col ->> 'data_type', '') <> all (
        enum_range(null::public.datasets__ava_data_type)::text[]
      )
  ) then
    raise exception 'The combined dataset needs at least one column, each with a name and a known type'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_columns) as e (col)
    group by lower(btrim(e.col ->> 'name'))
    having count(*) > 1
  ) then
    raise exception 'Two columns of the combined dataset cannot share a name'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;

  perform public.crosswalks__check_combined_binding_fields (p_bindings, p_compiled_code_lists);
end;
$$;

/**
 * Raises `combined_columns_invalid` unless every binding names a column, a
 * dictionary, an entry, a code list, and a known direction, with no column
 * twice, and every embedded code list names a uuid and a text fingerprint.
 */
create or replace function public.crosswalks__check_combined_binding_fields (
  p_bindings jsonb,
  p_compiled_code_lists jsonb
) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if exists (
    select 1
    from jsonb_array_elements(p_bindings) as e (binding)
    where
      jsonb_typeof(e.binding -> 'column_name') is distinct from 'string' or
      coalesce(e.binding ->> 'dictionary_id', '') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'entry_id', '') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'code_list_id', '') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'direction', '') <> all (
        enum_range(null::public.dataset_columns__binding_direction)::text[]
      )
  ) or exists (
    select 1
    from jsonb_array_elements(p_bindings) as e (binding)
    group by lower(btrim(e.binding ->> 'column_name'))
    having count(*) > 1
  ) then
    raise exception 'Every binding needs a column, a dictionary, an entry, a code list, and a direction, with no column twice'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_compiled_code_lists) as e (item)
    where
      coalesce(e.item ->> 'code_list_id', '') !~* v_uuid_pattern or
      jsonb_typeof(e.item -> 'fingerprint') is distinct from 'string'
  ) then
    raise exception 'Every embedded code list needs an id and a fingerprint'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;
end;
$$;

/**
 * Raises with a stable hint when a binding names a column the combined
 * dataset does not have, or a dictionary, entry, or code list outside the
 * crosswalk's workspace, an entry outside its dictionary, or a code list
 * its entry does not use.
 */
create or replace function public.crosswalks__check_combined_bindings (
  p_workspace_id uuid,
  p_columns jsonb,
  p_bindings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (column_name text)
    where not exists (
      select 1
      from jsonb_array_elements(p_columns) as e (col)
      where lower(btrim(e.col ->> 'name')) = lower(btrim(b.column_name))
    )
  ) then
    raise exception 'Every binding must name a column of the combined dataset'
      using errcode = '23514', hint = 'binding_column_missing';
  end if;

  -- The entry's workspace stands for all three: its dictionary has the
  -- same workspace (composite key), and so does every list it codes with.
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dictionary_id uuid, entry_id uuid, code_list_id uuid)
    where not exists (
      select 1
      from public.data_dictionaries__entries en
      join public.data_dictionaries__entry_codings ec on ec.entry_id = en.id
      where
        en.id = b.entry_id and
        en.dictionary_id = b.dictionary_id and
        en.workspace_id = p_workspace_id and
        ec.code_list_id = b.code_list_id
    )
  ) then
    raise exception 'Every binding''s dictionary, entry, and code list must belong together in this workspace'
      using errcode = '23514', hint = 'binding_not_in_workspace';
  end if;
end;
$$;

/**
 * The combined dataset's columns as rows, in the payload's order, with
 * names trimmed and `column_idx` counting from 0.
 */
create or replace function public.crosswalks__read_combined_columns (p_columns jsonb) returns table (
  name text,
  data_type public.datasets__ava_data_type,
  column_idx integer
) language sql immutable
set
  search_path = '' as $$
  select
    btrim(e.col ->> 'name'),
    (e.col ->> 'data_type')::public.datasets__ava_data_type,
    (e.column_index - 1)::integer
  from jsonb_array_elements(p_columns) with ordinality as e (col, column_index);
$$;

/**
 * Creates the combined dataset as a virtual dataset the caller owns, with
 * the payload's columns, after checking that the caller may add a dataset
 * to the workspace.
 */
create or replace function public.crosswalks__create_combined_dataset (
  p_workspace_id uuid,
  p_dataset_id uuid,
  p_name text,
  p_raw_sql text,
  p_columns jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'Only a workspace admin can add a dataset'
      using errcode = '42501', hint = 'dataset_creator_required';
  end if;

  -- The columns are built inline, as `datasets__virtual__create_linked`
  -- builds them.
  perform public.rpc_datasets__add_virtual_dataset (
    p_dataset_id,
    p_workspace_id,
    p_name,
    null,
    (
      select
        array_agg(
          row(
            w.name,
            w.name,
            null,
            public.datasets__ava_data_type_to_duckdb (w.data_type)::text,
            public.datasets__ava_data_type_to_duckdb (w.data_type),
            w.data_type,
            w.column_idx
          )::public.dataset_column_input
          order by w.column_idx
        )
      from public.crosswalks__read_combined_columns (p_columns) as w
    ),
    p_raw_sql
  );
end;
$$;

/**
 * Updates the crosswalk's combined dataset: its name, its SQL, and its
 * columns, after checking that `p_dataset_id` is that dataset and that
 * the caller can edit it. Locks the dataset for the rest of the save.
 */
create or replace function public.crosswalks__update_combined_dataset (
  p_workspace_id uuid,
  p_output_dataset_id uuid,
  p_dataset_id uuid,
  p_name text,
  p_raw_sql text,
  p_columns jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if p_dataset_id is distinct from p_output_dataset_id then
    raise exception 'This crosswalk updates a different combined dataset'
      using errcode = '23514', hint = 'combined_dataset_mismatch';
  end if;

  if not public.util__auth_user_can_access_resource (
    'dataset'::public.resource_type,
    p_dataset_id,
    'editor'::public.role_level
  ) then
    raise exception 'Only an editor of the combined dataset can update it'
      using errcode = '42501', hint = 'dataset_editor_required';
  end if;

  perform 1 from public.datasets where id = p_dataset_id for no key update;

  update public.datasets
  set name = p_name
  where id = p_dataset_id;

  update public.datasets__virtual
  set raw_sql = p_raw_sql
  where dataset_id = p_dataset_id;

  perform public.crosswalks__reconcile_combined_columns (p_workspace_id, p_dataset_id, p_columns);
end;
$$;

/**
 * Makes the combined dataset's columns the payload's. Each payload column
 * keeps the first existing column with its name ignoring case (by
 * position), so its id, description, and bindings' targets survive, and
 * takes the payload's name, type, and position; new names are inserted;
 * every other column is deleted, kept-original copies included.
 */
create or replace function public.crosswalks__reconcile_combined_columns (
  p_workspace_id uuid,
  p_dataset_id uuid,
  p_columns jsonb
) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_kept_ids uuid[];
begin
  with kept as (
    select distinct on (lower(dc.name))
      dc.id,
      lower(dc.name) as name_key
    from public.dataset_columns dc
    where dc.dataset_id = p_dataset_id and dc.dictionary_binding_id is null
    order by lower(dc.name), dc.column_idx, dc.id
  ), updated as (
    update public.dataset_columns dc
    set
      original_name = w.name,
      name = w.name,
      original_data_type = public.datasets__ava_data_type_to_duckdb (w.data_type)::text,
      detected_data_type = public.datasets__ava_data_type_to_duckdb (w.data_type),
      data_type = w.data_type,
      column_idx = w.column_idx
    from public.crosswalks__read_combined_columns (p_columns) as w
    join kept k on k.name_key = lower(w.name)
    where dc.id = k.id
    returning dc.id
  )
  select coalesce(array_agg(updated.id), '{}')
  into v_kept_ids
  from updated;

  delete from public.dataset_columns dc
  where dc.dataset_id = p_dataset_id and dc.id <> all (v_kept_ids);

  insert into public.dataset_columns (
    dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx
  )
  select
    p_dataset_id, p_workspace_id, w.name, w.name,
    public.datasets__ava_data_type_to_duckdb (w.data_type)::text,
    public.datasets__ava_data_type_to_duckdb (w.data_type),
    w.data_type, w.column_idx
  from public.crosswalks__read_combined_columns (p_columns) as w
  where not exists (
    select 1
    from public.dataset_columns dc
    where dc.dataset_id = p_dataset_id and lower(dc.name) = lower(w.name)
  );
end;
$$;

/**
 * Replaces the combined dataset's bindings with the given set, as
 * reference bindings at each dictionary's current version, on the column
 * of the binding's name ignoring case.
 */
create or replace function public.crosswalks__write_combined_bindings (
  p_workspace_id uuid,
  p_dataset_id uuid,
  p_bindings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.dataset_id = p_dataset_id;

  insert into public.dataset_columns__dictionary_bindings (
    workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id,
    mode, direction, applied_dictionary_version
  )
  select
    p_workspace_id, p_dataset_id, dc.id, b.dictionary_id, b.entry_id, b.code_list_id,
    'reference', b.direction::public.dataset_columns__binding_direction, d.version
  from jsonb_to_recordset(p_bindings) as b (
    column_name text, dictionary_id uuid, entry_id uuid, code_list_id uuid, direction text
  )
  join public.dataset_columns dc on dc.dataset_id = p_dataset_id and lower(dc.name) = lower(btrim(b.column_name))
  join public.data_dictionaries d on d.id = b.dictionary_id;
end;
$$;

revoke
execute on function public.rpc_crosswalks__save_combined_dataset (
  uuid,
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks Data Sources editor, the
-- right to add a dataset, and dataset edit rights itself.
grant
execute on function public.rpc_crosswalks__save_combined_dataset (
  uuid,
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) to authenticated;

-- The helpers run inside the SECURITY DEFINER RPC and are never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.crosswalks__check_members_viewable (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_combined_payload (jsonb, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_combined_binding_fields (jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_combined_bindings (uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__read_combined_columns (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__create_combined_dataset (uuid, uuid, text, text, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__update_combined_dataset (uuid, uuid, uuid, text, text, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__reconcile_combined_columns (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__write_combined_bindings (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;
