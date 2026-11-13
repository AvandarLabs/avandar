/**
 * Creates a linked dataset over `p_source_dataset_id` in one transaction:
 * a virtual dataset that reads every column of its source
 * (`SELECT * FROM "<source id>"`) and converts the columns `p_bindings`
 * marks `convert`, through live convert bindings that follow the
 * dictionary. Columns the set binds as `reference` get the same reference
 * binding on the linked dataset, so their descriptions and code-list tags
 * follow. The source's bindings are replaced with the same set as
 * `reference`, so its values stay as stored and stay explained; any
 * in-place conversion it had is undone. Returns the new dataset's id.
 *
 * SECURITY DEFINER because bindings are select-only for signed-in users.
 * Before it reads anything else it checks dataset editor on the source,
 * Data Sources viewer, Data Sources editor when it adds values, and the
 * right to add a dataset to the workspace, which any import needs. A
 * refusal at any point, including while the new dataset is being created,
 * rolls the whole apply back.
 *
 * @param p_source_dataset_id The dataset the linked dataset reads. It may
 *   not itself be a linked dataset.
 * @param p_linked_dataset_id The new dataset's id, chosen by the caller.
 * @param p_linked_dataset_name The new dataset's name.
 * @param p_bindings The source's bindings, as for
 *   `rpc_dataset_columns__apply_dictionaries`, with `is_pinned` false.
 * @param p_added_pairs Values to append to code lists the set uses first.
 * @returns The new dataset's id.
 */
