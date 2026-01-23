/**
 * This file contains a collection of utility functions to help with
 * RLS policy checks.
 *
 * TODO(jpsyx): these need to be moved to a private schema to ensure
 * they are never directly callable from the Supabase JS API.
 */
/**
 * Get all workspaces of the auth user
 * @returns: Array of workspace ids
 */
create or replace function public.util__get_auth_user_workspaces () returns uuid[] as $$
begin
  return array(
    select public.workspace_memberships.workspace_id
    from public.workspace_memberships
    where public.workspace_memberships.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

/**
 * Get all workspaces that the auth user is an owner of
 * @returns: Array of workspace ids
 */
create or replace function public.util__get_auth_user_owned_workspaces () returns uuid[] as $$
begin
  return array(
    select public.workspaces.id
    from public.workspaces
    where public.workspaces.owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

/**
 * Get all workspaces where the auth user has a given role
 * @param role: Role to filter by
 * @returns: Array of workspace ids
 */
create or replace function public.util__get_auth_user_workspaces_by_role (
  role text
) returns uuid[] as $$
begin
  return array(
    select public.user_roles.workspace_id
    from public.user_roles
    where
      public.user_roles.user_id = auth.uid()
      and public.user_roles.role = $1
  );
end;
$$ language plpgsql security definer stable;

/**
 * Get all workspace members given a workspace id
 * @param workspace_id: Workspace id to check
 * @returns: Array of user ids
 */
create or replace function public.util__get_workspace_members (
  workspace_id uuid
) returns uuid[] as $$
begin
  return array(
    select public.workspace_memberships.user_id
    from public.workspace_memberships
    where workspace_memberships.workspace_id = $1
  );
end;
$$ language plpgsql security definer stable;
