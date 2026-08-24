/**
 * Rank ordering for role_level (viewer < editor < admin).
 *
 * @returns Integer rank 1–3.
 */
create or replace function public.util__role_level_rank (p_role public.role_level) returns int language sql immutable as $$
  select case p_role
    when 'viewer' then 1
    when 'editor' then 2
    when 'admin' then 3
  end;
$$;

-- Reached only from inside SECURITY DEFINER bodies, which run as this
-- function's owner, so no Data API role needs EXECUTE.
revoke
execute on function public.util__role_level_rank (public.role_level)
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Maps a rank back to role_level for aggregate results.
 *
 * @returns Matching role_level or null when rank is zero.
 */
create or replace function public.util__rank_to_role_level (p_rank int) returns public.role_level language sql immutable as $$
  select case p_rank
    when 1 then 'viewer'::public.role_level
    when 2 then 'editor'::public.role_level
    when 3 then 'admin'::public.role_level
    else null::public.role_level
  end;
$$;

-- Reached only from inside SECURITY DEFINER bodies, which run as this
-- function's owner, so no Data API role needs EXECUTE.
revoke
execute on function public.util__rank_to_role_level (integer)
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Whether the auth user is a Settings admin (Global admin) in the workspace.
 *
 * @returns True when settings app role is admin.
 */
create or replace function public.util__is_settings_admin (p_workspace_id uuid) returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    inner join public.role_group_app_roles rgar on
      rgar.role_group_id = wm.role_group_id
    where
      wm.workspace_id = p_workspace_id and
      wm.user_id = auth.uid () and
      rgar.app = 'settings' and
      rgar.role = 'admin'
  );
$$;

-- `authenticated` only: named by `to authenticated` policies, which are
-- evaluated as the calling role, and called directly as an rpc by the
-- signed-in client.
revoke
execute on function public.util__is_settings_admin (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.util__is_settings_admin (uuid) to authenticated;

/**
 * Auth user's role for one app in a workspace.
 *
 * @returns Role level when present.
 */
create or replace function public.util__get_auth_user_app_role (
  p_workspace_id uuid,
  p_app public.app_type
) returns public.role_level language sql security definer stable
set
  search_path = public as $$
  select rgar.role
  from public.workspace_memberships wm
  inner join public.role_group_app_roles rgar on
    rgar.role_group_id = wm.role_group_id
  where
    wm.workspace_id = p_workspace_id and
    wm.user_id = auth.uid () and
    rgar.app = p_app
  limit 1;
$$;

-- Reached only from inside SECURITY DEFINER bodies, which run as this
-- function's owner, so no Data API role needs EXECUTE.
revoke
execute on function public.util__get_auth_user_app_role (uuid, public.app_type)
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Whether the auth user has at least p_min_role on p_app in the workspace.
 * Workspace owners always satisfy any minimum.
 *
 * @returns True when app role rank meets or exceeds the minimum.
 */
create or replace function public.util__auth_user_meets_min_app_role (
  p_workspace_id uuid,
  p_app public.app_type,
  p_min_role public.role_level
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid ();
  v_role public.role_level;
begin
  if v_uid is null then
    return false;
  end if;

  if exists (
    select 1
    from public.workspaces w
    where
      w.id = p_workspace_id and
      w.owner_id = v_uid
  ) then
    return true;
  end if;

  v_role := public.util__get_auth_user_app_role (p_workspace_id, p_app);

  if v_role is null then
    return false;
  end if;

  return public.util__role_level_rank (v_role) >=
    public.util__role_level_rank (p_min_role);
end;
$$;

-- `authenticated` (and `service_role` where it writes) because the
-- SECURITY INVOKER trigger that calls this runs as whoever ran the
-- statement, so that role needs EXECUTE on the callee as well.
revoke
execute on function public.util__auth_user_meets_min_app_role (uuid, public.app_type, public.role_level)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.util__auth_user_meets_min_app_role (uuid, public.app_type, public.role_level) to authenticated;

/**
 * Workspace owner or Settings (global) admin — membership and settings UI.
 *
 * @returns True when the auth user may manage workspace-level settings.
 */
create or replace function public.util__can_manage_workspace_settings (p_workspace_id uuid) returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.workspaces w
    where
      w.id = p_workspace_id and
      w.owner_id = auth.uid ()
  )
  or public.util__is_settings_admin (p_workspace_id);
$$;

-- `authenticated` only, because a policy expression is evaluated as the
-- calling role and the policies that name this are `to authenticated`.
revoke
execute on function public.util__can_manage_workspace_settings (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.util__can_manage_workspace_settings (uuid) to authenticated;
