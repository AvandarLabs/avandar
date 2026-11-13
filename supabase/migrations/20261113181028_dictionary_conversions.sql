drop trigger if exists "tr__data_dictionaries__remove_reference_bindings" on "public"."data_dictionaries";

drop trigger if exists "tr__data_dictionaries__entries__remove_reference_bindings" on "public"."data_dictionaries__entries";

drop function if exists "public"."dataset_columns__dictionary_bindings__check"(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb);

drop function if exists "public"."dataset_columns__dictionary_bindings__remove_for_dictionary"();

drop function if exists "public"."dataset_columns__dictionary_bindings__remove_for_entry"();

drop function if exists "public"."rpc_dataset_columns__apply_dictionaries"(p_dataset_id uuid, p_bindings jsonb);

alter table "public"."dataset_columns" add column "dictionary_binding_id" uuid;

alter table "public"."dataset_columns__dictionary_bindings" add column "keeps_original" boolean not null default false;

alter table "public"."dataset_columns__dictionary_bindings" add column "pinned_is_ordered" boolean;

alter table "public"."dataset_columns__dictionary_bindings" add column "pinned_pairs" jsonb;

alter table "public"."dataset_columns__dictionary_bindings" add column "replaced_data_type" public.datasets__ava_data_type;

alter table "public"."dataset_columns__dictionary_bindings" add column "value_overrides" jsonb not null default '[]'::jsonb;

alter table "public"."datasets__virtual" add column "linked_source_dataset_id" uuid;

CREATE INDEX idx_dataset_columns__dictionary_binding_id ON public.dataset_columns USING btree (dictionary_binding_id) WHERE (dictionary_binding_id IS NOT NULL);

CREATE INDEX idx_datasets__virtual__linked_source_dataset_id ON public.datasets__virtual USING btree (linked_source_dataset_id) WHERE (linked_source_dataset_id IS NOT NULL);

