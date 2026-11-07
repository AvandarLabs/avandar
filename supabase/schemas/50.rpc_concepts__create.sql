/**
 * Creates a case type with its statuses, attributes, and attribute mappings
 * in one transaction, and returns its id. Nothing is written if any part
 * fails.
 *
 * SECURITY INVOKER, so every insert passes through the caller's RLS: a
 * caller who is not a Case Types editor in the workspace fails on the first
 * insert. Each payload is a database row shape built by the client's model
 * parsers. Child rows take the case type's id and workspace from the
 * inserted case type, never from their own payloads.
 *
 * A signed-in caller always owns the new case type. `owner_id` in the
 * payload is read only when there is no signed-in user, which is the
 * service role seeding a workspace.
 *
 * @param p_concept The `concepts` row, including `id` and
 *   `default_status_id`.
 * @param p_attributes The `concept_attributes` rows, each with its `id`.
 * @param p_dataset_column_mappings The `attribute_mappings__dataset_column`
 *   rows.
 * @param p_manual_entry_mappings The `attribute_mappings__manual_entry` rows.
 * @param p_statuses The `concept_statuses` rows. `default_status_id` must be
 *   one of them, which the deferred foreign key checks at commit.
 * @returns The new case type's id.
 */
create or replace function public.rpc_concepts__create (
  p_concept jsonb,
  p_attributes jsonb,
  p_dataset_column_mappings jsonb,
  p_manual_entry_mappings jsonb,
  p_statuses jsonb
) returns uuid language plpgsql
set
  search_path = '' as $$
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
    allow_manual_edit
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
    a.allow_manual_edit
  from jsonb_to_recordset(p_attributes) as a (
    id uuid,
    name text,
    description text,
    data_type public.datasets__ava_data_type,
    mapping_type public.concept_attributes__mapping_type,
    is_label boolean,
    is_identifier boolean,
    is_array boolean,
    allow_manual_edit boolean
  );

  insert into public.attribute_mappings__dataset_column (
    workspace_id,
    concept_attribute_id,
    value_picker_rule_type,
    dataset_id,
    dataset_column_id
  )
  select
    v_workspace_id,
    m.concept_attribute_id,
    m.value_picker_rule_type,
    m.dataset_id,
    m.dataset_column_id
  from jsonb_to_recordset(p_dataset_column_mappings) as m (
    concept_attribute_id uuid,
    value_picker_rule_type public.attribute_mappings__value_picker_rule_type,
    dataset_id uuid,
    dataset_column_id uuid
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

  return v_concept_id;
end;
$$;

revoke
execute on function public.rpc_concepts__create (jsonb, jsonb, jsonb, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- RLS on each table decides whether a signed-in call succeeds. The service
-- role seeds case types for E2E setup, which cannot insert a case type and
-- its default status in two separate requests.
grant
execute on function public.rpc_concepts__create (jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated,
service_role;
