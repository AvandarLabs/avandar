-- Fix rpc_workspaces__add_user owner/admin check (idempotent)
create or replace function public.rpc_workspaces__add_user(
  p_workspace_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_display_name text,
  p_user_role text
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_membership_id uuid;
  v_profile_id uuid;
begin
  if
    not (p_workspace_id = any(public.util__get_auth_user_owned_workspaces()))
    and not (p_workspace_id = any(public.util__get_auth_user_workspaces_by_role('admin')))
  then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  insert into public.workspace_memberships (workspace_id, user_id)
  values (p_workspace_id, p_user_id)
  returning id into v_membership_id;

  insert into public.user_profiles (
    workspace_id, user_id, membership_id, full_name, display_name
  )
  values (
    p_workspace_id, p_user_id, v_membership_id, p_full_name, p_display_name
  )
  returning id into v_profile_id;

  insert into public.user_roles (workspace_id, membership_id, user_profile_id, role)
  values (p_workspace_id, v_membership_id, v_profile_id, p_user_role);

  return v_membership_id;
end;
$$;
