-- RPC: add a user to an existing workspace (bypass RLS after our checks)
create or replace function public.rpc_workspaces__add_user(
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  -- Our own authorization checks (owner or admin of the workspace)
  if (
    p_workspace_id <> any(public.util__get_auth_user_owned_workspaces())
    and p_workspace_id <> any(public.util__get_auth_user_workspaces_by_role('admin'))
  ) then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  -- Create membership
  insert into public.workspace_memberships (workspace_id, user_id)
  values (p_workspace_id, p_user_id)
  returning id into v_membership_id;

  -- Create profile
  insert into public.user_profiles (workspace_id, user_id, membership_id, full_name, display_name)
  values (p_workspace_id, p_user_id, v_membership_id, p_full_name, p_display_name)
  returning id into v_profile_id;

  -- Create role (NOTE: user_roles has no user_id now)
  insert into public.user_roles (workspace_id, membership_id, user_profile_id, role)
  values (p_workspace_id, v_membership_id, v_profile_id, p_user_role);

  return v_membership_id;
end;
$$;

-- RPC: create workspace, then add owner (bypass RLS)
create or replace function public.rpc_workspaces__create_with_owner(
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  -- Create the workspace owned by the caller
  insert into public.workspaces (owner_id, name, slug)
  values (v_owner_id, p_workspace_name, p_workspace_slug)
  returning * into v_workspace;

  -- Add owner as member/profile/role
  perform public.rpc_workspaces__add_user(
    v_workspace.id,
    v_owner_id,
    p_full_name,
    p_display_name,
    'admin'
  );

  return v_workspace;
end;
$$;

-- Make sure authenticated users can call them
grant execute on function public.rpc_workspaces__add_user(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.rpc_workspaces__create_with_owner(text, text, text, text) to authenticated;
