/**
 * Replaces every dictionary binding of one dataset with the given set in
 * one transaction and returns how many the dataset has now. An empty set
 * removes them all.
 *
 * A `reference` binding explains a column. A `convert` binding also
 * translates its values when the dataset loads: pinned to its code list's
 * pairs as they are now (`is_pinned`, an uploaded dataset converted in
 * place), or following the live list (a linked dataset). Each converted
 * column's `data_type` becomes what the conversion outputs and comes back
 * when the binding stops converting, a `<column>_original` copy is kept
 * where asked, and `p_added_pairs` are appended to their code lists first,
 * so pinned pairs include them.
 *
 * SECURITY DEFINER because bindings are select-only for signed-in users:
 * this function and the linked-dataset apply are their only write paths.
 * Before it reads anything else it checks that the caller can edit the
 * dataset and can read dictionaries in the dataset's own workspace, and it
 * refuses any column, entry, or code list from another dataset,
 * dictionary, or workspace. Adding values needs Data Sources editor. Every
 * refusal raises with a stable `hint` the client maps to copy. A binding
 * without the conversion fields, and a call without `p_added_pairs`, still
 * work, so a client that sends neither keeps working.
 *
 * Calls `data_dictionaries__check_pairs` from
 * `50.rpc_data_dictionaries__save.sql`.
 *
 * @param p_dataset_id The dataset whose bindings are replaced.
 * @param p_bindings The full set, as `[{ dataset_column_id, dictionary_id,
 *   entry_id, code_list_id, mode, direction, keeps_original,
 *   value_overrides, is_pinned }]`.
 * @param p_added_pairs Values to append to code lists the set uses, as
 *   `[{ code_list_id, code, label }]`.
 * @returns How many bindings the dataset has after the apply.
 */
create or replace function public.rpc_dataset_columns__apply_dictionaries (
  p_dataset_id uuid,
  p_bindings jsonb,
  p_added_pairs jsonb default '[]'::jsonb
) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_bindings jsonb := coalesce(p_bindings, '[]'::jsonb);
  v_num_bindings integer;
begin
  v_workspace_id := public.dataset_columns__dictionary_bindings__authorize (p_dataset_id);
  perform public.dataset_columns__dictionary_bindings__authorize_adding_pairs (v_workspace_id, p_added_pairs);

  perform public.dataset_columns__dictionary_bindings__check (p_dataset_id, v_workspace_id, v_bindings, false);
  perform public.dataset_columns__dictionary_bindings__add_pairs (v_workspace_id, v_bindings, coalesce(p_added_pairs, '[]'::jsonb));
  perform public.dataset_columns__dictionary_bindings__write (p_dataset_id, v_workspace_id, v_bindings);

  select count(*)::integer
  into v_num_bindings
  from public.dataset_columns__dictionary_bindings b
  where b.dataset_id = p_dataset_id;

  return v_num_bindings;
end;
$$;

/**
 * Raises with a stable hint when a set of bindings cannot be written to a
 * dataset: a malformed payload, a mode the dataset cannot take, a column
 * from another dataset or a kept original column, an entry outside its
 * dictionary or the dataset's workspace, a code list the entry does not
 * use, or a `map` override to a code the list does not have.
 *
 * @param p_is_for_linked_dataset Whether the set describes a source for a
 *   new linked dataset, whose converted columns follow the dictionary.
 */
create or replace function public.dataset_columns__dictionary_bindings__check (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_bindings jsonb,
  p_is_for_linked_dataset boolean
) returns void language plpgsql
set
  search_path = '' as $$
begin
  perform public.dataset_columns__dictionary_bindings__check_payload (p_bindings);
  perform public.dataset_columns__dictionary_bindings__check_conversion (p_bindings);
  perform public.dataset_columns__dictionary_bindings__check_modes (p_dataset_id, p_bindings, p_is_for_linked_dataset);

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dataset_column_id uuid)
    left join public.dataset_columns dc on dc.id = b.dataset_column_id
    where
      dc.id is null or
      dc.dataset_id <> p_dataset_id or
      dc.dictionary_binding_id is not null
  ) then
    raise exception 'Every column must be one of this dataset''s own columns'
      using errcode = '23514', hint = 'column_not_in_dataset';
  end if;

  perform public.dataset_columns__dictionary_bindings__check_entries (p_workspace_id, p_bindings);
  perform public.dataset_columns__dictionary_bindings__check_overrides (p_bindings);
