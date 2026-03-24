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
  v_membership_id uuid;
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

  -- Create the workspace membership
  insert into public.workspace_memberships (
    workspace_id,
    user_id
  ) values (
    v_workspace.id,
    v_owner_id
  ) returning id into v_membership_id;

  -- Create the user profile
  insert into public.user_profiles (
    workspace_id,
    user_id,
    membership_id,
    full_name,
    display_name
  ) values (
    v_workspace.id,
    v_owner_id,
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
    v_workspace.id,
    v_owner_id,
    v_membership_id,
    'admin'
  );

  return v_workspace;
end;
$$ language plpgsql security invoker;
