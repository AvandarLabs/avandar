/**
 * Replaces a dictionary's code lists, entries, and entry codings with the
 * given sets in one transaction, and bumps its version once.
 *
 * SECURITY DEFINER because entries, code lists, and codings are
 * select-only for signed-in users: this function is their only write path,
 * so the version always moves with the content. It checks Data Sources
 * editor against the dictionary's own workspace before it reads or writes
 * anything else. Every refusal raises with a stable `hint` that the client
 * maps to copy.
 *
 * Deleting a list, entry, or the dictionary's rows pins the live convert
 * bindings that used them (their triggers do that). After writing, a
 * reference binding whose list this save deleted is pointed at its entry's
 * only remaining list, and every converted column on the dictionary's lists
 * takes the `data_type` its pairs give: the pinned ones, including those
 * this save pinned, or the live list's.
 *
 * @param p_dictionary_id The dictionary whose contents are replaced.
 * @param p_code_lists The full set, as `{ id, name, is_ordered, pairs }`,
 *   where `pairs` is `[{ code, label, accepted_spellings, is_missing }]`.
 * @param p_entries The full set, as `{ id, name, column_names, kind, unit,
 *   valid_min, valid_max, description, position, codings }`, where
 *   `codings` is `[{ code_list_id, is_primary }]`.
 * @returns The dictionary's new version.
 */
create or replace function public.rpc_data_dictionaries__save (
  p_dictionary_id uuid,
  p_code_lists jsonb,
  p_entries jsonb
) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_code_lists jsonb := coalesce(p_code_lists, '[]'::jsonb);
  v_entries jsonb := coalesce(p_entries, '[]'::jsonb);
  v_bindings_to_repoint uuid[];
  v_version integer;
begin
  -- Read without a lock: the caller has not been authorized yet.
  select d.workspace_id
  into v_workspace_id
  from public.data_dictionaries d
  where d.id = p_dictionary_id;

  -- A missing dictionary and a forbidden one raise the same error, so the
  -- function cannot be used to probe for dictionary ids.
  if v_workspace_id is null or not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'data_sources'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Data Sources editors can change a dictionary'
      using errcode = '42501', hint = 'dictionary_editor_required';
  end if;

  -- Two saves of one dictionary run one at a time.
  perform 1 from public.data_dictionaries where id = p_dictionary_id for update;

  perform public.data_dictionaries__check_code_lists (p_dictionary_id, v_code_lists);
  perform public.data_dictionaries__check_entries (p_dictionary_id, v_entries, v_code_lists);

  v_bindings_to_repoint := public.dataset_columns__dictionary_bindings__find_repointable (p_dictionary_id, v_code_lists);

  delete from public.data_dictionaries__entry_codings ec
  where ec.dictionary_id = p_dictionary_id;

  perform public.data_dictionaries__write_code_lists (p_dictionary_id, v_workspace_id, v_code_lists);
  perform public.data_dictionaries__write_entries (p_dictionary_id, v_workspace_id, v_entries);
  perform public.dataset_columns__dictionary_bindings__repoint_reference (v_bindings_to_repoint);
  perform public.dataset_columns__dictionary_bindings__sync_live_types (
    array(
      select cl.id
      from public.data_dictionaries__code_lists cl
      where cl.dictionary_id = p_dictionary_id
    )
  );

  update public.data_dictionaries
  set version = version + 1
  where id = p_dictionary_id
  returning version into v_version;

  return v_version;
end;
$$;

/**
 * Raises with a stable hint when a set of code lists cannot be saved into
 * a dictionary. Called only by `rpc_data_dictionaries__save`.
 */
create or replace function public.data_dictionaries__check_code_lists (
  p_dictionary_id uuid,
  p_code_lists jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if jsonb_typeof(p_code_lists) is distinct from 'array' or exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    where jsonb_typeof(l.list -> 'pairs') is distinct from 'array'
  ) then
    raise exception 'Code lists must be an array of lists with pairs'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_code_lists) as l (id uuid)
    group by l.id
    having count(*) > 1
  ) then
    raise exception 'A code list id appears more than once'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_code_lists) as l (id uuid)
    left join public.data_dictionaries__code_lists cl on cl.id = l.id
    where l.id is null or cl.dictionary_id <> p_dictionary_id
  ) then
    raise exception 'Every code list must be new or belong to this dictionary'
      using errcode = '23514', hint = 'item_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_code_lists) as l (name text)
    where coalesce(btrim(l.name), '') = ''
  ) then
    raise exception 'Every code list needs a name'
      using errcode = '23514', hint = 'code_list_name_required';
  end if;

  perform public.data_dictionaries__check_pairs (p_code_lists);