end;
$$;

/**
 * Raises `binding_payload_invalid` unless the set is an array of objects,
 * each naming a column, a dictionary, an entry, an optional code list, a
 * known mode and direction, and, when present, a boolean `keeps_original`
 * and `is_pinned` and an array `value_overrides`, with no column twice.
 * Each check runs on its own, before anything casts the payload.
 */
create or replace function public.dataset_columns__dictionary_bindings__check_payload (p_bindings jsonb) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if jsonb_typeof(p_bindings) is distinct from 'array' then
    raise exception 'Bindings must be an array'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_bindings) as e (binding)
    where jsonb_typeof(e.binding) <> 'object'
  ) then
    raise exception 'Every binding must be an object'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_bindings) as e (binding)
    where
      coalesce(e.binding ->> 'dataset_column_id', '') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'dictionary_id', '') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'entry_id', '') !~* v_uuid_pattern or
      (e.binding ->> 'code_list_id') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'mode', '') <> all (
        enum_range(null::public.dataset_columns__binding_mode)::text[]
      ) or
      coalesce(e.binding ->> 'direction', '') <> all (
        enum_range(null::public.dataset_columns__binding_direction)::text[]
      ) or
      jsonb_typeof(coalesce(e.binding -> 'keeps_original', 'false'::jsonb)) <> 'boolean' or
      jsonb_typeof(coalesce(e.binding -> 'is_pinned', 'false'::jsonb)) <> 'boolean' or
      jsonb_typeof(coalesce(e.binding -> 'value_overrides', '[]'::jsonb)) <> 'array'
  ) then
    raise exception 'Every binding must name a column, dictionary, entry, mode, and direction, with well-formed conversion fields'
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
end;
$$;

/**
 * Raises `binding_payload_invalid` when a binding's conversion fields do
 * not fit its mode: `keeps_original`, `is_pinned`, and `value_overrides`
 * are for `convert` only; each override is an object naming a value once
 * (ignoring case and spaces around it), with an action of `keep`, `empty`,
 * or `map`, and a `code` only and always for `map`. Runs after
 * `..._check_payload`, so every field it casts has its type.
 */
create or replace function public.dataset_columns__dictionary_bindings__check_conversion (p_bindings jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (mode text, keeps_original boolean, is_pinned boolean, value_overrides jsonb)
    where
      b.mode = 'reference' and (
        coalesce(b.keeps_original, false) or
        coalesce(b.is_pinned, false) or
        jsonb_array_length(coalesce(b.value_overrides, '[]'::jsonb)) > 0
      )
  ) then
    raise exception 'Only a converted column keeps its original values, is pinned, or overrides values'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (value_overrides jsonb)
    cross join lateral jsonb_array_elements(coalesce(b.value_overrides, '[]'::jsonb)) as o (override)
    where
      jsonb_typeof(o.override) <> 'object' or
      jsonb_typeof(o.override -> 'value') is distinct from 'string' or
      coalesce(o.override ->> 'action', '') not in ('keep', 'empty', 'map') or
      (o.override ->> 'action' = 'map') is distinct from (jsonb_typeof(o.override -> 'code') is not distinct from 'string')
  ) then
    raise exception 'Every override needs a value and an action, and a code only for map'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_bindings) with ordinality as e (binding, binding_index)
    cross join lateral jsonb_array_elements(coalesce(e.binding -> 'value_overrides', '[]'::jsonb)) as o (override)
    group by e.binding_index, lower(btrim(o.override ->> 'value'))
    having count(*) > 1
  ) then
    raise exception 'A value is overridden more than once in one column'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;
end;
$$;

