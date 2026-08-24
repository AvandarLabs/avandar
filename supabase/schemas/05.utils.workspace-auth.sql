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

-- `authenticated` only, because a policy expression is evaluated as the
-- calling role and the policies that name this are `to authenticated`.
revoke
execute on function public.util__get_auth_user_workspaces ()
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.util__get_auth_user_workspaces () to authenticated;

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

-- `authenticated` only, because a policy expression is evaluated as the
-- calling role and the policies that name this are `to authenticated`.
revoke
execute on function public.util__get_auth_user_owned_workspaces ()
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.util__get_auth_user_owned_workspaces () to authenticated;

/**
 * Whether a user belongs to a workspace.
 *
 * Replaces `util__get_workspace_members`, which took a workspace id, checked
 * nothing about its caller, and returned every member's `auth.users.id`.
 * Postgres grants EXECUTE on a new function to PUBLIC and nothing revoked it,
 * so PostgREST served that roster to `anon`: the publishable key plus a
 * workspace id, which `anon` reads off any public dashboard row, was enough to
 * enumerate a tenant's members. See docs/audits/2026-08-19-catchup-audit.md,
 * finding F-5.
 *
 * All four policies that called the enumerator asked the same narrow question,
 * "is this row's new owner a member of this workspace", about a user id they
 * already held. Answering that instead of returning the list removes the
 * enumeration rather than trying to grant around it, and leaks nothing the
 * caller did not already supply: one boolean about one named user.
 *
 * `security definer` because a `with check` has to see membership rows the
 * caller's own RLS on `workspace_memberships` would hide.
 *
 * @param p_workspace_id: Workspace to check
 * @param p_user_id: User to check
 * @returns: True when that user has a membership row in that workspace
 */
create or replace function public.util__is_workspace_member (p_workspace_id uuid, p_user_id uuid) returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where
      wm.workspace_id = p_workspace_id and
      wm.user_id = p_user_id
  );
$$;

-- Only `authenticated` calls this, and only from the `with check` of the four
-- UPDATE policies in `17.rls.dashboards`, `17.rls.datasets`, `17.rls.maps` and
-- `18.user_workspace_policies`. A policy expression is evaluated as the calling
-- role, so that grant cannot be dropped; nothing gives `anon` or `service_role`
-- a path to it.
revoke
execute on function public.util__is_workspace_member (uuid, uuid)
from
  public,
  anon,
  service_role;

grant
execute on function public.util__is_workspace_member (uuid, uuid) to authenticated;
