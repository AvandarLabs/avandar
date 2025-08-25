-- Function: add a user to an existing workspace
-- Returns the workspace membership ID
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
  -- The caller must be an owner or an admin of the workspace.
  -- We check for ownership too because a freshly-created workspace
  -- may not have a user_roles row for the owner yet.
  if (
    p_workspace_id != all(public.util__get_auth_user_owned_workspaces())
    and p_workspace_id != all(public.util__get_auth_user_workspaces_by_role('admin'))
  ) then
    raise exception 'The requesting user is not an owner/admin of this workspace';
  end if;

  -- Create membership
  insert into public.workspace_memberships (workspace_id, user_id)
  values (p_workspace_id, p_user_id)
  returning id into v_membership_id;

  -- Create profile
  insert into public.user_profiles (
    workspace_id, user_id, membership_id, full_name, display_name
  )
  values (
    p_workspace_id, p_user_id, v_membership_id, p_full_name, p_display_name
  )
  returning id into v_profile_id;

  -- Create role (NOTE: uses user_profile_id, not user_id)
  insert into public.user_roles (
    workspace_id, membership_id, user_profile_id, role
  )
  values (
    p_workspace_id, v_membership_id, v_profile_id, p_user_role
  );

  return v_membership_id;
end;
$$;

comment on function create or replace function public.rpc_workspaces__add_user(
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
  -- Correct admin/owner check (positive membership checks, not "!= ANY")
  if
    not (p_workspace_id = any(public.util__get_auth_user_owned_workspaces()))
    and not (p_workspace_id = any(public.util__get_auth_user_workspaces_by_role('admin')))
  then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  -- Create membership
  insert into public.workspace_memberships (workspace_id, user_id)
  values (p_workspace_id, p_user_id)
  returning id into v_membership_id;

  -- Create profile
  insert into public.user_profiles (
    workspace_id, user_id, membership_id, full_name, display_name
  )
  values (
    p_workspace_id, p_user_id, v_membership_id, p_full_name, p_display_name
  )
  returning id into v_profile_id;

  -- Create role (no user_id column on user_roles)
  insert into public.user_roles (workspace_id, membership_id, user_profile_id, role)
  values (p_workspace_id, v_membership_id, v_profile_id, p_user_role);

  return v_membership_id;
end;
$$;

comment on function public.rpc_workspaces__create_with_owner(
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
) is
  'Creates a workspace owned by the caller and adds them as an admin member (profile + role). '
  'Returns the created workspaces row.';