/**
 * Raises when a binding converts in a way its dataset cannot: a `convert`
 * binding without a code list (`convert_needs_code_list`); in place, a
 * pinned conversion of anything but an upload or a live one of anything
 * but a linked dataset (`binding_mode_unsupported`), or a pinned
 * conversion of a dataset a linked dataset reads
 * (`dataset_has_linked_datasets`); for a new linked dataset, a pinned
 * conversion or none at all (`binding_payload_invalid`).
 */
create or replace function public.dataset_columns__dictionary_bindings__check_modes (
  p_dataset_id uuid,
  p_bindings jsonb,
  p_is_for_linked_dataset boolean
) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_source_type public.datasets__source_type;
  v_is_linked boolean;
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (mode text, code_list_id uuid)
    where b.mode = 'convert' and b.code_list_id is null
  ) then
    raise exception 'A converted column needs a code list'
      using errcode = '23514', hint = 'convert_needs_code_list';
  end if;

  if p_is_for_linked_dataset then
    if
      exists (
        select 1
        from jsonb_to_recordset(p_bindings) as b (mode text, is_pinned boolean)
        where b.mode = 'convert' and coalesce(b.is_pinned, false)
      ) or
      not exists (
        select 1
        from jsonb_to_recordset(p_bindings) as b (mode text)
        where b.mode = 'convert'
      )
    then
      raise exception 'A linked dataset converts at least one column and follows the dictionary'
        using errcode = '22023', hint = 'binding_payload_invalid';
    end if;

    return;
  end if;

  select ds.source_type, v.linked_source_dataset_id is not null
  into v_source_type, v_is_linked
  from public.datasets ds
  left join public.datasets__virtual v on v.dataset_id = ds.id
  where ds.id = p_dataset_id;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (mode text, is_pinned boolean)
    where
      b.mode = 'convert' and
      not (
        (coalesce(b.is_pinned, false) and v_source_type in ('csv_file', 'xlsx_file', 'pdf_file')) or
        (not coalesce(b.is_pinned, false) and coalesce(v_is_linked, false))
      )
  ) then
    raise exception 'This dataset cannot be converted that way'
      using errcode = '0A000', hint = 'binding_mode_unsupported';
  end if;

  if
    exists (
      select 1
      from jsonb_to_recordset(p_bindings) as b (mode text, is_pinned boolean)
      where b.mode = 'convert' and coalesce(b.is_pinned, false)
    ) and
    exists (
      select 1
      from public.datasets__virtual v
      where v.linked_source_dataset_id = p_dataset_id
    )
  then
    raise exception 'A linked dataset reads this dataset, so it cannot be converted in place'
      using errcode = '0A000', hint = 'dataset_has_linked_datasets';
  end if;
end;
$$;

/**
 * Raises with a stable hint when a binding's entry is not in its dictionary
 * and the dataset's workspace, or its code list is not one the entry uses.
 */
create or replace function public.dataset_columns__dictionary_bindings__check_entries (p_workspace_id uuid, p_bindings jsonb) returns void language plpgsql
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
 * Raises `binding_payload_invalid` when a `map` override names a code its
 * binding's code list does not have. Codes compare trimmed and ignoring
 * case, as conversions compare them. Runs after `..._check_entries`, so
 * every code list is the binding's own.
 */
create or replace function public.dataset_columns__dictionary_bindings__check_overrides (p_bindings jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (code_list_id uuid, value_overrides jsonb)
    cross join lateral jsonb_array_elements(coalesce(b.value_overrides, '[]'::jsonb)) as o (override)
    left join public.data_dictionaries__code_lists cl on cl.id = b.code_list_id
    where
      o.override ->> 'action' = 'map' and
      not exists (
        select 1
        from jsonb_array_elements(coalesce(cl.pairs, '[]'::jsonb)) as p (pair)
        where lower(btrim(p.pair ->> 'code')) = lower(btrim(o.override ->> 'code'))
      )
  ) then
    raise exception 'A map override must name a code in its column''s list'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;
