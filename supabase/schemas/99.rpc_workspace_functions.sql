/**
 * Add a user to an existing workspace with a given role.
 * The requesting user must be an admin or owner of the workspace.
 * 
 * @param p_workspace_id: The workspace id to add the user to
 * @param p_user_id: The user id to add
 * @param p_full_name: The full name of the user
 * @param p_display_name: The display name of the user
 * @param p_user_role: The role of the user
 * 
 * @returns: The workspace membership ID
 */
create or replace function public.rpc_workspaces__add_user (
  p_workspace_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_display_name text,
  p_user_role text
) returns uuid as $$
declare
  v_membership_id uuid;
begin
  -- Ensure the workspace is one that the user owns or admins.
  -- We need to check for ownership first, because if the workspace was just
  -- created then a `user_roles` row does not exist yet, because we still
  -- haven't finished created the user owner's role.
  if (
    p_workspace_id != all(public.util__get_auth_user_owned_workspaces()) and
    p_workspace_id != all(public.util__get_auth_user_workspaces_by_role('admin'))
  ) then
    raise 'The requesting user is not an admin of this workspace';
  end if;

  -- Create the workspace membership
  insert into public.workspace_memberships (
    workspace_id,
    user_id
  ) values (
    p_workspace_id,
    p_user_id
  ) returning id into v_membership_id;

  -- Create the user profile
  insert into public.user_profiles (
    workspace_id,
    user_id,
    membership_id,
    full_name,
    display_name
  ) values (
    p_workspace_id,
    p_user_id,
    v_membership_id,
    p_full_name,
    p_display_name
  );

  -- Create the user role
  insert into public.user_roles (
    workspace_id,
    user_id,
    membership_id,
    role
  ) values (
    p_workspace_id,
    p_user_id,
    v_membership_id,
    p_user_role
  );
  return v_membership_id;
end;
$$ language plpgsql security invoker;

/**
 * Create a new workspace and assign the current user as the owner.
 * 
 * @param p_workspace_name: The name of the workspace
 * @param p_workspace_slug: The slug of the workspace
 * @param p_full_name: The full name of the owner
 * @param p_display_name: The display name of the owner
 * 
 * @returns: The created workspace
 */
create or replace function public.rpc_workspaces__create_with_owner (
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
) returns public.workspaces as $$
declare
  v_owner_id uuid := auth.uid();
  v_workspace public.workspaces;
begin
  -- Create the workspace
  insert into public.workspaces (
    owner_id,
    name,
    slug
  ) values (
    v_owner_id,
    p_workspace_name,
    p_workspace_slug
  ) returning * into v_workspace;

  -- Call the rpc function to create the workspace membership and user profile
  perform
    public.rpc_workspaces__add_user(
      v_workspace.id,
      v_owner_id,
      p_full_name,
      p_display_name,
      'admin'
    );
  return v_workspace;
end;
$$ language plpgsql security invoker;
