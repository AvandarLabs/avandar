/**
 * Installs a plugin in a workspace together with its data slot bindings, in
 * one transaction, and returns the install. The install wizard calls it, so
 * a binding that fails leaves no install behind.
 *
 * SECURITY INVOKER, so the RLS on `plugin_installations` and
 * `plugin_data_slot_bindings` decides who may install: only the workspace's
 * settings admins. Each binding takes its install and workspace from the new
 * install row, never from the payload.
 *
 * @param p_granted_permissions The manifest permissions the admin approved.
 * @param p_bindings A JSON array with one
 *   `{ slot_id, source_type, concept_id, dataset_id, attribute_map }` per
 *   bound data slot. Empty when no slot is bound.
 * @returns The new `plugin_installations` row.
 */
create or replace function public.rpc_plugin_installations__install (
  p_workspace_id uuid,
  p_plugin_id text,
  p_installed_version text,
  p_granted_permissions text[],
  p_bindings jsonb
) returns public.plugin_installations language plpgsql security invoker
set
  search_path = '' as $$
declare
  v_installation public.plugin_installations;
begin
  insert into public.plugin_installations (
    workspace_id,
    plugin_id,
    installed_version,
    granted_permissions
  ) values (
    p_workspace_id,
    p_plugin_id,
    p_installed_version,
    coalesce(p_granted_permissions, '{}')
  )
  returning * into v_installation;

  insert into public.plugin_data_slot_bindings (
    workspace_id,
    installation_id,
    slot_id,
    source_type,
    concept_id,
    dataset_id,
    attribute_map
  )
  select
    v_installation.workspace_id,
    v_installation.id,
    binding.slot_id,
    binding.source_type,
    binding.concept_id,
    binding.dataset_id,
    coalesce(binding.attribute_map, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_bindings, '[]'::jsonb)) as binding (
    slot_id text,
    source_type public.plugin_data_slot_bindings__source_type,
    concept_id uuid,
    dataset_id uuid,
    attribute_map jsonb
  );

  return v_installation;
end;
$$;

-- `authenticated` only, the one role that calls this as an rpc.
revoke
execute on function public.rpc_plugin_installations__install (uuid, text, text, text[], jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_plugin_installations__install (uuid, text, text, text[], jsonb) to authenticated;