end;
$$;

/**
 * Each code list `p_added_pairs` adds to, as `{ id, pairs }` with the new
 * values appended in the order given, trimmed, with no accepted spellings
 * and not missing: the shape `data_dictionaries__check_pairs` checks.
 */
create or replace function public.dataset_columns__dictionary_bindings__merge_pairs (p_added_pairs jsonb) returns jsonb language sql stable
set
  search_path = '' as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('id', cl.id, 'pairs', cl.pairs || added.pairs)),
    '[]'::jsonb
  )
  from public.data_dictionaries__code_lists cl
  join (
    select
      (a.pair ->> 'code_list_id')::uuid as code_list_id,
      jsonb_agg(
        jsonb_build_object(
          'code', btrim(a.pair ->> 'code'),
          'label', btrim(a.pair ->> 'label'),
          'accepted_spellings', '[]'::jsonb,
          'is_missing', false
        )
        order by a.pair_index
      ) as pairs
    from jsonb_array_elements(p_added_pairs) with ordinality as a (pair, pair_index)
    group by (a.pair ->> 'code_list_id')::uuid
  ) as added on added.code_list_id = cl.id;
$$;

/**
 * Appends `p_added_pairs` to their code lists and bumps each touched
 * dictionary's version once, as a dictionary save would. The merged lists
 * were checked by `data_dictionaries__check_pairs` first.
 */
create or replace function public.dataset_columns__dictionary_bindings__write_pairs (p_added_pairs jsonb) returns void language sql
set
  search_path = '' as $$
  with
    merged as (
      select (l.list ->> 'id')::uuid as id, l.list -> 'pairs' as pairs
      from jsonb_array_elements(public.dataset_columns__dictionary_bindings__merge_pairs (p_added_pairs)) as l (list)
    ),
    updated as (
      update public.data_dictionaries__code_lists cl
      set pairs = merged.pairs
      from merged
      where cl.id = merged.id
      returning cl.dictionary_id
    )
  update public.data_dictionaries d
  set version = d.version + 1
  where d.id in (select u.dictionary_id from updated u);
$$;

/**
 * Raises `dictionary_editor_required` when `p_added_pairs` adds any value
 * and the caller is not a Data Sources editor in `p_workspace_id`. Called
 * by the apply RPCs right after they authorize the dataset, before they
 * read any binding, so a non-editor who adds values is refused first.
 * Anything other than a non-empty array is left to
 * `dataset_columns__dictionary_bindings__add_pairs` to judge.
 */
create or replace function public.dataset_columns__dictionary_bindings__authorize_adding_pairs (
  p_workspace_id uuid,
  p_added_pairs jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if
    jsonb_typeof(p_added_pairs) = 'array' and
    jsonb_array_length(p_added_pairs) > 0 and
    not public.util__auth_user_meets_min_app_role (
      p_workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  then
    raise exception 'Only Data Sources editors can add values to a code list'
      using errcode = '42501', hint = 'dictionary_editor_required';
  end if;
end;
$$;

/**
 * Appends the values the user added while applying to their code lists,
 * checked as a dictionary save checks them, bumps each touched
 * dictionary's version once, and re-types every converted column of those
 * lists. Each value must go to a code list the set uses. The caller has
 * already checked Data Sources editor with
 * `dataset_columns__dictionary_bindings__authorize_adding_pairs`. An empty
 * `p_added_pairs` changes nothing.
 */
create or replace function public.dataset_columns__dictionary_bindings__add_pairs (
  p_workspace_id uuid,
  p_bindings jsonb,
  p_added_pairs jsonb
) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_code_list_ids uuid[];
begin
  if jsonb_typeof(p_added_pairs) is distinct from 'array' then
    raise exception 'Added values must be an array'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if jsonb_array_length(p_added_pairs) = 0 then
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_added_pairs) as a (pair)
    where
      jsonb_typeof(a.pair) <> 'object' or
      coalesce(a.pair ->> 'code_list_id', '') !~* v_uuid_pattern or
      jsonb_typeof(a.pair -> 'code') is distinct from 'string' or
      jsonb_typeof(a.pair -> 'label') is distinct from 'string'
  ) then
    raise exception 'Every added value needs a code list, a code, and a label'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  v_code_list_ids := array(
    select distinct (a.pair ->> 'code_list_id')::uuid
    from jsonb_array_elements(p_added_pairs) as a (pair)
  );

  if exists (
    select 1
    from unnest(v_code_list_ids) as l (id)
    where not exists (
      select 1
      from jsonb_to_recordset(p_bindings) as b (code_list_id uuid)
      where b.code_list_id = l.id
    )
  ) then
    raise exception 'A value can only be added to a code list this apply uses'
      using errcode = '23514', hint = 'code_list_not_in_entry';
  end if;

  perform 1
  from public.data_dictionaries d
  where d.id in (
    select cl.dictionary_id
    from public.data_dictionaries__code_lists cl
    where cl.id = any (v_code_list_ids)
  )
  for update;

  perform public.data_dictionaries__check_pairs (public.dataset_columns__dictionary_bindings__merge_pairs (p_added_pairs));
  perform public.dataset_columns__dictionary_bindings__write_pairs (p_added_pairs);
  perform public.dataset_columns__dictionary_bindings__sync_live_types (v_code_list_ids);