end;
$$;

/**
 * Raises with a stable hint when any code list's pairs are incomplete or
 * ambiguous: a blank code, a label that is not text, two codes that differ
 * only in case, or a label or accepted spelling shared by two pairs. A
 * blank label is allowed: the value is saved and waits for its label, and
 * blank labels never clash with each other.
 */
create or replace function public.data_dictionaries__check_pairs (p_code_lists jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    where jsonb_typeof(p.pair -> 'label') is distinct from 'string'
  ) then
    raise exception 'Every value needs a label, even an empty one'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    where coalesce(btrim(p.pair ->> 'code'), '') = ''
  ) then
    raise exception 'Every value needs a code'
      using errcode = '23514', hint = 'code_pair_incomplete';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) with ordinality as l (list, list_index)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    group by l.list_index, lower(btrim(p.pair ->> 'code'))
    having count(*) > 1
  ) then
    raise exception 'Two codes in one list only differ in capitalization or spaces'
      using errcode = '23514', hint = 'codes_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) with ordinality as l (list, list_index)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') with ordinality as p (pair, pair_index)
    cross join lateral (
      select p.pair ->> 'label' as spelling
      union all
      select s.spelling
      from jsonb_array_elements_text(coalesce(p.pair -> 'accepted_spellings', '[]'::jsonb)) as s (spelling)
    ) as spellings
    where btrim(spellings.spelling) <> ''
    group by l.list_index, lower(btrim(spellings.spelling))
    having count(distinct p.pair_index) > 1
  ) then
    raise exception 'Two values in one list share a label or an accepted spelling'
      using errcode = '23514', hint = 'labels_not_unique';
  end if;
end;
$$;

/**
 * Raises with a stable hint when a set of entries cannot be saved into a
 * dictionary alongside the given code lists.
 */
create or replace function public.data_dictionaries__check_entries (
  p_dictionary_id uuid,
  p_entries jsonb,
  p_code_lists jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if jsonb_typeof(p_entries) is distinct from 'array' or exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (kind text)
    where e.kind is null or e.kind not in (
      select unnest(enum_range(null::public.data_dictionaries__entry_kind))::text
    )
  ) then
    raise exception 'Entries must be an array with a known kind each'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (id uuid)
    group by e.id
    having count(*) > 1
  ) then
    raise exception 'An entry id appears more than once'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (id uuid)
    left join public.data_dictionaries__entries en on en.id = e.id
    where e.id is null or en.dictionary_id <> p_dictionary_id
  ) then
    raise exception 'Every entry must be new or belong to this dictionary'
      using errcode = '23514', hint = 'item_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (name text)
    where coalesce(btrim(e.name), '') = ''
  ) then
    raise exception 'Every entry needs a name'
      using errcode = '23514', hint = 'entry_name_required';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (name text)
    group by lower(btrim(e.name))
    having count(*) > 1
  ) then
    raise exception 'Two entries in one dictionary cannot share a name'
      using errcode = '23505', hint = 'entry_names_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (valid_min numeric, valid_max numeric)
    where e.valid_min > e.valid_max
  ) then
    raise exception 'The lowest valid value cannot be above the highest'
      using errcode = '23514', hint = 'entry_range_invalid';
  end if;

  perform public.data_dictionaries__check_codings (p_entries, p_code_lists);
end;
$$;

/**
 * Raises with a stable hint when an entry's codings are not allowed: only
 * categorical and ordered entries have them, each points at a code list in
 * the same save, and exactly one is primary.
 */
