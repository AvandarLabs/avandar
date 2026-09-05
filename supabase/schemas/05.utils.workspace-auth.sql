/**
 * Utility functions used by RLS policy checks.
 *
 * TODO(jpsyx): these need to be moved to a private schema to ensure they are
 * never directly callable from the Supabase JS API.
 */
/**
 * Gets every workspace the auth user is a member of.
 *
 * @returns Array of workspace ids.
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
 * Gets every workspace the auth user owns.
 *
 * @returns Array of workspace ids.
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
 * Answers a question about a user id the caller already holds, so there is
 * nothing here to enumerate: one boolean about one named user.
 *
 * Do not replace it with a helper that takes only a workspace id and returns
 * the member list. Postgres grants EXECUTE on a new function to PUBLIC,
 * PostgREST then serves it to `anon`, and a workspace id is not a secret
 * (`anon` reads one off any public dashboard row), so such a helper would hand
 * a tenant's whole roster to anyone holding the publishable key. See
 * `docs/audits/2026-08-19-catchup-audit.md`, finding F-5.
 *
 * `security definer` because a `with check` has to see membership rows the
 * caller's own RLS on `workspace_memberships` would hide.
 *
 * @param p_workspace_id Workspace to check.
 * @param p_user_id User to check.
 * @returns True when that user has a membership row in that workspace.
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
