/**
 * Moves every dashboard and dataset a member owns in one workspace to a new
 * owner, in a single transaction.
 *
 * This is the shape offboarding needs. A workspace admin cannot see which of a
 * member's resources are private, so a per-resource picker is impossible to
 * build without leaking exactly what P1 hides. Transferring by owner sidesteps
 * that: the admin names a member and a successor, never a resource.
 *
 * Delegates each row to rpc_resources__transfer_ownership so the membership
 * check, the owner_profile_id update, and the audit row stay in one place.
 *
 * @returns The number of resources moved.
 */
create or replace function public.rpc_workspaces__transfer_all_owned_resources (
  p_workspace_id uuid,
  p_from_user_id uuid,
  p_new_owner_id uuid
) returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_moved integer := 0;
  v_row record;
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  for v_row in
    select 'dashboard'::public.resource_type as resource_type, d.id
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.owner_id = p_from_user_id
    union all
    select 'dataset'::public.resource_type, ds.id
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.owner_id = p_from_user_id
  loop
    perform public.rpc_resources__transfer_ownership (
      v_row.resource_type,
      v_row.id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  return v_moved;
end;
$$;
