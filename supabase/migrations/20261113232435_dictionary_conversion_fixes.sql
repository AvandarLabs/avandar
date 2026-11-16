set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__authorize_adding_pairs(p_workspace_id uuid, p_added_pairs jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__add_pairs(p_workspace_id uuid, p_bindings jsonb, p_added_pairs jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__sync_live_types(p_code_list_ids uuid[])
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
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
    join public.data_dictionaries__code_lists cl on cl.id = b.code_list_id
    where
      b.code_list_id = any (p_code_list_ids) and
      b.mode = 'convert'
  ) as t
  where dc.id = t.dataset_column_id and dc.data_type is distinct from t.data_type;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_dataset_columns__apply_dictionaries(p_dataset_id uuid, p_bindings jsonb, p_added_pairs jsonb DEFAULT '[]'::jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_dataset_columns__apply_dictionaries_as_linked_dataset(p_source_dataset_id uuid, p_linked_dataset_id uuid, p_linked_dataset_name text, p_bindings jsonb, p_added_pairs jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.dataset_columns__dictionary_bindings__authorize_adding_pairs(p_workspace_id uuid, p_added_pairs jsonb) from public, anon, authenticated, service_role;