alter table "public"."dataset_columns" add constraint "dataset_columns_dictionary_binding_id_fkey" FOREIGN KEY (dictionary_binding_id) REFERENCES public.dataset_columns__dictionary_bindings(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."dataset_columns" validate constraint "dataset_columns_dictionary_binding_id_fkey";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dictionary_bindings__overrides_is_array" CHECK ((jsonb_typeof(value_overrides) = 'array'::text)) not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dictionary_bindings__overrides_is_array";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dictionary_bindings__pinned_order_with_pairs" CHECK (((pinned_pairs IS NULL) = (pinned_is_ordered IS NULL))) not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dictionary_bindings__pinned_order_with_pairs";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dictionary_bindings__pinned_pairs_is_array" CHECK (((pinned_pairs IS NULL) OR (jsonb_typeof(pinned_pairs) = 'array'::text))) not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dictionary_bindings__pinned_pairs_is_array";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dictionary_bindings__reference_is_plain" CHECK (((mode = 'convert'::public.dataset_columns__binding_mode) OR ((NOT keeps_original) AND (value_overrides = '[]'::jsonb) AND (pinned_pairs IS NULL) AND (replaced_data_type IS NULL)))) not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dictionary_bindings__reference_is_plain";

alter table "public"."datasets__virtual" add constraint "datasets__virtual_linked_source_dataset_id_fkey" FOREIGN KEY (linked_source_dataset_id) REFERENCES public.datasets(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."datasets__virtual" validate constraint "datasets__virtual_linked_source_dataset_id_fkey";

set check_function_bodies = off;

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

  if not public.util__auth_user_meets_min_app_role (
    p_workspace_id,
    'data_sources'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Data Sources editors can add values to a code list'
      using errcode = '42501', hint = 'dictionary_editor_required';
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

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__as_reference(p_bindings jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    jsonb_agg(
      (e.binding - 'keeps_original' - 'value_overrides' - 'is_pinned') || '{"mode":"reference"}'::jsonb
      order by e.binding_index
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_bindings) with ordinality as e (binding, binding_index);
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__authorize(p_dataset_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__check(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb, p_is_for_linked_dataset boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__check_conversion(p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__check_modes(p_dataset_id uuid, p_bindings jsonb, p_is_for_linked_dataset boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__check_overrides(p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__check_payload(p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__find_repointable(p_dictionary_id uuid, p_code_lists jsonb)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__for_linked_dataset(p_source_dataset_id uuid, p_linked_dataset_id uuid, p_bindings jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__get_output_data_type(p_direction public.dataset_columns__binding_direction, p_pairs jsonb)
 RETURNS public.datasets__ava_data_type
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__merge_pairs(p_added_pairs jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__pin_for_code_list()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__pin_live(p_binding_ids uuid[])
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__release_for_dictionary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__release_for_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__repoint_reference(p_binding_ids uuid[])
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__restore_types(p_dataset_id uuid, p_bindings jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__set_types(p_dataset_id uuid)
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
    left join public.data_dictionaries__code_lists cl on cl.id = b.code_list_id
    where
      b.dataset_id = p_dataset_id and
      b.mode = 'convert' and
      (b.pinned_pairs is not null or cl.id is not null)
  ) as t
  where dc.id = t.dataset_column_id and dc.data_type is distinct from t.data_type;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__sync_copies(p_dataset_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
      public.dataset_columns__dictionary_bindings__get_output_data_type (b.direction, cl.pairs) as data_type
    from public.dataset_columns__dictionary_bindings b
    join public.data_dictionaries__code_lists cl on cl.id = b.code_list_id
    where
      b.code_list_id = any (p_code_list_ids) and
      b.mode = 'convert' and
      b.pinned_pairs is null
  ) as t
  where dc.id = t.dataset_column_id and dc.data_type is distinct from t.data_type;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__upsert(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__write_pairs(p_added_pairs jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__get_free_name(p_dataset_id uuid, p_base text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select c.candidate
  from (
    select
      s.n,
      case
        when s.n = 1 then p_base
        else p_base || '_' || s.n
      end as candidate
    from generate_series(1, 1000) as s (n)
  ) as c
  where not exists (
    select 1
    from public.dataset_columns dc
    where dc.dataset_id = p_dataset_id and lower(dc.name) = lower(c.candidate)
  )
  order by c.n
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__guard_dictionary_binding_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.dictionary_binding_id is not null then
      raise exception 'a kept original column is managed by its dictionary binding'
        using errcode = '42501';
    end if;
  elsif new.dictionary_binding_id is distinct from old.dictionary_binding_id then
    raise exception 'a kept original column is managed by its dictionary binding'
      using errcode = '42501';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__ava_data_type_to_duckdb(p_data_type public.datasets__ava_data_type)
 RETURNS public.datasets__duckdb_data_type
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__virtual__create_linked(p_source_dataset_id uuid, p_linked_dataset_id uuid, p_workspace_id uuid, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__virtual__guard_linked_source()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION public.rpc_dataset_columns__reapply_dictionary(p_dataset_id uuid, p_dictionary_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_num_repinned integer;
begin
  perform public.dataset_columns__dictionary_bindings__authorize (p_dataset_id);

  update public.dataset_columns__dictionary_bindings b
  set
    pinned_pairs = cl.pairs,
    pinned_is_ordered = cl.is_ordered,
    applied_dictionary_version = d.version
  from public.data_dictionaries__code_lists cl
  join public.data_dictionaries d on d.id = cl.dictionary_id
  where
    b.dataset_id = p_dataset_id and
    b.dictionary_id = p_dictionary_id and
    b.mode = 'convert' and
    b.pinned_pairs is not null and
    cl.id = b.code_list_id;

  get diagnostics v_num_repinned = row_count;

  if v_num_repinned = 0 then
    raise exception 'Nothing on this dataset is pinned to this dictionary'
      using errcode = 'P0002', hint = 'nothing_to_reapply';
  end if;

  perform public.dataset_columns__dictionary_bindings__set_types (p_dataset_id);

  return v_num_repinned;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_can_read_code_list_through_binding(p_code_list_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__write(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  perform public.dataset_columns__dictionary_bindings__restore_types (p_dataset_id, p_bindings);
  perform public.dataset_columns__dictionary_bindings__upsert (p_dataset_id, p_workspace_id, p_bindings);
  perform public.dataset_columns__dictionary_bindings__set_types (p_dataset_id);
  perform public.dataset_columns__dictionary_bindings__sync_copies (p_dataset_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_dictionaries__save(p_dictionary_id uuid, p_code_lists jsonb, p_entries jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;


  create policy "Linked dataset viewers can select their code lists"
  on "public"."data_dictionaries__code_lists"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_read_code_list_through_binding(id));


CREATE TRIGGER tr__data_dictionaries__release_bindings BEFORE DELETE ON public.data_dictionaries FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__dictionary_bindings__release_for_dictionary();

CREATE TRIGGER tr__data_dictionaries__code_lists__pin_bindings BEFORE DELETE ON public.data_dictionaries__code_lists FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__dictionary_bindings__pin_for_code_list();

CREATE TRIGGER tr__data_dictionaries__entries__release_bindings BEFORE DELETE ON public.data_dictionaries__entries FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__dictionary_bindings__release_for_entry();

CREATE TRIGGER tr__dataset_columns__guard_dictionary_binding_id BEFORE INSERT OR UPDATE OF dictionary_binding_id ON public.dataset_columns FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__guard_dictionary_binding_id();

CREATE TRIGGER tr__datasets__virtual__guard_linked_source BEFORE INSERT OR UPDATE OF linked_source_dataset_id ON public.datasets__virtual FOR EACH ROW EXECUTE FUNCTION public.datasets__virtual__guard_linked_source();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.dataset_columns__dictionary_bindings__add_pairs(p_workspace_id uuid, p_bindings jsonb, p_added_pairs jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__as_reference(p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__authorize(p_dataset_id uuid) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__check_conversion(p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__check_modes(p_dataset_id uuid, p_bindings jsonb, p_is_for_linked_dataset boolean) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__check_overrides(p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__check_payload(p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__check(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb, p_is_for_linked_dataset boolean) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__find_repointable(p_dictionary_id uuid, p_code_lists jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__for_linked_dataset(p_source_dataset_id uuid, p_linked_dataset_id uuid, p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__get_output_data_type(p_direction dataset_columns__binding_direction, p_pairs jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__merge_pairs(p_added_pairs jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__pin_for_code_list() from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__pin_live(p_binding_ids uuid[]) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__release_for_dictionary() from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__release_for_entry() from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__repoint_reference(p_binding_ids uuid[]) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__restore_types(p_dataset_id uuid, p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__set_types(p_dataset_id uuid) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__sync_copies(p_dataset_id uuid) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__sync_live_types(p_code_list_ids uuid[]) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__upsert(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__write_pairs(p_added_pairs jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__get_free_name(p_dataset_id uuid, p_base text) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__guard_dictionary_binding_id() from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__ava_data_type_to_duckdb(p_data_type datasets__ava_data_type) from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__virtual__create_linked(p_source_dataset_id uuid, p_linked_dataset_id uuid, p_workspace_id uuid, p_name text) from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__virtual__guard_linked_source() from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_dataset_columns__apply_dictionaries_as_linked_dataset(p_source_dataset_id uuid, p_linked_dataset_id uuid, p_linked_dataset_name text, p_bindings jsonb, p_added_pairs jsonb) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_dataset_columns__apply_dictionaries_as_linked_dataset(p_source_dataset_id uuid, p_linked_dataset_id uuid, p_linked_dataset_name text, p_bindings jsonb, p_added_pairs jsonb) to "authenticated";
revoke all privileges on function public.rpc_dataset_columns__apply_dictionaries(p_dataset_id uuid, p_bindings jsonb, p_added_pairs jsonb) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_dataset_columns__apply_dictionaries(p_dataset_id uuid, p_bindings jsonb, p_added_pairs jsonb) to "authenticated";
revoke all privileges on function public.rpc_dataset_columns__reapply_dictionary(p_dataset_id uuid, p_dictionary_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_dataset_columns__reapply_dictionary(p_dataset_id uuid, p_dictionary_id uuid) to "authenticated";
revoke all privileges on function public.util__auth_user_can_read_code_list_through_binding(p_code_list_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_can_read_code_list_through_binding(p_code_list_id uuid) to "authenticated";
