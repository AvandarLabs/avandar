set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_concepts__create(p_concept jsonb, p_attributes jsonb, p_dataset_column_mappings jsonb, p_manual_entry_mappings jsonb, p_statuses jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_concept_id uuid;
  v_workspace_id uuid;
begin
  insert into public.concepts (
    id,
    owner_id,
    workspace_id,
    name,
    description,
    allow_manual_creation,
    default_status_id
  )
  select
    c.id,
    coalesce(auth.uid (), c.owner_id),
    c.workspace_id,
    c.name,
    c.description,
    c.allow_manual_creation,
    c.default_status_id
  from jsonb_to_record(p_concept) as c (
    id uuid,
    owner_id uuid,
    workspace_id uuid,
    name text,
    description text,
    allow_manual_creation boolean,
    default_status_id uuid
  )
  returning id, workspace_id into v_concept_id, v_workspace_id;

  insert into public.concept_statuses (
    id,
    workspace_id,
    concept_id,
    name,
    description,
    color,
    position
  )
  select
    s.id,
    v_workspace_id,
    v_concept_id,
    s.name,
    s.description,
    s.color,
    s.position
  from jsonb_to_recordset(p_statuses) as s (
    id uuid,
    name text,
    description text,
    color text,
    position integer
  );

  -- One statement, so the label trigger counts every attribute at once.
  insert into public.concept_attributes (
    id,
    workspace_id,
    concept_id,
    name,
    description,
    data_type,
    mapping_type,
    is_label,
    is_identifier,
    is_array,
    allow_manual_edit,
    bucket_grain
  )
  select
    a.id,
    v_workspace_id,
    v_concept_id,
    a.name,
    a.description,
    a.data_type,
    a.mapping_type,
    a.is_label,
    a.is_identifier,
    a.is_array,
    a.allow_manual_edit,
    a.bucket_grain
  from jsonb_to_recordset(p_attributes) as a (
    id uuid,
    name text,
    description text,
    data_type public.datasets__ava_data_type,
    mapping_type public.concept_attributes__mapping_type,
    is_label boolean,
    is_identifier boolean,
    is_array boolean,
    allow_manual_edit boolean,
    bucket_grain public.concept_attributes__bucket_grain
  );

  -- After the attributes, so the bucket column trigger finds each mapping's
  -- field and its period.
  insert into public.attribute_mappings__dataset_column (
    workspace_id,
    concept_attribute_id,
    value_picker_rule_type,
    dataset_id,
    dataset_column_id,
    bucket_column_id
  )
  select
    v_workspace_id,
    m.concept_attribute_id,
    m.value_picker_rule_type,
    m.dataset_id,
    m.dataset_column_id,
    m.bucket_column_id
  from jsonb_to_recordset(p_dataset_column_mappings) as m (
    concept_attribute_id uuid,
    value_picker_rule_type public.attribute_mappings__value_picker_rule_type,
    dataset_id uuid,
    dataset_column_id uuid,
    bucket_column_id uuid
  );

  insert into public.attribute_mappings__manual_entry (
    workspace_id,
    concept_attribute_id
  )
  select
    v_workspace_id,
    m.concept_attribute_id
  from jsonb_to_recordset(p_manual_entry_mappings) as m (
    concept_attribute_id uuid
  );

  -- A field that keeps every value names no rule. Every other dataset field
  -- reduces its rows with exactly one, a per-period field once per period.
  -- The rule and `is_array` live in different tables, so no constraint can
  -- hold this. `rpc_concepts__create` enforces it when a case type is
  -- created, and readers refuse a single-value field that has no rule.
  if exists (
    select 1
    from public.attribute_mappings__dataset_column m
    join public.concept_attributes a on a.id = m.concept_attribute_id
    where
      a.concept_id = v_concept_id
      and (a.is_array and a.bucket_grain is null) = (
        m.value_picker_rule_type is not null
      )
  ) then
    raise exception 'A dataset field has a value rule unless it keeps every value'
      using errcode = '23514', hint = 'value_rule_mismatch';
  end if;

  -- The label names a record and an identifier matches rows to it, so
  -- neither can hold a list.
  if exists (
    select 1
    from public.concept_attributes a
    where
      a.concept_id = v_concept_id
      and a.is_array
      and (a.is_label or a.is_identifier)
  ) then
    raise exception 'A list field cannot be the label or an identifier'
      using errcode = '23514', hint = 'list_field_is_key_or_label';
  end if;

  return v_concept_id;
end;
$function$
;