end;
$$;

/**
 * Puts back the `data_type` of every column of `p_dataset_id` whose convert
 * binding the new set no longer converts: one left out, or one now
 * `reference`. Runs before the set is written, while the old bindings
 * still say which type each column replaced.
 */
create or replace function public.dataset_columns__dictionary_bindings__restore_types (p_dataset_id uuid, p_bindings jsonb) returns void language sql
set
  search_path = '' as $$
  update public.dataset_columns dc
  set data_type = b.replaced_data_type
  from public.dataset_columns__dictionary_bindings b
  where
    b.dataset_id = p_dataset_id and
    b.mode = 'convert' and
    b.replaced_data_type is not null and
    dc.id = b.dataset_column_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_bindings) as n (dataset_column_id uuid, mode text)
      where n.dataset_column_id = b.dataset_column_id and n.mode = 'convert'
    );
$$;

/**
 * Deletes a dataset's bindings that the new set leaves out and upserts the
 * rest, recording each dictionary's current version. A pinned binding
 * copies its code list's pairs and order as they are now. A convert
 * binding remembers the type its column had before any conversion: the
 * prior binding's when the column was already converted, the column's own
 * otherwise.
 */
create or replace function public.dataset_columns__dictionary_bindings__upsert (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_bindings jsonb
) returns void language sql
set
  search_path = '' as $$
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
    code_list_id, mode, direction, applied_dictionary_version, keeps_original,
    value_overrides, pinned_pairs, pinned_is_ordered, replaced_data_type
  )
  select
    p_workspace_id, p_dataset_id, n.dataset_column_id, n.dictionary_id, n.entry_id,
    n.code_list_id, n.mode::public.dataset_columns__binding_mode,
    n.direction::public.dataset_columns__binding_direction, d.version,
    coalesce(n.keeps_original, false), coalesce(n.value_overrides, '[]'::jsonb),
    case when coalesce(n.is_pinned, false) then cl.pairs end,
    case when coalesce(n.is_pinned, false) then cl.is_ordered end,
    case when n.mode = 'convert' then coalesce(prior.replaced_data_type, dc.data_type) end
  from jsonb_to_recordset(p_bindings) as n (
    dataset_column_id uuid, dictionary_id uuid, entry_id uuid, code_list_id uuid,
    mode text, direction text, keeps_original boolean, value_overrides jsonb, is_pinned boolean
  )
  join public.data_dictionaries d on d.id = n.dictionary_id
  join public.dataset_columns dc on dc.id = n.dataset_column_id
  left join public.data_dictionaries__code_lists cl on cl.id = n.code_list_id
  left join public.dataset_columns__dictionary_bindings prior on
    prior.dataset_column_id = n.dataset_column_id and
    prior.mode = 'convert'
  on conflict (dataset_column_id) do update
  set
    dictionary_id = excluded.dictionary_id,
    entry_id = excluded.entry_id,
    code_list_id = excluded.code_list_id,
    mode = excluded.mode,
    direction = excluded.direction,
    applied_dictionary_version = excluded.applied_dictionary_version,
    keeps_original = excluded.keeps_original,
    value_overrides = excluded.value_overrides,
    pinned_pairs = excluded.pinned_pairs,
    pinned_is_ordered = excluded.pinned_is_ordered,
    replaced_data_type = excluded.replaced_data_type;