create or replace function public.data_dictionaries__check_codings (p_entries jsonb, p_code_lists jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    where
      jsonb_array_length(coalesce(e.entry -> 'codings', '[]'::jsonb)) > 0 and
      e.entry ->> 'kind' not in ('categorical', 'ordered')
  ) then
    raise exception 'Only categorical and ordered entries have code lists'
      using errcode = '23514', hint = 'coding_kind_mismatch';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) with ordinality as e (entry, entry_index)
    cross join lateral jsonb_to_recordset(coalesce(e.entry -> 'codings', '[]'::jsonb)) as c (code_list_id uuid)
    group by e.entry_index, c.code_list_id
    having count(*) > 1
  ) then
    raise exception 'An entry lists the same code list more than once'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    cross join lateral jsonb_to_recordset(coalesce(e.entry -> 'codings', '[]'::jsonb)) as c (code_list_id uuid)
    where not exists (
      select 1
      from jsonb_to_recordset(p_code_lists) as l (id uuid)
      where l.id = c.code_list_id
    )
  ) then
    raise exception 'A code list an entry uses must be saved with it'
      using errcode = '23514', hint = 'coding_list_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    where
      jsonb_array_length(coalesce(e.entry -> 'codings', '[]'::jsonb)) > 0 and
      (
        select count(*)
        from jsonb_to_recordset(e.entry -> 'codings') as c (is_primary boolean)
        where c.is_primary
      ) <> 1
  ) then
    raise exception 'An entry with code lists needs exactly one primary list'
      using errcode = '23514', hint = 'coding_primary_required';
  end if;
end;
$$;

/** Upserts a dictionary's code lists and deletes the ones left out. */
create or replace function public.data_dictionaries__write_code_lists (
  p_dictionary_id uuid,
  p_workspace_id uuid,
  p_code_lists jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, is_ordered, pairs)
  select l.id, p_workspace_id, p_dictionary_id, btrim(l.name), coalesce(l.is_ordered, false), l.pairs
  from jsonb_to_recordset(p_code_lists) as l (id uuid, name text, is_ordered boolean, pairs jsonb)
  on conflict (id) do update
  set
    name = excluded.name,
    is_ordered = excluded.is_ordered,
    pairs = excluded.pairs
  where public.data_dictionaries__code_lists.dictionary_id = excluded.dictionary_id;

  delete from public.data_dictionaries__code_lists cl
  where
    cl.dictionary_id = p_dictionary_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_code_lists) as l (id uuid)
      where l.id = cl.id
    );
end;
$$;

/**
 * Upserts a dictionary's entries, deletes the ones left out, and inserts
 * every entry's codings. Codings were already deleted by the caller.
 */
create or replace function public.data_dictionaries__write_entries (
  p_dictionary_id uuid,
  p_workspace_id uuid,
  p_entries jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  -- Park saved names under a unique placeholder first, so a save that swaps
  -- two names never meets the unique name index partway through.
  update public.data_dictionaries__entries en
  set name = '~' || en.id::text
  where en.dictionary_id = p_dictionary_id;

  insert into public.data_dictionaries__entries (
    id, workspace_id, dictionary_id, name, column_names, kind, unit, valid_min, valid_max, description, position
  )
  select
    e.id, p_workspace_id, p_dictionary_id, btrim(e.name), coalesce(e.column_names, '{}'),
    e.kind::public.data_dictionaries__entry_kind, nullif(btrim(e.unit), ''), e.valid_min, e.valid_max,
    nullif(btrim(e.description), ''), e.position
  from jsonb_to_recordset(p_entries) as e (
    id uuid, name text, column_names text[], kind text, unit text,
    valid_min numeric, valid_max numeric, description text, position integer
  )
  on conflict (id) do update
  set
    name = excluded.name,
    column_names = excluded.column_names,
    kind = excluded.kind,
    unit = excluded.unit,
    valid_min = excluded.valid_min,
    valid_max = excluded.valid_max,
    description = excluded.description,
    position = excluded.position
  where public.data_dictionaries__entries.dictionary_id = excluded.dictionary_id;

  delete from public.data_dictionaries__entries en
  where
    en.dictionary_id = p_dictionary_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_entries) as e (id uuid)
      where e.id = en.id
    );

  insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
  select p_workspace_id, p_dictionary_id, (e.entry ->> 'id')::uuid, c.code_list_id, coalesce(c.is_primary, false)
  from jsonb_array_elements(p_entries) as e (entry)
  cross join lateral jsonb_to_recordset(coalesce(e.entry -> 'codings', '[]'::jsonb)) as c (code_list_id uuid, is_primary boolean);
end;
$$;

revoke
execute on function public.rpc_data_dictionaries__save (uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks Data Sources editor itself.
grant
execute on function public.rpc_data_dictionaries__save (uuid, jsonb, jsonb) to authenticated;

-- The helpers run inside the SECURITY DEFINER save and are never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.data_dictionaries__check_code_lists (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__check_pairs (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__check_entries (uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__check_codings (jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__write_code_lists (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.data_dictionaries__write_entries (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;
