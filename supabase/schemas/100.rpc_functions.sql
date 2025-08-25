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

comment on function public.rpc_workspaces__add_user(
  p_workspace_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_display_name text,
  p_user_role text
) is
  'Adds a user to an existing workspace: creates membership, profile, and role (via user_profile_id). '
  'Returns the workspace_memberships.id. Caller must be an owner or admin of the workspace.';


-- Function: create a new workspace and assign the current user as the owner
-- Returns the created workspace row
create or replace function public.rpc_workspaces__create_with_owner(
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
)
returns public.workspaces
language plpgsql
security invoker
as $$
declare
  v_owner_id uuid := auth.uid();
  v_workspace public.workspaces;
begin
  -- Create the workspace owned by the current user
  insert into public.workspaces (owner_id, name, slug)
  values (v_owner_id, p_workspace_name, p_workspace_slug)
  returning * into v_workspace;

  -- Add the owner as an admin member (creates membership, profile, role)
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

comment on function public.rpc_workspaces__create_with_owner(
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
) is
  'Creates a workspace owned by the caller and adds them as an admin member (profile + role). '
  'Returns the created workspaces row.';