$$;

/**
 * Keeps one `<column>_original` copy for every convert binding of
 * `p_dataset_id` that keeps its original values, and none for the rest. A
 * new copy reads the column's stored values (its `original_name`) with the
 * type the column had before converting, is named by
 * `dataset_columns__get_free_name`, and goes after the dataset's last
 * column. A copy that exists keeps its name, so a user's rename stays.
 */
create or replace function public.dataset_columns__dictionary_bindings__sync_copies (p_dataset_id uuid) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_column record;
begin
  delete from public.dataset_columns dc
  using public.dataset_columns__dictionary_bindings b
  where
    dc.dictionary_binding_id = b.id and
    b.dataset_id = p_dataset_id and
    not (b.mode = 'convert' and b.keeps_original);

  for v_column in
    select b.id as binding_id, b.replaced_data_type, dc.workspace_id, dc.original_name, dc.name, dc.original_data_type, dc.detected_data_type
    from public.dataset_columns__dictionary_bindings b
    join public.dataset_columns dc on dc.id = b.dataset_column_id
    where
      b.dataset_id = p_dataset_id and
      b.mode = 'convert' and
      b.keeps_original and
      not exists (
        select 1
        from public.dataset_columns c
        where c.dictionary_binding_id = b.id
      )
    order by dc.column_idx, dc.id
  loop
    insert into public.dataset_columns (
      dataset_id, workspace_id, original_name, name, original_data_type,
      detected_data_type, data_type, column_idx, dictionary_binding_id
    )
    select
      p_dataset_id, v_column.workspace_id, v_column.original_name,
      public.dataset_columns__get_free_name (p_dataset_id, v_column.name || '_original'),
      v_column.original_data_type, v_column.detected_data_type, v_column.replaced_data_type,
      coalesce(max(c.column_idx), -1) + 1, v_column.binding_id
    from public.dataset_columns c
    where c.dataset_id = p_dataset_id;
  end loop;
end;
$$;

/**
 * Writes a checked set of bindings to one dataset: restores the types of
 * columns that stop converting, upserts the set, sets the types of
 * converted columns, and keeps their original copies in step. Called by
 * both apply RPCs after their checks pass.
 */
create or replace function public.dataset_columns__dictionary_bindings__write (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_bindings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  perform public.dataset_columns__dictionary_bindings__restore_types (p_dataset_id, p_bindings);
  perform public.dataset_columns__dictionary_bindings__upsert (p_dataset_id, p_workspace_id, p_bindings);
  perform public.dataset_columns__dictionary_bindings__set_types (p_dataset_id);
  perform public.dataset_columns__dictionary_bindings__sync_copies (p_dataset_id);
end;
$$;

revoke
execute on function public.rpc_dataset_columns__apply_dictionaries (uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks dataset edit rights itself.
grant
execute on function public.rpc_dataset_columns__apply_dictionaries (uuid, jsonb, jsonb) to authenticated;

-- The helpers run inside the SECURITY DEFINER applies and are never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.dataset_columns__dictionary_bindings__check (uuid, uuid, jsonb, boolean)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__check_payload (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__check_conversion (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__check_modes (uuid, jsonb, boolean)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__check_entries (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__check_overrides (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__merge_pairs (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__write_pairs (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__authorize_adding_pairs (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__add_pairs (uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__restore_types (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__upsert (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__sync_copies (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.dataset_columns__dictionary_bindings__write (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;