create or replace function public.rpc_dataset_columns__apply_dictionaries_as_linked_dataset (
  p_source_dataset_id uuid,
  p_linked_dataset_id uuid,
  p_linked_dataset_name text,
  p_bindings jsonb,
  p_added_pairs jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_bindings jsonb := coalesce(p_bindings, '[]'::jsonb);
begin
  v_workspace_id := public.dataset_columns__dictionary_bindings__authorize (p_source_dataset_id);
  perform public.dataset_columns__dictionary_bindings__authorize_adding_pairs (v_workspace_id, p_added_pairs);

  if not public.util__can_manage_workspace_settings (v_workspace_id) then
    raise exception 'Only a workspace admin can add a dataset'
      using errcode = '42501', hint = 'dataset_creator_required';
  end if;

  if exists (
    select 1
    from public.datasets__virtual v
    where v.dataset_id = p_source_dataset_id and v.linked_source_dataset_id is not null
  ) then
    raise exception 'A linked dataset converts its own columns; apply to it directly'
      using errcode = '0A000', hint = 'binding_mode_unsupported';
  end if;

  if coalesce(btrim(p_linked_dataset_name), '') = '' then
    raise exception 'A linked dataset needs a name'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  perform public.dataset_columns__dictionary_bindings__check (p_source_dataset_id, v_workspace_id, v_bindings, true);
  perform public.dataset_columns__dictionary_bindings__add_pairs (v_workspace_id, v_bindings, coalesce(p_added_pairs, '[]'::jsonb));
  perform public.dataset_columns__dictionary_bindings__write (p_source_dataset_id, v_workspace_id, public.dataset_columns__dictionary_bindings__as_reference (v_bindings));
  perform public.datasets__virtual__create_linked (p_source_dataset_id, p_linked_dataset_id, v_workspace_id, btrim(p_linked_dataset_name));
  perform public.dataset_columns__dictionary_bindings__write (
    p_linked_dataset_id,
    v_workspace_id,
    public.dataset_columns__dictionary_bindings__for_linked_dataset (p_source_dataset_id, p_linked_dataset_id, v_bindings)
  );

  return p_linked_dataset_id;
end;
$$;

/**
 * The same bindings as `reference`: the same columns, entries, code lists,
 * and directions, with no conversion fields. What a linked dataset's
 * source keeps.
 */
create or replace function public.dataset_columns__dictionary_bindings__as_reference (p_bindings jsonb) returns jsonb language sql immutable
set
  search_path = '' as $$
  select coalesce(
    jsonb_agg(
      (e.binding - 'keeps_original' - 'value_overrides' - 'is_pinned') || '{"mode":"reference"}'::jsonb
      order by e.binding_index
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_bindings) with ordinality as e (binding, binding_index);
$$;

/**
 * A source's set moved onto the linked dataset's columns of the same name:
 * each `convert` binding left live, and each `reference` binding as it is
 * (the checks already refused conversion fields on it), so the linked
 * dataset carries the same descriptions and code-list tags.
 */
create or replace function public.dataset_columns__dictionary_bindings__for_linked_dataset (
  p_source_dataset_id uuid,
  p_linked_dataset_id uuid,
  p_bindings jsonb
) returns jsonb language sql stable
set
  search_path = '' as $$
  select coalesce(
    jsonb_agg(
      e.binding || jsonb_build_object('dataset_column_id', lc.id, 'is_pinned', false)
      order by lc.column_idx
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_bindings) as e (binding)
  join public.dataset_columns sc on
    sc.id = (e.binding ->> 'dataset_column_id')::uuid and
    sc.dataset_id = p_source_dataset_id
  join public.dataset_columns lc on
    lc.dataset_id = p_linked_dataset_id and
    lc.name = sc.name and
    lc.dictionary_binding_id is null;
$$;

/**
 * The DuckDB type a column of this Ava type has when a query reads it, the
 * rule `DuckDbDataTypeUtils.fromDatasetColumnType` follows. A linked
 * dataset's columns are detected as this, since it reads its source's
 * view.
 */
create or replace function public.datasets__ava_data_type_to_duckdb (
  p_data_type public.datasets__ava_data_type
) returns public.datasets__duckdb_data_type language sql immutable
set
  search_path = '' as $$
  select
    case p_data_type
      when 'varchar' then 'VARCHAR'
      when 'bigint' then 'BIGINT'
      when 'double' then 'DOUBLE'
      when 'time' then 'TIME'
      when 'date' then 'DATE'
      when 'timestamp' then 'TIMESTAMP'
      when 'boolean' then 'BOOLEAN'
    end::public.datasets__duckdb_data_type;
$$;

/**
 * Creates the virtual dataset a linked dataset is, with the source's
 * columns as its view names them (renamed names, current types), and
 * records the source. Kept original columns of the source are left out:
 * the source's own bindings were written as `reference` first, so it has
 * none.
 */
create or replace function public.datasets__virtual__create_linked (
  p_source_dataset_id uuid,
  p_linked_dataset_id uuid,
  p_workspace_id uuid,
  p_name text
) returns void language plpgsql
set
  search_path = '' as $$
begin
  -- The columns are built inline rather than in a declared variable:
  -- `dataset_column_input` is defined in a later schema file, and plpgsql
  -- resolves declared types when the function is created.
  perform public.rpc_datasets__add_virtual_dataset (
    p_linked_dataset_id,
    p_workspace_id,
    p_name,
    null,
    coalesce(
      (
        select
          array_agg(
            row(
              dc.name,
              dc.name,
              dc.description,
              public.datasets__ava_data_type_to_duckdb (dc.data_type)::text,
              public.datasets__ava_data_type_to_duckdb (dc.data_type),
              dc.data_type,
              dc.column_idx
            )::public.dataset_column_input
            order by dc.column_idx, dc.id
          )
        from public.dataset_columns dc
        where dc.dataset_id = p_source_dataset_id and dc.dictionary_binding_id is null
      ),
      array[]::public.dataset_column_input[]
    ),
    format('SELECT * FROM %I', p_source_dataset_id::text)
  );

  update public.datasets__virtual
  set linked_source_dataset_id = p_source_dataset_id
  where dataset_id = p_linked_dataset_id;
end;
$$;

revoke
execute on function public.rpc_dataset_columns__apply_dictionaries_as_linked_dataset (uuid, uuid, text, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks dataset edit rights and the
-- right to add a dataset itself.
grant
execute on function public.rpc_dataset_columns__apply_dictionaries_as_linked_dataset (uuid, uuid, text, jsonb, jsonb) to authenticated;

revoke
execute on function public.dataset_columns__dictionary_bindings__as_reference (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__for_linked_dataset (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.datasets__ava_data_type_to_duckdb (public.datasets__ava_data_type)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.datasets__virtual__create_linked (uuid, uuid, uuid, text)
from
  public,
  anon,
  authenticated,
  service_role;
