/**
 * Binds one data slot of an installed plugin, replacing the slot's binding
 * when it has one, and returns the saved binding. The plugin card in
 * Settings calls it when an admin changes which records a slot reads.
 *
 * SECURITY INVOKER, so the RLS on `plugin_data_slot_bindings` decides who
 * may bind: only the install's workspace's settings admins. The binding
 * takes its workspace from the install, never from the caller. An install
 * the caller cannot read raises the same error as a missing one.
 *
 * @param p_concept_id The case type the slot reads, when `p_source_type` is
 *   `concept`.
 * @param p_dataset_id The dataset the slot reads, when `p_source_type` is
 *   `dataset`.
 * @param p_attribute_map Slot attribute key to the case type attribute id
 *   or the dataset column id that fills it.
 * @returns The saved `plugin_data_slot_bindings` row.
 */
create or replace function public.rpc_plugin_data_slot_bindings__save (
  p_installation_id uuid,
  p_slot_id text,
  p_source_type public.plugin_data_slot_bindings__source_type,
  p_concept_id uuid default null,
  p_dataset_id uuid default null,
  p_attribute_map jsonb default '{}'::jsonb
) returns public.plugin_data_slot_bindings language plpgsql security invoker
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_binding public.plugin_data_slot_bindings;
begin
  select installation.workspace_id
  into v_workspace_id
  from public.plugin_installations installation
  where installation.id = p_installation_id;

  if v_workspace_id is null then
    raise exception 'The plugin install does not exist or cannot be read'
      using
        errcode = '42501',
        hint = 'plugin_installation_not_found',
        detail = format('installation_id %s', p_installation_id);
  end if;

  insert into public.plugin_data_slot_bindings (
    workspace_id,
    installation_id,
    slot_id,
    source_type,
    concept_id,
    dataset_id,
    attribute_map
  ) values (
    v_workspace_id,
    p_installation_id,
    p_slot_id,
    p_source_type,
    p_concept_id,
    p_dataset_id,
    coalesce(p_attribute_map, '{}'::jsonb)
  )
  on conflict (installation_id, slot_id) do update
  set
    source_type = excluded.source_type,
    concept_id = excluded.concept_id,
    dataset_id = excluded.dataset_id,
    attribute_map = excluded.attribute_map,
    bound_by = excluded.bound_by
  returning * into v_binding;

  return v_binding;
end;
$$;

-- `authenticated` only, the one role that calls this as an rpc.
revoke
execute on function public.rpc_plugin_data_slot_bindings__save (
  uuid,
  text,
  public.plugin_data_slot_bindings__source_type,
  uuid,
  uuid,
  jsonb
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_plugin_data_slot_bindings__save (
  uuid,
  text,
  public.plugin_data_slot_bindings__source_type,
  uuid,
  uuid,
  jsonb
) to authenticated;
